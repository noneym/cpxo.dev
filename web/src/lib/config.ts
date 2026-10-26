const MB = 1024 * 1024;

export const config = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  fileTtlDays: Number(process.env.FILE_TTL_DAYS ?? 7),
  /** Upload limit, configured in megabytes (default 4096 = 4 GB). */
  maxFileBytes: Math.max(1, Number(process.env.MAX_FILE_MB ?? 4096)) * MB,
  /** Clipboard entry limit, in kilobytes. */
  maxClipBytes: Math.max(1, Number(process.env.MAX_CLIP_KB ?? 512)) * 1024,
  /** Clipboard history kept per account (oldest entries are trimmed). */
  maxClips: Math.max(10, Number(process.env.MAX_CLIPS ?? 10000)),
  sessionDays: 30,
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "",
    secretKey: process.env.MINIO_SECRET_KEY ?? "",
    secure: (process.env.MINIO_SECURE ?? "true") !== "false",
    bucket: process.env.MINIO_BUCKET ?? "cpxo",
  },
};

/** Human label for the upload limit: "4 GB", "500 MB". */
export const maxFileLabel =
  config.maxFileBytes >= 1024 * MB
    ? `${Number((config.maxFileBytes / (1024 * MB)).toFixed(1))} GB`
    : `${Math.round(config.maxFileBytes / MB)} MB`;

export function fileUrl(code: string, name?: string) {
  return name
    ? `${config.appUrl}/f/${code}/${encodeURIComponent(name)}`
    : `${config.appUrl}/f/${code}`;
}
