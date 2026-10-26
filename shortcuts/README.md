# iOS Shortcuts

`build.py` generates the two Shortcuts as unsigned `.shortcut` files (binary plists):

- `cpxo-send-to-windows.shortcut`: Get Clipboard, POST to `/api/clip`, notification
- `cpxo-get-from-windows.shortcut`: GET `/api/clip`, Copy to Clipboard, notification

Both read the token from iCloud Drive `Shortcuts/cpxo/token.txt` and ask for it on the first run.

## Signing (needs a Mac signed into iCloud)

iOS only installs signed shortcut files, and Apple's `shortcuts sign` refuses to run without an
iCloud session, so this cannot happen on CI. On a Mac:

```bash
python3 shortcuts/build.py
shortcuts sign --mode anyone --input shortcuts/cpxo-send-to-windows.shortcut --output web/public/s/cpxo-send-to-windows.shortcut
shortcuts sign --mode anyone --input shortcuts/cpxo-get-from-windows.shortcut --output web/public/s/cpxo-get-from-windows.shortcut
git add web/public/s && git commit -m "Signed iOS shortcuts" && git push
```

Once both files exist in `web/public/s/`, the iPhone docs page shows "Add to iPhone" buttons and
`/s/send`, `/s/get` serve them. Without them the page shows the manual build steps.

## No Mac?

Build the Shortcut once on an iPhone following `/docs/ios`, then Share, "Copy iCloud Link", and put the
`icloud.com/shortcuts/...` links in `web/src/app/docs/ios/page.tsx` in place of the `/s/` links.
