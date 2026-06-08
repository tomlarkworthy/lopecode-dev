#!/usr/bin/env bun
/**
 * Syncs a module between files. Works with .js module files and .html notebook files.
 *
 * Usage:
 *   bun tools/channel/sync-module.ts --module @author/name --source src --target dest.html
 *   bun tools/channel/sync-module.ts --module @author/name --source src --target dest.html --watch
 *   bun tools/channel/sync-module.ts --module @author/name --source src --target a.html --target b.html
 *   bun tools/channel/sync-module.ts --module @author/name --source src --target "lopebooks/notebooks/*.html"
 *
 * Source can be:
 *   - A .js file containing the module's define() function
 *   - A .html notebook file containing a <script id="@author/name"> block
 *
 * If source is a .js file that doesn't exist, extracts the module from target first,
 * creating the .js file as a starting point for editing. (Single-target mode only.)
 *
 * Target must be an .html notebook file. `--target` can be passed multiple times
 * and accepts glob patterns (expanded via Bun.Glob, so quoted globs work too).
 * The source file is auto-excluded from any glob expansion so it never overwrites itself.
 *
 * This:
 * 1. Reads module content from source (.js file or .html <script> block)
 * 2. If the module <script> already exists in target, replaces its content (update-only)
 * 3. If not, the target is SKIPPED unless `--insert-ok` is passed. This avoids
 *    accidentally adding the module to false-positive grep targets (notebooks that
 *    only mention the module name in a comment or config). Pass --insert-ok when
 *    you genuinely want to add the module to a notebook that doesn't yet bundle it.
 *
 * In multi-target mode `--watch` is disallowed and the per-target "Wrote ..." log
 * is collapsed to one line per target plus a final
 * `updated=N inserted=M unchanged=O skipped=P failed=K` summary.
 */

import { readFileSync, writeFileSync, existsSync, watch, statSync } from "fs";
import { resolve, extname } from "path";
import { Glob } from "bun";

function parseArgs() {
  const args = process.argv.slice(2);
  let moduleName = "";
  let sourcePath = "";
  const rawTargets: string[] = [];
  let watchMode = false;
  let insertOk = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--module":
        moduleName = args[++i];
        break;
      case "--source":
        sourcePath = args[++i];
        break;
      case "--target":
        rawTargets.push(args[++i]);
        break;
      case "--watch":
        watchMode = true;
        break;
      case "--insert-ok":
        insertOk = true;
        break;
    }
  }

  if (!moduleName || !sourcePath || rawTargets.length === 0) {
    console.error(
      "Usage: bun tools/channel/sync-module.ts --module <@author/name> --source <file> --target <notebook.html> [--target <more>...] [--watch] [--insert-ok]\n" +
      "  --insert-ok  Allow inserting the module into targets that don't yet bundle it.\n" +
      "               Default: skip such targets (avoids accidentally adding a module to\n" +
      "               notebooks that grep-positive only because they mention the name)."
    );
    process.exit(1);
  }

  return {
    moduleName,
    sourcePath: resolve(sourcePath),
    rawTargets,
    watchMode,
    insertOk,
  };
}

function expandTargets(rawTargets: string[], sourcePath: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of rawTargets) {
    const matches: string[] = [];
    if (/[*?[\]]/.test(raw)) {
      const glob = new Glob(raw);
      for (const match of glob.scanSync(".")) matches.push(resolve(match));
    } else {
      matches.push(resolve(raw));
    }
    for (const m of matches) {
      if (m === sourcePath) continue; // don't sync source onto itself
      if (seen.has(m)) continue;
      seen.add(m);
      out.push(m);
    }
  }
  return out;
}

export function extractModuleScriptTag(html: string, moduleId: string): string | null {
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<script\\s+id="${escaped}"[^>]*>[\\s\\S]*?</script>`
  );
  const m = html.match(pattern);
  return m ? m[0] : null;
}

export function extractModuleContent(html: string, moduleId: string): string | null {
  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<script\\s+id="${escaped}"[^>]*>([\\s\\S]*?)</script>`
  );
  const m = html.match(pattern);
  return m ? m[1].replace(/^\n/, "").replace(/\n$/, "") : null;
}

/**
 * Read the source and return the literal `<script>...</script>` block to
 * splice into targets. For .html sources we preserve the source's script tag
 * byte-exact (no wrapper rebuild) so re-syncs against an unchanged source
 * produce zero diff. For .js sources we wrap in the canonical template.
 */
function readSourceScriptBlock(sourcePath: string, moduleId: string): string {
  const ext = extname(sourcePath).toLowerCase();

  if (ext === ".js" || ext === ".ts") {
    return buildScriptBlock(moduleId, readFileSync(sourcePath, "utf8"));
  } else if (ext === ".html") {
    const html = readFileSync(sourcePath, "utf8");
    const block = extractModuleScriptTag(html, moduleId);
    if (!block) {
      console.error(`Module ${moduleId} not found in ${sourcePath}`);
      process.exit(1);
    }
    return block;
  } else {
    console.error(`Unsupported source file type: ${ext}`);
    process.exit(1);
  }
}

export type InjectResult = "updated" | "inserted" | "unchanged" | "skipped";

