import type { Metadata } from "next";
import Link from "next/link";
import { Legal, Section, CONTACT_EMAIL } from "@/components/Legal";
import { config, maxFileLabel } from "@/lib/config";

export const metadata: Metadata = {
  title: "Terms of Service · cpxo",
  description: "The rules for using cpxo and its developer tools.",
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <Legal title="Terms of Service" updated="November 5, 2026">
      <Section title="The service">
        <p>
          cpxo (<Link href="/">cpxo.dev</Link>) syncs clipboard text between your devices, shares files through
          expiring links, and offers developer tools such as MCP connectors, including one for Google Analytics and
          Google Search Console. By creating an account or using any of these you agree to these terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section title="Your account">
        <ul>
          <li>Use a real e-mail address you control, and keep your password and API tokens secret. Anything done with your token counts as done by you.</li>
          <li>You must be at least 16 years old.</li>
          <li>One person per account. Do not resell access.</li>
        </ul>
      </Section>

      <Section title="Your content">
        <p>
          You keep all rights to the text and files you put on cpxo. You give us only the permission needed to
          store them, sync them to your devices and serve them to people you share a link with. Files expire after{" "}
          {config.fileTtlDays} days and a single upload can be up to {maxFileLabel}.
        </p>
      </Section>

      <Section title="Acceptable use">
        <p>Do not use cpxo to:</p>
        <ul>
          <li>share malware, phishing pages or anything illegal where you or we are;</li>
          <li>share content that infringes someone else&apos;s rights, or sexual content involving minors;</li>
          <li>attack, overload or probe the service, or get around its limits;</li>
          <li>access Google or other third-party accounts you are not authorized to manage.</li>
        </ul>
        <p>
          We may remove content or suspend accounts that break these rules. Report abuse to{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>

      <Section title="Google connector">
        <p>
          The Google Analytics and Search Console connector acts on the Google account you authorize, with the
          permissions you grant. You are responsible for the changes you make through it (for example creating or
          deleting properties) and for following Google&apos;s own terms. You can revoke its access at any time at{" "}
          <a href="https://myaccount.google.com/permissions" rel="noopener">myaccount.google.com/permissions</a>.
        </p>
      </Section>

      <Section title="Availability and changes">
        <p>
          We work to keep cpxo running but do not promise it will always be available or free of errors. Features
          and limits may change. Do not use it as the only copy of anything important.
        </p>
      </Section>

      <Section title="Ending">
        <p>
          You can stop using cpxo and ask us to delete your account at any time. We may end or suspend access for
          breaking these terms, and will usually warn you first unless the problem is serious.
        </p>
      </Section>

      <Section title="Liability">
        <p>
          cpxo is provided &quot;as is&quot;. To the extent the law allows, we are not liable for indirect or
          consequential losses, or for lost data, and our total liability is limited to the amount you paid us in
          the 12 months before the claim.
        </p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          When these terms change, the date above changes too. For significant changes we will tell account holders
          by e-mail before they take effect. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </Legal>
  );
}
