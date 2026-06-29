# Routix Rebrand Design

**Date:** 2026-06-29
**Topic:** Rebrand fork dari `9Router` → `Routix` (visible surfaces + safe identifiers)

## Goal

Hilangkan brand `9Router` dari semua surface yang visible ke user, ganti dengan `Routix`. Pertahankan kompatibilitas internal yang aman, nonaktifkan cloud sync sampai backend Routix siap, dan siapkan jalur migrasi data legacy.

## Scope

Surface masuk rebrand (semua yang aman):

1. **UI browser** — landing, dashboard, footer, nav, page title, PWA manifest
2. **CLI tool config** — config generated buat codex/claude/jcode dll
3. **Filesystem & package id** — `APP_NAME`, `~/.9router` → `~/.routix`, `package.json` name
4. **README & docs** — README.md, translasi i18n, DOCKER.md, docs/, gitbook/

Tidak masuk scope: git history, fork relationship GitHub, LICENSE file (atribusi legal tetap).

## Decisions

| Item | Decision |
|------|----------|
| Cloud URL | `CLOUD_URL=https://routix.web.id` (domain dimiliki, backend belum) |
| Cloud sync | Dinonaktifkan sampai backend siap (guard `CLOUD_SYNC_ENABLED=false`) |
| APP_NAME | `routix` → folder data `~/.routix` |
| Dev data | `DATA_DIR=./data` (project-local, gitignored) — fresh, tidak tersebar |
| Migrasi data | Logic di `dataDir.js`, env `MIGRATE_LEGACY_DATA=false` default; dev skip, prod set `true` |
| Logo | Edit teks SVG saja (favicon `9`→`R`, icon `9R`→`Rx`), gradient/warna tetap |
| Upstream link README | Buang (badge/URL 9Router). LICENSE file tetap |
| CHANGELOG | Entri lama biarkan (`9Router`), entri baru `Routix` |
| Pendekatan | Hybrid — pusatkan titik kunci ke konstanta, mekanikal replace sisanya |

## Architecture

### Brand constants module

Buat `src/lib/brand.js` — single source of truth untuk brand:

