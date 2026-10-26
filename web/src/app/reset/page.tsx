import { Nav } from "@/components/Nav";
import { ResetForm } from "@/components/PasswordForms";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1200px] items-center justify-center px-4 py-12">
        <ResetForm token={token} />
      </main>
    </>
  );
}
