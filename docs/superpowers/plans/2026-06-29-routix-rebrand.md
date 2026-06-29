# Routix Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand fork dari `9Router` → `Routix` di semua surface visible (UI, CLI config, filesystem/package id, README/docs, logo, Docker) tanpa break dev.

**Architecture:** Hybrid — buat `src/lib/brand.js` single source of truth untuk brand constants, pakai di titik kunci (layout, manifest, dataDir). Mekanikal replace literal `9Router`→`Routix` / `9router`→`routix` di sisanya. Migrasi data legacy (`~/.9router` → target) via fungsi terpisah di `dataDir.js`, dikendalikan env `MIGRATE_LEGACY_DATA`.

**Tech Stack:** Next.js 16, React 19, vitest, Docker, Node 22.

## Global Constraints

- Display string `"9Router"` → `"Routix"`; slug/identifier `9router` → `routix`.
- Domain: `CLOUD_URL=https://routix.web.id`, `NEXT_PUBLIC_CLOUD_URL=https://routix.web.id`.
- `APP_NAME="routix"` → folder data `~/.routix`. Dev pakai `DATA_DIR=./data` (gitignored).
- `MIGRATE_LEGACY_DATA=false` default (dev skip migrasi); prod set `true` kalau mau migrasi `~/.9router`.
- Cloud sync sudah off by default (`cloudEnabled: false` di `settingsRepo.js`). Tidak tambah env flag.
- LICENSE file tidak disentuh. CHANGELOG entri lama biarkan (`9Router`).
- Buang link upstream (badge/URL `github.com/decolua/9router`, `9router.com`) dari README.
- Test runner: `npx vitest run` (config `tests/vitest.config.js`, alias `@/` → `src/`).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/lib/brand.js` (create) | Brand constants: `BRAND_NAME`, `BRAND_SLUG`, `BRAND_DOMAIN`, `CLOUD_URL`, `APP_NAME` |
| `src/lib/dataDir.js` (modify) | Pakai `APP_NAME` dari brand; fungsi `migrateLegacyData()` terpisah, dikendalikan env |
| `src/app/layout.js` (modify) | `metadata.title`/`description` pakai `BRAND_NAME` |
| `src/app/manifest.js` (modify) | `name`/`short_name` pakai `BRAND_NAME` |
| `public/favicon.svg`, `public/icons/icon-192.svg`, `public/icons/icon-512.svg` (modify) | Teks logo `9`/`9R` → `R`/`Rx` |
| `src/app/landing/**`, `src/app/(dashboard)/**` (modify) | Mekanikal replace brand literal |
| `src/app/api/cli-tools/**` (modify) | Replace brand di generated config |
| `src/app/api/{version,auth/login,...}/**` (modify) | Replace teks visible |
| `package.json` (modify) | name `9router-app` → `routix-app` |
| `.env.example`, `.env` (modify) | `CLOUD_URL`, `NEXT_PUBLIC_CLOUD_URL`, `MIGRATE_LEGACY_DATA`, `DATA_DIR` |
| `docker-compose.yml`, `start.sh`, `Dockerfile` (modify) | container/image/volume `9router`→`routix` |
| `README.md`, `README.zh-CN.md`, `i18n/README.*.md`, `DOCKER.md`, `docs/`, `gitbook/` (modify) | Replace brand, buang upstream link |
| `tests/unit/brand-migration.test.js` (create) | Test `migrateLegacyData()` |

---

### Task 1: Brand constants module

**Files:**
- Create: `src/lib/brand.js`

**Interfaces:**
- Produces: `BRAND_NAME="Routix"`, `BRAND_SLUG="routix"`, `BRAND_DOMAIN="routix.web.id"`, `CLOUD_URL="https://routix.web.id"`, `APP_NAME="routix"` (named exports)

- [ ] **Step 1: Create `src/lib/brand.js`**

```js
// Single source of truth for Routix brand identity.
// Import from here instead of hardcoding "Routix"/"routix" in key surfaces.

export const BRAND_NAME = "Routix";        // display name
export const BRAND_SLUG = "routix";        // lowercase: filesystem, package, URL
export const BRAND_DOMAIN = "routix.web.id";
export const CLOUD_URL = `https://${BRAND_DOMAIN}`;
export const APP_NAME = BRAND_SLUG;        // → ~/.routix
```

- [ ] **Step 2: Verify import works**

Run: `node -e "import('./src/lib/brand.js').then(m => console.log(m.BRAND_NAME, m.APP_NAME, m.CLOUD_URL))"`
Expected: `Routix routix https://routix.web.id`

- [ ] **Step 3: Commit**

```bash
git add src/lib/brand.js
git commit -m "feat(brand): add Routix brand constants module"
```

---

### Task 2: dataDir.js — APP_NAME from brand + legacy migration

**Files:**
- Modify: `src/lib/dataDir.js`
- Test: `tests/unit/brand-migration.test.js`

**Interfaces:**
- Consumes: `APP_NAME` from `src/lib/brand.js` (Task 1)
- Produces: `migrateLegacyData(targetDir, { legacyDir, enabled })` — returns `{ migrated: boolean, from?: string }`. `getDataDir()` memanggilnya dengan `enabled = process.env.MIGRATE_LEGACY_DATA === "true"`.

- [ ] **Step 1: Write failing test for migration**

Create `tests/unit/brand-migration.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { migrateLegacyData } from "@/lib/dataDir.js";

describe("migrateLegacyData", () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "routix-mig-"));
  });
  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("migrates legacy dir into empty target when enabled", () => {
    const legacy = path.join(tmpRoot, "legacy-9router");
    const target = path.join(tmpRoot, "target-routix");
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, "data.db"), "fake");

    const result = migrateLegacyData(target, { legacyDir: legacy, enabled: true });

    expect(result.migrated).toBe(true);
    expect(result.from).toBe(legacy);
    expect(fs.existsSync(path.join(target, "data.db"))).toBe(true);
  });

  it("skips when disabled", () => {
    const legacy = path.join(tmpRoot, "legacy-9router");
    const target = path.join(tmpRoot, "target-routix");
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, "data.db"), "fake");

    const result = migrateLegacyData(target, { legacyDir: legacy, enabled: false });

    expect(result.migrated).toBe(false);
    expect(fs.existsSync(path.join(target, "data.db"))).toBe(false);
  });

  it("skips when legacy dir does not exist", () => {
    const target = path.join(tmpRoot, "target-routix");
    const result = migrateLegacyData(target, { legacyDir: path.join(tmpRoot, "nope"), enabled: true });
    expect(result.migrated).toBe(false);
  });

  it("skips when target already has content", () => {
    const legacy = path.join(tmpRoot, "legacy-9router");
    const target = path.join(tmpRoot, "target-routix");
    fs.mkdirSync(legacy, { recursive: true });
    fs.writeFileSync(path.join(legacy, "old.db"), "fake");
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "existing.db"), "keep");

    const result = migrateLegacyData(target, { legacyDir: legacy, enabled: true });

    expect(result.migrated).toBe(false);
    expect(fs.existsSync(path.join(target, "old.db"))).toBe(false);
    expect(fs.existsSync(path.join(target, "existing.db"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/brand-migration.test.js`
Expected: FAIL — `migrateLegacyData` is not exported / not a function.

- [ ] **Step 3: Implement — rewrite `src/lib/dataDir.js`**

Replace entire file with:

```js
import fs from "node:fs";
import path from "path";
import os from "os";
import { APP_NAME } from "@/lib/brand.js";

function defaultDir() {
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), APP_NAME);
  }
  return path.join(os.homedir(), `.${APP_NAME}`);
}

function legacyDir() {
  // Pre-rebrand data folder: ~/.9router
  if (process.platform === "win32") {
    return path.join(process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"), "9router");
  }
  return path.join(os.homedir(), ".9router");
}

// Move contents of legacy ~/.9router into target if:
//  - enabled (env MIGRATE_LEGACY_DATA=true)
//  - legacy dir exists
//  - target is empty
// Returns { migrated, from? }.
export function migrateLegacyData(target, { legacyDir: legacy = legacyDir(), enabled } = {}) {
  if (!enabled) return { migrated: false };
  if (!fs.existsSync(legacy)) return { migrated: false };

  fs.mkdirSync(target, { recursive: true });
  const existing = fs.readdirSync(target);
  if (existing.length > 0) return { migrated: false };

  const entries = fs.readdirSync(legacy);
  for (const entry of entries) {
    fs.renameSync(path.join(legacy, entry), path.join(target, entry));
  }
  try { fs.rmdirSync(legacy); } catch { /* leave empty legacy dir if removal fails */ }
  return { migrated: true, from: legacy };
}

