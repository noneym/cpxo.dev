// cpxo upload for SiYuan. Adds "Upload to cpxo and copy link" to the image
// menu, the attachment-link menu and the block icon menu. The asset is read
// from the local workspace (/assets/...), sent to POST /api/drop as multipart
// and the returned share link goes on the clipboard. The link is also stored
// as a clip on cpxo, so every synced device gets it.
import { Plugin, Setting, showMessage } from "siyuan";
import type { IProtyle, subMenu } from "siyuan";

const STORE = "settings.json";
const DEFAULT_SERVER = "https://cpxo.dev";

type Settings = { server: string; token: string };
type Asset = { path: string; name: string };
type MenuDetail = { menu: subMenu; protyle: IProtyle; element: HTMLElement };
type BlockDetail = { menu: subMenu; protyle: IProtyle; blockElements: HTMLElement[] };

const FALLBACK: Record<string, string> = {
  upload: "Upload to cpxo and copy link",
  uploadMany: "Upload {n} files to cpxo and copy links",
  uploading: "Uploading {name} to cpxo…",
  copied: "cpxo link copied",
  copiedMany: "{n} cpxo links copied",
  noToken: "Set your cpxo API token first: Settings → Marketplace → Downloaded → cpxo upload → Settings",
  failed: "cpxo upload failed: {err}",
  server: "Server",
  serverDesc: "Your cpxo instance. Leave as is for cpxo.dev.",
  token: "API token",
  tokenDesc: "From the dashboard at cpxo.dev. Uploads and links are tied to this account.",
  test: "Test connection",
  testOk: "Signed in as {email}",
  testFail: "Token rejected: {err}",
};

export default class CpxoPlugin extends Plugin {
  settings: Settings = { server: DEFAULT_SERVER, token: "" };

  async onload() {
    const saved = await this.loadData(STORE).catch(() => null);
    if (saved && typeof saved === "object") this.settings = { ...this.settings, ...saved };
    this.buildSetting();
    this.eventBus.on("open-menu-image", this.onAssetMenu);
    this.eventBus.on("open-menu-link", this.onAssetMenu);
    this.eventBus.on("click-blockicon", this.onBlockIcon);
  }

  onunload() {
    this.eventBus.off("open-menu-image", this.onAssetMenu);
    this.eventBus.off("open-menu-link", this.onAssetMenu);
    this.eventBus.off("click-blockicon", this.onBlockIcon);
  }

  t(key: string, vars: Record<string, string | number> = {}) {
    const raw = this.i18n?.[key];
    let s = typeof raw === "string" ? raw : FALLBACK[key] ?? key;
    for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  }

  // ---- menus -------------------------------------------------------------

  onAssetMenu = ({ detail }: CustomEvent<MenuDetail>) => {
    const assets = assetsIn([detail.element]);
    if (assets.length) this.addItem(detail.menu, assets);
  };

  onBlockIcon = ({ detail }: CustomEvent<BlockDetail>) => {
    const assets = assetsIn(detail.blockElements);
    if (assets.length) this.addItem(detail.menu, assets);
  };

  addItem(menu: subMenu, assets: Asset[]) {
    menu.addItem({
      icon: "iconUpload",
      label: assets.length > 1 ? this.t("uploadMany", { n: assets.length }) : this.t("upload"),
      click: () => void this.uploadAll(assets),
    });
  }

  // ---- upload ------------------------------------------------------------

  async uploadAll(assets: Asset[]) {
    if (!this.settings.token) {
      showMessage(this.t("noToken"), 8000, "error");
      return;
    }
    const links: string[] = [];
    for (const a of assets) {
      showMessage(this.t("uploading", { name: a.name }), 4000, "info", "cpxo-progress");
      try {
        links.push(await this.upload(a));
      } catch (e) {
        showMessage(this.t("failed", { err: (e as Error).message }), 8000, "error");
        return;
      }
    }
    await copyText(links.join("\n"));
    showMessage(links.length > 1 ? this.t("copiedMany", { n: links.length }) : this.t("copied"), 4000, "info", "cpxo-progress");
  }

