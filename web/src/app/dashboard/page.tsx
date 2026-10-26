import { redirect } from "next/navigation";
import Link from "next/link";
import { Nav, Footer } from "@/components/Nav";
import { currentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { Dashboard } from "@/components/Dashboard";
import { VerifyBanner } from "@/components/PasswordForms";
import { needsVerification } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  const tokens = await prisma.apiToken.findMany({ where: { userId: user.id }, orderBy: { id: "asc" } });
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 py-10 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">Dashboard</h1>
            <p className="mt-1 text-fog">{user.email}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link href="/docs/ios" className="btn btn-ghost h-10">iPhone</Link>
            <Link href="/docs/windows" className="btn btn-ghost h-10">Windows app</Link>
            <Link href="/docs/mac" className="btn btn-ghost h-10">Mac app</Link>
            <Link href="/docs/cli" className="btn btn-ghost h-10">Shell</Link>
          </div>
        </div>
        {needsVerification(user) && <VerifyBanner email={user.email} />}
        <Dashboard
          appUrl={config.appUrl}
          initialTokens={tokens.map((t) => ({ id: t.id, name: t.name, token: t.token, lastUsedAt: t.lastUsedAt?.toISOString() ?? null }))}
        />
      </main>
      <Footer />
    </>
  );
}
