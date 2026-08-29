#!/usr/bin/env bun
/**
 * lope-sync.ts — module checkout/staleness tracking for lopecode notebooks.
 *
 * The notebook HTML files are the source of truth. A module's identity is the
 * md5 of its `<script id="@author/name">` block CONTENT, DERIVED on every run —
 * never stored. Deriving the whole corpus (218 notebooks, 647 MB, ~10k blocks)
 * costs ~1.1s, so there is no cache to invalidate. This matters: any hash we
 * persisted would be silently invalidated by save-in-place, which rewrites a
 * notebook from the browser through a FileSystemFileHandle and cannot update a
 * sibling file. A stored hash would report "clean" while being wrong.
 *
 * Two facts are NOT derivable and so are stored:
 *   modules/canonical.json  which notebook is the source for a module, per repo
 *                           (a human decision; committed)
 *   modules/.sync.json      what a working copy was checked out from, and the
 *                           block sha at that moment (session state; gitignored)
 *
 * A canonical.json entry maps repo -> notebook, plus one optional non-repo key:
 *
 *   "@tomlarkworthy/butter-synth": {
 *     "lopebooks": "lopebooks/notebooks/@tomlarkworthy_coding_harness_tuning_blog.html",
 *     "upstream": null
 *   }
 *
 * `upstream` records whether the module exists on ObservableHQ, which is NOT
 * derivable from the corpus and changes what a fix looks like:
 *   absent          publish as @tomlarkworthy/<name> — the default, so most
 *                   entries say nothing; a stale canonical is fixed by
 *                   jumpgating down from Observable.
 *   null            NO upstream. The notebook IS the origin — typically a module
 *                   owned by a blog post rather than published on its own. There
 *                   is nothing to jumpgate; the local block is the only copy, and
 *                   `api.observablehq.com/....js` would 404.
 *   "<slug>"        published under a different slug than the module name.
 *
 * Commands:
 *   bun tools/lope-sync.ts status                 working copies: clean/modified/STALE/DIVERGED
 *   bun tools/lope-sync.ts audit [--module M]     canonical vs consumers, and cross-repo skew
 *   bun tools/lope-sync.ts checkout <module> [--repo R]   extract from declared canonical
 *   bun tools/lope-sync.ts pull <module> [--force]        re-extract over a working copy
 *   bun tools/lope-sync.ts init-canonical [--write]       bootstrap canonical.json
 *   bun tools/lope-sync.ts spec-sync [--check] [--rebuild]  sibling .json specs
 *   bun tools/lope-sync.ts hash-mains [--write]   declare modules only the boot hash holds
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, rmSync, realpathSync } from "fs";
import { join, resolve, relative, dirname, basename } from "path";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { blocks, blockSpans, blockContent, findSpan, guardedWrite } from "./lib/notebook-blocks.ts";

const ROOT = resolve(import.meta.dir, "..");
const REPOS = ["lopecode", "lopebooks"];
const CANONICAL_PATH = join(ROOT, "modules", "canonical.json");
const INDEX_PATH = join(ROOT, "modules", ".sync.json");

const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const short = (h: string) => h.slice(0, 12);

// ---------------------------------------------------------------- derived index

export type BlockRef = {
  repo: string;      // "lopecode" | "lopebooks"
  rel: string;       // path relative to ROOT
  sha: string;       // md5 of block content
};

/** All javascript module blocks in one notebook: id -> content sha. */
export function blocksIn(html: string): Map<string, string> {
  const out = new Map<string, string>();
  // Tag attrs may span newlines (the exporter emits `id="X" \n  type=...`).
  // [^>]* spans newlines since it is a negated class.
  const re = /<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(re)) {
    if (!/data-mime="application\/javascript"/.test(m[2])) continue;
    // `@author/name/path.js` is a file attachment that happens to be JS, not a module.
    if (m[1].split("/").length > 2) continue;
    // First occurrence wins, matching both the runtime (`contentSync` resolves by id,
    // so a later duplicate is shadowed) and extractModuleScriptTag. Two notebooks
    // embed `@tomlarkworthy/bootloader` twice — the compiled block followed by a raw
    // Observable-format copy. Letting the last win made audit report all 220
    // bootloader consumers permanently stale against a block that never executes.
    if (out.has(m[1])) continue;
    // Match extractModuleContent's normalisation so a checked-out .js hashes
    // identically to the block it came from.
    out.set(m[1], md5(m[3].replace(/^\n/, "").replace(/\n$/, "")));
  }
  return out;
}

/**
 * The notebook's own `bootconf.json` block, or null. Last parseable block wins —
 * the exporter modules carry the *template* for this block in their source, and
 * that one has unresolved `${…}` so it never parses.
 */
