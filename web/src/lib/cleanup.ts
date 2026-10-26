import { prisma } from "./db";
import { deleteObject } from "./storage";

/** Deletes expired files from MinIO and the database. Safe to call often. */
export async function cleanupExpired() {
  const expired = await prisma.file.findMany({
    where: { expiresAt: { lt: new Date() } },
    take: 200,
  });
  for (const f of expired) {
    await deleteObject(f.objectKey);
    await prisma.file.delete({ where: { id: f.id } }).catch(() => {});
  }
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  return expired.length;
}
