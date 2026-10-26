"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "./Turnstile";

export function AuthForm({ mode, siteKey = "" }: { mode: "login" | "register"; siteKey?: string }) {
  const SITE_KEY = siteKey;
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const needsCaptcha = mode === "register" && Boolean(SITE_KEY);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode, email, password, captcha }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Something went wrong.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">{mode === "login" ? "Sign in" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-fog">
        {mode === "login" ? "Welcome back." : "You get an API token right away."}
      </p>
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {mode === "register" ? (
            <p className="mt-1.5 text-xs text-fog">At least 8 characters.</p>
          ) : (
            <p className="mt-1.5 text-xs text-fog"><Link href="/forgot" className="hover:text-paper">Forgot password?</Link></p>
          )}
        </div>
        {needsCaptcha && <Turnstile siteKey={SITE_KEY} onToken={setCaptcha} />}
        {error && <p className="text-sm text-coral" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || (needsCaptcha && !captcha)}>
          {busy ? "One moment" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </div>
      <p className="mt-6 text-sm text-fog">
        {mode === "login" ? (
          <>No account? <Link href="/register" className="text-lime hover:underline">Create one</Link></>
        ) : (
          <>Already registered? <Link href="/login" className="text-lime hover:underline">Sign in</Link></>
        )}
      </p>
    </form>
  );
}