export function inject(
  scriptBlock: string,
  targetPath: string,
  moduleId: string,
  insertOk: boolean
): InjectResult {
  let html = readFileSync(targetPath, "utf8");

  const escaped = moduleId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const scriptPattern = new RegExp(
    `<script\\s+id="${escaped}"[^>]*>[\\s\\S]*?</script>`
  );
  const existing = html.match(scriptPattern);

  let next: string;
  let kind: InjectResult;
  if (existing) {
    if (existing[0] === scriptBlock) return "unchanged";
    const idx = html.indexOf(existing[0]);
    next = html.slice(0, idx) + scriptBlock + html.slice(idx + existing[0].length);
    kind = "updated";
  } else {
    if (!insertOk) return "skipped";
    const bootconfMarker = "<!-- Bootloader -->";
    const bootconfIdx = html.lastIndexOf(bootconfMarker);
    if (bootconfIdx === -1) {
      throw new Error("Could not find '<!-- Bootloader -->' marker in HTML");
    }
    next = html.slice(0, bootconfIdx) + scriptBlock + "\n\n" + html.slice(bootconfIdx);
    kind = "inserted";
  }
  writeFileSync(targetPath, next);
  return kind;
}

export function buildScriptBlock(moduleId: string, content: string): string {
  // Match the exporter/jumpgate output byte-exact (trailing space after the id
  // quote; newline after '>' but none before '</script>') so re-injecting an
  // unchanged module produces zero diff. `content` is stored without a trailing newline.
  return `<script id="${moduleId}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${content}</script>`;
}

function extractToJs(targetPath: string, moduleId: string, jsPath: string): void {
  const html = readFileSync(targetPath, "utf8");
  const content = extractModuleContent(html, moduleId);
  if (!content) {
    console.error(`Module ${moduleId} not found in ${targetPath} — cannot extract`);
    process.exit(1);
  }
  writeFileSync(jsPath, content);
  console.log(`Extracted ${moduleId} from ${targetPath} → ${jsPath}`);
}

function syncAll(
  sourcePath: string,
  targetPaths: string[],
  moduleId: string,
  verbose: boolean,
  insertOk: boolean
): void {
  const scriptBlock = readSourceScriptBlock(sourcePath, moduleId);

  if (targetPaths.length === 1) {
    const t = targetPaths[0];
    const result = inject(scriptBlock, t, moduleId, insertOk);
    if (result === "unchanged") {
      console.log(`Unchanged ${moduleId} in ${t} (already byte-exact)`);
      return;
    }
    if (result === "skipped") {
      console.log(`Skipped ${t}: no <script id="${moduleId}"> block (pass --insert-ok to add the module to this target)`);
      return;
    }
    const size = (statSync(t).size / 1024 / 1024).toFixed(2);
    console.log(
      result === "updated"
        ? `Updated existing ${moduleId} module`
        : `Inserted new ${moduleId} module`
    );
    console.log(`Wrote ${t} (${size} MB)`);
    return;
  }

  let updated = 0, inserted = 0, unchanged = 0, skipped = 0, failed = 0;
  for (const target of targetPaths) {
    try {
      const r = inject(scriptBlock, target, moduleId, insertOk);
      if (r === "updated") updated++;
      else if (r === "inserted") inserted++;
      else if (r === "skipped") skipped++;
      else unchanged++;
      if (verbose) console.log(`${r.padEnd(9)} ${target}`);
    } catch (e: any) {
      failed++;
      console.error(`FAIL ${target}: ${e.message}`);
    }
  }
  console.log(
    `Done. updated=${updated} inserted=${inserted} unchanged=${unchanged} skipped=${skipped} failed=${failed} (${targetPaths.length} targets)` +
    (skipped > 0 && !insertOk ? ` — ${skipped} target(s) lacked the <script id="${moduleId}"> block; pass --insert-ok to add it.` : "")
  );
}

// CLI
if (import.meta.main) {
const { moduleName, sourcePath, rawTargets, watchMode, insertOk } = parseArgs();
const targetPaths = expandTargets(rawTargets, sourcePath);

if (targetPaths.length === 0) {
  console.error("No targets matched (after excluding source). Nothing to do.");
  process.exit(1);
}

if (watchMode && targetPaths.length > 1) {
  console.error("--watch is only supported with a single target.");
  process.exit(1);
}

// If source is .js and doesn't exist, extract from target first (single-target only).
const sourceExt = extname(sourcePath).toLowerCase();
if ((sourceExt === ".js" || sourceExt === ".ts") && !existsSync(sourcePath)) {
  if (targetPaths.length !== 1) {
    console.error(
      `Source ${sourcePath} not found and multiple targets given — refusing to guess which to extract from.`
    );
    process.exit(1);
  }
  console.log(`Source ${sourcePath} not found — extracting from target`);
  extractToJs(targetPaths[0], moduleName, sourcePath);
}

// Initial sync
syncAll(sourcePath, targetPaths, moduleName, process.env.VERBOSE === "1", insertOk);

if (watchMode) {
  const target = targetPaths[0];
  console.log(`Watching ${sourcePath} for changes...`);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  watch(sourcePath, () => {
    if (debounce) clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(
        `\n${new Date().toLocaleTimeString()} — source changed, re-injecting...`
      );
      try {
        syncAll(sourcePath, [target], moduleName, false, insertOk);
      } catch (e: any) {
        console.error("Injection failed:", e.message);
      }
    }, 200);
  });
}
}
