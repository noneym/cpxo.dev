export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { cleanupExpired } = await import("./lib/cleanup");
  const run = () =>
    cleanupExpired()
      .then((n) => n && console.log(`[cleanup] removed ${n} expired files`))
      .catch((e) => console.warn("[cleanup] failed:", e.message));
  setTimeout(run, 15_000);
  setInterval(run, 60 * 60_000).unref();

  // Encrypt clipboard rows stored before CLIP_KEY was set.
  const { encryptLegacyClips } = await import("./lib/clipcrypt");
  setTimeout(() => {
    encryptLegacyClips()
      .then((n) => n && console.log(`[clipcrypt] encrypted ${n} existing clips`))
      .catch((e) => console.warn("[clipcrypt] migration failed:", e.message));
  }, 5_000);
}
