// CORS for the endpoints browser-based clients call directly: the SiYuan plugin
// runs on http://127.0.0.1:6806 and posts to /api/drop with a Bearer token.
// Tokens are explicit, no cookies are involved, so "*" is safe here.
const HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type, x-file-name, x-source",
  "access-control-max-age": "86400",
};

export function preflight() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export function withCors(res: Response) {
  for (const [k, v] of Object.entries(HEADERS)) res.headers.set(k, v);
  return res;
}
