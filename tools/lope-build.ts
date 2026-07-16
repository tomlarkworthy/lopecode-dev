#!/usr/bin/env bun
/**
 * lope-build.ts — Rebuild notebook HTML files from the canonical /modules/ store.
 *
 * A notebook's embedded @tomlarkworthy/* module blocks are treated as build
 * OUTPUTS: this tool re-injects each from modules/<author>/<name>.js (the
 * canonical copy produced by lope-modules.ts). Update-only — it never adds a
 * module a notebook doesn't already reference, and leaves third-party blocks,
 * the bootloader, bootconf and theme untouched. Reuses sync-module's byte-exact
 * block replace, so content-identical modules produce zero diff.
 *
 * Usage:
 *   bun tools/lope-build.ts <notebook.html> [--dry-run]   # build one notebook
 *   bun tools/lope-build.ts --module @tomlarkworthy/x      # rebuild every notebook embedding x
 *   bun tools/lope-build.ts --all [--dry-run]             # rebuild all notebooks
 *   bun tools/lope-build.ts --watch                       # watch modules/, rebuild affected
 *
 * Exit code: 0 normally; with --dry-run, 1 if any notebook would change (CI gate).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, watch } from "fs";
import { join, resolve, basename, dirname } from "path";
import { buildScriptBlock, inject, extractModuleContent } from "./channel/sync-module.ts";

const ROOT = resolve(import.meta.dir, "..");
const STORE = join(ROOT, "modules");
const DIRS = [
  join(ROOT, "lopecode", "notebooks"),
  join(ROOT, "lopebooks", "notebooks"),
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const moduleFlag = args.includes("--module") ? args[args.indexOf("--module") + 1] : null;
const buildAll = args.includes("--all");
const watchMode = args.includes("--watch");

const MODULE_ID = /<script\s+id="(@tomlarkworthy\/[^/"]+)"/g;
const storePath = (id: string) => {
  const [author, name] = id.slice(1).split("/");
  return join(STORE, "@" + author, name + ".js");
};

/**
 * A module's HOME notebook is its authoring surface: file `@author_name.html`
 * owns module id `@author/name` (first `_` delimits author from name). The
 * embedded block there is the SOURCE, not a build output — so lope-build must
 * never overwrite it from the store. Instead it harvests notebook→store.
 */
function homeModuleId(path: string): string | null {
  const base = basename(path, ".html");
  if (!base.startsWith("@")) return null;
  const us = base.indexOf("_");
  if (us < 0) return null;
  return base.slice(0, us) + "/" + base.slice(us + 1);
}

function allNotebooks(): string[] {
  const out: string[] = [];
  for (const dir of DIRS) {
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) if (f.endsWith(".html")) out.push(join(dir, f));
  }
  return out;
}

function embeddedModules(html: string): string[] {
  const ids = new Set<string>();
  let m: RegExpExecArray | null;
  MODULE_ID.lastIndex = 0;
  while ((m = MODULE_ID.exec(html))) ids.add(m[1]);
  return [...ids];
}