export function getDataDir() {
  const configured = process.env.DATA_DIR;
  const target = configured || defaultDir();

  if (process.platform === "win32" && configured && /^\//.test(configured)) {
    console.warn(`[DATA_DIR] '${configured}' is a Unix path on Windows → fallback to default`);
    return defaultDir();
  }

  try {
    fs.mkdirSync(target, { recursive: true });
    migrateLegacyData(target, { enabled: process.env.MIGRATE_LEGACY_DATA === "true" });
    return target;
  } catch (e) {
    if (e?.code === "EACCES" || e?.code === "EPERM") {
      console.warn(`[DATA_DIR] '${target}' not writable → fallback ~/.${APP_NAME}`);
      return defaultDir();
    }
    throw e;
  }
}

export const DATA_DIR = getDataDir();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/brand-migration.test.js`
Expected: PASS — 4 tests passed.

- [ ] **Step 5: Run full unit suite to check no regression**

Run: `npx vitest run`
Expected: no new failures vs baseline (ignore pre-existing flaky provider/cloud tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/dataDir.js tests/unit/brand-migration.test.js
git commit -m "feat(dataDir): use APP_NAME from brand + legacy ~/.9router migration"
```

---

### Task 3: layout.js + manifest.js — brand via constants

**Files:**
- Modify: `src/app/layout.js:19-30`
- Modify: `src/app/manifest.js`

