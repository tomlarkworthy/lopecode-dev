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

import { readFileSync, writeFileSync, existsSync, readdirSync, watch, statSync } from "fs";
import { resolve, extname, relative, join } from "path";
import { Glob } from "bun";
import { loadIndex, saveIndex, loadCanonical, shaOfBlock, deriveIndex, reposOf } from "../lope-sync.ts";

const REPO_ROOT = resolve(import.meta.dir, "../..");

function parseArgs() {
  const args = process.argv.slice(2);
  let moduleName = "";
  let sourcePath = "";
  const rawTargets: string[] = [];
  let watchMode = false;
  let insertOk = false;
  let force = false;

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
      case "--force":
        force = true;
        break;
    }
  }

  if (!moduleName || !sourcePath || rawTargets.length === 0) {
    console.error(
      "Usage: bun tools/channel/sync-module.ts --module <@author/name> --source <file> --target <notebook.html> [--target <more>...] [--watch] [--insert-ok] [--force]\n" +
      "  --insert-ok  Allow inserting the module into targets that don't yet bundle it.\n" +
      "               Default: skip such targets (avoids accidentally adding a module to\n" +
      "               notebooks that grep-positive only because they mention the name).\n" +
      "  --force      Override the canonical/staleness guards (see lope-sync)."
    );
    process.exit(1);
  }

  return {
    moduleName,
    sourcePath: resolve(sourcePath),
    rawTargets,
    watchMode,
    insertOk,
    force,
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
  // unchanged module produces zero diff. `content` is stored without a trailing
  // newline — strip one if an editor added it, else every target gets a spurious
  // full-block diff.
  return `<script id="${moduleId}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${content.replace(/\n$/, "")}</script>`;
}

/**
 * Compare-and-swap guard. Two ways a push silently destroys work:
 *   (a) sourcing from a notebook that is not the module's declared canonical —
 *       spreading a stale copy that merely looked authoritative;
 *   (b) pushing a working copy whose canonical has moved since checkout (a
 *       save-in-place, a jumpgate, another agent) — a lost update.
 * Both are refused rather than warned: the failure mode is an agent that forgot
 * to check, so the check has to live on the write path. Only fires for declared
 * modules and tracked checkouts, so untracked ad-hoc syncs behave as before.
 */
function preflight(sourcePath: string, moduleId: string, force: boolean): void {
  const srcRel = relative(REPO_ROOT, sourcePath);
  const decl = loadCanonical()[moduleId];

  if (extname(sourcePath).toLowerCase() === ".html" && decl) {
    const declared = Object.values(decl);
    if (!declared.includes(srcRel)) {
      const msg =
        `REFUSING: ${srcRel} is not the declared canonical for ${moduleId}.\n` +
        `  declared: ${declared.join(", ")}\n` +
        `  That notebook holds a consumer copy, which may be stale. Source from the\n` +
        `  canonical, or pass --force if you really mean to promote this copy.`;
      if (!force) { console.error(msg); process.exit(1); }
      console.warn(msg.replace("REFUSING", "WARNING (--force)"));
    }
  }

  const co = loadIndex()[srcRel];
  if (co) {
    const now = shaOfBlock(co.canonical, co.module);
    if (now !== null && now !== co.baseSha) {
      const msg =
        `REFUSING: canonical for ${moduleId} moved since checkout — pushing would clobber it.\n` +
        `  ${co.canonical}\n` +
        `  checked out at ${co.baseSha.slice(0, 12)} (${co.at}), now ${now.slice(0, 12)}\n` +
        `  Run: bun tools/lope-sync.ts pull ${moduleId}   (or --force to overwrite)`;
      if (!force) { console.error(msg); process.exit(1); }
      console.warn(msg.replace("REFUSING", "WARNING (--force)"));
    }
  }
}

/**
 * Re-stamp the checkout's base to whatever canonical now holds. Pushing to
 * canonical makes it match the working copy (status → clean); pushing only to
 * consumers leaves canonical untouched (status stays `modified`, correctly —
 * the edits are not yet in the source).
 */
