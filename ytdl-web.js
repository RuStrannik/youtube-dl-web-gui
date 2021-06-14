#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const url = require('url');
const { timestamp, printf, printf_err, printf_dbg } = require('./stdlib');
const ytdlw = require('./ytdl-wrap');

const ytdl_path = 'youtube-dl';
const ytdl_cfg_path = '/etc/youtube-dl.conf';
const web_root = '';
const web_port = 8001;

const youtubeDlWrap = new ytdlw(ytdl_path);
const server = http.createServer(server_req_handler);

class Ytdl { // TODO: extends ytdlw?
	constructor(cfg_file_path) {
		this.cfg_file_path = cfg_file_path;
		// Constructor will throw Error if file doesn't exist, or some operation fails, which is exactly what we need
		let cfg_data = fs.readFileSync(cfg_file_path).toString(); //printf('cfg_data:', cfg_data);
		this.dl_dir_path = cfg_data.match(/--output \'(.*\/)%/)[1];
		this.dl_arch_path = cfg_data.match(/--download-archive (.+)/)[1]; //printf('dl_dir_path:', this.dl_dir_path, 'dl_arch_path:', this.dl_arch_path);
		if ((this.dl_dir_path.length === 0) || (this.dl_arch_path.length === 0)) { throw new Error('Could not extract necessary info from config'); };

		this.dl_queue = [];
		this.dl_active = null;
		this.dl_finished = [];
		//this.getFinishedList();

//		let arch_data = fs.readFileSync(this.dl_arch_path).toString(); //printf('arch_data:', arch_data);
//		//let file_ids = [...arch_data.matchAll(/.+ (.+)/g)]; file_ids.forEach((id) => {  });
//		//let file_ids = arch_data.matchAll(/.+ (.+)/g); for (const id of file_ids) { printf("File ID:", id[1]); };
//		let file_ids = Array.from(arch_data.matchAll(/.+ (.+)/g), m => m[1]); //printf("File IDs:", file_ids);
//		let dir_files = fs.readdirSync(this.dl_dir_path); // printf('dir_files:', dir_files);

//		this.dl_finished = []; //for (const id of file_ids) { printf("File ID:", id); };
//		file_ids.forEach((id) => {
//			let fname = dir_files.find((name) => (name.includes(id))); //let fname = dir_files.find((name) => (name.match(new RegExp(`.*${id}.*`))));
//			//printf("File ID:", id, 'Path:', fname);
//			if (fname === undefined) { fname = null; }; // else { fname = this.dl_dir_path + fname; }
//			this.dl_finished.push({ id: id, path: fname });
//		});

		//printf('dl_finished:', this.dl_finished);

		//throw new Error('FIXME: Exit');
	}

	getFinishedList() {
		let arch_data = fs.readFileSync(this.dl_arch_path).toString(); //printf('arch_data:', arch_data);
		//let file_ids = [...arch_data.matchAll(/.+ (.+)/g)]; file_ids.forEach((id) => {  });
		//let file_ids = arch_data.matchAll(/.+ (.+)/g); for (const id of file_ids) { printf("File ID:", id[1]); };
		let file_ids = Array.from(arch_data.matchAll(/.+ (.+)/g), m => m[1]); //printf("File IDs:", file_ids);
		let dir_files = fs.readdirSync(this.dl_dir_path); // printf('dir_files:', dir_files);

		this.dl_finished = []; //for (const id of file_ids) { printf("File ID:", id); };
		file_ids.forEach((id) => {
			let fname = dir_files.find((name) => (name.includes(id))); //let fname = dir_files.find((name) => (name.match(new RegExp(`.*${id}.*`))));
			//printf("File ID:", id, 'Path:', fname);
			if (fname === undefined) { fname = null; }; // else { fname = this.dl_dir_path + fname; }
			this.dl_finished.push({ id: id, path: fname });
		});
		return this.dl_finished;
	}
	getFinishedNum() { return this.getFinishedList().length; };
	getActiveList() {
		let obj_arr = [];
		this.dl_queue.forEach((dl) => {
			let obj = { vid: dl, progress: { percent: 0, totalSize: 0, currentSpeed: '0 Bit/s', eta:'Queued' }, path: null };
			obj_arr.push(obj);
		});
		if (this.dl_active !== null) { obj_arr.push({ pid: this.dl_active.ee.youtubeDlProcess.pid, vid: this.dl_active.vid, progress: this.dl_active.progress, path: this.dl_active.path }); };
		return obj_arr;
	}
	getActiveNum() { return this.dl_queue.length + Number(this.dl_active !== null); };
	addFile(vid) {
		if (vid.length === 0) { return 1; };
		// TODO: check if this vid has already been enqueued

		if (this.dl_active === null) {
			// start new process
			this.start(vid);
		} else {
			// TODO: write enqueued file_vids into the file
			this.dl_queue.push(vid);
		};
		return 0;
	}
	next() { this.start(this.dl_queue.shift()); }; // NOTE: .shift() and .pop() return 'undefined' when no vals left in array
	start(vid) {
		if (vid === undefined) { this.dl_active = null; return; };
		let ytdl_ee = youtubeDlWrap.exec(["--", vid]);
		this.dl_active = { ee: ytdl_ee, vid: vid, progress: { percent: 0, totalSize: 0, currentSpeed: '0 B/s', eta:'Unknown' }, path: '' };

		printf_dbg(`Set this.dl_active.ee.youtubeDlProcess.pid=${this.dl_active.ee.youtubeDlProcess.pid} (${ytdl_ee.youtubeDlProcess.pid})`); // , ytdl_ee.youtubeDlProcess
		//setTimeout(() => { printf_dbg(`Attempting to interrupt PID=${ytdl_ee.youtubeDlProcess.pid}`); ytdl_ee.youtubeDlProcess.kill(); }, 3000); <- that works
		ytdl_ee.on("progress", (progress) => { this.dl_active.progress = progress; printf_dbg(`EVT(${ytdl_ee.youtubeDlProcess.pid})/PROGRESS:`, this.dl_active.progress.percent, progress.totalSize, progress.currentSpeed, progress.eta); }); // Object.assign({}, progress);
		ytdl_ee.on("youtubeDlEvent", (eventType, eventData) => {
			printf_dbg(`EVT(${ytdl_ee.youtubeDlProcess.pid})/youtubeDlEvent: '${eventType}' Data: '${eventData}'`);
			if ((eventType === 'download') && eventData.startsWith(LBL_DEST)) {
				this.dl_active.path = eventData.substr(LBL_DEST.length + ytdl.dl_dir_path.length);
				//this.dl_active.id = Array.from(this.dl_active.path.matchAll(/\(([0-9a-zA-Z\-]+)\)\.mp4/g), m => m[1])[0];
				this.dl_active.id = (/\(([0-9a-zA-Z\-]+)\)\.mp4/g).exec(this.dl_active.path)[1];
				printf_dbg(`Extracted path:`, this.dl_active.path, 'id:', this.dl_active.id);
			};
		});
		ytdl_ee.on("error", (error) => {
			printf_err(`EVT(${ytdl_ee.youtubeDlProcess.pid})/ERR:`, error);
			// TODO: write failed file_vids into the file
			this.next();
		});
		ytdl_ee.on("close", () => { printf_dbg(`EVT(${ytdl_ee.youtubeDlProcess.pid})/CLOSE: trying next...`); this.next(); });
	}
}
const ytdl = new Ytdl(ytdl_cfg_path);
const restype = {
	html: { 'Content-Type': 'text/html' },
	css:  { 'Content-Type': 'text/css' },
	js:   { 'Content-Type': 'text/javascript' },
	json: { 'Content-Type': 'application/json' },
	icon: { 'Content-Type': 'image/x-icon' },
}

let favicon_data;
let req_seq = 0;
const LBL_DEST = ' Destination: ';
const LBL_RESUME = ' Resuming download at byte ';

function app_stop_cb() {
	process.stdout.write('\r'); // erase '^C' or any other crap from console
	printf('Yt-dl server is stopping...');
	server.close();
}

function err_page_tpl(head, msg) { return `<html><meta charset="utf-8" /><body style="text-align:center;"><h1>${head}</h1><hr><p>${msg}</p></body></html>`};
function send_error_resp(res) {
	res.writeHead(500, { 'Content-Type': 'text/html' });
	res.write(err_page_tpl('500: Internal Error','Erorr processing request'));
	res.end();
}
function send_404_resp(res) {
	res.writeHead(404, { 'Content-Type': 'text/html' });
	res.write(err_page_tpl('404: Not found','Requested file not found'));
	res.end();
}

function process_new_url(new_url) {
	//printf('Recv new_url:', new_url);
	const yt_url = url.parse(new_url, true);
	//printf('yt_url:', yt_url);
	let vid = yt_url;
	if (yt_url.hostname !== null) {
		try {
			if (yt_url.hostname.includes('youtu.be')) { vid = yt_url.pathname.split('/')[1]; };				// this one is a bit annoying, since it doesn't always allow dowlloading most preferable video format, so better parse it
			if (yt_url.hostname.includes('youtube.com')) { vid = yt_url.query.v; };							// psrsing this one is not necessary, let's just leave it as an example
		} catch (e) { printf_err(e); };
	};//if(hostname !== null)
	printf_dbg('final vid:', vid);
	return ytdl.addFile(vid);
}
function server_req_handler (req, res) {
	++req_seq;
	let request = url.parse(req.url, true); //printf_dbg('req.url:', req.url, 'req.url.parsed:', request);
	//printf(`request.pathname: '${request.pathname}'`, `web_root: '${web_root}'`, 'startsWith:', request.pathname.startsWith(web_root));
	if ((web_root.length > 0) && (request.pathname.startsWith(web_root))) { request.pathname = request.pathname.substr(web_root.length); } else { send_404_resp(res); return; };
	if (request.pathname.charAt(0) !== '/') { request.pathname = '/' + request.pathname; };
	let path = request.pathname.split('/'); //printf_dbg('path:', path);
	//printf(`request.pathname: '${request.pathname}'`, `path:`, path);
	//if (path[i] === undefined) { path[i] = ''; };
	const i = 1;
	switch (path[i]) {
		// TODO: for
		case '':				{ fs.readFile(__dirname + "/intf/index.html",				(err, data) => { if (err) { printf_err(err); send_404_resp(res); return; }; res.writeHead(200, restype.html); res.end(data); if (request.query.new_url !== undefined) { process_new_url(request.query.new_url); }; }); return; };
		case 'jquery.min.js':	{ fs.readFile(__dirname + "/intf/js/jquery-3.5.1.min.js",	(err, data) => { if (err) { printf_err(err); send_404_resp(res); return; }; res.writeHead(200, restype.js  ); res.end(data); }); return; };
		case 'style.css':		{ fs.readFile(__dirname + "/intf/style.css",				(err, data) => { if (err) { printf_err(err); send_404_resp(res); return; }; res.writeHead(200, restype.css ); res.end(data); }); return; };
		case 'images':			{ fs.readFile(__dirname + "/intf/images/" + path[i+1],		(err, data) => { if (err) { printf_err(err); send_404_resp(res); return; }; res.writeHead(200, restype.icon); res.end(data); }); return; };
		case 'favicon.ico':		{ res.writeHead(200, restype.icon); res.end(favicon_data); return; };
		//case 'test':			{ res.writeHead(200, restype.html); res.write('<html><body><p>Test passed.<br>Server: OK</p></body></html>'); res.end(); return; };
		case 'files_active':	{ res.writeHead(200, restype.json); res.end(`{"state": "OK", "req_seq":${req_seq}, "files":${JSON.stringify(ytdl.getActiveList())} }`); return; };
		case 'files_finished':	{ res.writeHead(200, restype.json); res.end(`{"state": "OK", "req_seq":${req_seq}, "files":${JSON.stringify(ytdl.getFinishedList())} }`); return; };
		case 'stats':			{ res.writeHead(200, restype.json); res.end(`{"state": "OK", "req_seq":${req_seq}, "files_active":${ytdl.getActiveNum()}, "files_finished":${ytdl.getFinishedNum()}}`); return; };
		case 'cmd':				{
			if (request.query.new_url !== undefined) {
				let sts = process_new_url(request.query.new_url);
				if (sts === 0) { sts = 'OK'; } else { sts = `ERR: ${sts}`; } ;
				res.writeHead(200, restype.json);
				res.end(`{"state": "${sts}", "req_seq":${req_seq} }`);
				return;
			};//if()
			break;
		};
		default: { break; }
	};//switch(req.url)

	send_404_resp(res);
}

function main (argv) {
	printf('Yt-dl server starting...');

	//printf('ytdl:', ytdl);
	favicon_data = fs.readFileSync(__dirname + "/intf/images/favicon.ico");

	process.once('SIGINT', () => { app_stop_cb('SIGINT'); } );
	process.once('SIGTERM', () => { app_stop_cb('SIGTERM') } );

	server.listen(web_port); //6 - listen for any incoming requests
	printf('Yt-dl server ready');

}; main(process.argv); //.catch(printf_err);

