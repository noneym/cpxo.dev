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
            `<strong>Get Contents of URL</strong>. URL: <code>${base}/api/clip?t=${T}</code>. Tap the arrow to expand: Method <strong>POST</strong>, Request Body <strong>File</strong>, pick the <strong>Clipboard</strong> variable. Add header <code>Content-Type</code> = <code>text/plain</code> and <code>X-Source</code> = <code>ios</code>.`,
            "<strong>Show Notification</strong> with text <em>Sent to Windows</em> (optional).",
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

      <Step n={4} title="Make it one tap">
        <p>
          Add both Shortcuts as widgets on the Lock Screen or Home Screen, or trigger them with the Action Button on iPhone 15 Pro and later.
          A <strong>Back Tap</strong> gesture (Settings, Accessibility, Touch, Back Tap) works well for <strong>Send to Windows</strong>.
        </p>
      </Step>

      <Step n={5} title="Test it">
        <p>Copy any text on the phone, run <strong>Send to Windows</strong>, then check the dashboard. With the Windows app running, the text is already on your PC clipboard and a notification shows the preview.</p>
      </Step>
    </Doc>
  );
}
