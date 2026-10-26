import Link from "next/link";
import { Nav, Footer } from "./Nav";

const tabs = [
  { href: "/docs/ios", label: "iPhone" },
  { href: "/docs/windows", label: "Windows" },
  { href: "/docs/mac", label: "Mac" },
  { href: "/docs/cli", label: "Shell" },
];

export function Doc({ title, lead, active, children }: { title: string; lead: string; active: string; children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 md:py-16">
        <div className="flex gap-1 rounded-full border border-line p-1 w-fit">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`h-9 rounded-full px-4 text-sm inline-flex items-center ${t.href === active ? "bg-lime text-ink font-semibold" : "text-mist hover:text-paper"}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <h1 className="mt-8 max-w-[18ch] text-4xl font-bold tracking-[-0.03em] md:text-6xl">{title}</h1>
        <p className="mt-4 max-w-[58ch] text-lg text-mist">{lead}</p>
        <div className="mt-12 grid gap-12 lg:grid-cols-12">
          <article className="prose-cpxo lg:col-span-8">{children}</article>
          <aside className="lg:col-span-4">
            <div className="card sticky top-24 p-5 text-sm">
              <p className="font-medium">Need a token?</p>
              <p className="mt-1 text-fog">Every command and Shortcut below uses your personal token from the dashboard.</p>
              <Link href="/dashboard" className="btn btn-primary mt-4 h-10 w-full">Open dashboard</Link>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}

export function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-3 border-t border-line py-8 md:grid-cols-12">
      <span className="font-mono text-3xl text-lime md:col-span-2">{n}</span>
      <div className="md:col-span-10">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="mt-3 flex flex-col gap-3 text-mist [&_strong]:text-paper [&_code]:rounded [&_code]:bg-raise [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-paper">
          {children}
        </div>
      </div>
    </section>
  );
}

export function Actions({ items }: { items: string[] }) {
  return (
    <ol className="card divide-y divide-line">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3 px-4 py-3 text-[15px]">
          <span className="font-mono text-xs text-fog pt-1">{String(i + 1).padStart(2, "0")}</span>
          <span dangerouslySetInnerHTML={{ __html: it }} />
        </li>
      ))}
    </ol>
  );
}
