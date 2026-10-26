import { Nav } from "@/components/Nav";
import { ForgotForm } from "@/components/PasswordForms";

export default function ForgotPage() {
  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1200px] items-center justify-center px-4 py-12">
        <ForgotForm />
      </main>
    </>
  );
}
