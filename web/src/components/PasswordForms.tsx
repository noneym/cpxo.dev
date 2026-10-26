"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function ForgotForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "forgot", email }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(d.error ?? "Something went wrong.");
    setDone(true);
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Reset your password</h1>
      <p className="mt-1 text-sm text-fog">We email you a link that works for one hour.</p>
      {done ? (
        <p className="mt-6 text-sm text-mist">If an account exists for that address, the email is on its way. Check spam too.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && <p className="text-sm text-coral" role="alert">{error}</p>}
          <button className="btn btn-primary w-full" disabled={busy}>{busy ? "One moment" : "Send reset link"}</button>
        </div>
      )}
      <p className="mt-6 text-sm text-fog">
        <Link href="/login" className="text-lime hover:underline">Back to sign in</Link>
      </p>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "reset", token, password }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setError(d.error ?? "Something went wrong.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card w-full max-w-md p-6 md:p-8">
      <h1 className="text-2xl font-bold tracking-[-0.02em]">Choose a new password</h1>
      <div className="mt-6 flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <input id="password" className="input" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1.5 text-xs text-fog">At least 8 characters. Other sessions are signed out.</p>
        </div>
        {error && <p className="text-sm text-coral" role="alert">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !token}>{busy ? "One moment" : "Save password"}</button>
      </div>
    </form>
  );
}

export function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sent" | "busy">("idle");
  async function resend() {
    setState("busy");
    await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "resend" }) });
    setState("sent");
  }
  return (
    <div className="mt-6 flex flex-col gap-3 rounded-[14px] border border-lime/40 bg-lime/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        <strong>Confirm your email.</strong> We sent a link to {email}. Until then your API token is paused: Shortcuts and the desktop apps will not sync.
      </p>
      <button onClick={resend} disabled={state !== "idle"} className="btn btn-ghost h-9 shrink-0 text-xs">
        {state === "sent" ? "Sent again" : state === "busy" ? "Sending" : "Resend email"}
      </button>
    </div>
  );
}
