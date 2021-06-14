'use strict';

const fs = require('fs');
//const evt = require('events');
//const os = require('os');
//const util = require('util');
//const crypto = require('crypto');
//const readline = require('readline');
//const net = require('net');

let silent = false;
let debug = false;
function setSilent(mode) { silent = !!mode; };
function setDebug(mode) { debug = !!mode; };

function timestamp() { let d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().replace(/[TZ]/g,' '); };
function printf(...msg) { if (!silent) console.log(timestamp()+'|', ...msg); };
function printf_err(...msg) { console.error(timestamp()+'|', ...msg); };
function printf_dbg(...msg) { if (debug) console.log(timestamp()+'|', ...msg); };
function getChar() {
	let buffer = Buffer.alloc(1)
	fs.readSync(0, buffer, 0, 1)
	return buffer.toString('utf8')
}
function pause(msg) {
	process.stdin.setRawMode(true);
	process.stdout.write(msg);
	getChar();
	process.stdin.setRawMode(false);
}
function delay_ms(ms) { return new Promise((resolve) => { setTimeout(resolve, ms); }); }

module.exports = {
	timestamp,
	printf,
	printf_err,
	printf_dbg,
	pause,
};
