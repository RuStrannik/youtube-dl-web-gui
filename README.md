# Web GUI Server for YouTube Downloader Tool
Node.js based solution inspired by Transmission web-interface. Suitable for Windows and Linux

![sample](sample_screen.png)

Note: since `youtube-dl` is essentially a python script, there is similar [native python-based web gui server](https://github.com/d0u9/youtube-dl-webui).

## Installation:
1. Make sure [youtube-dl](https://youtube-dl.org) is installed
2. Make sure [Node.js](https://nodejs.org) is installed
3. Install dependency: 
	- `npm install youtube-dl-wrap`
4. Unpack contents of this repository into your preferred folder 
	- `git clone https://github.com/SerenityIslandEngineering/ytdl-web-gui.git`
5. Configure youtube-dl:
 	- Create file `/etc/youtube-dl.conf`, containing the following:
```bash
# Required, for now, for effective downloads management:
--output '/your/folder/%(uploader)s-%(upload_date)s-(%(title).20s)-%(height)dp%(fps)d-(%(id)s).%(ext)s'
--download-archive /your/folder/ytdl.arch

# Optional:
--no-part
--restrict-filenames
-f '(mp4)[height<=720]'
```
6. Check that path to youtube-dl config is correct:
	- `ytdl_cfg_path = '/etc/youtube-dl.conf'` 
7. Check that path to youtube-dl is correct:
	- `ytdl_path = '/your/path/youtube-dl'` 
8. Start the server:
	- `node ytdl-web.js`
9. By default, server is waiting for connections at `localhost:8001`

---
NOTE: 
- Supported running through reverse proxy like nginx under subdirectory. (ex. https://example.com/ytdl-web-gui )
	- required changing variable: `web-root = '/ytdl-web-gui'`
	- required nginx config: 
	```nginx
        location /ytdl-web-gui {
                location = /ytdl-web-gui { return 301 /ytdl-web-gui/; } # adds trailing slash only for 1st lvl path
                proxy_set_header Host $host;
                proxy_set_header X-Real-IP $remote_addr;
                proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                proxy_pass http://localhost:8001;
		}
	```


## TODO:
- [ ] Convenient download type selector (ex: mp3 / mp4 / etc)
- [ ] Interactive downloads mangement (pause/stop download, remove record, remove file, filter downloads, etc)
- [ ] Download details (date added, thumbnail, full url, full title, uploader, etc)
- [ ] npm package ytdl-web-gui for quickest install and auto-config
- [ ] play file? (ex: calls web-player, that remember last played positions)
