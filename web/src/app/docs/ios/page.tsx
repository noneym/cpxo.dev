import { Doc, Step, Actions } from "@/components/Doc";
import { CodeBlock } from "@/components/CodeBlock";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { signedShortcutsAvailable } from "@/lib/shortcuts";

export const dynamic = "force-dynamic";

export default async function IosDoc() {
  const user = await currentUser();
  const token = user ? (await prisma.apiToken.findFirst({ where: { userId: user.id }, orderBy: { id: "asc" } }))?.token : null;
  const T = token ?? "cpx_YOURTOKEN";
  const base = config.appUrl;
  const signed = signedShortcutsAvailable();

  return (
    <Doc
      active="/docs/ios"
      title="Two Shortcuts on your iPhone."
      lead="Nothing to install from the App Store. The Shortcuts app sends your clipboard to cpxo and pulls it back. Takes about four minutes."
    >
      {signed ? (
        <Step n={1} title="Add the two Shortcuts">
          <p>Open these on your iPhone and tap <strong>Add Shortcut</strong>. They are signed, so iOS installs them directly.</p>
          <p>
            <strong>Send to Windows</strong> sends whatever is on the clipboard: text becomes a clip, a copied photo or file is uploaded and its link becomes the clip (and is copied back to your iPhone).
            It also appears in the Share Sheet, so you can share a photo or a file straight from Photos or Files.
          </p>
          <div className="flex flex-wrap gap-3">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/s/send" className="btn btn-primary" download>Add: Send to Windows</a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/s/get" className="btn btn-ghost" download>Add: Get from Windows</a>
          </div>
          <p>
            On the first run each Shortcut asks for your token and saves it in the Shortcuts folder (<code>iCloud Drive/Shortcuts/cpxo/token.txt</code>). Your token:
          </p>
          <CodeBlock code={T} />
          {!token && <p className="text-sm">Sign in and this page fills in your real token.</p>}
          <p>That is all. Steps 2 and 3 below are only for building the Shortcuts by hand.</p>
        </Step>
      ) : (
        <Step n={1} title="Copy your push URL">
          <p>The URL carries your token, so the Shortcut needs no headers. Keep it private like a password.</p>
          <CodeBlock title="push and pull URL (same URL, different method)" code={`${base}/api/clip?t=${T}`} />
          {!token && <p className="text-sm">Sign in and this page fills in your real token.</p>}
        </Step>
      )}

      <Step n={2} title={signed ? "Build it yourself: Send to Windows" : "Shortcut A: Send to Windows"}>
        <p>Open <strong>Shortcuts</strong>, tap <strong>+</strong>, name it <strong>Send to Windows</strong>, then add these actions in order:</p>
        <Actions
          items={[
            "<strong>Get Clipboard</strong>",
            `<strong>Get Contents of URL</strong>. URL: <code>${base}/api/drop?t=${T}</code>. Tap the arrow to expand: Method <strong>POST</strong>, Request Body <strong>File</strong>, pick the <strong>Clipboard</strong> variable. Add header <code>X-Source</code> = <code>ios</code>. Text becomes a clip; a photo or file is uploaded and the link is returned.`,
            "<strong>Copy to Clipboard</strong> with the <strong>Contents of URL</strong> variable (so a file link lands on your iPhone clipboard too).",
            "<strong>Show Notification</strong> with the <strong>Contents of URL</strong> variable (optional).",
          ]}
        />
        <p>Add it to the Home Screen or the Share Sheet (Shortcut settings, toggle <strong>Show in Share Sheet</strong>) and you can send any selected text straight from Safari too.</p>
      </Step>

      <Step n={3} title={signed ? "Build it yourself: Get from Windows" : "Shortcut B: Get from Windows"}>
        <p>New Shortcut named <strong>Get from Windows</strong>:</p>
        <Actions
          items={[
            `<strong>Get Contents of URL</strong>. URL: <code>${base}/api/clip?t=${T}</code>. Method <strong>GET</strong>.`,
            "<strong>Copy to Clipboard</strong> with the <strong>Contents of URL</strong> variable.",
            "<strong>Show Notification</strong> with the same variable so you see what landed (optional).",
          ]}
        />
        <p>The response is plain text, exactly what Windows last copied. If nothing was ever copied, the request returns empty.</p>
      </Step>

      <Step n={4} title="Make it one tap, or automatic-ish">
        <p>
          iOS does not let any app or Shortcut watch the clipboard in the background, so there is no fully automatic sync on the phone. These get close:
        </p>
        <Actions
          items={[
            "<strong>Back Tap</strong>: Settings, Accessibility, Touch, Back Tap, Double Tap, pick <em>Send to Windows</em>. Copy, tap the back of the phone twice, done.",
            "<strong>Action Button</strong> (iPhone 15 Pro and later) or a Lock Screen widget for either Shortcut.",
            "<strong>Automation on app close</strong>: Shortcuts, Automation, <em>App</em>, choose Safari, Notes, Messages (whatever you copy from), <em>Is Closed</em>, run <em>Send to Windows</em>, turn on <em>Run Immediately</em>. Whatever is on the clipboard when you leave the app is sent.",
            "<strong>Automation on a timer</strong>: Shortcuts, Automation, <em>Time of Day</em>, repeat every 15 minutes, run <em>Send to Windows</em>. The server ignores a clip identical to the last one, so this does not flood your history.",
            "For automations, set Settings, Shortcuts, <strong>Paste from Other Apps</strong> to <em>Allow</em>, otherwise iOS asks for permission every run.",
          ]}
        />
        <p>
          If you also use a Mac: Apple&apos;s Universal Clipboard already moves copies from the iPhone to the Mac. Paste once on the Mac and the cpxo Mac app forwards it to Windows.
        </p>
      </Step>

      <Step n={5} title="Test it">
        <p>Copy any text on the phone, run <strong>Send to Windows</strong>, then check the dashboard. With the Windows app running, the text is already on your PC clipboard and a notification shows the preview.</p>
      </Step>
    </Doc>
  );
}
