import type { Metadata } from "next";
import Link from "next/link";
import { Legal, Section, CONTACT_EMAIL } from "@/components/Legal";
import { config } from "@/lib/config";

export const metadata: Metadata = {
  title: "Privacy Policy · cpxo",
  description: "What cpxo stores, why, for how long, and how to get it deleted.",
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <Legal title="Privacy Policy" updated="November 5, 2026">
      <Section title="Who we are">
        <p>
          cpxo (<Link href="/">cpxo.dev</Link>) is a clipboard and file-drop service for iPhone, Mac, Windows and the
          shell, plus a small set of developer tools built by the same team, including an MCP connector for Google
          Analytics and Google Search Console. This policy covers all of them. Questions go to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="What we store">
        <ul>
          <li><strong>Account:</strong> your e-mail address, a bcrypt hash of your password, and when you verified your e-mail.</li>
          <li><strong>Sign-in sessions and API tokens:</strong> random identifiers that keep you signed in and let your devices, the CLI and MCP clients act for you, with the time each token was last used.</li>
          <li><strong>Clipboard entries:</strong> the text you send, which device sent it and when. Each account keeps up to {config.maxClips.toLocaleString("en-US")} entries; older ones are trimmed.</li>
          <li><strong>Files:</strong> the files you upload, their name, size and type, and a download counter. Files are deleted automatically {config.fileTtlDays} days after upload, or earlier if you delete them.</li>
          <li><strong>Server logs:</strong> IP address, user agent and request path, kept briefly to run and protect the service.</li>
        </ul>
        <p>We do not sell data, show ads, or use third-party analytics or tracking cookies. The only cookie is the session cookie that keeps you signed in.</p>
      </Section>

      <Section title="Google user data">
        <p>
          Our Google connector (an MCP server) lets the account owner read and manage their own Google Analytics and
          Google Search Console properties from an AI assistant. When you authorize it, Google asks you to grant
          access to:
        </p>
        <ul>
          <li>Google Analytics: read reports, and create or edit accounts, properties, data streams and user access (<code>analytics.readonly</code>, <code>analytics.edit</code>, <code>analytics.manage.users</code>, <code>analytics.provision</code>).</li>
          <li>Google Search Console: list and add sites, read search performance, submit sitemaps and inspect URLs (<code>webmasters</code>).</li>
          <li>Site Verification: get and confirm site ownership tokens (<code>siteverification</code>).</li>
        </ul>
        <p>
          <strong>How it is used.</strong> Data from these APIs is fetched only when you, through your own AI
          assistant, call one of the connector&apos;s tools, and is returned only to you. We do not store reports or
          other Google data; the only thing kept is the OAuth refresh token, on the server you deploy it to, so the
          connector can act for you.
        </p>
        <p>
          <strong>Limited Use.</strong> cpxo&apos;s use and transfer of information received from Google APIs adheres to
          the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" rel="noopener">
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements. Google user data is not sold, not used for advertising, not
          used to train AI models, and not shared with anyone except as needed to provide the features you asked
          for, to comply with law, or with your explicit consent. No human reads it unless you ask us to for
          support, it is needed for security, or the law requires it.
        </p>
        <p>
          <strong>Revoking access.</strong> You can remove the connector&apos;s access at any time at{" "}
          <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>.
          The stored refresh token then stops working.
        </p>
      </Section>

      <Section title="Who processes data for us">
        <ul>
          <li>Dedicated servers we rent in the European Union run the app, the database and the file storage.</li>
          <li>Cloudflare protects the site, checks sign-up forms (Turnstile) and sends our e-mails.</li>
        </ul>
        <p>Each of them handles data only to provide that service to us.</p>
      </Section>

      <Section title="Security">
        <p>
          Everything travels over HTTPS (TLS 1.3). Clipboard entries are stored encrypted with AES-256-GCM, and the key is kept outside the database. Passwords are hashed, files are served through short-lived signed links,
          and every API call is tied to your token. Anyone holding a share link can download that file until it
          expires, so share links with care.
        </p>
      </Section>

      <Section title="Your choices and rights">
        <ul>
          <li>Delete clips and files from the dashboard at any time.</li>
          <li>Revoke API tokens from the dashboard.</li>
          <li>
            Ask for a copy of your data, a correction, or deletion of your whole account by writing to{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account&apos;s e-mail address. We answer
            within 30 days. Deleting an account removes its clips, files, tokens and sessions.
          </li>
        </ul>
      </Section>

      <Section title="Children">
        <p>cpxo is not meant for children under 16 and we do not knowingly collect their data.</p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the date above changes with it. For changes that matter, we will also tell
          account holders by e-mail before they take effect.
        </p>
      </Section>
    </Legal>
  );
}
