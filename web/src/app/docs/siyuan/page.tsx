import { Doc, Step } from "@/components/Doc";
import { CodeBlock } from "@/components/CodeBlock";
import { config } from "@/lib/config";

export default function SiyuanDoc() {
  return (
    <Doc
      active="/docs/siyuan"
      title="Share from SiYuan notes."
      lead="A small plugin for the SiYuan note app. Any image or attachment in your notes gets a 7-day share link with one click, and the link lands on your clipboard and every synced device."
    >
      <Step n={1} title="Install the plugin">
        <p>
          Download <a className="text-lime hover:underline" href="https://github.com/noneym/cpxo.dev/releases/latest">cpxo-siyuan-&lt;version&gt;.zip</a> from GitHub Releases and extract it into your workspace:
        </p>
        <CodeBlock code={`<workspace>/data/plugins/cpxo-siyuan/
  plugin.json  index.js  icon.png  README.md  i18n/`} />
        <p>
          Restart SiYuan or reload the window, then enable it under <strong>Settings → Marketplace → Downloaded → Plugins</strong>. Desktop, browser and mobile frontends all work.
        </p>
      </Step>

      <Step n={2} title="Paste your token">
        <p>
          Open the plugin&apos;s settings (the gear next to it in the Downloaded list) and paste the API token from your dashboard. <strong>Test connection</strong> shows the account it signed in as.
          The server stays <code>{config.appUrl}</code> unless you self-host.
        </p>
      </Step>

      <Step n={3} title="Upload and copy link">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Image</strong>: click it, open its menu, choose <strong>Upload to cpxo and copy link</strong>.</li>
          <li><strong>Attachment</strong>: click a link to a file in <code>assets/</code>, same item.</li>
          <li><strong>Block menu</strong>: click the block icon (or select several blocks). Every image, file, video and audio inside is uploaded and the links are copied, one per line.</li>
        </ul>
        <p>
          The file goes to cpxo as it is stored in your workspace, keeps its name, and expires after {config.fileTtlDays} days like every upload. The link is also saved as a clip, so your Mac, Windows PC and iPhone get it too.
        </p>
      </Step>

      <Step n={4} title="Build it yourself">
        <CodeBlock code={`git clone https://github.com/noneym/cpxo.dev.git
cd cpxo.dev/siyuan
npm ci
npm run build   # dist/cpxo-siyuan-<version>.zip`} />
      </Step>
    </Doc>
  );
}
