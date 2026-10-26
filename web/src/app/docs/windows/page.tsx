import { Doc, Step } from "@/components/Doc";
import { CodeBlock } from "@/components/CodeBlock";
import { config } from "@/lib/config";

export default function WindowsDoc() {
  const base = config.appUrl;
  return (
    <Doc
      active="/docs/windows"
      title="The Windows tray app."
      lead="A small Electron app that lives in the tray. It syncs your clipboard both ways and uploads files from the Explorer right-click menu."
    >
      <Step n={1} title="Install">
        <p>
          Download <a className="text-lime hover:underline" href="https://github.com/noneym/cpxo.dev/releases/latest">cpxo-setup.exe</a> from GitHub Releases and run it.
          Windows SmartScreen may warn because the installer is not code-signed yet. Choose <strong>More info</strong>, then <strong>Run anyway</strong>.
        </p>
        <p>Or build it yourself:</p>
        <CodeBlock code={`git clone https://github.com/noneym/cpxo.dev.git
cd cpxo.dev/desktop
npm install
npm run dist   # dist/cpxo-setup-*.exe`} />
      </Step>

      <Step n={2} title="Sign in">
        <p>Open the tray icon, choose <strong>Settings</strong>, paste your token from the dashboard and press <strong>Test</strong>. The server URL stays <code>{base}</code>.</p>
      </Step>

      <Step n={3} title="Clipboard sync">
        <p>
          Everything you copy on Windows is sent to cpxo. Anything that arrives from your phone or a shell is placed on the clipboard and shown as a notification.
          Turn it off any time with <strong>Sync clipboard</strong> in the tray menu.
        </p>
      </Step>

      <Step n={4} title="Upload and copy link">
        <p>
          Three ways: right-click any file in Explorer and pick <strong>Upload to cpxo and copy link</strong>, use <strong>Upload file</strong> in the tray menu, or drop files onto the settings window.
          The share link is on your clipboard when the upload finishes.
        </p>
        <p>The Explorer menu item is registered only for your user account (HKCU). Untick <strong>Explorer context menu</strong> in Settings to remove it.</p>
      </Step>
    </Doc>
  );
}