**Interfaces:**
- Consumes: `BRAND_NAME` from `src/lib/brand.js`

- [ ] **Step 1: Read current `src/app/layout.js` metadata block**

Run: `sed -n '1,35p' src/app/layout.js`
Note exact import lines and `metadata` object for the edit.

- [ ] **Step 2: Add brand import to `layout.js`**

Add to the import section (after existing imports):

```js
import { BRAND_NAME } from "@/lib/brand.js";
```

- [ ] **Step 3: Replace metadata in `layout.js`**

Replace `title: "9Router - AI Infrastructure Management"` and any `9Router` in the metadata block with template using `BRAND_NAME`:

```js
export const metadata = {
  title: `${BRAND_NAME} - AI Infrastructure Management`,
  description: `${BRAND_NAME} dashboard ...`, // keep existing description text, only swap brand word
  ...
};
```

(Read the full metadata block first; preserve all other fields. Only swap `9Router` → `${BRAND_NAME}` in title/description strings.)

- [ ] **Step 4: Update `src/app/manifest.js`**

Add import and swap `name`/`short_name`:

```js
import { BRAND_NAME } from "@/lib/brand.js";

export default function manifest() {
  return {
    name: `${BRAND_NAME} - AI Infrastructure Management`,
    short_name: BRAND_NAME,
    // ... preserve rest (icons, etc.)
  };
}
```

- [ ] **Step 5: Verify build compiles**

