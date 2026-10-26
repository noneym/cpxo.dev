export const config = {
  appUrl: (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  fileTtlDays: Number(process.env.FILE_TTL_DAYS ?? 7),
  maxFileBytes: 4 * 1024 * 1024 * 1024, // 4 GB
  maxClipBytes: 512 * 1024,
  sessionDays: 30,
  minio: {
    endpoint: process.env.MINIO_ENDPOINT ?? "localhost:9000",
    accessKey: process.env.MINIO_ACCESS_KEY ?? "",
    secretKey: process.env.MINIO_SECRET_KEY ?? "",
    secure: (process.env.MINIO_SECURE ?? "true") !== "false",
    bucket: process.env.MINIO_BUCKET ?? "cpxo",
  },
};

export function fileUrl(code: string, name?: string) {
  return name
    ? `${config.appUrl}/f/${code}/${encodeURIComponent(name)}`
    : `${config.appUrl}/f/${code}`;
}
