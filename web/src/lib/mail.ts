// Transactional email through Cloudflare Email Service (REST API).
// Disabled (returns false, logs the link) until CF_EMAIL_API_TOKEN and CF_ACCOUNT_ID are set.
import { config } from "./config";

const token = process.env.CF_EMAIL_API_TOKEN || process.env.CLOUDFLARE_EMAIL_API_TOKEN || "";
const account = process.env.CF_ACCOUNT_ID || process.env.CLOUDFLARE_EMAIL_ACCOUNT_ID || "";
const baseUrl = (process.env.CLOUDFLARE_EMAIL_BASE_URL || "https://api.cloudflare.com/client/v4").replace(/\/$/, "");
const from = process.env.MAIL_FROM ?? "cpxo <no-reply@cpxo.dev>";

export const mailEnabled = Boolean(token && account);

function layout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#0b0d10;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#f3f2ec">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px">
    <div style="font-weight:700;font-size:22px;letter-spacing:-0.04em;margin-bottom:28px">cp<span style="color:#d6ff3f">x</span>o</div>
    <h1 style="font-size:22px;margin:0 0 12px">${title}</h1>
    <div style="font-size:15px;line-height:1.6;color:#c9cfd6">${bodyHtml}</div>
    ${cta ? `<p style="margin:28px 0"><a href="${cta.url}" style="display:inline-block;background:#d6ff3f;color:#0b0d10;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:999px">${cta.label}</a></p>
    <p style="font-size:12px;color:#9aa3ad;word-break:break-all">Or open this link: ${cta.url}</p>` : ""}
    <p style="font-size:12px;color:#9aa3ad;margin-top:32px">cpxo.dev. If you did not request this, ignore this email.</p>
  </div></body></html>`;
}

export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!mailEnabled) {
    console.log(`[mail disabled] to=${to} subject=${subject}\n${text}`);
    return false;
  }
  const r = await fetch(`${baseUrl}/accounts/${account}/email/sending/send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html, text }),
  });
  if (!r.ok) {
    console.error("[mail] send failed", r.status, (await r.text()).slice(0, 300));
    return false;
  }
  return true;
}

export function sendVerificationMail(to: string, tokenValue: string) {
  const url = `${config.appUrl}/verify?token=${tokenValue}`;
  return sendMail(
    to,
    "Confirm your cpxo email",
    layout("Confirm your email", "One tap and your account is ready: clipboard sync and file links on every device.", { label: "Confirm email", url }),
    `Confirm your cpxo email: ${url}`
  );
}

export function sendResetMail(to: string, tokenValue: string) {
  const url = `${config.appUrl}/reset?token=${tokenValue}`;
  return sendMail(
    to,
    "Reset your cpxo password",
    layout("Reset your password", "This link works for one hour.", { label: "Choose a new password", url }),
    `Reset your cpxo password: ${url}`
  );
}
