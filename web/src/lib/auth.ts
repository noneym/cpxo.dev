import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { prisma } from "./db";
import { config } from "./config";

const SESSION_COOKIE = "cpxo_session";
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const tokenBody = customAlphabet(alphabet, 40);
export const shortCode = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);

export function newApiToken() {
  return `cpx_${tokenBody()}`;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 11);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + config.sessionDays * 86400_000);
  await prisma.session.create({ data: { id, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.appUrl.startsWith("https"),
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (id) await prisma.session.deleteMany({ where: { id } });
  jar.delete(SESSION_COOKIE);
}

export async function currentUser() {
  const jar = await cookies();
  const id = jar.get(SESSION_COOKIE)?.value;
  if (!id) return null;
  const session = await prisma.session.findUnique({ where: { id }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

/** Resolves the user behind an API token given in header, query or path. */
export async function userFromToken(req: Request, pathToken?: string) {
  const url = new URL(req.url);
  const header = req.headers.get("authorization");
  const raw =
    pathToken ||
    (header?.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null) ||
    url.searchParams.get("t") ||
    req.headers.get("x-api-token");
  if (!raw || !raw.startsWith("cpx_")) return null;
  const token = await prisma.apiToken.findUnique({ where: { token: raw }, include: { user: true } });
  if (!token) return null;
  prisma.apiToken
    .update({ where: { id: token.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {});
  return token.user;
}

/** API auth: token first, then the browser session (so the dashboard can call the same routes). */
export async function apiUser(req: Request, pathToken?: string) {
  return (await userFromToken(req, pathToken)) ?? (await currentUser());
}

export function unauthorized() {
  return Response.json({ error: "unauthorized: pass a token as Authorization: Bearer cpx_... or ?t=" }, { status: 401 });
}
