"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Check, Trash, ArrowClockwise, MagnifyingGlass, DeviceMobile, WindowsLogo, AppleLogo, Terminal, Globe, Robot, X } from "@phosphor-icons/react";

type Clip = { id: number; text: string; source: string; createdAt: string };
type Page = { items: Clip[]; nextCursor: number | null; total: number };

const SOURCES: { key: string; label: string; Icon: typeof Globe }[] = [
  { key: "ios", label: "iPhone", Icon: DeviceMobile },
  { key: "windows", label: "Windows", Icon: WindowsLogo },
  { key: "mac", label: "Mac", Icon: AppleLogo },
  { key: "cli", label: "Shell", Icon: Terminal },
  { key: "web", label: "Web", Icon: Globe },
  { key: "ai", label: "AI", Icon: Robot },
];
const PAGE = 30;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}
function SourceIcon({ s, size = 16 }: { s: string; size?: number }) {
  const found = SOURCES.find((x) => x.key === s);
  const Icon = found?.Icon ?? Globe;
  return <Icon size={size} />;
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      aria-label="Copy"
      onClick={async () => {
        await navigator.clipboard.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1400);
      }}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-mist hover:border-fog active:scale-[0.97]"
    >
      {ok ? <Check size={14} weight="bold" className="text-lime" /> : <Copy size={14} />}
    </button>
  );
}

export function ClipHistory() {
  const [source, setSource] = useState<string>("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [items, setItems] = useState<Clip[] | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendText, setSendText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const newest = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const params = useCallback(
    (extra: Record<string, string | number> = {}) => {
      const p = new URLSearchParams({ limit: String(PAGE) });
      if (source) p.set("source", source);
      if (debouncedQ) p.set("q", debouncedQ);
      for (const [k, v] of Object.entries(extra)) p.set(k, String(v));
      return p.toString();
    },
    [source, debouncedQ]
  );

  const loadFirst = useCallback(async () => {
    setError(null);
    const r = await fetch(`/api/clip/history?${params()}`);
    if (!r.ok) return setError("Could not load the history.");
    const page = (await r.json()) as Page;
    setItems(page.items);
    setCursor(page.nextCursor);
    setTotal(page.total);
    newest.current = page.items[0]?.id ?? 0;
  }, [params]);

  // Only pulls entries newer than what is shown, so scrolling position and loaded pages survive.
  const pollNew = useCallback(async () => {
    if (!newest.current) return loadFirst();
    const r = await fetch(`/api/clip/history?${params({ after: newest.current, limit: 100 })}`);
    if (!r.ok) return;
    const page = (await r.json()) as Page;
    if (page.items.length) {
      setItems((cur) => [...page.items, ...(cur ?? [])]);
      setTotal(page.total);
      newest.current = page.items[0].id;
    }
  }, [params, loadFirst]);

  useEffect(() => {
    const first = setTimeout(() => {
      setItems(null);
      loadFirst();
    }, 0);
    return () => clearTimeout(first);
  }, [loadFirst]);

  useEffect(() => {
    const t = setInterval(pollNew, 5_000);
    return () => clearInterval(t);
  }, [pollNew]);

  async function loadMore() {
    if (cursor === null || loadingMore) return;
    setLoadingMore(true);
    const r = await fetch(`/api/clip/history?${params({ before: cursor })}`);
    setLoadingMore(false);
    if (!r.ok) return;
    const page = (await r.json()) as Page;
    setItems((cur) => [...(cur ?? []), ...page.items]);
    setCursor(page.nextCursor);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!sendText.trim()) return;
    const r = await fetch("/api/clip", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: sendText, source: "web" }) });
    if (r.ok) {
      setSendText("");
      pollNew();
    }
  }

  async function remove(id: number) {
    await fetch(`/api/clip/${id}`, { method: "DELETE" });
    setItems((cur) => cur?.filter((c) => c.id !== id) ?? null);
    setTotal((t) => Math.max(0, t - 1));
  }

  async function clearAll() {
    const scope = source || debouncedQ ? "the filtered entries" : "the whole clipboard history";
    if (!confirm(`Delete ${scope}? This cannot be undone.`)) return;
    await fetch(`/api/clip/history?${params()}`, { method: "DELETE" });
    loadFirst();
  }

  return (
    <section className="min-w-0">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Clipboard <span className="ml-1 font-mono text-sm font-normal text-fog">{total.toLocaleString()}</span>
        </h2>
        <div className="flex gap-2">
          <button onClick={loadFirst} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-mist hover:border-fog">
            <ArrowClockwise size={14} /> Refresh
          </button>
          <button onClick={clearAll} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-fog hover:border-coral hover:text-coral">
            <Trash size={14} /> Clear
          </button>
        </div>
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input className="input" placeholder="Type or paste, then send to your devices" value={sendText} onChange={(e) => setSendText(e.target.value)} />
        <button className="btn btn-primary shrink-0">Send</button>
      </form>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:w-64">
          <MagnifyingGlass size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fog" />
          <input className="input h-10 pl-9 pr-9" placeholder="Search history" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && (
            <button type="button" aria-label="Clear search" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-fog hover:text-paper">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSource("")}
            className={`h-8 rounded-full px-3 text-xs ${source === "" ? "bg-lime font-semibold text-ink" : "border border-line text-mist hover:border-fog"}`}
          >
            All
          </button>
          {SOURCES.map(({ key, label, Icon }) => (
            <button
              key={key}
              onClick={() => setSource(source === key ? "" : key)}
              className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs ${source === key ? "bg-lime font-semibold text-ink" : "border border-line text-mist hover:border-fog"}`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-coral">{error}</p>}
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {items === null && [0, 1, 2].map((i) => <li key={i} className="h-14 animate-pulse bg-panel/60" />)}
        {items?.length === 0 && (
          <li className="py-8 text-center text-sm text-fog">
            {source || debouncedQ ? "Nothing matches this filter." : "Nothing yet. Copy something on your phone, Mac or Windows and it shows up here."}
          </li>
        )}
        {items?.map((c) => (
          <li key={c.id} className="flex min-w-0 items-start gap-3 py-3">
            <span className="mt-1 text-fog"><SourceIcon s={c.source} /></span>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 break-all font-mono text-[13px] text-paper">{c.text}</p>
              <p className="mt-1 text-[11px] text-fog">{SOURCES.find((s) => s.key === c.source)?.label ?? c.source} · {ago(c.createdAt)}</p>
            </div>
            <CopyBtn text={c.text} />
            <button onClick={() => remove(c.id)} aria-label="Delete" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line text-fog hover:border-coral hover:text-coral">
              <Trash size={14} />
            </button>
          </li>
        ))}
      </ul>
      {cursor !== null && (
        <button onClick={loadMore} disabled={loadingMore} className="btn btn-ghost mt-4 h-10 w-full">
          {loadingMore ? "Loading" : `Load more (${Math.max(0, total - (items?.length ?? 0)).toLocaleString()} left)`}
        </button>
      )}
    </section>
  );
}
