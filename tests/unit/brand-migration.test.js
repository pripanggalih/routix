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