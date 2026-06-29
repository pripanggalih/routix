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
  // Pre-rebrand data folder: ~/.9router (intentional legacy reference, do not rename)
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
  try {
    fs.rmdirSync(legacy);
  } catch {
    /* leave empty legacy dir if removal fails */
  }
  return { migrated: true, from: legacy };
}

export function getDataDir() {
  const configured = process.env.DATA_DIR;
  const target = configured || defaultDir();

  // On Windows, ignore Unix-style absolute paths (e.g. /var/lib/...) that come
  // from a Linux-targeted .env or Docker config — they are not valid here.
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