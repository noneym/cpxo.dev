# cpxo desktop (Windows)

Tray app for [cpxo.dev](https://cpxo.dev): two-way clipboard sync with your phone and
one-click file sharing. Electron, plain JavaScript, no native modules.

## Features

- Lives in the tray. Menu: Paste from phone now, Upload file..., Sync clipboard, Open dashboard, Settings, Quit.
- Clipboard sync: local clipboard changes are pushed to `POST /api/clip`; new clips from other
  devices are polled from `GET /api/clip?since=<id>&format=json` every 2 s, written to the Windows
  clipboard and announced with a notification.
- File upload: tray item, drag and drop onto the settings window, or Explorer right-click.
  Files below 100 MB go through `PUT /up` as a raw stream; larger files (up to the server limit, 4 GB by default) use
  `POST /api/files/presign`, a streaming PUT to storage and `POST /api/files/complete`.
  The share link is copied to the clipboard when the upload finishes.
- Settings window: server URL, API token (with a Test button that calls `GET /api/me`),
  launch at login, clipboard sync, notifications, Explorer context menu.
- Logs rotate in `%APPDATA%\cpxo\logs\cpxo.log`; settings live in `%APPDATA%\cpxo\settings.json`.

## Layout

```
desktop/
  package.json            scripts + electron-builder config
  scripts/icons.js        rasterizes assets/mark.svg -> assets/tray.png, build/icon.ico
  assets/                 mark.svg, mark-mono.svg, tray.png, icon.png (generated, committed)
  build/                  icon.ico, icon.png (generated, committed)
  src/main/
    index.js              app entry, single instance, windows, IPC, upload queue
    tray.js               tray icon + menu
    clipboard.js          clipboard watcher + server poller with backoff
    uploader.js           streaming uploads (direct and presigned)
    registry.js           Explorer context-menu registration via reg.exe
    settings-store.js     JSON settings in app.getPath('userData')
    api.js                small fetch client for the JSON endpoints
    logger.js             rotating file logger
    preload.js            contextBridge API for the renderer
  src/renderer/
    settings.html/css/js  settings window with drop zone
    progress.html/js      small progress toast for uploads above 10 MB
```

## Build

Requirements: Node 22, npm 10, Windows.

```powershell
cd desktop
npm install
npm run icons    # optional: regenerate tray.png / icon.ico from assets/mark.svg (needs sharp)
npm start        # run in development
npm run dist     # build dist/cpxo-setup-<version>.exe (NSIS, per-user install)
```

`npm run icons` uses `sharp` and `png-to-ico`; the generated PNG/ICO files are committed,
so `npm run dist` works without regenerating them.

## Explorer context menu

Enabling "Add Upload to cpxo to the Explorer right-click menu" in Settings writes this key for the
current user only (no admin rights needed):

```
HKCU\Software\Classes\*\shell\cpxo
  (Default)  = "Upload to cpxo and copy link"
  Icon       = <path to cpxo.exe>
  command\(Default) = "<path to cpxo.exe>" --upload "%1"
```

It is written with `reg add` from a child process (`src/main/registry.js`) and removed with
`reg delete` when the checkbox is turned off. When Explorer runs the command:

- if cpxo is already running, the single-instance lock hands the arguments to the running
  instance, which uploads the file and copies the link;
- otherwise the new process uploads the file and then stays in the tray.

In development (`npm start`) the registered command points at `electron.exe` plus the app
directory. The app re-points the command at the current executable on each start if the key
exists, so an updated install keeps working.

## Behaviour notes

- Without a token the tray shows "Not signed in" and opens Settings; uploads and sync are disabled.
- Network errors back off exponentially (2 s to 60 s) and are logged; the tray tooltip shows
  "server unreachable, retrying". A 401 stops sync and asks you to sign in again.
- Clips the app wrote itself and clips with `source: "windows"` are not echoed back.
- The last seen clip id is persisted, so a restart does not replay old clips.