export function bootconfIn(html: string): Record<string, unknown> | null {
  let found: Record<string, unknown> | null = null;
  for (const m of html.matchAll(/<script\s+id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { found = JSON.parse(m[1].trim()); } catch { /* exporter template */ }
  }
  return found;
}

/** module id -> every notebook that embeds it. ~1.1s cold over the full corpus. */
export function deriveIndex(): Map<string, BlockRef[]> {
  const idx = new Map<string, BlockRef[]>();
  for (const repo of REPOS) {
    const dir = join(ROOT, repo, "notebooks");
    if (!existsSync(dir)) continue;
    for (const f of readdirSync(dir)) {
      if (!f.endsWith(".html")) continue;
      const abs = join(dir, f);
      const rel = relative(ROOT, abs);
      for (const [id, sha] of blocksIn(readFileSync(abs, "utf8"))) {
        if (!idx.has(id)) idx.set(id, []);
        idx.get(id)!.push({ repo, rel, sha });
      }
    }
  }
  return idx;
}

// ------------------------------------------------------------------- registries

// module -> { <repo>: relpath, ...; upstream?: string | null }. Repo keys and the
// reserved `upstream` key share one object, so always read repos via reposOf().
type CanonicalEntry = Record<string, string | null | undefined>;
type Canonical = Record<string, CanonicalEntry>;

/** The repo keys of an entry, ignoring reserved non-repo keys like `upstream`. */
export function reposOf(entry: CanonicalEntry | undefined): string[] {
  if (!entry) return [];
  return REPOS.filter((r) => typeof entry[r] === "string");
}

export type Upstream =
  | { kind: "observable"; slug: string }
  | { kind: "none" };

/**
 * Where a module is published, if anywhere. Defaults to ObservableHQ under its
 * own name — only an explicit `upstream` in canonical.json says otherwise.
 */
export function upstreamFor(moduleId: string, canonical?: Canonical): Upstream {
  const entry = (canonical ?? loadCanonical())[moduleId];
  if (entry && "upstream" in entry) {
    const u = entry.upstream;
    if (u === null) return { kind: "none" };
    if (typeof u === "string") return { kind: "observable", slug: u };
  }
  return { kind: "observable", slug: moduleId };
}
type Checkout = { module: string; canonical: string; baseSha: string; at: string };
type Index = Record<string, Checkout>;                   // working-copy relpath -> checkout

export function loadCanonical(): Canonical {
  if (!existsSync(CANONICAL_PATH)) return {};
  return JSON.parse(readFileSync(CANONICAL_PATH, "utf8"));
}

export function loadIndex(): Index {
  if (!existsSync(INDEX_PATH)) return {};
  return JSON.parse(readFileSync(INDEX_PATH, "utf8"));
}

export function saveIndex(idx: Index): void {
  mkdirSync(dirname(INDEX_PATH), { recursive: true });
  const sorted: Index = {};
  for (const k of Object.keys(idx).sort()) sorted[k] = idx[k];
  writeFileSync(INDEX_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

/**
 * Resolve the canonical notebook for a module. Returns null when undeclared.
 * `repo` disambiguates modules canonical in both repos (staging vs published).
 */
export function canonicalFor(
  moduleId: string,
  repo?: string
): { repo: string; rel: string } | null | "ambiguous" {
  const entry = loadCanonical()[moduleId];
  if (!entry) return null;
  const repos = reposOf(entry);
  if (repo) return repos.includes(repo) ? { repo, rel: entry[repo] as string } : null;
  if (!repos.length) return null;
  if (repos.length === 1) return { repo: repos[0], rel: entry[repos[0]] as string };
  return "ambiguous";
}

/** Current sha of a module block in a notebook, or null if absent. */
export function shaOfBlock(relPath: string, moduleId: string): string | null {
  const abs = join(ROOT, relPath);
  if (!existsSync(abs)) return null;
  return blocksIn(readFileSync(abs, "utf8")).get(moduleId) ?? null;
}

// -------------------------------------------------------------- validation

/**
 * canonical.json is the one hand-maintained file here, so it is the one that can
 * rot: renaming a notebook or a module leaves a dangling declaration that every
 * other command then silently skips. (Observed 2026-07-26: `belief-state-geometry`
 * was renamed to `belief-geometry` in both module id and filename, and the stale
 * entry went unnoticed because `audit` skips repos where the module has no copies.)
 * Run this first in every command so a dangling declaration is loud, not invisible.
 */
export function validateCanonical(): number {
  const canonical = loadCanonical();
  const problems: string[] = [];
  for (const [mod, entry] of Object.entries(canonical)) {
    for (const repo of reposOf(entry)) {
      const rel = entry[repo] as string;
      if (!existsSync(join(ROOT, rel))) {
        problems.push(`  ${mod}\n      declared canonical does not exist: ${rel} (${repo})`);
      } else if (shaOfBlock(rel, mod) === null) {
        problems.push(`  ${mod}\n      notebook exists but no longer embeds this module: ${rel} (${repo})`);
      }
    }
  }
  if (problems.length) {
    console.error(`\ncanonical.json has ${problems.length} dangling declaration(s):`);
    for (const p of problems) console.error(p);
    console.error(
      `\n  Usually a rename. Re-derive with:  bun tools/lope-sync.ts init-canonical --write\n` +
      `  (diff it first — regenerating drops any entry whose filename no longer encodes its module name.)\n`
    );
  }
  return problems.length;
}

// ------------------------------------------------------------------ status

type State = "clean" | "modified" | "STALE" | "DIVERGED" | "missing";

function classify(workRel: string, co: Checkout): { state: State; now: string | null } {
  const abs = join(ROOT, workRel);
  const now = shaOfBlock(co.canonical, co.module);
  if (!existsSync(abs)) return { state: "missing", now };
  const local = md5(readFileSync(abs, "utf8").replace(/\n$/, ""));
  const localChanged = local !== co.baseSha;
  const canonicalMoved = now !== null && now !== co.baseSha;
  if (localChanged && canonicalMoved) return { state: "DIVERGED", now };
  if (canonicalMoved) return { state: "STALE", now };
  if (localChanged) return { state: "modified", now };
  return { state: "clean", now };
}

function cmdStatus(): number {
  const dangling = validateCanonical();
  const idx = loadIndex();
  const entries = Object.entries(idx);
  if (entries.length === 0) {
    console.log("No working copies checked out. Use: lope-sync checkout <module>");
    return 0;
  }
  let bad = 0;
  for (const [workRel, co] of entries) {
    const { state } = classify(workRel, co);
    if (state === "STALE" || state === "DIVERGED" || state === "missing") bad++;
    const note =
      state === "clean" ? ""
      : state === "modified" ? "(local edits; canonical unchanged — safe to push)"
      : state === "STALE" ? `(canonical moved — pull)`
      : state === "DIVERGED" ? `(local edits AND canonical moved — reconcile)`
      : "(working copy deleted)";
    console.log(`  ${state.padEnd(9)} ${co.module.padEnd(38)} ${note}`);
    if (state === "STALE" || state === "DIVERGED") {
      console.log(`  ${"".padEnd(9)} ${"".padEnd(38)} base ${short(co.baseSha)} → ${short(shaOfBlock(co.canonical, co.module) ?? "?")}  ${co.canonical}`);
    }
  }
  return bad > 0 || dangling > 0 ? 1 : 0;
}

// ------------------------------------------------------------------- audit

function cmdAudit(only?: string, repoFilter?: string): number {
  const dangling = validateCanonical();
  const canonical = loadCanonical();
  const idx = deriveIndex();
  const managed = Object.keys(canonical).filter((m) => !only || m === only);
  if (managed.length === 0) {
    console.error(
      only
        ? `${only} is not declared in modules/canonical.json`
        : "modules/canonical.json is empty — run: lope-sync init-canonical --write"
    );
    return 1;
  }

  let rotten = 0;
  let behind = 0;
  const skew: string[] = [];
  for (const mod of managed.sort()) {
    const refs = idx.get(mod) ?? [];
    const decl = canonical[mod];
    const declRepos = reposOf(decl);

    // Which canonical does a given consumer answer to? Its own repo's, when that
    // repo declares one; otherwise the sole canonical (a module canonical in only
    // one repo still governs consumers in the other). Ambiguous when both repos
    // declare one and the consumer is in neither — that cannot happen, since a
    // consumer is always in some repo.
    const canonRelFor = (repo: string): string | null =>
      (decl[repo] as string | undefined) ??
      (declRepos.length === 1 ? (decl[declRepos[0]] as string) : null);

    for (const repo of REPOS) {
      if (repoFilter && repo !== repoFilter) continue;
      const consumers = refs.filter((r) => r.repo === repo);
      if (consumers.length === 0) continue;
      const canonRel = canonRelFor(repo);
      if (!canonRel) continue;
      const canonSha = refs.find((r) => r.rel === canonRel)?.sha;
      if (!canonSha) {
        console.log(`  ${"MISSING".padEnd(9)} ${mod}  declared canonical not found: ${canonRel}`);
        rotten++;
        continue;
      }
      const stale = consumers.filter((r) => r.rel !== canonRel && r.sha !== canonSha);
      if (!stale.length) continue;
      rotten++;
      const n = consumers.filter((r) => r.rel !== canonRel).length;
      console.log(`  ${"STALE".padEnd(9)} ${mod.padEnd(38)} ${repo}: ${stale.length}/${n} consumers differ from canonical`);
      for (const s of stale.slice(0, 3)) console.log(`  ${"".padEnd(9)}   ${s.rel} (${short(s.sha)})`);
      if (stale.length > 3) console.log(`  ${"".padEnd(9)}   … ${stale.length - 3} more`);
    }

    // Smell: canonical is a minority version. NOT proof of staleness — content
    // hashes carry no ordering, and canonical can be MAJORITY-stale (observed:
    // @tomlarkworthy/summarizejs, where 190/218 copies including canonical lack a
    // fix that 28 consumers have). Use `audit --module X` for the dated breakdown.
    const counts = new Map<string, number>();
    for (const r of refs) counts.set(r.sha, (counts.get(r.sha) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    for (const repo of declRepos) {
      if (repoFilter && repo !== repoFilter) continue;
      const canonSha = refs.find((r) => r.rel === decl[repo])?.sha;
      if (!canonSha || top.length < 2) continue;
      const canonCount = counts.get(canonSha) ?? 0;
      if (canonCount < top[0][1]) {
        behind++;
        console.log(
          `  ${"minority".padEnd(9)} ${mod.padEnd(38)} ${repo} canonical is a minority version ` +
          `(${short(canonSha)}×${canonCount} vs ${short(top[0][0])}×${top[0][1]}) — check it is not behind`
        );
      }
    }

    // Single-module drill-down: every distinct version, how many carry it, and
    // when those notebooks last changed in git. Git dates the NOTEBOOK, not the
    // block, so this orders versions only approximately — but it is the only
    // ordering signal available, and it is what distinguishes "canonical is the
    // source" from "canonical never received the fix".
    if (only) {
      console.log(`\n  versions of ${mod} (${refs.length} copies):`);
      const byShaAll = new Map<string, BlockRef[]>();
      for (const r of refs) {
        if (!byShaAll.has(r.sha)) byShaAll.set(r.sha, []);
        byShaAll.get(r.sha)!.push(r);
      }
      const canonRels = new Set(declRepos.map((r) => decl[r]));
      const dated = [...byShaAll.entries()].map(([sha, rs]) => {
        let newest = "";
        for (const r of rs.slice(0, 40)) {
          try {
            const d = Bun.spawnSync(["git", "log", "-1", "--format=%cs", "--", r.rel.split("/").slice(1).join("/")], {
              cwd: join(ROOT, r.repo),
            }).stdout.toString().trim();
            if (d > newest) newest = d;
          } catch { /* not a git repo — date stays blank */ }
        }
        return { sha, rs, newest };
      });
      dated.sort((a, b) => (b.newest || "").localeCompare(a.newest || ""));
      for (const { sha, rs, newest } of dated) {
        const isCanon = rs.some((r) => canonRels.has(r.rel));
        console.log(
          `    ${short(sha)}  ×${String(rs.length).padStart(3)}  newest notebook ${newest || "?"}` +
          (isCanon ? "   <== DECLARED CANONICAL" : "")
        );
        console.log(`               e.g. ${rs[0].rel}`);
      }
      console.log(`    (git dates the notebook file, not the block — ordering is approximate)`);
    }

    // Cross-repo channel skew: expected (staging ahead of published), reported separately.
    if (declRepos.length > 1 && !repoFilter) {
      const shas = declRepos.map((r) => refs.find((x) => x.rel === decl[r])?.sha);
      if (new Set(shas).size > 1) {
        skew.push(`  ${"skew".padEnd(9)} ${mod.padEnd(38)} ${declRepos.map((r, i) => `${r}=${short(shas[i] ?? "?")}`).join("  ")}`);
      }
    }
  }

  if (skew.length) {
    console.log(`\nCross-repo channel skew (expected — staging vs published, not an error):`);
    for (const s of skew) console.log(s);
  }
  if (rotten === 0 && behind === 0) console.log("  no consumer drift");
  console.log(
    `\n${managed.length} managed module(s); ${rotten} with consumers differing from canonical; ` +
    `${behind} where canonical is a minority version (smell — check with audit --module X); ` +
    `${skew.length} with cross-repo skew.`
  );
  return rotten > 0 || behind > 0 || dangling > 0 ? 1 : 0;
}

// ---------------------------------------------------------------- checkout/pull

function workPathFor(moduleId: string): string {
  return join("modules", moduleId.replace(/^@/, "@")) + ".js";
}

function cmdCheckout(moduleId: string, repo?: string, force = false): number {
  const c = canonicalFor(moduleId, repo);
  if (c === null) {
    console.error(
      `${moduleId} has no declared canonical.\n` +
      `Add it to modules/canonical.json (or run: lope-sync init-canonical --write).`
    );
    return 1;
  }
  if (c === "ambiguous") {
    const repos = reposOf(loadCanonical()[moduleId]);
    console.error(
      `${moduleId} is canonical in more than one repo: ${repos.join(", ")}.\n` +
      `Pass --repo <${repos.join("|")}> to pick the channel.`
    );
    return 1;
  }

  const sha = shaOfBlock(c.rel, moduleId);
  if (!sha) {
    console.error(`Module ${moduleId} not found in declared canonical ${c.rel}`);
    return 1;
  }
  const workRel = workPathFor(moduleId);
  const abs = join(ROOT, workRel);
  if (existsSync(abs) && !force) {
    const idx = loadIndex();
    const co = idx[workRel];
    if (co) {
      const { state } = classify(workRel, co);
      if (state === "modified" || state === "DIVERGED") {
        console.error(`${workRel} has local edits (${state}). Push them, or re-run with --force to discard.`);
        return 1;
      }
    } else {
      console.error(`${workRel} exists but is not a tracked checkout. Re-run with --force to overwrite.`);
      return 1;
    }
  }

  const html = readFileSync(join(ROOT, c.rel), "utf8");
  const content = blockContent(html, moduleId)!;

  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, content);
  const idx = loadIndex();
  idx[workRel] = { module: moduleId, canonical: c.rel, baseSha: sha, at: new Date().toISOString() };
  saveIndex(idx);
  console.log(`Checked out ${moduleId} from ${c.rel} (${c.repo}) → ${workRel}  base ${short(sha)}`);
  return 0;
}

function cmdPull(moduleId: string, force: boolean): number {
  const workRel = workPathFor(moduleId);
  const idx = loadIndex();
  const co = idx[workRel];
  if (!co) {
    console.error(`${moduleId} is not checked out. Use: lope-sync checkout ${moduleId}`);
    return 1;
  }
  const { state } = classify(workRel, co);
  if ((state === "modified" || state === "DIVERGED") && !force) {
    console.error(
      `${workRel} has local edits (${state}) — pull would discard them.\n` +
      `Push first, or re-run with --force.`
    );
    return 1;
  }
  return cmdCheckout(moduleId, co.canonical.split("/")[0], true);
}

// -------------------------------------------------------------------- prune

/**
 * Delete working copies whose content is provably not unique — i.e. nothing is
 * lost by removing them, because `checkout` can reproduce the bytes.
 *
 *   equivalent  content == the declared canonical's current block  -> delete
 *   extant      content == some other copy of that module in the corpus, so the
 *               file is a stale-but-real extraction ("behind")     -> delete
 *   UNIQUE      content matches NO block anywhere -> in-flight work -> KEEP
 *   undeclared  no canonical to compare against                    -> KEEP
 *
 * Ordering is deliberately not inferred: "behind" here means "these exact bytes
 * still exist in a notebook", which is checkable, rather than "older", which is
 * not (content hashes carry no ordering).
 */
function cmdPrune(write: boolean): number {
  const canonical = loadCanonical();
  const idx = deriveIndex();
  const storeDir = join(ROOT, "modules");
  if (!existsSync(storeDir)) { console.log("No modules/ store."); return 0; }

  type Row = { rel: string; mod: string; state: string; note: string };
  const rows: Row[] = [];

  for (const author of readdirSync(storeDir)) {
    const authorDir = join(storeDir, author);
    if (!author.startsWith("@") || !existsSync(authorDir)) continue;
    for (const f of readdirSync(authorDir)) {
      if (!f.endsWith(".js")) continue;
      const rel = join("modules", author, f);
      const mod = `${author}/${f.replace(/\.js$/, "")}`;
      const sha = md5(readFileSync(join(ROOT, rel), "utf8").replace(/\n$/, ""));
      const decl = canonical[mod];
      const refs = idx.get(mod) ?? [];

      // Undeclared modules have no canonical to compare against, but the
      // reproducibility question does not need one: if these exact bytes still
      // sit in a notebook, deleting the file loses nothing. Only fall back to
      // KEEP when the content matches nothing anywhere.
      if (!reposOf(decl).length) {
        const here = refs.filter((r) => r.sha === sha);
        if (here.length) {
          rows.push({ rel, mod, state: "extant", note: `undeclared; matches ${here.length} notebook(s), e.g. ${here[0].rel}` });
        } else {
          rows.push({ rel, mod, state: "UNIQUE", note: `undeclared AND matches none of its ${refs.length} corpus copies — IN FLIGHT` });
        }
        continue;
      }
      const canonShas = reposOf(decl).map((rp) => refs.find((x) => x.rel === decl[rp])?.sha).filter(Boolean) as string[];
      if (canonShas.includes(sha)) { rows.push({ rel, mod, state: "equivalent", note: "matches canonical" }); continue; }
      const elsewhere = refs.filter((r) => r.sha === sha);
      if (elsewhere.length) {
        rows.push({ rel, mod, state: "extant", note: `matches ${elsewhere.length} notebook(s), e.g. ${elsewhere[0].rel}` });
        continue;
      }
      rows.push({ rel, mod, state: "UNIQUE", note: `content matches nothing in the corpus — IN FLIGHT` });
    }
  }

  const del = rows.filter((r) => r.state === "equivalent" || r.state === "extant");
  const keep = rows.filter((r) => r.state === "UNIQUE" || r.state === "undeclared");

  console.log(`\nKEEP — ${keep.filter(r => r.state === "UNIQUE").length} with unique content (in flight), ${keep.filter(r => r.state === "undeclared").length} undeclared:`);
  for (const r of keep.filter((x) => x.state === "UNIQUE")) console.log(`  UNIQUE      ${r.mod.padEnd(42)} ${r.note}`);
  for (const r of keep.filter((x) => x.state === "undeclared")) console.log(`  undeclared  ${r.mod.padEnd(42)} ${r.note}`);

  const byState = (s: string) => del.filter((r) => r.state === s).length;
  console.log(`\nDELETE — ${del.length} reproducible by checkout (${byState("equivalent")} equivalent, ${byState("extant")} extant elsewhere)`);

  if (!write) {
    console.log(`\n(dry run — pass --write to delete the ${del.length} reproducible files)`);
    return 0;
  }
  const index = loadIndex();
  for (const r of del) {
    rmSync(join(ROOT, r.rel));
    delete index[r.rel];
  }
  saveIndex(index);
  console.log(`\nDeleted ${del.length} file(s). Kept ${keep.length}.`);
  return 0;
}

// ---------------------------------------------------------------- hash-mains

/**
 * Declare the modules a notebook's boot hash opens, but nothing holds.
 *
 * exporter-3 emits blocks by walking `mains` through each module's imports, so a
 * block reachable from neither is not written out — "it is in the file" does not
 * survive a save. The boot hash is NOT part of that walk, so a module a pane
 * opens is only safe while something imports it.
 *
 * `@tomlarkworthy/lopepage` imported ten symbols from `@tomlarkworthy/module-selection`
 * (notebookModule, selected_modules, parseGoldenDSL, linkTo, …), which anchored it
 * incidentally. `@tomlarkworthy/lopepage-2` does not use it at all — it is an
 * optional utility opened from the hash — so the anchor vanished on conversion.
 * Measured 2026-08-14: 181 lopepage-2 notebooks were exposed, the 7 still on v1
 * were not, and two (plugin-registry, import_wizards) had already lost the block
 * and were silently fetching it from api.observablehq.com at pane-open.
 *
 * The fix is to say so in `mains`. Reachability, not the frame name, is the test:
 * a module already imported from a main needs nothing, which is why v1 notebooks
 * are left alone. Booting one costs a `define()` and no tab — and for these the
 * hash renders the pane anyway, so it is what already happens, just declared.
 *
 * Refuses a module with no block in the file: making that a main turns a lazy
 * pane-open fetch into a boot-time network dependency. Those need the block
 * inserting first (`sync-module --insert-ok`).
 */
function cmdHashMains(paths: string[], write: boolean): number {
  const targets = paths.length
    ? paths.map((p) => resolve(p))
    : REPOS.flatMap((r) => {
        const d = join(ROOT, r, "notebooks");
        return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".html")).map((f) => join(d, f)) : [];
      });

  let fixed = 0, clean = 0, blocked = 0;
  const blockedRows: string[] = [];

  for (const abs of targets) {
    if (!existsSync(abs)) continue;
    const src = readFileSync(abs, "utf8");
    const bc = bootconfIn(src);
    if (!bc) continue;
    const mains = Array.isArray(bc.mains) ? (bc.mains as string[]) : [];
    const hash = typeof bc.hash === "string" ? bc.hash : "";
    const hashMods = [...new Set([...hash.matchAll(/@[\w.-]+\/[\w.-]+/g)].map((m) => m[0]))];
    if (!hashMods.length) continue;

    // Reachable = mains plus everything they import, transitively. dependsOn comes
    // from the sibling spec (lope-reader --compute-imports writes it); with no spec
    // entry a module contributes no edges, which biases toward declaring — safe.
    const specPath = abs.replace(/\.html$/, ".json");
    let deps: Record<string, string[]> = {};
    if (existsSync(specPath)) {
      try {
        const spec = JSON.parse(readFileSync(specPath, "utf8"));
        for (const [id, info] of Object.entries<any>(spec.modules ?? {})) {
          deps[id] = Array.isArray(info?.dependsOn) ? info.dependsOn : [];
        }
      } catch { /* unreadable spec: treat as no edges */ }
    }
    const reachable = new Set<string>();
    const walk = (id: string) => {
      if (reachable.has(id)) return;
      reachable.add(id);
      for (const d of deps[id] ?? []) walk(d);
    };
    mains.forEach(walk);

    const blocksHere = blocksIn(src);
    const needed = hashMods.filter((m) => !reachable.has(m));
    if (!needed.length) { clean++; continue; }

    const addable = needed.filter((m) => blocksHere.has(m));
    const absent = needed.filter((m) => !blocksHere.has(m));
    for (const m of absent) blockedRows.push(`${basename(abs)}  ${m} (no block in file)`);
    if (absent.length) blocked++;
    if (!addable.length) continue;

    const next = { ...bc, mains: [...mains, ...addable] };
    console.log(`${write ? "fix " : "would fix"}  ${basename(abs)}  += ${addable.join(", ")}`);
    if (write) {
      // Replace only the parseable bootconf block; the exporter's `${…}` template
      // copy must stay untouched.
      // Match the shape exporter-3's template emits — one key per line, arrays
      // inline — so a later save-in-place does not reformat the block back and
      // churn the diff.
      const body = "{\n" +
        Object.entries(next).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(",\n") +
        "\n}";
      let done = false;
      const out = src.replace(
        /(<script\s+id="bootconf\.json"[^>]*>)([\s\S]*?)(<\/script>)/g,
        (whole, open, prev, close) => {
          try { JSON.parse(prev.trim()); } catch { return whole; }
          done = true;
          return `${open}\n${body}\n${close}`;
        }
      );
      if (!done) { console.error(`  ! ${basename(abs)}: no parseable bootconf block, skipped`); continue; }
      writeFileSync(abs, out);
    }
    fixed++;
  }

  console.log(
    `\n${fixed} notebook(s) ${write ? "updated" : "would be updated"}; ${clean} already consistent` +
    (blocked ? `; ${blocked} need a block inserted first` : "")
  );
  if (blockedRows.length) {
    console.error(`\n  hash opens a module the file does not carry — insert the block, do not declare it:`);
    for (const r of blockedRows) console.error(`    ${r}`);
  }
  if (!write && fixed) console.log(`\nRe-run with --write, then: bun tools/lope-sync.ts spec-sync`);
  return blockedRows.length ? 1 : 0;
}

// ----------------------------------------------------------------- spec-sync

/**
 * Bring each notebook's sibling `.json` spec back in line with the HTML.
 *
 * The spec's per-module `hash` IS a content md5 — it just is never updated after
 * export, so ~70% of entries corpus-wide are stale. Neither `sync-module` (no
 * spec handling) nor `save-in-place` (writes one file through a
 * FileSystemFileHandle, cannot touch a sibling) maintains it.
 *
 * The commit boundary is the one synchronisation point every writer passes
 * through, so this is designed as a pre-commit hook: given the staged .html
 * files, it rewrites their spec hashes. That makes "in committed history,
 * spec.hash matches the block" a real invariant — which no single writer could
 * establish on its own.
 *
 * Default scope is deliberately narrow, because the hook runs on every commit:
 * it restamps hashes for modules present in BOTH the spec and the HTML, resyncs
 * `bootconf` from the HTML block, and only reports modules the spec has never
 * heard of.
 *
 * `bootconf` is in the default path because it is the half of the spec other
 * tools *read*: `lope-jumpgate.js` takes `mains` and `hash` from it to decide
 * what to re-export. Left unmaintained it went badly wrong — on 2026-08-13, 187
 * of 229 specs recorded different `mains` than their own HTML, so a jumpgate
 * regeneration silently dropped mains and downgraded the frame. `theme` is
 * preserved rather than overwritten: the exporter never writes one into the
 * block (0 of 231 notebooks), so the spec is its only record. Measured the same
 * day, `theme` is the ONLY key the spec has and the HTML lacks, and the HTML has
 * no key the spec lacks — so a whole-object merge is faithful.
 *
 * A notebook with NO spec fails rather than being skipped — otherwise the
 * invariant is silently optional and every new notebook opts out of it by
 * default. The hook is passed only the notebooks being committed, so a
 * pre-existing gap surfaces when that notebook is next touched, not on every
 * unrelated commit.
 *
 * `--rebuild` handles those, and mints a whole spec for a notebook that has
 * none. A new entry needs `dependsOn`, which means parsing
 * the generated loaders — and that parser is a notebook cell
 * (`@tomlarkworthy/observablejs-toolchain`'s `extractModuleInfo`), not something
 * to reimplement here. `lope-reader.ts --manifest <dir> --compute-imports`
 * already drives it across a whole directory in one notebook load, so rebuild
 * shells out to that and merges the result. Slow (one runtime boot per
 * directory), hence opt-in rather than part of the hook.
 *
 * Rebuild takes ONLY `modules` from the regeneration — `bootconf` is handled on
 * the default path above, and `upstreams` / `observable_version` /
 * `observable_update_time` come from ObservableHQ at jumpgate time. Those are
 * preserved verbatim, as is key order.
 */
function freshSpecsByNotebook(dir: string): Map<string, any> {
  const out = execFileSync(
    "bun",
    [join(ROOT, "tools", "lope-reader.ts"), "--manifest", dir, "--compute-imports"],
    { cwd: ROOT, maxBuffer: 512 << 20, encoding: "utf8" }
  );
  const byName = new Map<string, any>();
  for (const s of JSON.parse(out)) if (s?.notebook && s?.modules) byName.set(s.notebook, s);
  return byName;
}

function cmdSpecSync(paths: string[], check: boolean, rebuild = false): number {
  const targets = paths.length
    ? paths.map((p) => resolve(p))
    : REPOS.flatMap((r) => {
        const d = join(ROOT, r, "notebooks");
        return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".html")).map((f) => join(d, f)) : [];
      });

  let changedFiles = 0, changedEntries = 0, addedEntries = 0, createdFiles = 0, bootconfFiles = 0;
  const unlisted: string[] = [];
  const missingSpec: string[] = [];

  // One regeneration per directory, shared by every target in it.
  const freshCache = new Map<string, Map<string, any>>();
  const freshSpecFor = (html: string): any | null => {
    const dir = dirname(html);
    if (!freshCache.has(dir)) {
      console.log(`  regenerating ${relative(ROOT, dir)} via lope-reader --compute-imports …`);
      freshCache.set(dir, freshSpecsByNotebook(dir));
    }
    return freshCache.get(dir)!.get(basename(html, ".html")) ?? null;
  };
  const freshFor = (html: string): any | null => freshSpecFor(html)?.modules ?? null;

  for (const html of targets) {
    if (!html.endsWith(".html") || !existsSync(html)) continue;
    const specPath = html.replace(/\.html$/, ".json");
    if (!existsSync(specPath)) {
      // A notebook with no spec has no invariant to keep, so this is a failure
      // rather than a skip. `--rebuild` mints one; the hook only ever sees the
      // notebooks being committed, so pre-existing gaps surface when touched.
      if (!rebuild) { missingSpec.push(relative(ROOT, html)); continue; }
      const fresh = freshSpecFor(html);
      if (!fresh) { missingSpec.push(relative(ROOT, html)); continue; }
      // Restamp before writing, the same way an existing spec is restamped below:
      // lope-reader's hash and blocksIn's disagree on at least one block per
      // notebook, so a spec written straight from the manifest would come out
      // stale on its very next check.
      const freshBlocks = blocksIn(readFileSync(html, "utf8"));
      for (const [mod, entry] of Object.entries<any>(fresh.modules ?? {})) {
        const actual = freshBlocks.get(mod);
        if (actual && entry) entry.hash = actual;
      }
      if (check) {
        console.error(`  MISSING ${relative(ROOT, specPath)}`);
      } else {
        writeFileSync(specPath, JSON.stringify(fresh, null, 2) + "\n");
        console.log(`  created ${relative(ROOT, specPath)} (${Object.keys(fresh.modules ?? {}).length} module(s))`);
      }
      createdFiles++;
      continue;
    }
    let spec: any;
    try { spec = JSON.parse(readFileSync(specPath, "utf8")); } catch { continue; }
    if (!spec.modules) continue;

    const src = readFileSync(html, "utf8");
    const blocks = blocksIn(src);
    let touched = 0;

    // bootconf: the HTML is the live record — save-in-place and sync-module rewrite
    // its block, and neither touches the spec. `theme` is the exception and is
    // preserved: the exporter never writes one into the block (0 of 231 notebooks),
    // so the spec is its only record. Measured 2026-08-13: `theme` is the ONLY key
    // the spec has and the HTML lacks, and the HTML has no key the spec lacks.
    let bootconfFixed = false;
    const liveBootconf = bootconfIn(src);
    if (liveBootconf) {
      const merged: Record<string, unknown> = { ...liveBootconf };
      for (const [k, v] of Object.entries(spec.bootconf ?? {})) {
        if (!(k in merged)) merged[k] = v;
      }
      if (JSON.stringify(spec.bootconf ?? null) !== JSON.stringify(merged)) {
        spec.bootconf = merged;
        bootconfFixed = true;
        touched++;
      }
    }

    if (rebuild) {
      const fresh = freshFor(html);
      if (fresh) {
        const before = JSON.stringify(spec.modules);
        addedEntries += Object.keys(fresh).filter((k) => !(k in spec.modules)).length;
        spec.modules = fresh;   // assigning an existing key keeps its position
        if (JSON.stringify(spec.modules) !== before) touched++;
      }
    }

    for (const [mod, entry] of Object.entries<any>(spec.modules)) {
      const actual = blocks.get(mod);
      if (!actual || !entry) continue;
      if (entry.hash !== actual) { entry.hash = actual; touched++; }
    }
    // Modules in the HTML the spec has never heard of — `--rebuild` adds them.
    for (const mod of blocks.keys()) {
      if (mod.startsWith("@tomlarkworthy/") && !(mod in spec.modules)) {
        unlisted.push(`${relative(ROOT, specPath)}  lacks  ${mod}`);
      }
    }
    if (!touched) continue;
    changedEntries += touched;
    changedFiles++;
    if (bootconfFixed) bootconfFiles++;
    const what = `${touched - (bootconfFixed ? 1 : 0)} hash(es)${bootconfFixed ? " + bootconf" : ""}`;
    if (check) {
      console.error(`  STALE ${relative(ROOT, specPath)} (${what})`);
    } else {
      writeFileSync(specPath, JSON.stringify(spec, null, 2) + "\n");
      console.log(`  updated ${relative(ROOT, specPath)} (${what})`);
    }
  }

  if (unlisted.length) {
    console.error(`\n  ${unlisted.length} module(s) embedded but absent from the spec — add them with: bun tools/lope-sync.ts spec-sync --rebuild`);
    for (const u of unlisted.slice(0, 10)) console.error(`    ${u}`);
    if (unlisted.length > 10) console.error(`    … ${unlisted.length - 10} more`);
  }
  if (missingSpec.length) {
    console.error(`\n  ${missingSpec.length} notebook(s) have no spec — mint one with: bun tools/lope-sync.ts spec-sync --rebuild <notebook.html>`);
    for (const m of missingSpec.slice(0, 10)) console.error(`    ${m}`);
    if (missingSpec.length > 10) console.error(`    … ${missingSpec.length - 10} more`);
  }

  if (!changedFiles && !createdFiles && !missingSpec.length) { console.log("  specs up to date"); return 0; }
  const parts: string[] = [];
  if (createdFiles) parts.push(`${createdFiles} spec(s) ${check ? "missing" : "created"}`);
  if (changedFiles) {
    parts.push(
      check
        ? `${changedEntries} stale entr(ies) in ${changedFiles} spec(s)` +
          (bootconfFiles ? ` (${bootconfFiles} bootconf)` : "")
        : `${changedEntries} change(s) in ${changedFiles} spec(s)` +
          (addedEntries ? `, ${addedEntries} module entr(ies) added` : "") +
          (bootconfFiles ? `, ${bootconfFiles} bootconf(s) resynced` : "")
    );
  }
  if (parts.length) console.log(`\n${parts.join("; ")}${check ? ". Fix: bun tools/lope-sync.ts spec-sync" : " — re-stage them."}`);
  return 1; // pre-commit convention: non-zero when files were changed, created, or are stale/absent
}

