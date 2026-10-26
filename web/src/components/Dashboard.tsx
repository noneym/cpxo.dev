"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipHistory } from "./ClipHistory";
import { Copy, Check, Trash, UploadSimple, Plus, SignOut } from "@phosphor-icons/react";

type Token = { id: number; name: string; token: string; lastUsedAt: string | null };
type FileRow = { id: number; code: string; name: string; size: number; url: string; downloads: number; expiresAt: string };

function fmtBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
function daysLeft(iso: string) {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400_000));
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-mist hover:border-fog active:scale-[0.97]"
    >
      {ok ? <Check size={14} weight="bold" className="text-lime" /> : <Copy size={14} />} {ok ? "Copied" : label}
    </button>
  );
}

export function Dashboard({ appUrl, initialTokens }: { appUrl: string; initialTokens: Token[] }) {
  const router = useRouter();
  const [tokens, setTokens] = useState<Token[]>(initialTokens);
  const [files, setFiles] = useState<FileRow[] | null>(null);
  const [uploading, setUploading] = useState<{ name: string; pct: number } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const primary = tokens[0]?.token ?? "cpx_YOURTOKEN";

  const load = useCallback(async () => {
    const f = await fetch("/api/files").then((r) => (r.ok ? r.json() : []));
    setFiles(f);
  }, []);
  useEffect(() => {
    const first = setTimeout(load, 0);
    const t = setInterval(load, 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [load]);

  async function createToken() {
    const name = prompt("Token name (e.g. iPhone, laptop)", "device") ?? "";
    if (!name) return;
    const r = await fetch("/api/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    if (r.ok) setTokens([...tokens, { ...(await r.json()), lastUsedAt: null }]);
  }
  async function revoke(id: number) {
    if (!confirm("Revoke this token? Devices using it will stop syncing.")) return;
    await fetch(`/api/tokens?id=${id}`, { method: "DELETE" });
    setTokens(tokens.filter((t) => t.id !== id));
  }

  function upload(file: File) {
    setErr(null);
    setUploading({ name: file.name, pct: 0 });
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", `/up?name=${encodeURIComponent(file.name)}`);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (ev) => ev.lengthComputable && setUploading({ name: file.name, pct: Math.round((ev.loaded / ev.total) * 100) });
    xhr.onload = () => {
      setUploading(null);
      if (xhr.status >= 200 && xhr.status < 300) load();
      else setErr(`Upload failed: ${JSON.parse(xhr.responseText || "{}").error ?? xhr.status}`);
    };
    xhr.onerror = () => {
      setUploading(null);
      setErr("Upload failed: network error");
    };
    xhr.send(file);
  }

  async function removeFile(id: number) {
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    setFiles((f) => f?.filter((x) => x.id !== id) ?? null);
  }
  async function logout() {
    await fetch("/api/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "logout" }) });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-12">
      {/* Tokens + quick commands */}
      <section className="min-w-0 lg:col-span-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">API tokens</h2>
          <button onClick={createToken} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-mist hover:border-fog">
            <Plus size={14} weight="bold" /> New token
          </button>
        </div>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {tokens.map((t) => (
            <li key={t.id} className="flex min-w-0 items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{t.name}</div>
                <div className="truncate font-mono text-xs text-fog">{t.token}</div>
                <div className="text-[11px] text-fog/70">{t.lastUsedAt ? `used ${ago(t.lastUsedAt)}` : "never used"}</div>
              </div>
              <CopyBtn text={t.token} />
              <button onClick={() => revoke(t.id)} aria-label="Revoke" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fog hover:border-coral hover:text-coral">
                <Trash size={14} />
              </button>
            </li>
          ))}
        </ul>

        <h3 className="mt-8 text-sm font-medium text-mist">Your shell one-liners</h3>
        <div className="mt-2 flex flex-col gap-2">
          {[
            { k: "upload", v: `curl -T FILE ${appUrl}/up/${primary}/` },
            { k: "install cli", v: `curl -fsSL ${appUrl}/cli -o /usr/local/bin/cpxo && chmod +x /usr/local/bin/cpxo && cpxo login ${primary}` },
            { k: "iOS push url", v: `${appUrl}/api/clip?t=${primary}` },
          ].map((c) => (
            <div key={c.k} className="card flex min-w-0 items-center gap-2 px-3 py-2">
              <span className="w-16 shrink-0 text-[10px] uppercase tracking-wide text-fog sm:w-20 sm:text-[11px]">{c.k}</span>
              <code className="min-w-0 flex-1 truncate text-xs text-mist">{c.v}</code>
              <CopyBtn text={c.v} label="" />
            </div>
          ))}
        </div>

        <button onClick={logout} className="mt-8 inline-flex items-center gap-1.5 text-sm text-fog hover:text-paper">
          <SignOut size={16} /> Sign out
        </button>
      </section>

      {/* Clips + files */}
      <section className="min-w-0 lg:col-span-7">
        <ClipHistory />

        <div className="mt-12 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Files</h2>
          <button onClick={() => fileInput.current?.click()} className="btn btn-primary h-10">
            <UploadSimple size={18} weight="bold" /> Upload
          </button>
          <input ref={fileInput} type="file" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        {uploading && (
          <div className="card mt-4 p-3 text-sm">
            <div className="flex justify-between text-mist"><span className="truncate">{uploading.name}</span><span className="font-mono">{uploading.pct}%</span></div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-lime transition-[width]" style={{ width: `${uploading.pct}%` }} /></div>
          </div>
        )}
        {err && <p className="mt-3 text-sm text-coral">{err}</p>}
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {files === null && [0, 1].map((i) => <li key={i} className="h-14 animate-pulse bg-panel/60" />)}
          {files?.length === 0 && <li className="py-8 text-center text-sm text-fog">No files. Upload here, from the Windows app, or with curl.</li>}
          {files?.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <a href={f.url} className="block truncate text-sm font-medium hover:text-lime">{f.name}</a>
                <p className="text-[11px] text-fog">{fmtBytes(f.size)} · {f.downloads} downloads · expires in {daysLeft(f.expiresAt)} d</p>
              </div>
              <CopyBtn text={f.url} label="Link" />
              <button onClick={() => removeFile(f.id)} aria-label="Delete" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fog hover:border-coral hover:text-coral">
                <Trash size={14} />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
