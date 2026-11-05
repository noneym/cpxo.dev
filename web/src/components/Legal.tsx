import { Nav, Footer } from "./Nav";

export const CONTACT_EMAIL = "support@cpxo.dev";

export function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto max-w-[1200px] px-4 py-12 md:px-6 md:py-16">
        <h1 className="max-w-[18ch] text-4xl font-bold tracking-[-0.03em] md:text-6xl">{title}</h1>
        <p className="mt-4 text-sm text-fog">Last updated {updated}</p>
        <article className="mt-10 max-w-[72ch]">{children}</article>
      </main>
      <Footer />
    </>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-8">
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-mist [&_strong]:text-paper [&_a]:text-lime [&_a:hover]:underline [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_code]:rounded [&_code]:bg-raise [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-paper">
        {children}
      </div>
    </section>
  );
}
