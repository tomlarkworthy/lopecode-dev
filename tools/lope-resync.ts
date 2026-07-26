#!/usr/bin/env bun
/**
 * lope-resync.ts — push each module's declared canonical out to the consumers that
 * embed an older copy.
 *
 * `lope-sync audit` reports the drift; this applies it. The whole corpus is drifted
 * (2423 module-in-notebook pairs across all 221 notebooks), so this is deliberately
 * scoped and staged rather than a single run: `--module`/`--repo`/`--limit` select a
 * batch, and `tools/lope-preflight.ts --baseline` gates each batch.
 *
 * Two hazards this handles, both real in this corpus:
 *
 *  1. A newer module can need a block the target does not embed. 186 notebooks
 *     already carry an `editor-5` that imports `@tomlarkworthy/modules` without
 *     embedding it. Updating a block can therefore break a target that parsed fine
 *     before, which no source diff reveals. Targets with a gap are SKIPPED and
 *     reported; `--carry-deps` instead copies the missing blocks from the canonical
 *     notebook, which is the only place they are known to be current.
 *
 *  2. A module's own content blocks must precede its module block, so carried
 *     attachments are inserted immediately before it — never appended.
 *
 * Direction is taken from `modules/canonical.json`, never inferred: content hashes
 * carry no ordering, so "differs" does not mean "older". Verify a canonical really is
 * ahead (tools/triage/cellwise.ts) before sweeping it into ~170 notebooks.
 *
 *   bun tools/lope-resync.ts --module @tomlarkworthy/visualizer          # dry run
 *   bun tools/lope-resync.ts --module @tomlarkworthy/visualizer --write
 *   bun tools/lope-resync.ts --all --repo lopebooks --limit 5            # pilot batch
 *   bun tools/lope-resync.ts --all --write --carry-deps
 */
import { readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { deriveIndex, loadCanonical, reposOf } from "./lope-sync.ts";
import { extractModuleScriptTag, inject } from "./channel/sync-module.ts";

const ROOT = resolve(import.meta.dir, "..");

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

// ------------------------------------------------------------------------ CLI
const argv = process.argv.slice(2);
const flagVal = (n: string) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
const write = argv.includes("--write");
const carryDeps = argv.includes("--carry-deps");
const all = argv.includes("--all");
const onlyRepo = flagVal("--repo");
const limit = Number(flagVal("--limit") ?? Infinity);
const wanted = argv.filter((a, i) => argv[i - 1] === "--module");

const idx = deriveIndex();
const canon = loadCanonical();
const mods = (all ? Object.keys(canon).sort() : wanted).filter((m) => canon[m]);
if (!mods.length) {
  console.error("nothing selected: pass --module @a/b (repeatable) or --all");
  process.exit(2);
}

let updated = 0, unchanged = 0, carried = 0, skipped = 0;
const gaps = new Map<string, Set<string>>();   // target -> missing ids

const REPOS = ["lopecode", "lopebooks"];

/**
 * Which canonical governs each repo's consumers. A module declared canonical in one
 * repo still has consumers in the other (visualizer: 48 in lopecode, 172 in lopebooks)
 * and `audit` counts those as drifted, so the sole canonical governs both. Declared in
 * both repos, each governs its own. Nothing is guessed beyond that.
 */
function governing(mod: string): Array<[string, string]> {
  const declared = reposOf(canon[mod]);
  if (!declared.length) return [];
  const out: Array<[string, string]> = declared.map((r) => [r, canon[mod]![r] as string]);
  if (declared.length === 1)
    for (const r of REPOS) if (r !== declared[0]) out.push([r, canon[mod]![declared[0]] as string]);
  return out;
}

for (const mod of mods) {
  for (const [repo, canonRel] of governing(mod)) {
    if (onlyRepo && repo !== onlyRepo) continue;
    const refs = idx.get(mod) ?? [];
    const canonSha = refs.find((r) => r.rel === canonRel)?.sha;
    if (!canonSha) { console.error(`  ! ${mod}: canonical ${canonRel} has no block`); continue; }

    const canonHtml = readFileSync(join(ROOT, canonRel), "utf8");
    const block = extractModuleScriptTag(canonHtml, mod)!;
    const needMods = importsOf(block);
    const needBlocks = ownedBlockIds(canonHtml, mod);
    const attNames = attachmentsOf(block);
    // attachment basenames the canonical actually provides
    const canonAtt = new Set(needBlocks.map((id) => id.slice(mod.length + 1)));

    const targets = refs
      .filter((r) => r.rel.startsWith(repo + "/") && r.rel !== canonRel && r.sha !== canonSha)
      .slice(0, limit);
    if (!targets.length) continue;

    let mUpd = 0, mSkip = 0, mCarry = 0;
    for (const t of targets) {
      const tPath = join(ROOT, t.rel);
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

      if (!write) { mUpd++; updated++; mCarry += carryable.length; carried += carryable.length; continue; }

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