// -------------------------------------------------------------- init-canonical

function cmdInitCanonical(write: boolean): number {
  const idx = deriveIndex();
  const out: Canonical = {};
  const unresolved: string[] = [];
  const inferred: string[] = [];
  const ambiguous: string[] = [];

  // A notebook is a module's home when its filename encodes the module name:
  // `@author_name.html`, `author_name.html` (older jumpgates), or bare `name.html`
  // (hand-named notebooks like atproto.html / ledger.html / lopefeed.html).
  const homeCandidates = (moduleId: string): string[] => {
    const [author, name] = moduleId.replace(/^@/, "").split("/");
    return [`@${author}_${name}.html`, `${author}_${name}.html`, `${name}.html`];
  };

  // Filename is a weak signal: a notebook can host a module whose name it does
  // not encode (`atproto.html` hosts at-login/at-read/at-write; a blog post hosts
  // the widgets it embeds). Booting the module as a main is the stronger claim.
  const mainsCache = new Map<string, string[]>();
  const mainsOf = (rel: string): string[] => {
    let m = mainsCache.get(rel);
    if (m) return m;
    m = (bootconfIn(readFileSync(join(ROOT, rel), "utf8"))?.mains as string[]) ?? [];
    mainsCache.set(rel, m);
    return m;
  };

  for (const [mod, refs] of idx) {
    if (!mod.startsWith("@tomlarkworthy/")) continue; // third-party is version-pinned in the id
    const entry: Record<string, string> = {};
    for (const repo of REPOS) {
      const names = homeCandidates(mod);
      const hit = refs.find((r) => r.repo === repo && names.some((n) => r.rel.endsWith("/" + n)));
      if (hit) entry[repo] = hit.rel;
    }
    if (Object.keys(entry).length) {
      out[mod] = entry;
      continue;
    }
    // No home file: try the bundle host by longest declared prefix
    // (e.g. @x/robocoop-4-core lives in @x/robocoop-4's notebook).
    const parts = mod.split("-");
    let found = false;
    for (let i = parts.length - 1; i > 0 && !found; i--) {
      const parent = parts.slice(0, i).join("-");
      for (const repo of REPOS) {
        const names = homeCandidates(parent);
        const hit = refs.find((r) => r.repo === repo && names.some((n) => r.rel.endsWith("/" + n)));
        if (hit) {
          out[mod] = { [repo]: hit.rel };
          inferred.push(`${mod}  ->  ${hit.rel}  (host of ${parent})`);
          found = true;
          break;
        }
      }
    }
    if (found) continue;

    // Last resort: a notebook that BOOTS the module owns it — how a blog post owns
    // the widget it embeds. Weak on its own, because a consumer boots it too
    // (blank-notebook boots robocoop-5-engine; a newsletter boots at-login), so it
    // only counts when exactly one notebook in the corpus does. Anything else is a
    // judgement call and goes to the human rather than being guessed.
    const hosts = refs.filter((r) => mainsOf(r.rel).includes(mod));
    if (hosts.length === 1) {
      out[mod] = { [hosts[0].repo]: hosts[0].rel };
      inferred.push(`${mod}  ->  ${hosts[0].rel}  (sole notebook booting it as a main)`);
    } else if (hosts.length > 1) {
      ambiguous.push(`${mod}  booted as a main by ${hosts.length}: ${hosts.map((h) => h.rel).join(", ")}`);
    } else {
      unresolved.push(`${mod}  (${refs.length} copies, no home notebook)`);
    }
  }

  // Merge over the existing file rather than replacing it. Everything above is
  // inferred; anything a human put there is not, and re-deriving must not silently
  // drop it. `upstream` is never inferred at all. A hand-declared repo entry the
  // deriver missed is kept when it still resolves — and reported when it does not,
  // rather than vanishing (that is how the belief-geometry rename went unnoticed).
  const existing = loadCanonical();
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const [mod, prev] of Object.entries(existing)) {
    const entry = (out[mod] ??= {});
    if ("upstream" in prev) entry.upstream = prev.upstream;
    for (const repo of reposOf(prev)) {
      if (entry[repo] === prev[repo]) continue;
      const rel = prev[repo] as string;
      const live = existsSync(join(ROOT, rel)) && shaOfBlock(rel, mod) !== null;
      if (live && !entry[repo]) { entry[repo] = rel; kept.push(`${mod}  ${repo}: ${rel}`); }
      else if (!live) dropped.push(`${mod}  ${repo}: ${rel} (no longer exists / no longer embeds it)`);
    }
    if (!reposOf(entry).length && !("upstream" in entry)) delete out[mod];
  }

  const declared = Object.keys(out).length;
  const dual = Object.values(out).filter((e) => reposOf(e).length > 1).length;
  console.log(`Resolved ${declared} module(s); ${dual} canonical in BOTH repos (staging + published).`);
  if (inferred.length) {
    console.log(`\nInferred from bundle host — REVIEW THESE (${inferred.length}):`);
    for (const l of inferred) console.log(`  ${l}`);
  }
  if (kept.length) {
    console.log(`\nKept hand-declared entries the deriver did not find (${kept.length}):`);
    for (const l of kept) console.log(`  ${l}`);
  }
  if (dropped.length) {
    console.log(`\nDROPPED — declared but no longer resolves (${dropped.length}):`);
    for (const l of dropped) console.log(`  ${l}`);
  }
  // Only nag about what is still undeclared. A module the deriver cannot resolve
  // but a human already declared is answered, not open — otherwise every run
  // re-asks a question that was settled (at-login, at-write, butter-synth).
  const open = (lines: string[]) => lines.filter((l) => !reposOf(out[l.split(/\s\s+/)[0]]).length);
  const stillAmbiguous = open(ambiguous);
  const stillUnresolved = open(unresolved);
  if (stillAmbiguous.length) {
    console.log(`\nAMBIGUOUS — several notebooks boot these; pick one by hand (${stillAmbiguous.length}):`);
    for (const l of stillAmbiguous) console.log(`  ${l}`);
  }
  if (stillUnresolved.length) {
    console.log(`\nUNRESOLVED — declare by hand (${stillUnresolved.length}):`);
    for (const l of stillUnresolved.slice(0, 30)) console.log(`  ${l}`);
    if (stillUnresolved.length > 30) console.log(`  … ${stillUnresolved.length - 30} more`);
  }

  if (!write) {
    console.log(`\n(dry run — pass --write to create modules/canonical.json)`);
    return 0;
  }
  const sorted: Canonical = {};
  for (const k of Object.keys(out).sort()) sorted[k] = out[k];
  mkdirSync(dirname(CANONICAL_PATH), { recursive: true });
  writeFileSync(CANONICAL_PATH, JSON.stringify(sorted, null, 2) + "\n");
  console.log(`\nWrote ${CANONICAL_PATH}`);
  return 0;
}