  async upload({ path, name }: Asset) {
    const local = await fetch("/" + path);
    if (!local.ok) throw new Error(`asset not found (${local.status})`);
    const blob = await local.blob();
    // multipart keeps text files (.txt, .md, .csv) as files; a raw text body
    // would be stored as a clipboard entry by /api/drop.
    const form = new FormData();
    form.append("file", blob, name);
    const res = await fetch(`${this.settings.server}/api/drop`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.settings.token}`, "X-Source": "web" },
      body: form,
    });
    const text = (await res.text()).trim();
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    return text;
  }

  // ---- settings ----------------------------------------------------------

  buildSetting() {
    let serverInput: HTMLInputElement | undefined;
    let tokenInput: HTMLInputElement | undefined;
    const read = (): Settings => ({
      server: serverInput?.value.trim().replace(/\/+$/, "") || DEFAULT_SERVER,
      token: tokenInput?.value.trim() ?? this.settings.token,
    });

    this.setting = new Setting({
      confirmCallback: () => {
        this.settings = read();
        void this.saveData(STORE, this.settings);
      },
    });
    this.setting.addItem({
      title: this.t("server"),
      description: this.t("serverDesc"),
      createActionElement: () => {
        serverInput = field("text", this.settings.server, DEFAULT_SERVER);
        return serverInput;
      },
    });
    this.setting.addItem({
      title: this.t("token"),
      description: this.t("tokenDesc"),
      createActionElement: () => {
        tokenInput = field("password", this.settings.token, "cpx_...");
        return tokenInput;
      },
    });
    this.setting.addItem({
      title: this.t("test"),
      createActionElement: () => {
        const btn = document.createElement("button");
        btn.className = "b3-button b3-button--outline fn__flex-center fn__size200";
        btn.textContent = this.t("test");
        btn.addEventListener("click", async () => {
          const s = read();
          try {
            const res = await fetch(`${s.server}/api/me`, { headers: { Authorization: `Bearer ${s.token}` } });
            const body = (await res.json().catch(() => ({}))) as { email?: string; error?: string };
            if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
            showMessage(this.t("testOk", { email: body.email ?? "?" }), 4000, "info");
          } catch (e) {
            showMessage(this.t("testFail", { err: (e as Error).message }), 6000, "error");
          }
        });
        return btn;
      },
    });
  }
}

// ---- helpers -------------------------------------------------------------

function field(type: string, value: string, placeholder: string) {
  const input = document.createElement("input");
  input.className = "b3-text-field fn__flex-center fn__size200";
  input.type = type;
  input.value = value;
  input.placeholder = placeholder;
  return input;
}

/** Workspace assets referenced by the given elements (images, attachment links, video/audio blocks), in document order, no duplicates. */
function assetsIn(roots: HTMLElement[]): Asset[] {
  const out: Asset[] = [];
  const seen = new Set<string>();
  const add = (raw: string | null) => {
    if (!raw) return;
    const path = raw.replace(/^\//, "").split("?")[0];
    if (!path.startsWith("assets/") || seen.has(path)) return;
    seen.add(path);
    let name = path.split("/").pop() ?? "file";
    try {
      name = decodeURIComponent(name);
    } catch {
      /* keep raw */
    }
    out.push({ path, name });
  };
  const scan = (el: Element) => {
    if (el.matches('span[data-type~="a"]')) add(el.getAttribute("data-href"));
    if (el.matches("img, video, audio, source")) add(el.getAttribute("data-src") || el.getAttribute("src"));
  };
  for (const root of roots) {
    scan(root);
    root.querySelectorAll('span[data-type~="a"], img, video, audio, source').forEach(scan);
  }
  return out;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    /* fall through */
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