function restamp(sourcePath: string, moduleId: string): void {
  const srcRel = relative(REPO_ROOT, sourcePath);
  const idx = loadIndex();
  const co = idx[srcRel];
  if (!co) return;
  const now = shaOfBlock(co.canonical, co.module);
  if (now === null || now === co.baseSha) return;
  idx[srcRel] = { ...co, baseSha: now, at: new Date().toISOString() };
  saveIndex(idx);
  console.log(`lope-sync: rebased ${moduleId} checkout to ${now.slice(0, 12)}`);
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

/**
 * A module's attachments are separate `<script id="<module>/<name>">` blocks, and a
 * `--source` .js working copy contains none of them — so inserting a module into a
 * notebook that never had it left the attachments behind and the module dead at
 * boot (measured: installing `@tomlarkworthy/prosemirror` gave two
 * `missing-attachment` findings from lope-preflight). Carry them from the declared
 * canonical, which is the only place they are known to be current. Only blocks this
 * module *owns*; a missing dependency module is a different repair
 * (`--all-canonical --carry-deps`) and preflight names it either way.
 */
function carryOwnedBlocks(moduleId: string, targetPath: string): string[] {
  const decl = loadCanonical()[moduleId];
  if (!decl) return [];
  const tRel = relative(REPO_ROOT, targetPath);
  const repo = tRel.split("/")[0];
  const canonRel = decl[repo] ?? Object.values(decl)[0];
  const canonHtml = readFileSync(join(REPO_ROOT, canonRel), "utf8");
  const carried: string[] = [];
  for (const id of ownedBlockIds(canonHtml, moduleId)) {
    if (idsIn(targetPath).has(id)) continue;
    const b = rawBlock(canonHtml, id);
    if (b && insertBefore(targetPath, moduleId, b)) {
      idCache.delete(targetPath);
      carried.push(id.slice(moduleId.length + 1));
    }
  }
  return carried;
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
    console.log(
      result === "updated"
        ? `Updated existing ${moduleId} module`
        : `Inserted new ${moduleId} module`
    );
    if (result === "inserted") {
      const carried = carryOwnedBlocks(moduleId, t);
      if (carried.length) console.log(`  carried ${carried.length} attachment(s): ${carried.join(", ")}`);
    }
    console.log(`Wrote ${t} (${(statSync(t).size / 1024 / 1024).toFixed(2)} MB)`);
    return;
  }

  let updated = 0, inserted = 0, unchanged = 0, skipped = 0, failed = 0;
  for (const target of targetPaths) {
    try {
      const r = inject(scriptBlock, target, moduleId, insertOk);
      if (r === "updated") updated++;
      else if (r === "inserted") { inserted++; carryOwnedBlocks(moduleId, target); }
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


// ------------------------------------------------------- corpus-wide canonical sync

/** Module ids a block imports — see lope-preflight.ts for why these are excluded. */
function importsOf(src: string): string[] {
  return [...src.matchAll(/main\.define\("module ([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => /^@[^/${]+\/[^/${]+$/.test(id) && id !== "@x");
}

/** FileAttachment names a block expects, from the generated loader map. */
function attachmentsOf(src: string): string[] {
  const m = src.match(/const fileAttachments = new Map\(\[([\s\S]*?)\]\.map\(/);
  if (!m) return [];
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
}

/** Every `<script id=…>` block id, whatever its mime. `blocksIn` deliberately returns
 *  only module blocks (JS mime, <=2 path segments), so it cannot see attachments —
 *  using it here made every attachment look absent. */
function allIds(html: string): string[] {
  return [...html.matchAll(/<script\s+id="([^"]+)"/g)].map((m) => m[1]);
}

/** Every block id the canonical owns by prefix — its attachments plus any content
 *  it reads off the DOM itself (markdown-wiki scans for its own docs). */
function ownedBlockIds(html: string, moduleId: string): string[] {
  return allIds(html).filter((id) => id.startsWith(moduleId + "/"));
}

/** Insert a block immediately before `moduleId`'s block: a module's own content must
 *  precede it. Returns false if the anchor is missing. */
function insertBefore(targetPath: string, moduleId: string, block: string): boolean {
  const html = readFileSync(targetPath, "utf8");
  const anchor = extractModuleScriptTag(html, moduleId);
  if (!anchor) return false;
  const at = html.indexOf(anchor);
  writeFileSync(targetPath, html.slice(0, at) + block + "\n\n" + html.slice(at));
  return true;
}

/** Dry runs re-read the same 2MB notebooks thousands of times; memoise the block ids.
 *  Invalidated on write, since carrying a block changes what a target has. */
const idCache = new Map<string, Set<string>>();
function idsIn(path: string): Set<string> {
  let s = idCache.get(path);
  if (!s) idCache.set(path, (s = new Set(allIds(readFileSync(path, "utf8")))));
  return s;
}

function rawBlock(html: string, id: string): string | null {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = html.match(new RegExp(`<script\\s+id="${esc}"[^>]*>[\\s\\S]*?</script>`));
  return m ? m[0] : null;
}

export type ResyncOpts = {
  modules?: string[];      // explicit module ids; empty means every declared module
  repo?: string | null;    // restrict to one repo's consumers
  limit?: number;          // cap targets per module (pilot batches)
  write?: boolean;         // false = dry run
  carryDeps?: boolean;     // copy missing dependency blocks across
};

/**
 * `--all-canonical`: the same injection as single-module mode, but sourced from
 * `modules/canonical.json` and applied to every consumer instead of one module to
 * hand-listed targets. `lope-sync audit` reports this drift; this applies it.
 *
 * Direction comes from canonical.json and is never inferred: content hashes carry no
 * ordering, so "differs from 168 consumers" does not mean "older". Verify a canonical
 * really is ahead (`tools/triage/cellwise.ts --all-minority`) before sweeping it.
 *
 * Two hazards, both real in this corpus:
 *
 *  1. A newer module can import a block the target does not embed — 186 notebooks
 *     carried an `editor-5` importing `@tomlarkworthy/modules` without embedding it,
 *     which the lazy runtime never surfaces. Such targets are SKIPPED and reported;
 *     `carryDeps` copies the missing blocks from the canonical notebook, following
 *     each carried block's own needs to a fixpoint.
 *  2. A module's own content blocks must precede its module block, so carried
 *     attachments are inserted before the anchor, never appended.
 *
 * Returns a process exit code: non-zero when targets were left skipped.
 */
export function resyncCanonical(opts: ResyncOpts): number {
  const { repo: onlyRepo = null, limit = Infinity, write = false, carryDeps = false } = opts;
  const idx = deriveIndex();
  const canon = loadCanonical();
  const mods = (opts.modules?.length ? opts.modules : Object.keys(canon).sort())
    .filter((m) => canon[m]);
  if (!mods.length) {
    console.error("nothing selected: --all-canonical needs declared modules, or pass --module @a/b");
    return 2;
  }

  let updated = 0, unchanged = 0, carried = 0, skipped = 0;
  const gaps = new Map<string, Set<string>>();   // target -> missing ids

  /**
   * Which canonical governs each repo's consumers. A module declared canonical in one
   * repo still has consumers in the other (visualizer: 48 in lopecode, 172 in
   * lopebooks) and `audit` counts those as drifted, so the sole canonical governs
   * both. Declared in both repos, each governs its own. Nothing else is guessed.
   */
  const governing = (mod: string): Array<[string, string]> => {
    const declared = reposOf(canon[mod]);
    if (!declared.length) return [];
    const out: Array<[string, string]> = declared.map((r) => [r, canon[mod]![r] as string]);
    if (declared.length === 1)
      for (const r of ["lopecode", "lopebooks"])
        if (r !== declared[0]) out.push([r, canon[mod]![declared[0]] as string]);
    return out;
  };

  for (const mod of mods) {
  for (const [repo, canonRel] of governing(mod)) {
    if (onlyRepo && repo !== onlyRepo) continue;
    const refs = idx.get(mod) ?? [];
    const canonSha = refs.find((r) => r.rel === canonRel)?.sha;
    if (!canonSha) { console.error(`  ! ${mod}: canonical ${canonRel} has no block`); continue; }

    const canonHtml = readFileSync(join(REPO_ROOT, canonRel), "utf8");
    const block = extractModuleScriptTag(canonHtml, mod)!;
    const needMods = importsOf(block);
    const needBlocks = ownedBlockIds(canonHtml, mod);
    const attNames = attachmentsOf(block);
    // attachment basenames the canonical actually provides
    const canonAtt = new Set(needBlocks.map((id) => id.slice(mod.length + 1)));

    // Same-sha consumers are visited too, not just stale ones: a notebook can hold a
    // block already equal to the canonical while missing what that block imports (5
    // notebooks embed a current `lopepage` without `@tomlarkworthy/command-palette`).
    // Skipping them left exactly those gaps unrepaired. The block update is then a
    // no-op and `inject` reports it unchanged.
    const targets = refs
      .filter((r) => r.rel.startsWith(repo + "/") && r.rel !== canonRel)
      .slice(0, limit);
    if (!targets.length) continue;

    let mUpd = 0, mSkip = 0, mCarry = 0;
    for (const t of targets) {
      const tPath = join(REPO_ROOT, t.rel);
      const have = idsIn(tPath);

      // What the canonical needs that this target lacks, to a fixpoint: carrying
      // @tomlarkworthy/modules into 186 notebooks is no good if that module's own
      // imports and attachments stay behind, so follow each carried block's needs
      // too. A loader-map name with no block in the *canonical* is a defect in the
      // canonical rather than something this sweep can repair; reported separately.
      const carryable: string[] = [];
      const unfixable: string[] = [];
      const seen = new Set<string>();
      const queue = [...needMods, ...needBlocks];
      while (queue.length) {
        const id = queue.pop()!;
        if (have.has(id) || seen.has(id)) continue;
        seen.add(id);
        const b = rawBlock(canonHtml, id);
        if (!b) { unfixable.push(id); continue; }
        carryable.push(id);
        if (id.split("/").length <= 2) queue.push(...importsOf(b), ...ownedBlockIds(canonHtml, id));
      }
      for (const n of attNames)
        if (!canonAtt.has(encodeURIComponent(n)) && !canonAtt.has(n))
          unfixable.push(`${n} (canonical has no such attachment)`);

      const blocked = [...carryable, ...unfixable];
      if (blocked.length && !(carryDeps && !unfixable.length)) {
        (gaps.get(t.rel) ?? gaps.set(t.rel, new Set()).get(t.rel)!).add(`${mod} needs ${blocked.join(", ")}`);
        mSkip++; skipped++;
        continue;
      }

      if (!write) {
        if (t.sha === canonSha) unchanged++; else { mUpd++; updated++; }
        mCarry += carryable.length; carried += carryable.length;
        continue;
      }

      // Modules first, then the blocks they own: an attachment is placed relative to
      // its owner's block, so the owner has to be present to anchor it.
      const carryMods = carryable.filter((id) => id.split("/").length <= 2);
      for (const id of carryMods) inject(rawBlock(canonHtml, id)!, tPath, id, true);
      for (const id of carryable.filter((id) => !carryMods.includes(id)))
        insertBefore(tPath, id.slice(0, id.lastIndexOf("/")), rawBlock(canonHtml, id)!);
      idCache.delete(tPath);
      mCarry += carryable.length; carried += carryable.length;
      const r = inject(block, tPath, mod, false);
      if (r === "updated") { mUpd++; updated++; }
      else if (r === "unchanged") unchanged++;
      else { mSkip++; skipped++; }
    }
    if (mUpd || mSkip)
      console.log(`${write ? "sync" : "would"}  ${mod.padEnd(38)} ${repo.padEnd(9)} ` +
        `${String(mUpd).padStart(3)} target(s)` +
        (mCarry ? `  +${mCarry} carried` : "") + (mSkip ? `  ${mSkip} skipped (dep gap)` : ""));
    }
  }

  console.log(`\n${write ? "applied" : "dry run"}: ${updated} block(s) ${write ? "updated" : "would update"}` +
    `, ${carried} carried, ${unchanged} already current, ${skipped} skipped for a dependency gap`);

  if (gaps.size) {
    console.log(`\n${gaps.size} target(s) skipped — the canonical needs blocks they do not embed.` +
      `\nRe-run with --carry-deps to copy them from the canonical notebook:`);
    for (const [rel, set] of [...gaps].slice(0, 12)) {
      console.log(`  ${rel.split("/").pop()}`);
      for (const g of [...set].slice(0, 3)) console.log(`      ${g}`);
    }
    if (gaps.size > 12) console.log(`  … ${gaps.size - 12} more`);
  }
  console.log(`\nNow gate it:  bun tools/lope-preflight.ts --baseline tools/preflight-baseline.json`);
  return skipped ? 1 : 0;
}

// ------------------------------------------------------------- frame modernisation

const FRAME_OLD = "@tomlarkworthy/lopepage";
const FRAME_NEW = "@tomlarkworthy/lopepage-2";
const SIP = "@tomlarkworthy/save-in-place";

/** The last `bootconf.json` block that parses — earlier ones are exporter templates. */
function bootconfBlock(html: string): { tag: string; body: string; conf: any } | null {
  let out = null;
  for (const m of html.matchAll(/<script\s+id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { out = { tag: m[0], body: m[1], conf: JSON.parse(m[1].trim()) }; } catch { /* template */ }
  }
  return out;
}

/**
 * Swap a notebook's frame from lopepage to lopepage-2 and give it save-in-place.
 *
 * Three things have to happen together, and the third is the one that bites:
 *
 *  1. bootconf `mains`: lopepage -> lopepage-2, and save-in-place appended. Only the
 *     mains array is rewritten, so `hash`/`headless`/`prerender` stay byte-identical.
 *  2. The lopepage-2 and save-in-place blocks are installed if absent. Their own
 *     dependencies are NOT resolved here — run `--all-canonical --carry-deps`
 *     afterwards, which now sees these notebooks as consumers and completes them.
 *  3. The old lopepage BLOCK is deleted, not merely dropped from mains. Module
 *     discovery instantiates every module `<script>` in the DOM, so a lopepage block
 *     left behind boots a competing GoldenLayout overlay on top of lopepage-2.
 *
 * Skipped: lopepage's own canonical notebooks (deleting the block there destroys the
 * module, and it cannot host both frames at once), and notebooks where a surviving
 * module still imports lopepage (jumpgate does), since the import would break.
 */
export function modernizeFrame(opts: { repo?: string | null; limit?: number; write?: boolean }): number {
  const { repo: onlyRepo = null, limit = Infinity, write = false } = opts;
  const canon = loadCanonical();
  const srcOf = (mod: string) => {
    const e = canon[mod];
    const rel = e && (reposOf(e).includes("lopecode") ? e["lopecode"] : e[reposOf(e)[0]]);
    if (typeof rel !== "string") throw new Error(`${mod} has no declared canonical`);
    return { rel, html: readFileSync(join(REPO_ROOT, rel), "utf8") };
  };
  const frame = srcOf(FRAME_NEW), sip = srcOf(SIP);
  const oldHomes = new Set(Object.values(canon[FRAME_OLD] ?? {}).filter((v) => typeof v === "string"));

  let done = 0, skipped = 0, installed = 0;
  const skips: string[] = [];
  const repos = ["lopecode", "lopebooks"].filter((r) => !onlyRepo || r === onlyRepo);

  for (const repo of repos) {
    const dir = join(REPO_ROOT, repo, "notebooks");
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".html")).sort()) {
      if (done >= limit) break;
      const rel = `${repo}/notebooks/${f}`;
      const path = join(dir, f);
      if (rel === frame.rel || rel === sip.rel) continue;
      if (oldHomes.has(rel)) { skipped++; skips.push(`${f} — canonical home of ${FRAME_OLD}`); continue; }
      let html = readFileSync(path, "utf8");
      const bc = bootconfBlock(html);
      if (!bc || !Array.isArray(bc.conf.mains) || !bc.conf.mains.includes(FRAME_OLD)) continue;

      // a surviving module that still imports the old frame keeps its block
      const importers = [...html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g)]
        .filter((m) => /data-mime="application\/javascript"/.test(m[2]) && m[1] !== FRAME_OLD)
        .filter((m) => m[3].includes(`main.define("module ${FRAME_OLD}"`))
        .map((m) => m[1]);
      if (importers.length) { skipped++; skips.push(`${f} — ${importers.join(", ")} imports ${FRAME_OLD}`); continue; }

      if (!write) { done++; continue; }

      // 2. install the new frame modules (block only; deps come from the resync pass)
      for (const { mod, src } of [{ mod: FRAME_NEW, src: frame }, { mod: SIP, src: sip }]) {
        if (rawBlock(html, mod)) continue;
        const block = extractModuleScriptTag(src.html, mod)!;
        writeFileSync(path, html);
        inject(block, path, mod, true);
        html = readFileSync(path, "utf8");
        for (const owned of ownedBlockIds(src.html, mod)) {
          if (rawBlock(html, owned)) continue;
          insertBefore(path, mod, rawBlock(src.html, owned)!);
          html = readFileSync(path, "utf8");
        }
        installed++;
      }

      // 3. delete the shadowing old frame block
      const old = rawBlock(html, FRAME_OLD);
      if (old) {
        const at = html.indexOf(old);
        html = html.slice(0, at) + html.slice(at + old.length).replace(/^\n{1,2}/, "");
      }

      // 1. rewrite ONLY the mains array, leaving the rest of bootconf untouched
      const mains = bc.conf.mains.map((m: string) => (m === FRAME_OLD ? FRAME_NEW : m));
      if (!mains.includes(SIP)) mains.push(SIP);
      const newBody = bc.body.replace(
        /"mains"\s*:\s*\[[^\]]*\]/,
        `"mains": [${mains.map((m: string) => JSON.stringify(m)).join(",")}]`
      );
      html = html.replace(bc.tag, bc.tag.replace(bc.body, newBody));

      writeFileSync(path, html);
      done++;
    }
  }

  console.log(`\n${write ? "modernised" : "would modernise"} ${done} notebook(s)` +
    (installed ? `, ${installed} frame module(s) installed` : "") +
    (skipped ? `, ${skipped} skipped` : ""));
  for (const s of skips) console.log(`  skip  ${s}`);
  if (write && done)
    console.log(`\nNow complete their dependencies:\n` +
      `  bun tools/channel/sync-module.ts --all-canonical --write --carry-deps\n` +
      `  bun tools/lope-preflight.ts --baseline tools/preflight-baseline.json`);
  return 0;
}

// ------------------------------------------------------------------ theme switching

/**
 * The theme is not a bootconf field. It is baked into three places, and a switch that
 * misses any one of them leaves the notebook inconsistent:
 *
 *  1. The bootloader's `importShim(...css)` list + `document.adoptedStyleSheets`.
 *  2. The `<script id="<url>" data-mime="text/css">` blocks holding those bytes —
 *     nothing is fetched at boot, so a URL with no block is a blank stylesheet.
 *  3. The sibling `.json` spec's `bootconf.theme`, which `lope-jumpgate` reads to
 *     decide the theme on the next export. Leave it and the next jumpgate reverts.
 *
 * Plus, for the three notebooks that ship a baked prerender snapshot, the two inline
 * copies of the concatenated theme CSS inside it.
 *
 * A theme is a triple (`theme-X`, `abstract-light|dark`, `syntax-light|dark`) — going
 * from a light theme to a dark one swaps all three, so the target list is copied from
 * a donor notebook already on that theme rather than reconstructed from a table.
 */
const THEME_CSS = /\/(theme-[a-z0-9-]+|abstract-(?:light|dark)|syntax-(?:light|dark))\.css$/;

/** The bootloader's ordered CSS list, and the exact region to rewrite. */
function styleRegion(html: string): { start: number; end: number; urls: string[] } | null {
  const start = html.indexOf("  const style0 = await importShim(");
  if (start < 0) return null;
  const marker = "  document.adoptedStyleSheets = [";
  const at = html.indexOf(marker, start);
  if (at < 0) return null;
  const end = html.indexOf("\n", at) + 1;
  const urls = [...html.slice(start, at).matchAll(/importShim\("([^"]+)", \{ with: \{ type: 'css' \} \}\)/g)]
    .map((m) => m[1]);
  return { start, end, urls };
}

function renderStyleRegion(urls: string[]): string {
  const lines = urls.map((u, i) =>
    `  const style${i} = await importShim(${JSON.stringify(u)}, { with: { type: 'css' } });`);
  lines.push(`  document.adoptedStyleSheets = [${urls.map((_, i) => `style${i}.default`).join(",")}];`);
  return lines.join("\n") + "\n";
}

/** Concatenated CSS exactly as exporter-3 builds `themeCss` for the prerender snapshot. */
function themeCssOf(html: string, urls: string[]): string | null {
  const parts = urls.map((u) => rawBlockContent(html, u));
  return parts.some((p) => p === null) ? null : parts.join("\n");
}

function rawBlockContent(html: string, id: string): string | null {
  const b = rawBlock(html, id);
  if (!b) return null;
  return b.slice(b.indexOf(">") + 1, b.lastIndexOf("</script>"));
}

export function setTheme(opts: {
  theme: string; repo?: string | null; limit?: number; write?: boolean; skip?: string[];
}): number {
  const { theme, repo: onlyRepo = null, limit = Infinity, write = false, skip = [] } = opts;
  const repos = ["lopecode", "lopebooks"].filter((r) => !onlyRepo || r === onlyRepo);
  const files = (r: string) => {
    const dir = join(REPO_ROOT, r, "notebooks");
    return existsSync(dir)
      ? readdirSync(dir).filter((x) => x.endsWith(".html")).sort().map((f) => join(dir, f))
      : [];
  };
  const all = repos.flatMap(files);
  const themeOf = (html: string) =>
    styleRegion(html)?.urls.find((u) => /\/theme-[a-z0-9-]+\.css$/.test(u))
      ?.match(/theme-([a-z0-9-]+)\.css$/)?.[1] ?? null;

  // donor: any notebook already on the target theme, so the URL triple and its bytes
  // come from something known to boot rather than from a hand-written table
  const donorPath = all.find((p) => themeOf(readFileSync(p, "utf8")) === theme);
  if (!donorPath) { console.error(`no notebook is on theme "${theme}" to copy from`); return 1; }
  const donorHtml = readFileSync(donorPath, "utf8");
  const donorTheme = styleRegion(donorHtml)!.urls.filter((u) => THEME_CSS.test(u));
  console.log(`donor: ${relative(REPO_ROOT, donorPath)}\n  ${donorTheme.map((u) => u.split("/").pop()).join(", ")}\n`);

  let done = 0, prerendered = 0, specs = 0;
  const skips: string[] = [];
  for (const path of all) {
    if (done >= limit) break;
    const rel = relative(REPO_ROOT, path);
    if (skip.includes(rel)) { skips.push(`${rel} — excluded`); continue; }
    let html = readFileSync(path, "utf8");
    const reg = styleRegion(html);
    if (!reg) { skips.push(`${rel} — no bootloader style list`); continue; }
    const was = themeOf(html);
    if (was === theme) continue;

    const oldTheme = reg.urls.filter((u) => THEME_CSS.test(u));
    const first = reg.urls.findIndex((u) => THEME_CSS.test(u));
    const newUrls = reg.urls.filter((u) => !THEME_CSS.test(u));
    newUrls.splice(first, 0, ...donorTheme);
    if (!write) { done++; continue; }

    // 4. baked prerender snapshot: replace the two inline themeCss copies. Computed
    //    before the blocks move, since it is the concatenation of the OLD ones.
    const oldCss = themeCssOf(html, reg.urls);
    const newCssParts = newUrls.map((u) =>
      THEME_CSS.test(u) ? rawBlockContent(donorHtml, u) : rawBlockContent(html, u));
    if (oldCss && !newCssParts.some((p) => p === null) && html.includes(oldCss)) {
      html = html.split(oldCss).join(newCssParts.join("\n"));
      prerendered++;
    }

    // 2. swap the CSS blocks, new ones landing where the old ones were
    const anchor = rawBlock(html, oldTheme[0])!;
    const donorBlocks = donorTheme.map((u) => rawBlock(donorHtml, u)!).join("\n\n");
    html = html.replace(anchor, donorBlocks);
    for (const u of oldTheme.slice(1)) {
      const b = rawBlock(html, u);
      if (b) html = html.slice(0, html.indexOf(b)) + html.slice(html.indexOf(b) + b.length).replace(/^\n{1,2}/, "");
    }

    // 1. the bootloader list (re-located: the block edits above shifted offsets)
    const r2 = styleRegion(html)!;
    html = html.slice(0, r2.start) + renderStyleRegion(newUrls) + html.slice(r2.end);

    writeFileSync(path, html);

    // 3. the spec's bootconf.theme, or the next jumpgate reverts the switch
    const spec = path.replace(/\.html$/, ".json");
    if (existsSync(spec)) {
      const s = JSON.parse(readFileSync(spec, "utf8"));
      if (s.bootconf && s.bootconf.theme !== theme) {
        s.bootconf.theme = theme;
        writeFileSync(spec, JSON.stringify(s, null, 2) + "\n");
        specs++;
      }
    }
    done++;
  }

  console.log(`${write ? "themed" : "would theme"} ${done} notebook(s) -> ${theme}` +
    (write ? `, ${specs} spec(s) updated, ${prerendered} prerender snapshot(s) rebuilt` : ""));
  for (const s of skips) console.log(`  skip  ${s}`);
  return 0;
}

// CLI
if (import.meta.main) {

if (process.argv.includes("--set-theme")) {
  const a = process.argv.slice(2);
  const val = (n: string) => (a.indexOf(n) >= 0 ? a[a.indexOf(n) + 1] : null);
  process.exit(setTheme({
    theme: val("--set-theme")!,
    repo: val("--repo"),
    limit: Number(val("--limit") ?? Infinity),
    write: a.includes("--write"),
    skip: a.filter((x, i) => a[i - 1] === "--skip"),
  }));
}

if (process.argv.includes("--modernize-frame")) {
  const a = process.argv.slice(2);
  const val = (n: string) => (a.indexOf(n) >= 0 ? a[a.indexOf(n) + 1] : null);
  process.exit(modernizeFrame({
    repo: val("--repo"),
    limit: Number(val("--limit") ?? Infinity),
    write: a.includes("--write"),
  }));
}

// `--all-canonical` is its own mode: source and targets come from canonical.json, so
// none of --source/--target applies. It defaults to a dry run and needs --write,
// unlike single-module mode, because it can rewrite a block in all 221 notebooks.
if (process.argv.includes("--all-canonical")) {
  const a = process.argv.slice(2);
  const val = (n: string) => (a.indexOf(n) >= 0 ? a[a.indexOf(n) + 1] : null);
  process.exit(resyncCanonical({
    modules: a.filter((x, i) => a[i - 1] === "--module"),
    repo: val("--repo"),
    limit: Number(val("--limit") ?? Infinity),
    write: a.includes("--write"),
    carryDeps: a.includes("--carry-deps"),
  }));
}

const { moduleName, sourcePath, rawTargets, watchMode, insertOk, force } = parseArgs();
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
preflight(sourcePath, moduleName, force);
syncAll(sourcePath, targetPaths, moduleName, process.env.VERBOSE === "1", insertOk);
restamp(sourcePath, moduleName);

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
        preflight(sourcePath, moduleName, force);
        syncAll(sourcePath, [target], moduleName, false, insertOk);
        restamp(sourcePath, moduleName);
      } catch (e: any) {
        console.error("Injection failed:", e.message);
      }
    }, 200);
  });
}
}