// ------------------------------------------------------------------- blocks
//
// A notebook is a flat list of top-level `<script id=…>` blocks and these three
// commands work on that list directly, without going through a module's canonical.
// They all locate blocks with tools/lib/notebook-blocks.ts — a regex sees phantom
// openers inside a block's own source (2,947 of them across the corpus) and a
// hand-rolled remover built on one cut 3,477 bytes out of an unrelated block.

const attr = (attrs: string, name: string) =>
  new RegExp(`${name}="([^"]*)"`).exec(attrs)?.[1] ?? "";

export function cmdLsBlocks(path: string, json: boolean): number {
  if (!existsSync(path)) { console.error(`No such file: ${path}`); return 1; }
  const bs = blocks(readFileSync(path, "utf8")).map((b) => ({
    id: b.id,
    start: b.start,
    end: b.end,
    bytes: b.end - b.start,
    mime: attr(b.attrs, "data-mime"),
    encoding: attr(b.attrs, "data-encoding"),
  }));
  if (json) { console.log(JSON.stringify(bs, null, 2)); return 0; }
  for (const b of bs) {
    const w = b.encoding ? `${b.mime}/${b.encoding}` : b.mime;
    console.log(`${b.id.padEnd(52)} ${String(b.start).padStart(9)}-${String(b.end).padEnd(9)} ${String(b.bytes).padStart(9)}  ${w}`);
  }
  console.log(`${bs.length} top-level block(s)`);
  return 0;
}

