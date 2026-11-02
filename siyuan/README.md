# cpxo upload for SiYuan

Upload an image or attachment from your SiYuan notes to [cpxo.dev](https://cpxo.dev) and get a share link on your clipboard. Links live 7 days and also land on every device that syncs with cpxo (Mac, Windows, iPhone, shell).

## Where it shows up

- **Image menu**: click an image, open its menu, pick *Upload to cpxo and copy link*.
- **Attachment link menu**: click a link to a file in `assets/`, same item.
- **Block menu (the block icon / ⋮)**: every image, attachment, video or audio in the selected blocks is uploaded and all links are copied, one per line.

## Setup

1. Install: download `cpxo-siyuan-<version>.zip` from the [releases](https://github.com/noneym/cpxo.dev/releases/latest) and extract it into `<workspace>/data/plugins/cpxo-siyuan/`, then enable it under *Settings → Marketplace → Downloaded → Plugins*.
2. Open the plugin settings and paste your API token from the [cpxo dashboard](https://cpxo.dev/dashboard). *Test connection* confirms it.
3. Self-hosted cpxo: change *Server* to your instance.

## Build

```bash
cd siyuan
npm ci
npm run build   # dist/cpxo-siyuan-<version>.zip
```

Part of the [cpxo.dev](https://github.com/noneym/cpxo.dev) repository, MIT.