Run: `npx next build --webpack 2>&1 | tail -20` (or skip full build if slow — at minimum run `node -e "import('./src/app/manifest.js')"` won't work for Next route; rely on Task 10 build). For now verify no syntax error:

Run: `node --check src/app/layout.js && node --check src/app/manifest.js`
Expected: no syntax error output.

- [ ] **Step 6: Commit**

```bash
git add src/app/layout.js src/app/manifest.js
git commit -m "feat(ui): use BRAND_NAME in layout metadata + PWA manifest"
```

---

### Task 4: Logo & favicon SVG teks

**Files:**
- Modify: `public/favicon.svg`
- Modify: `public/icons/icon-192.svg`
- Modify: `public/icons/icon-512.svg`

- [ ] **Step 1: Replace teks di `public/favicon.svg`**

Edit the `<text>` element: change `>9<` to `>R<`.

Current:
```xml
<text x="16" y="24" ... text-anchor="middle">9</text>
```
New:
```xml
<text x="16" y="24" ... text-anchor="middle">R</text>
```

- [ ] **Step 2: Replace teks di `public/icons/icon-192.svg`**

Change `>9R<` to `>Rx<`:

```xml
<text x="96" y="120" ... text-anchor="middle">Rx</text>
```

- [ ] **Step 3: Replace teks di `public/icons/icon-512.svg`**

Change `>9R<` to `>Rx<`:

```xml
<text x="256" y="320" ... text-anchor="middle">Rx</text>
```

- [ ] **Step 4: Verify no brand char left in SVGs**

Run: `grep -l "9R\|>9<" public/favicon.svg public/icons/icon-192.svg public/icons/icon-512.svg`
Expected: no output (empty).

- [ ] **Step 5: Commit**

```bash
git add public/favicon.svg public/icons/icon-192.svg public/icons/icon-512.svg
git commit -m "feat(brand): replace logo teks 9/9R → R/Rx"
```

---

### Task 5: UI visible mekanikal replace — landing + dashboard

**Files:**
- Modify (landing): `src/app/landing/components/HeroSection.js`, `Navigation.js`, `Footer.js`, `HowItWorks.js`, `GetStarted.js`, `FlowAnimation.js`, `src/app/landing/page.js`
- Modify (dashboard): `src/app/(dashboard)/dashboard/usage/components/ProviderTopology.js`, `src/app/(dashboard)/dashboard/cli-tools/components/ToolSummaryCard.js`, semua `*ToolCard.js` di `src/app/(dashboard)/dashboard/cli-tools/components/`

**Approach:** mechanical replace. Two patterns:
- `"9Router` → `"Routix` (display strings, including inside template literals/backticks: `` `9Router` → `` `Routix` ``)
- `9router` (lowercase, slug/identifier in text/URLs) → `routix`

Do NOT touch `import` paths, variable names like `has9RouterConfig` (those are Task 6, CLI config), or `src/lib/brand.js`.

- [ ] **Step 1: List exact occurrences in scope**

Run:
```bash
grep -rniE "9router|9Router" src/app/landing/ "src/app/(dashboard)/" | grep -v "cli-tools/components/.*ToolCard" | wc -l
```
Note the count. Then for `*ToolCard.js`:
```bash
grep -rniE "9router|9Router" "src/app/(dashboard)/dashboard/cli-tools/components/" | wc -l
```

- [ ] **Step 2: Replace in landing files**

For each landing file, run:
```bash
perl -pi -e 's/9Router/Routix/g; s/9router/routix/g' src/app/landing/components/HeroSection.js src/app/landing/components/Navigation.js src/app/landing/components/Footer.js src/app/landing/components/HowItWorks.js src/app/landing/components/GetStarted.js src/app/landing/components/FlowAnimation.js src/app/landing/page.js
```

- [ ] **Step 3: Replace in dashboard files (non-ToolCard + ToolCard)**

```bash
perl -pi -e 's/9Router/Routix/g; s/9router/routix/g' "src/app/(dashboard)/dashboard/usage/components/ProviderTopology.js" "src/app/(dashboard)/dashboard/cli-tools/components/"*.js
```

- [ ] **Step 4: Verify none left in scope**

Run:
```bash
grep -rniE "9router|9Router" src/app/landing/ "src/app/(dashboard)/"
```
Expected: empty (Task 6 will handle remaining cli-tools API routes separately; dashboard component files should be clean).

- [ ] **Step 5: Spot-check one file for natural prose**

Run: `grep -niE "routix|Routix" src/app/landing/components/HeroSection.js`
Read surrounding lines to ensure prose reads naturally (no "Routix is Routix" duplication).

- [ ] **Step 6: Commit**

```bash
git add src/app/landing "src/app/(dashboard)"
git commit -m "feat(brand): rebrand UI teks landing + dashboard → Routix"
```

---

### Task 6: CLI tool config routes — brand replace

**Files:**
- Modify: semua `src/app/api/cli-tools/*-settings/route.js`, `src/app/api/cli-tools/cowork-mcp-tools/route.js`, `src/app/api/cli-tools/cowork-mcp-registry/route.js`, `src/app/api/cli-tools/antigravity-mitm/route.js`

**Note:** These files contain both display strings AND identifiers used in generated user config (e.g. `model_provider = "9router"`, `[model_providers.9router]`, `name: "9Router"`). All rename to `routix`/`Routix`. Function names like `has9RouterConfig` → `hasRoutixConfig`.

- [ ] **Step 1: Enumerate files**

Run:
```bash
ls src/app/api/cli-tools/
```
Note all `*-settings/route.js` plus `cowork-mcp-*`, `antigravity-mitm`.

- [ ] **Step 2: Mechanical replace across all cli-tools routes**

```bash
find src/app/api/cli-tools -name "route.js" -print0 | xargs -0 perl -pi -e 's/9Router/Routix/g; s/9router/routix/g'
```

- [ ] **Step 3: Verify none left**

Run:
```bash
grep -rniE "9router|9Router" src/app/api/cli-tools/
```
Expected: empty.

- [ ] **Step 4: Spot-check codex-settings for identifier consistency**

Run: `grep -niE "routix|Routix" src/app/api/cli-tools/codex-settings/route.js`
Confirm `hasRoutixConfig`, `model_provider = "routix"`, `[model_providers.routix]`, `name: "Routix"` all consistent (no orphan `9router`).

- [ ] **Step 5: Run unit tests (cli-tools normalization tests if any)**

Run: `npx vitest run tests/unit/codex-tool-normalization.test.js`
Expected: PASS (if test references old `9router` identifier, update test fixtures to `routix` too).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/cli-tools
git commit -m "feat(brand): rebrand CLI tool config generators → Routix"
```

---

### Task 7: API routes teks visible (non cli-tools)

**Files:**
- Modify: `src/app/api/auth/login/route.js`, `src/app/api/version/route.js`, `src/app/api/version/update/route.js`, `src/app/api/proxy-pools/deno-deploy/route.js`, `src/app/api/providers/[id]/test/testUtils.js`, `src/app/api/headroom/start/route.js`, dan lain yang punya brand literal (cek grep).

- [ ] **Step 1: Find all remaining brand occurrences in src/app/api (exclude cli-tools)**

Run:
```bash
grep -rliE "9router|9Router" src/app/api | grep -v cli-tools
```

- [ ] **Step 2: Replace each file**

```bash
grep -rliE "9router|9Router" src/app/api | grep -v cli-tools | xargs perl -pi -e 's/9Router/Routix/g; s/9router/routix/g'
```

- [ ] **Step 3: Verify**

Run:
```bash
grep -rniE "9router|9Router" src/app/api | grep -v cli-tools
```
Expected: empty.

- [ ] **Step 4: Commit**

```bash
git add src/app/api
git commit -m "feat(brand): rebrand API routes teks visible → Routix"
```

---

### Task 8: Sisa src/ (lib, components di luar landing/dashboard) + package.json

**Files:**
- Modify: sisa `src/` yang masih ada brand literal (cek grep)
- Modify: `package.json:2`

- [ ] **Step 1: Find remaining brand in src/ (exclude brand.js, dataDir.js — dataDir handled)**

Run:
```bash
grep -rliE "9router|9Router" src/ | grep -vE "src/lib/brand.js"
```
Note: `src/lib/dataDir.js` should already be clean (legacy `~/.9router` string is intentional reference, kept). Verify it only has the legacy reference string, not display brand.

- [ ] **Step 2: Replace remaining src/ files**

```bash
grep -rliE "9router|9Router" src/ | grep -vE "src/lib/brand.js" | xargs perl -pi -e 's/9Router/Routix/g; s/9router/routix/g'
```

**Caution:** `src/lib/dataDir.js` contains `legacyDir()` returning `~/.9router` — that string is intentional (migration source). After perl replace it would become `~/.routix` which breaks migration. Re-check and restore the legacy path string in `dataDir.js` if perl touched it:

Run: `grep -n "9router\|routix" src/lib/dataDir.js`
Confirm `legacyDir()` still returns `".9router"` / `"9router"`. If changed, restore to `"9router"`.

- [ ] **Step 3: Update `package.json` name**

Edit `package.json` line 2:
```json
  "name": "routix-app",
```

- [ ] **Step 4: Verify src/ clean (except intentional legacy ref + CHANGELOG not in src)**

Run:
```bash
grep -rniE "9router|9Router" src/ | grep -v "src/lib/dataDir.js"
```
Expected: empty.

Run: `grep -n "9router" src/lib/dataDir.js`
Expected: only the `legacyDir()` reference lines (intentional).

- [ ] **Step 5: Run unit suite**

Run: `npx vitest run`
Expected: no new failures vs baseline.

- [ ] **Step 6: Commit**

```bash
git add src/ package.json
git commit -m "feat(brand): rebrand sisa src/ + package.json name → routix-app"
```

---

### Task 9: Env contract

**Files:**
- Modify: `.env.example`
- Modify: `.env` (create if absent)

- [ ] **Step 1: Read current `.env.example`**

Run: `cat .env.example`

- [ ] **Step 2: Update `.env.example`**

Edit:
- `CLOUD_URL=https://routix.web.id`
- `NEXT_PUBLIC_CLOUD_URL=https://routix.web.id`
- Tambahkan section:
```
# Data dir — dev: project-local (gitignored); prod: /var/lib/routix or ~/.routix
DATA_DIR=./data
# Migrate legacy ~/.9router into DATA_DIR on first run (true/false). Dev: false (fresh).
MIGRATE_LEGACY_DATA=false
```
- Hapus/ubah referensi `9router.com` → `routix.web.id` di komentar.

- [ ] **Step 3: Create `.env` for dev (copy from example)**

```bash
cp .env.example .env
```
Edit `.env`:
- `JWT_SECRET=` → generate random: `openssl rand -hex 32` output
- `INITIAL_PASSWORD=` → set dev password
- `DATA_DIR=./data`
- `MIGRATE_LEGACY_DATA=false`
- `NODE_ENV=development`
- `CLOUD_URL=https://routix.web.id`
- `BASE_URL=http://localhost:20127`
- `NEXT_PUBLIC_BASE_URL=http://localhost:20127`

- [ ] **Step 4: Verify .env gitignored**

Run: `git check-ignore .env`
Expected: `.env` (confirmed ignored, won't be committed).

- [ ] **Step 5: Commit `.env.example` only**

```bash
git add .env.example
git commit -m "feat(env): update .env.example for Routix (cloud url, data dir, migration flag)"
```

---

### Task 10: Docker files

**Files:**
- Modify: `docker-compose.yml`
- Modify: `start.sh`
- Modify: `Dockerfile`

- [ ] **Step 1: Update `docker-compose.yml`**

Replace service `9router` → `routix`:
```yaml
services:
  routix:
    build: .
    container_name: routix
    restart: always
    ports:
      - "20128:20128"
    volumes:
      - routix-data:/app/data
    env_file:
      - .env
    environment:
      DATA_DIR: /app/data
      PORT: "20128"
      HOSTNAME: "0.0.0.0"
      NODE_ENV: production
      HEADROOM_URL: http://headroom:8787
    depends_on:
      - headroom

  headroom:
    image: ghcr.io/chopratejas/headroom:latest
    container_name: headroom
    restart: always
    ports:
      - "8787:8787"

volumes:
  routix-data:
    name: routix-data
```
(Replace upstream `image: decolua/9router:latest` with `build: .` — build local fork.)

- [ ] **Step 2: Update `start.sh`**

```bash
docker stop routix
docker rm routix
docker build -t routix .
docker run -d --name routix -p 20128:20128 --env-file .env -v routix-data:/app/data routix
```

- [ ] **Step 3: Update `Dockerfile`**

- Line with `LABEL org.opencontainers.image.title="9router"` → `LABEL org.opencontainers.image.title="routix"`
- Line `ln -sf /app/data-home /root/.9router` → `ln -sf /app/data-home /root/.routix`
- Cek label/deskripsi lain: `grep -niE "9router" Dockerfile`, replace brand.

- [ ] **Step 4: Verify no brand left in Docker files**

Run: `grep -niE "9router|9Router" docker-compose.yml start.sh Dockerfile captain-definition`
Expected: empty.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml start.sh Dockerfile
git commit -m "feat(docker): rename container/image/volume 9router → routix, build local"
```

---

### Task 11: README + docs + i18n + CHANGELOG

**Files:**
- Modify: `README.md`, `README.zh-CN.md`
- Modify: `i18n/README.zh-CN.md`, `i18n/README.ru.md`, `i18n/README.ja-JP.md`, `i18n/README.vi.md`
- Modify: `DOCKER.md`
- Modify: `docs/`, `gitbook/` files with brand (cek grep)
- Modify: `CHANGELOG.md` — only header/brand mention if present; entri lama biarkan

**Approach:** mechanical replace `9Router`→`Routix`, `9router`→`routix`, `9router.com`→`routix.web.id`, `github.com/decolua/9router`→buang link/badge.

- [ ] **Step 1: Buang upstream badge/link di `README.md` (lines 10-14, 18, 193, 1086, 1099, 1117)**

Hapus baris badge:
```markdown
[![npm](https://img.shields.io/npm/v/9router.svg)](https://www.npmjs.com/package/9router)
[![Downloads](https://img.shields.io/npm/dm/9router.svg)](https://www.npmjs.com/package/9router)
[![Docker Pulls](https://img.shields.io/docker/pulls/decolua/9router.svg?logo=docker&label=Docker%20pulls)](https://hub.docker.com/r/decolua/9router)
[![GHCR](https://img.shields.io/badge/GHCR-decolua%2F9router-blue?logo=github)](https://github.com/decolua/9router/pkgs/container/9router)
[![License](https://img.shields.io/npm/l/9router.svg)](https://github.com/decolua/9router/blob/main/LICENSE)
```
Ganti link `https://9router.com` → `https://routix.web.id`.
Ganti `git clone https://github.com/decolua/9router.git` → `git clone <fork repo url>` (atau hapus URL upstream, ganti placeholder `git clone <your-routix-repo>.git`).
Hapus/ubah PR link `https://github.com/decolua/9router/pulls` reference (line 193) — rephrase tanpa upstream link.

- [ ] **Step 2: Mechanical replace brand di README**

```bash
perl -pi -e 's|9router\.com|routix.web.id|g; s|9Router|Routix|g; s|9router|routix|g' README.md README.zh-CN.md
```

- [ ] **Step 3: Replace i18n README**

```bash
perl -pi -e 's|9router\.com|routix.web.id|g; s|9Router|Routix|g; s|9router|routix|g' i18n/README.zh-CN.md i18n/README.ru.md i18n/README.ja-JP.md i18n/README.vi.md
```

- [ ] **Step 4: Replace DOCKER.md**

```bash
perl -pi -e 's|9router\.com|routix.web.id|g; s|9Router|Routix|g; s|9router|routix|g' DOCKER.md
```

- [ ] **Step 5: Find + replace docs/ and gitbook/ brand**

Run:
```bash
grep -rliE "9router|9Router" docs/ gitbook/ 2>/dev/null
```
Replace:
```bash
grep -rliE "9router|9Router" docs/ gitbook/ 2>/dev/null | xargs perl -pi -e 's|9router\.com|routix.web.id|g; s|9Router|Routix|g; s|9router|routix|g'
```

- [ ] **Step 6: CHANGELOG — only new entry header, keep history**

Run: `grep -niE "9router|9Router" CHANGELOG.md | head`
Jika ada header brand di atas, ganti ke `Routix`. **Jangan** ganti entri lama (sebut `9Router` di body history) — biarkan.

Add new entry at top:
```markdown
# v0.5.13 (2026-06-29)
- rebrand: 9Router → Routix (UI, CLI config, docs, Docker, package id)
- feat(dataDir): legacy ~/.9router migration via MIGRATE_LEGACY_DATA
- cloud: CLOUD_URL → https://routix.web.id (sync off until backend ready)
```

- [ ] **Step 7: Verify README/docs clean of upstream + brand**

Run:
```bash
grep -niE "github.com/decolua|9router\.com" README.md README.zh-CN.md i18n/README.*.md DOCKER.md
```
Expected: empty.

Run:
```bash
grep -rniE "9router|9Router" docs/ gitbook/ DOCKER.md i18n/ README.md README.zh-CN.md
```
Expected: empty (CHANGELOG entri lama dikecualikan).

- [ ] **Step 8: Spot-check zh-CN sample**

Run: `grep -niE "Routix|routix" i18n/README.zh-CN.md | head`
Confirm prose natural (CJK + Latin mix reads OK).

- [ ] **Step 9: Commit**

```bash
git add README.md README.zh-CN.md i18n DOCKER.md docs gitbook CHANGELOG.md
git commit -m "docs: rebrand 9Router → Routix, remove upstream links, add changelog entry"
```

---

### Task 12: Final verification

- [ ] **Step 1: Full grep audit src/ + public/**

Run:
```bash
grep -rniE "9router|9Router" src/ public/ | grep -v "src/lib/dataDir.js"
```
Expected: empty (dataDir legacy ref intentional).

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: sukses, no error. Note any pre-existing warnings.

- [ ] **Step 3: Run dev server**

Run: `npm run dev` (background or new terminal)
Buka `http://localhost:20127`:
- Landing header/nav/footer: `Routix`, no `9Router`
- Tab title: `Routix - AI Infrastructure Management`
- Favicon: huruf `R`
- Dashboard: brand `Routix`

- [ ] **Step 4: Manifest check**

Dev tools → Application → Manifest:
- `name`: `Routix - AI Infrastructure Management`
- `short_name`: `Routix`
- icon `Rx`

- [ ] **Step 5: Data dir check**

Run: `ls -la ./data` (after dev run)
Expected: folder created, no `~/.9router` touched.

Run: `ls -la ~/.9router 2>/dev/null` — should be untouched/absent.

- [ ] **Step 6: CLI config sample**

Generate config via dashboard for one tool (e.g. Codex) or hit endpoint. Check generated config text: brand `Routix`, `model_provider = "routix"`, URL correct.

- [ ] **Step 7: Docker build (optional, if Docker available)**

Run: `docker build -t routix .`
Expected: sukses. `docker inspect routix | grep -i title` → `routix`.

- [ ] **Step 8: Run unit suite final**

Run: `npx vitest run`
Expected: no new failures vs baseline.

- [ ] **Step 9: Final commit if any verification fixes**

If verification surfaced fixes, commit them:
```bash
git add -A
git commit -m "fix(brand): verification fixes from rebrand audit"
```

---

## Self-Review notes

- Spec coverage: brand constants (T1), dataDir+migration (T2), layout+manifest (T3), logo (T4), UI (T5), CLI config (T6), API routes (T7), sisa src+package (T8), env (T9), Docker (T10), README/docs (T11), verify (T12). All spec sections covered.
- Cloud sync: spec mentioned `CLOUD_SYNC_ENABLED` guard — replaced by existing `cloudEnabled: false` default in `settingsRepo.js` (verified). No new flag. Documented in Global Constraints.
- Type consistency: `migrateLegacyData(target, { legacyDir, enabled })` signature consistent across T2 test + impl.
- dataDir legacy ref: T8 Step 2 has explicit caution to preserve `~/.9router` string in `legacyDir()`.