/** Remove a top-level block, plus the `\n\n` separator insertBefore/inject writes
 *  after one. Dry run unless --write. */
export function cmdRmBlock(path: string, id: string, write: boolean, all: boolean): number {
  if (!existsSync(path)) { console.error(`No such file: ${path}`); return 1; }
  const html = readFileSync(path, "utf8");
  const hits = blockSpans(html).filter((s) => s.id === id);
  if (!hits.length) { console.error(`No top-level block with id ${id} in ${path}`); return 1; }
  if (hits.length > 1 && !all) {
    console.error(
      `${id} occurs ${hits.length} times at top level in ${path} ` +
      `(${hits.map((s) => `${s.start}-${s.end}`).join(", ")}).\n` +
      `Only the first is live — the runtime resolves by id. Pass --all to remove every copy.`
    );
    return 1;
  }
  let next = html;
  let removed = 0;
  for (const s of [...hits].reverse()) {
    let end = s.end;
    if (next.slice(end, end + 2) === "\n\n") end += 2;
    console.log(`${write ? "removing" : "would remove"} ${id}  ${s.start}-${end}  ${end - s.start} bytes`);
    next = next.slice(0, s.start) + next.slice(end);
    removed += end - s.start;
  }
  if (!write) {
    console.log(`(dry run — pass --write to apply; ${removed} bytes, ${html.length} -> ${html.length - removed})`);
    return 0;
  }
  guardedWrite(path, html, next, "", `rm-block(${id})`, [id]);
  console.log(`Wrote ${path}  ${html.length} -> ${next.length} bytes`);
  return 0;
}

