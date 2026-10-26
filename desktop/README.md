# cpxo desktop (Windows and macOS)

Tray app for [cpxo.dev](https://cpxo.dev): two-way clipboard sync with your phone and
one-click file sharing. Electron, plain JavaScript, no native modules.

## Features

- Lives in the tray (Windows) or the menu bar (macOS). Menu: Paste from phone now, Upload file..., Sync clipboard, Open dashboard, Settings, Quit.
- Clipboard sync: local clipboard changes are pushed to `POST /api/clip`; new clips from other
  devices are polled from `GET /api/clip?since=<id>&format=json` every 2 s, written to the system
  clipboard and announced with a notification.
- File upload: tray item, drag and drop onto the settings window, Explorer right-click (Windows),
  Finder "Open With" or a drop on the Dock icon (macOS), or file paths on the command line.
  Files below 100 MB go through `PUT /up` as a raw stream; larger files (up to the server limit, 4 GB by default) use
  `POST /api/files/presign`, a streaming PUT to storage and `POST /api/files/complete`.
  The share link is copied to the clipboard when the upload finishes.
- Settings window: server URL, API token (with a Test button that calls `GET /api/me`),
  launch at login, clipboard sync, notifications, Explorer context menu (Windows only).
- Logs rotate in `<userData>/logs/cpxo.log`; settings live in `<userData>/settings.json`, where
  `<userData>` is `%APPDATA%\cpxo` on Windows and `~/Library/Application Support/cpxo` on macOS.

## Layout

```
desktop/
  package.json            scripts + electron-builder config
  scripts/icons.js        rasterizes assets/mark.svg -> tray.png, build/icon.ico, build/icon.png (1024px)
                          and assets/mark-mono.svg -> assets/trayTemplate.png (macOS menu bar)
  assets/                 mark.svg, mark-mono.svg, tray.png, trayTemplate.png, icon.png (generated, committed)
  build/                  icon.ico, icon.png (generated, committed; electron-builder makes icon.icns from icon.png)
  src/main/
    index.js              app entry, single instance, windows, IPC, upload queue
    tray.js               tray icon + menu
    clipboard.js          clipboard watcher + server poller with backoff
    uploader.js           streaming uploads (direct and presigned)
    registry.js           Explorer context-menu registration via reg.exe (no-op outside Windows)
    settings-store.js     JSON settings in app.getPath('userData')
    api.js                small fetch client for the JSON endpoints
    logger.js             rotating file logger
    preload.js            contextBridge API for the renderer
  src/renderer/
    settings.html/css/js  settings window with drop zone
    progress.html/js      small progress toast for uploads above 10 MB
```

## Build

Requirements: Node 22, npm 10. The Windows installer is built on Windows, the macOS dmg on a Mac.

```powershell
cd desktop
npm install
npm run icons      # optional: regenerate the PNG/ICO icons from assets/*.svg (needs sharp)
npm start          # run in development
npm run dist       # Windows: build dist/cpxo-setup-<version>.exe (NSIS, per-user install)
npm run dist:win   # same as dist
npm run dist:mac   # macOS: build dist/cpxo-<version>-mac-{arm64,x64}.dmg and .zip
```

`npm run icons` uses `sharp` and `png-to-ico`; the generated PNG/ICO files are committed,
so `npm run dist` works without regenerating them.

## macOS

Build on a Mac with `npm run dist:mac` (Intel and Apple Silicon dmg + zip). electron-builder
turns `build/icon.png` into the `.icns` itself, so no Xcode tooling is needed.

- The app is **ad-hoc signed, not notarized** (`scripts/afterPack.js` runs `codesign --sign -`;
  without any signature Apple Silicon reports the app as "damaged"). On first launch Gatekeeper
  still warns: right-click `cpxo.app` and choose Open, or clear the quarantine flag once:
  `xattr -d com.apple.quarantine /Applications/cpxo.app`. If an older build already says
  "damaged": `xattr -cr /Applications/cpxo.app && codesign --force --deep --sign - /Applications/cpxo.app`.
- cpxo is a menu bar app (`LSUIElement`): no Dock icon, no Cmd+Tab entry. The Dock icon appears
  only while the Settings window is open. Closing Settings leaves the app running in the menu
  bar; quit from the menu bar menu (Quit).
- Upload from Finder: right-click any file, Open With, cpxo. The app registers a catch-all
  document type (`public.item`) so it is offered for every file type. Dropping files on the
  Dock icon (while visible) and `open -a cpxo <file>` upload the same way; the link is copied
  when the upload finishes.
- Launch at login uses `app.setLoginItemSettings({ openAtLogin, openAsHidden: true })`; it is
  applied only in the installed app (System Settings, General, Login Items lists it as cpxo).
- The menu bar icon is a Template image (`assets/trayTemplate.png`, `@2x`), so it follows the
  light/dark menu bar automatically.
- Settings and logs live in `~/Library/Application Support/cpxo/`.

## Explorer context menu (Windows)

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
- Clips the app wrote itself and clips from this machine's own source are not echoed back. The app
  reports `source: "windows"` on Windows and `source: "mac"` on macOS.
- The last seen clip id is persisted, so a restart does not replay old clips.
