/** Cloudflare Turnstile server-side verification. Disabled when no secret is configured. */
/** Site key read at request time (not inlined at build), so it works with runtime env on the host. */
export const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY || process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";
export const turnstileEnabled = Boolean(process.env.TURNSTILE_SECRET_KEY && turnstileSiteKey);

export async function verifyTurnstile(token: string | undefined, ip?: string | null): Promise<boolean> {
  if (!turnstileEnabled) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
    if (ip) body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const data = (await r.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
