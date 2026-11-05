// Clipboard entries are stored encrypted (AES-256-GCM). The key comes from
// CLIP_KEY (32 bytes, base64 or hex) or, when that is unset, is derived from
// SESSION_SECRET with HKDF. It never touches the database. Changing either
// secret makes the stored clips unreadable. Each row
// has its own random IV, and the user id is bound in as associated data, so a
// ciphertext copied to another user's row does not decrypt.
//
// Stored format: "e1:" + base64(iv[12] | tag[16] | ciphertext).
// Rows without the prefix are legacy plaintext; they are still readable and
// encryptLegacyClips() converts them at startup.
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { prisma } from "./db";

const PREFIX = "e1:";

function loadKey(): Buffer | null {
  const raw = (process.env.CLIP_KEY ?? "").trim();
  if (!raw) {
    const secret = (process.env.SESSION_SECRET ?? "").trim();
    if (secret.length < 16) return null;
    return Buffer.from(hkdfSync("sha256", secret, "cpxo", "clip-encryption-v1", 32));
  }
  const buf = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("CLIP_KEY must be 32 bytes (base64 or 64 hex chars)");
  return buf;
}

const key = loadKey();
if (!key) console.warn("[clipcrypt] neither CLIP_KEY nor SESSION_SECRET is set: clipboard entries are stored as plain text");

export const clipEncryption = !!key;

export function sealClip(userId: number, text: string): string {
  if (!key) return text;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(`clip:${userId}`));
  const ct = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return PREFIX + Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function openClip(userId: number, stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext
  if (!key) return "[encrypted: CLIP_KEY missing on the server]";
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64");
    const d = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
    d.setAAD(Buffer.from(`clip:${userId}`));
    d.setAuthTag(buf.subarray(12, 28));
    return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return "[encrypted: cannot decrypt]";
  }
}

type Row = { id: number; userId: number; text: string; source: string; createdAt: Date };

/** A clip row with its text decrypted. */
export function plainClip<T extends Row>(row: T): T {
  return { ...row, text: openClip(row.userId, row.text) };
}

/** Latest clip of a user, decrypted. */
export async function latestClip(userId: number) {
  const row = await prisma.clip.findFirst({ where: { userId }, orderBy: { id: "desc" } });
  return row ? plainClip(row) : null;
}

/** Stores a clip encrypted; returns the row with plain text. */
export async function createClip(userId: number, text: string, source: string) {
  const row = await prisma.clip.create({ data: { userId, text: sealClip(userId, text), source } });
  return { ...row, text };
}

/** Encrypts rows written before CLIP_KEY was set. Runs in batches; safe to repeat. */
export async function encryptLegacyClips() {
  if (!key) return 0;
  let done = 0;
  for (;;) {
    const rows = await prisma.clip.findMany({
      where: { NOT: { text: { startsWith: PREFIX } } },
      select: { id: true, userId: true, text: true },
      orderBy: { id: "asc" },
      take: 200,
    });
    if (!rows.length) return done;
    for (const r of rows) {
      await prisma.clip.updateMany({ where: { id: r.id, text: r.text }, data: { text: sealClip(r.userId, r.text) } });
    }
    done += rows.length;
  }
}
