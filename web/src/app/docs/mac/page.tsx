import { Doc, Step } from "@/components/Doc";
import { CodeBlock } from "@/components/CodeBlock";
import { config } from "@/lib/config";

const RELEASES = "https://github.com/noneym/cpxo.dev/releases/latest";

export default function MacDoc() {
  const base = config.appUrl;
  return (
    <Doc
      active="/docs/mac"
      title="The Mac menu bar app."
      lead="Same app as on Windows: lives in the menu bar, syncs your clipboard both ways, uploads files from Finder. Apple Silicon and Intel builds."
    >
      <Step n={1} title="Install">
        <p>
          Download the dmg from <a className="text-lime hover:underline" href={RELEASES}>GitHub Releases</a>: <code>cpxo-x.y.z-mac-arm64.dmg</code> for M1 and later,
          <code>cpxo-x.y.z-mac-x64.dmg</code> for Intel Macs. Drag cpxo to Applications.
        </p>
        <p>
          The build is not notarized, so the first launch is blocked by Gatekeeper. Either right-click the app and choose <strong>Open</strong>, or run:
        </p>
        <CodeBlock code={`xattr -d com.apple.quarantine /Applications/cpxo.app`} />
      </Step>

      <Step n={2} title="Sign in">
        <p>Click the cpxo icon in the menu bar, choose <strong>Settings</strong>, paste your token from the dashboard and press <strong>Test</strong>. The server URL stays <code>{base}</code>.</p>
      </Step>

      <Step n={3} title="Clipboard sync">
        <p>
          Everything you copy on the Mac is sent to cpxo. Anything from your phone, Windows or a shell lands on the Mac clipboard with a notification.
          Toggle it with <strong>Sync clipboard</strong> in the menu.
        </p>
      </Step>

      <Step n={4} title="Upload and copy link">
        <p>
          Right-click a file in Finder, <strong>Open With</strong>, <strong>cpxo</strong>. Or drop files on the Dock icon, on the settings window, or use <strong>Upload file</strong> in the menu.
          The share link is on your clipboard when the upload finishes.
        </p>
        <p>From a terminal:</p>
        <CodeBlock code={`open -a cpxo ~/Desktop/report.pdf`} />
      </Step>
    </Doc>
  );
}
