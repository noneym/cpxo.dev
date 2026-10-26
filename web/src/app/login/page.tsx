import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { AuthForm } from "@/components/AuthForm";
import { currentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await currentUser()) redirect("/dashboard");
  return (
    <>
      <Nav />
      <main className="mx-auto flex min-h-[calc(100dvh-64px)] max-w-[1200px] items-center justify-center px-4 py-12">
        <AuthForm mode="login" />
      </main>
    </>
  );
}