/** Rebuild one notebook from the store. Returns per-result counts. */
function buildNotebook(path: string, onlyModule: string | null): { updated: number; unchanged: number; missing: number; harvested: number; changedIds: string[]; harvestedIds: string[] } {
  let html = readFileSync(path, "utf8");
  const ids = embeddedModules(html);
  const homeId = homeModuleId(path);
  let updated = 0, unchanged = 0, missing = 0, harvested = 0;
  const changedIds: string[] = [];
  const harvestedIds: string[] = [];

  for (const id of ids) {
    if (onlyModule && id !== onlyModule) continue;
    const sp = storePath(id);

    // Home module: the notebook block is the SOURCE. Harvest it into the store
    // rather than overwriting it — this is where authoring happens.
    if (id === homeId) {
      const content = extractModuleContent(html, id);
      if (content == null) { missing++; continue; }
      if (existsSync(sp) && readFileSync(sp, "utf8") === content) { unchanged++; continue; }
      harvested++; harvestedIds.push(id);
      if (!dryRun) { mkdirSync(dirname(sp), { recursive: true }); writeFileSync(sp, content); }
      continue;
    }

    if (!existsSync(sp)) { missing++; continue; }
    const block = buildScriptBlock(id, readFileSync(sp, "utf8"));
    // Compare in-memory to support dry-run and batch single-write.
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pat = new RegExp(`<script\\s+id="${escaped}"[^>]*>[\\s\\S]*?</script>`);
    const existing = html.match(pat);
    if (!existing) { missing++; continue; }
    if (existing[0] === block) { unchanged++; continue; }
    updated++; changedIds.push(id);
    if (!dryRun) {
      const idx = html.indexOf(existing[0]);
      html = html.slice(0, idx) + block + html.slice(idx + existing[0].length);
    }
  }
  if (updated > 0 && !dryRun) writeFileSync(path, html);
  return { updated, unchanged, missing, harvested, changedIds, harvestedIds };
}

function buildMany(paths: string[], onlyModule: string | null) {
  let totUpd = 0, totHarv = 0, totNb = 0, changedNb = 0;
  for (const p of paths) {
    const r = buildNotebook(p, onlyModule);
    totNb++;
    if (r.updated > 0 || r.harvested > 0) {
      changedNb++; totUpd += r.updated; totHarv += r.harvested;
      if (r.updated > 0) console.log(`${dryRun ? "would update" : "updated"} ${basename(p)}: ${r.changedIds.join(", ")}`);
      if (r.harvested > 0) console.log(`${dryRun ? "would harvest" : "harvested"} ${basename(p)} → store: ${r.harvestedIds.join(", ")}`);
    }
  }
  console.log(`\n${dryRun ? "DRY-RUN " : ""}${changedNb}/${totNb} notebooks ${dryRun ? "would change" : "processed"}, ${totUpd} block(s) built, ${totHarv} harvested to store.`);
  if (dryRun && changedNb > 0) process.exit(1);
}

// ---- Dispatch ----
if (watchMode) {
  console.log(`Watching ${STORE}/ — rebuilding affected notebooks on change...`);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  watch(STORE, { recursive: true }, (_e, file) => {
    if (!file || !file.endsWith(".js")) return;
    const id = "@" + file.replace(/\.js$/, ""); // @author/name
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      const affected = allNotebooks().filter((p) => embeddedModules(readFileSync(p, "utf8")).includes(id));
      console.log(`\n${id} changed → ${affected.length} affected notebook(s)`);
      buildMany(affected, id);
    }, 200);
  });
} else if (moduleFlag) {
  const affected = allNotebooks().filter((p) => embeddedModules(readFileSync(p, "utf8")).includes(moduleFlag));
  console.log(`${moduleFlag}: ${affected.length} notebook(s) embed it`);
  buildMany(affected, moduleFlag);
} else if (buildAll) {
  buildMany(allNotebooks(), null);
} else {
  const nb = args.find((a) => a.endsWith(".html"));
  if (!nb) { console.error("Provide a <notebook.html>, --module <id>, --all, or --watch"); process.exit(2); }
  const r = buildNotebook(resolve(nb), null);
  console.log(`${dryRun ? "DRY-RUN " : ""}${basename(nb)}: ${r.updated} ${dryRun ? "would update" : "updated"}, ${r.harvested} ${dryRun ? "would harvest" : "harvested"}, ${r.unchanged} unchanged, ${r.missing} not-in-store`);
  if (r.changedIds.length) console.log(`  ${dryRun ? "would change" : "changed"}: ${r.changedIds.join(", ")}`);
  if (r.harvestedIds.length) console.log(`  ${dryRun ? "would harvest" : "harvested"} → store: ${r.harvestedIds.join(", ")}`);
  if (dryRun && (r.updated > 0 || r.harvested > 0)) process.exit(1);
}
