import Link from "next/link";
import { Nav, Footer } from "@/components/Nav";
import { Mark } from "@/components/Logo";
import { CodeBlock } from "@/components/CodeBlock";
import { ClipDemo } from "@/components/ClipDemo";
import { Reveal } from "@/components/Reveal";
import { ArrowRight, ClockCountdown, DeviceMobile, Terminal, WindowsLogo } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 md:px-6">
        {/* Hero: asymmetric split, message left, live clip demo right */}
        <section className="relative grid min-h-[calc(100dvh-64px)] items-center gap-10 py-16 md:grid-cols-12 md:py-20">
          <div className="grid-bg pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
          <div className="md:col-span-7">
            <h1 className="text-5xl font-bold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Copy here.
              <br />
              <span className="text-lime">Paste anywhere.</span>
            </h1>
            <p className="mt-6 max-w-[48ch] text-lg text-mist">
              Your iPhone clipboard lands on Windows, and back. Drop a 4 GB file from any shell with one curl line.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn btn-primary">
                Create account <ArrowRight size={18} weight="bold" />
              </Link>
              <Link href="/docs/ios" className="btn btn-ghost">
                Set up iPhone
              </Link>
            </div>
          </div>
          <div className="md:col-span-5">
            <ClipDemo />
          </div>
        </section>

        {/* How it works: one vertical stack, large numerals, no cards */}
        <section className="py-20 md:py-28">
          <Reveal>
            <h2 className="max-w-[20ch] text-3xl font-bold tracking-[-0.03em] md:text-5xl">Three parts, one clipboard.</h2>
          </Reveal>
          <ol className="mt-12 divide-y divide-line border-y border-line">
            {[
              {
                n: "1",
                icon: DeviceMobile,
                title: "iPhone runs a Shortcut",
                body: "Two Shortcuts in the Shortcuts app: one sends what you copied, one pulls what Windows copied. No app store install.",
                href: "/docs/ios",
              },
              {
                n: "2",
                icon: WindowsLogo,
                title: "Windows runs the tray app",
                body: "It watches your clipboard and pushes changes. New clips from your phone arrive as a notification and are already pasted.",
                href: "/docs/windows",
              },
              {
                n: "3",
                icon: Terminal,
                title: "Any shell drops files",
                body: "curl -T on a Linux box returns a link. Open it on the phone, the laptop, or send it to a colleague.",
                href: "/docs/cli",
              },
            ].map((s, i) => (
              <Reveal key={s.n} delay={i * 0.08}>
                <li className="grid gap-4 py-8 md:grid-cols-12 md:items-start">
                  <span className="font-mono text-4xl text-lime md:col-span-2 md:text-5xl">{s.n}</span>
                  <div className="md:col-span-6">
                    <h3 className="flex items-center gap-2 text-xl font-semibold">
                      <s.icon size={22} className="text-fog" /> {s.title}
                    </h3>
                    <p className="mt-2 max-w-[52ch] text-mist">{s.body}</p>
                  </div>
                  <div className="md:col-span-4 md:text-right">
                    <Link href={s.href} className="inline-flex items-center gap-1 text-sm text-lime hover:underline">
                      Setup guide <ArrowRight size={14} weight="bold" />
                    </Link>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Shell: full-width code, two real commands */}
        <section className="py-10 md:py-16">
          <Reveal>
            <h2 className="max-w-[22ch] text-3xl font-bold tracking-[-0.03em] md:text-5xl">One line from any shell.</h2>
            <p className="mt-4 max-w-[52ch] text-mist">
              Up to 4 GB per file. The link works for 7 days, then the file is deleted from storage.
            </p>
          </Reveal>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Reveal>
              <CodeBlock
                title="upload"
                code={`curl -T backup.tar.gz https://cpxo.dev/up/cpx_YOURTOKEN/
# https://cpxo.dev/f/k3v9xq2a/backup.tar.gz`}
              />
            </Reveal>
            <Reveal delay={0.08}>
              <CodeBlock
                title="download"
                code={`wget --content-disposition https://cpxo.dev/f/k3v9xq2a
curl -JLO https://cpxo.dev/f/k3v9xq2a`}
              />
            </Reveal>
          </div>
        </section>

        {/* Bento: 4 items, 4 cells, varied backgrounds */}
        <section className="py-20 md:py-28">
          <div className="grid gap-4 md:grid-cols-6 md:grid-rows-2">
            <Reveal className="md:col-span-4 md:row-span-2">
              <div className="relative h-full overflow-hidden rounded-[14px] bg-lime p-8 text-ink md:p-10">
                <Mark size={420} className="pointer-events-none absolute -bottom-24 -right-20 opacity-[0.12]" mono />
                <h3 className="text-3xl font-bold tracking-[-0.03em] md:text-4xl">Clipboard history, both ways.</h3>
                <p className="mt-3 max-w-[40ch] text-ink/80">
                  The last 200 clips stay on your dashboard. Pull any of them back to either device.
                </p>
                <Link href="/register" className="mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 font-semibold text-paper">
                  Start syncing <ArrowRight size={18} weight="bold" />
                </Link>
              </div>
            </Reveal>
            <Reveal delay={0.05} className="md:col-span-2">
              <div className="card h-full p-6">
                <ClockCountdown size={28} className="text-lime" />
                <h3 className="mt-4 text-xl font-semibold">Gone in 7 days</h3>
                <p className="mt-2 text-sm text-mist">Every file expires. Nothing piles up, nothing leaks later.</p>
              </div>
            </Reveal>
            <Reveal delay={0.1} className="md:col-span-2">
              <div className="card h-full bg-[linear-gradient(135deg,#14171c,#1f2430)] p-6">
                <WindowsLogo size={28} className="text-lime" />
                <h3 className="mt-4 text-xl font-semibold">Right-click, upload, link copied</h3>
                <p className="mt-2 text-sm text-mist">The Windows app adds an Explorer menu item. Drop a file, the link is on your clipboard.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-10 md:py-16">
          <Reveal>
            <div className="flex flex-col items-start gap-6 border-t border-line pt-12 md:flex-row md:items-end md:justify-between">
              <h2 className="max-w-[16ch] text-3xl font-bold tracking-[-0.03em] md:text-5xl">Free while in preview.</h2>
              <Link href="/register" className="btn btn-primary">
                Create account <ArrowRight size={18} weight="bold" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