/** Stage ONLY one module's block from the working tree, leaving the rest of the
 *  notebook at HEAD and the working tree untouched. Notebooks are 1-50MB and a
 *  save-in-place rewrites unrelated bytes, so `git add` on the file commits far more
 *  than the module you edited. */
export function cmdStage(moduleId: string, notebook: string): number {
  if (!existsSync(notebook)) { console.error(`No such file: ${notebook}`); return 1; }
  // realpath both sides: `rev-parse --show-toplevel` resolves symlinks (macOS
  // /var -> /private/var), and a mismatched pair makes `relative` emit `../../..`,
  // which git then rejects as outside the repository.
  const abs = realpathSync(resolve(notebook));
  const sub = realpathSync(execFileSync("git", ["-C", dirname(abs), "rev-parse", "--show-toplevel"],
    { encoding: "utf8" }).trim());
  const rel = relative(sub, abs);
  const head = execFileSync("git", ["-C", sub, "show", `HEAD:${rel}`],
    { encoding: "utf8", maxBuffer: 1 << 30 });
  const work = readFileSync(abs, "utf8");

  const hSpan = findSpan(head, moduleId);
  const wSpan = findSpan(work, moduleId);
  if (!hSpan) { console.error(`${moduleId} has no block in HEAD:${rel} — stage adds nothing, use git add.`); return 1; }
  if (!wSpan) { console.error(`${moduleId} has no block in the working tree copy of ${rel}`); return 1; }

  // The real gate. Comparing spans structurally rather than reading `git diff`
  // output: a hunk header tells you line numbers, not whether they fall inside the
  // block, and a 50MB one-line-per-block file makes that reading useless anyway.
  if (head.slice(0, hSpan.start) !== work.slice(0, wSpan.start)) {
    console.error(`${rel} differs from HEAD BEFORE the ${moduleId} block — refusing to stage a partial file.`);
    return 1;
  }
  if (head.slice(hSpan.end) !== work.slice(wSpan.end)) {
    console.error(`${rel} differs from HEAD AFTER the ${moduleId} block — refusing to stage a partial file.`);
    return 1;
  }
  if (head.slice(hSpan.start, hSpan.end) === work.slice(wSpan.start, wSpan.end)) {
    console.log(`${moduleId} in ${rel} is unchanged from HEAD — nothing to stage.`);
    return 0;
  }

  const built = head.slice(0, hSpan.start) + work.slice(wSpan.start, wSpan.end) + head.slice(hSpan.end);
  const bSpan = findSpan(built, moduleId)!;
  if (built.slice(0, bSpan.start) !== head.slice(0, hSpan.start) ||
      built.slice(bSpan.end) !== head.slice(hSpan.end)) {
    console.error(`Built blob differs from HEAD outside the ${moduleId} block. Refusing.`);
    return 1;
  }

  const tmp = join(ROOT, "modules", `.stage-${md5(rel + moduleId)}.tmp`);
  writeFileSync(tmp, built);
  let sha: string;
  try {
    sha = execFileSync("git", ["-C", sub, "hash-object", "-w", "--path", rel, tmp],
      { encoding: "utf8" }).trim();
  } finally { rmSync(tmp, { force: true }); }
  const mode = execFileSync("git", ["-C", sub, "ls-files", "-s", "--", rel], { encoding: "utf8" })
    .trim().split(/\s+/)[0] || "100644";
  execFileSync("git", ["-C", sub, "update-index", "--cacheinfo", `${mode},${sha},${rel}`]);
  console.log(
    `Staged ${moduleId} in ${rel} (${relative(ROOT, sub) || "."})\n` +
    `  block ${hSpan.end - hSpan.start} -> ${wSpan.end - wSpan.start} bytes, blob ${short(sha)}, mode ${mode}\n` +
    `  working tree untouched; everything outside the block stays at HEAD`
  );
  return 0;
}