```js
export const BRAND_NAME = "Routix";        // display name
export const BRAND_SLUG = "routix";        // lowercase, filesystem, package
export const BRAND_DOMAIN = "routix.web.id";
export const CLOUD_URL = `https://${BRAND_DOMAIN}`;
export const APP_NAME = BRAND_SLUG;        // → ~/.routix
```

Dipakai titik kunci: `layout.js`, `manifest.js`, `dataDir.js`, `package.json` (tidak import, hardcode `routix-app`), Docker files.

### dataDir.js — migrasi legacy

`src/lib/dataDir.js` update:

- `APP_NAME` import dari `brand.js` (bukan hardcode `"9router"`)
- Default dir: `~/.routix` (prod) atau `DATA_DIR` env (dev: `./data`)
- Logika migrasi:
  - Cek env `MIGRATE_LEGACY_DATA` (default `false`)
  - Jika `true` + target dir kosong + `~/.9router` ada → pindah isi `~/.9router` → target
  - Jika `false` → skip migrasi (dev fresh)
- Warning log tetap untuk fallback writability

### Env contract (`.env.example` + `.env`)

```
CLOUD_URL=https://routix.web.id
NEXT_PUBLIC_CLOUD_URL=https://routix.web.id
BASE_URL=http://localhost:20127          # dev
NEXT_PUBLIC_BASE_URL=http://localhost:20127
MIGRATE_LEGACY_DATA=false
DATA_DIR=./data                           # dev: project-local, gitignored
CLOUD_SYNC_ENABLED=false                  # sampai backend siap
```

## Per-surface changes

### 1. UI browser visible

**Titik kunci (pakai konstanta `brand.js`):**
- `src/app/layout.js` — `metadata.title` → `${BRAND_NAME} - AI Infrastructure Management`, `metadata.description` rebrand
- `src/app/manifest.js` — `name`, `short_name` → `BRAND_NAME`

**Mekanikal replace (literal):**
- Landing: `HeroSection.js`, `Navigation.js`, `Footer.js`, `HowItWorks.js`, `GetStarted.js`, `FlowAnimation.js`, `page.js`
- Dashboard: `ProviderTopology.js`, `ToolSummaryCard.js`, semua `*ToolCard.js` di `cli-tools/components/`
- API routes teks visible: `version/route.js`, `login/route.js`, dll

**Aturan replace:**
- Display string (`"9Router"`, `"9Router - ..."`) → `"Routix"`
- Slug/identifier lowercase (`9router` di URL/path) → `routix`
- Kalimat naratif: baca konteks, ganti natural

### 2. CLI tool config

Routes generate config eksternal (codex, claude, jcode, kilo, droid, opencode, cline, copilot, hermes, openclaw, antigravity, deepseek-tui, cowork, cowork-mcp-*):
- Ganti brand di generated config: base URL label, app name field, comment header → `Routix`/`routix`
- Endpoint proxy `/api/v1/...` tidak berubah
- Cek tiap `*-settings/route.js`, `cowork-mcp-*`, `antigravity-mitm`

### 3. Filesystem & package id

- `package.json` name: `9router-app` → `routix-app`
- `src/lib/dataDir.js`: import `APP_NAME` dari `brand.js` + logika migrasi
- Docker: container/image `9router`→`routix`, volume `9router-data`→`routix-data`
  - `docker-compose.yml`: service name, image → `build: .` (build lokal, bukan pull upstream `decolua/9router:latest`), container_name, volume
  - `start.sh`: semua `9router`→`routix`
  - `Dockerfile`: `LABEL org.opencontainers.image.title="routix"`, `ln -sf /app/data-home /root/.routix`
  - `captain-definition`: cek nama app

### 4. Logo & favicon (SVG teks)

Edit teks `<text>` element, gradient/warna/dimensi tetap:
- `public/favicon.svg`: `9` → `R`
- `public/icons/icon-192.svg`: `9R` → `Rx`
- `public/icons/icon-512.svg`: `9R` → `Rx`
- `manifest.js` icon path tidak berubah

### 5. README & docs

- `README.md` (46KB) + `README.zh-CN.md` (42KB): rebrand judul, header, deskripsi, body. `9router.com`→`routix.web.id`
- i18n README: `i18n/README.zh-CN.md`, `README.ru.md`, `README.ja-JP.md`, `README.vi.md`
- `CHANGELOG.md`: entri lama biarkan (`9Router`), entri baru `Routix`
- `DOCKER.md`: rebrand, container name `routix`
- `docs/`, `gitbook/`: cek brand mention, replace visible
- **Buang link upstream** (badge, URL GitHub 9Router) dari README. LICENSE file tetap (atribusi legal)

### 6. Env, Docker, cloud sync

Lihat **Env contract** di atas + section 3 Docker.

Cloud sync:
- `CLOUD_URL=https://routix.web.id` (domain dimiliki, backend belum)
- Guard `CLOUD_SYNC_ENABLED=false` — verifikasi kode sync, kalau flag belum ada tambah guard eksplisit biar tidak spam error sync gagal

## Testing & verification

Tidak ada unit test baru (rebrand = string replace, bukan logic baru). Verifikasi:

1. **Build cek**: `npm run build` sukses tanpa error
2. **Dev run**: `npm run dev`, buka `localhost:20127`:
   - Landing: header/nav/footer `Routix`, tidak ada `9Router`
   - Tab title: `Routix - AI Infrastructure Management`
   - Favicon: huruf `R`
   - Dashboard: brand `Routix`
3. **Manifest**: dev tools → Application → Manifest, name/short_name `Routix`, icon `Rx`
4. **CLI config**: generate config satu tool (misal codex), cek output — brand `Routix`, URL benar
5. **Data dir**: dev pakai `./data`, folder terbentuk, tidak sentuh `~/.9router`
6. **Grep audit**: `grep -ri "9router\|9Router" src/ public/ i18n/` → kosong (kecuali CHANGELOG entri lama sengaja dipertahankan)
7. **Docker build**: `docker build -t routix .` sukses, `LABEL` benar

**Batas verifikasi:**
- i18n README translate: cek 1 file sampel (zh-CN), bukan semua dibaca penuh
- Cloud sync: tidak diaktifkan (backend belum), tidak ditest end-to-end

## Out of scope

- Logo baru custom / wordmark (cuma edit teks SVG)
- Refactor semua 518 literal jadi import konstanta (over-engineering)
- Migrasi otomatis di dev (dev fresh skip)
- Backend cloud Routix (domain dimiliki, backend belum — cloud sync off)
- Git history / fork relationship GitHub (tidak disentuh)
- LICENSE file (atribusi legal tetap)