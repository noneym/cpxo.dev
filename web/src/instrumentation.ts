export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { cleanupExpired } = await import("./lib/cleanup");
  const run = () =>
    cleanupExpired()
      .then((n) => n && console.log(`[cleanup] removed ${n} expired files`))
      .catch((e) => console.warn("[cleanup] failed:", e.message));
  setTimeout(run, 15_000);
  setInterval(run, 60 * 60_000).unref();
}