// ---------------------------------------------------------------------- CLI

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const flag = (n: string) => argv.includes(n);
  const opt = (n: string) => {
    const i = argv.indexOf(n);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const positional = argv.slice(1).filter((a, i, arr) => !a.startsWith("--") && !(i > 0 && arr[i - 1].startsWith("--") && ["--repo", "--module"].includes(arr[i - 1])));

  let code = 0;
  switch (cmd) {
    case "status":
      code = cmdStatus();
      break;
    case "audit":
      code = cmdAudit(opt("--module"), opt("--repo"));
      break;
    case "checkout":
      if (!positional[0]) { console.error("Usage: lope-sync checkout <@author/module> [--repo lopecode|lopebooks] [--force]"); code = 1; break; }
      code = cmdCheckout(positional[0], opt("--repo"), flag("--force"));
      break;
    case "pull":
      if (!positional[0]) { console.error("Usage: lope-sync pull <@author/module> [--force]"); code = 1; break; }
      code = cmdPull(positional[0], flag("--force"));
      break;
    case "prune":
      code = cmdPrune(flag("--write"));
      break;
    case "spec-sync":
      code = cmdSpecSync(positional, flag("--check"), flag("--rebuild"));
      break;
    case "hash-mains":
      code = cmdHashMains(positional, flag("--write"));
      break;
    case "init-canonical":
      code = cmdInitCanonical(flag("--write"));
      break;
    case "ls-blocks":
      if (!positional[0]) { console.error("Usage: lope-sync ls-blocks <notebook.html> [--json]"); code = 1; break; }
      code = cmdLsBlocks(positional[0], flag("--json"));
      break;
    case "rm-block":
      if (!positional[0] || !positional[1]) { console.error("Usage: lope-sync rm-block <notebook.html> <id> [--write] [--all]"); code = 1; break; }
      code = cmdRmBlock(positional[0], positional[1], flag("--write"), flag("--all"));
      break;
    case "stage":
      if (!opt("--module") || !opt("--notebook")) { console.error("Usage: lope-sync stage --module <@a/b> --notebook <notebook.html>"); code = 1; break; }
      code = cmdStage(opt("--module")!, opt("--notebook")!);
      break;
    default:
      console.error(
        "Usage:\n" +
        "  bun tools/lope-sync.ts status\n" +
        "  bun tools/lope-sync.ts audit [--module @a/b] [--repo lopecode|lopebooks]\n" +
        "  bun tools/lope-sync.ts checkout <@a/b> [--repo R] [--force]\n" +
        "  bun tools/lope-sync.ts pull <@a/b> [--force]\n" +
        "  bun tools/lope-sync.ts prune [--write]\n" +
        "  bun tools/lope-sync.ts spec-sync [--check] [--rebuild] [notebook.html ...]\n" +
        "  bun tools/lope-sync.ts hash-mains [--write] [notebook.html ...]\n" +
        "  bun tools/lope-sync.ts init-canonical [--write]\n" +
        "  bun tools/lope-sync.ts ls-blocks <notebook.html> [--json]\n" +
        "  bun tools/lope-sync.ts rm-block <notebook.html> <id> [--write] [--all]\n" +
        "  bun tools/lope-sync.ts stage --module <@a/b> --notebook <notebook.html>"
      );
      code = 1;
  }
  process.exit(code);
}
