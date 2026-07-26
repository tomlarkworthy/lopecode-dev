#!/usr/bin/env bun
/**
 * lope-preflight.ts — static integrity check over every notebook. No browser, no
 * runtime, ~seconds for the whole corpus.
 *
 * Purpose: guard a module resync sweep. Injecting a newer module block can quietly
 * add a dependency the target notebook does not embed — a newer `save-in-place`
 * wants `@tomlarkworthy/plugin-registry`, a newer module wants a FileAttachment —
 * and the notebook then fails at BOOT, which no amount of source diffing shows.
 * A real boot (bulk-smoke-test.js) only catches it when the notebook has tests
 * exercising that path, and many notebooks report `no-tests`. These checks are
 * deterministic and cover all of them.
 *
 *   syntax       every module block parses as ESM
 *   imports      every `main.define("module @x/y")` has an embedded @x/y block
 *   attachments  every FileAttachment name maps to an embedded <module>/<name> block
 *   mains        every bootconf main is embedded
 *   duplicates   no repeated block id
 *
 * Two layers, same entry point. The static layer above is instant and total. The
 * `--boot` layer really instantiates each notebook in node (reusing
 * bulk-smoke-test-worker.js, so there is one boot implementation) and runs its
 * in-notebook tests: slower, and only as good as the tests a notebook happens to
 * have, but it catches what static analysis cannot. Neither subsumes the other.
 *
 * Usage:
 *   bun tools/lope-preflight.ts                        # whole corpus, static, ~4s
 *   bun tools/lope-preflight.ts --json out.json        # write a baseline
 *   bun tools/lope-preflight.ts --baseline out.json    # gate: only NEW findings fail
 *   bun tools/lope-preflight.ts --boot                 # also really boot each notebook
 *   bun tools/lope-preflight.ts <notebook.html> ...    # specific files, verbose
 *
 * The corpus already carries pre-existing findings, so a clean sheet is not the
 * bar. Capture a baseline, sweep, then re-run with --baseline: exit is non-zero
 * only for findings that were not there before.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "fs";
import { join, resolve, relative, dirname } from "path";
import { execFile } from "child_process";

const ROOT = resolve(import.meta.dir, "..");
const REPOS = ["lopecode", "lopebooks"];
const transpiler = new Bun.Transpiler({ loader: "js" });

type Block = { id: string; attrs: string; content: string };
type Problem = { kind: string; detail: string };

function blocks(html: string): Block[] {
  const out: Block[] = [];
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g))
    out.push({ id: m[1], attrs: m[2], content: m[3].replace(/^\n/, "").replace(/\n$/, "") });
  return out;
}

/** A first-party module block: JS source, not a file attachment, not a packed bundle.
 *  `data-encoding` blocks (base64+gzip vendored libs like es-module-shims) carry
 *  encoded bytes, not source, so parsing them is meaningless. */
const isModuleBlock = (b: Block) =>
  /data-mime="application\/javascript"/.test(b.attrs) &&
  !/data-encoding=/.test(b.attrs) &&
  b.id.split("/").length <= 2;

/** bootconf.json, skipping the exporter's own template (which contains `${...}`). */
function bootconf(html: string): any | null {
  for (const m of html.matchAll(/<script\s+id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try { return JSON.parse(m[1].trim()); } catch { /* template */ }
  }
  return null;
}

/**
 * Module ids this block imports, from the generated `main.define("module <id>")`.
 * Only `@author/name` ids name a content block. Excluded:
 *   d/<hex>@<n>, plain integers   Observable document-id imports, resolved by the
 *                                 importmap rather than by block id
 *   ids containing ${...}, and @x  the exporter's own code-generation templates,
 *                                 which live inside module source as string literals
 */
function importsOf(src: string): string[] {
  return [...src.matchAll(/main\.define\("module ([^"]+)"/g)]
    .map((m) => m[1])
    .filter((id) => /^@[^/${]+\/[^/${]+$/.test(id) && id !== "@x");
}

/**
 * Symbols this block imports from other modules, as [sourceModule, exportedName].
 * The exporter emits one of:
 *   main.define("x",  ["module @a/b", "@variable"], (_, v) => v.import("x", _));
 *   main.define("y",  ["module @a/b", "@variable"], (_, v) => v.import("x", "y", _));
 * so the FIRST string argument to v.import is always the name in the source module.
 */
function importedSymbols(src: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = /main\.define\("[^"]*",\s*\[\s*"module ([^"]+)"[^\]]*\][^)]*\)\s*=>\s*v\.import\("([^"]+)"/g;
  for (const m of src.matchAll(re))
    if (/^@[^/${]+\/[^/${]+$/.test(m[1])) out.push([m[1], m[2]]);
  return out;
}

/**
 * Stdlib names every module gets for free. A module can be imported FROM for one of
 * these even though it never defines it — the name resolves through the source
 * module's builtins — so importing e.g. `md` from runtime-sdk is not a missing export.
 */
const BUILTINS = new Set([
  "FileAttachment", "Files", "Generators", "Mutable", "Promises", "DOM", "Event",
  "html", "md", "svg", "tex", "dot", "mermaid", "now", "width", "invalidation",
  "visibility", "require", "resolve", "Inputs", "d3", "htl", "_", "L", "topojson",
]);

/**
 * Cell names a module block defines. `$def(id, name, inputs, fn)` carries the name
 * (null for anonymous cells); re-exported imports come through as `main.define("n",`.
 */
function definedNames(src: string): Set<string> {
  const out = new Set<string>();
  for (const m of src.matchAll(/\$def\("[^"]*",\s*"((?:[^"\\]|\\.)*)"/g)) out.add(m[1]);
  for (const m of src.matchAll(/main\.define\("((?:[^"\\]|\\.)*)"/g))
    if (!m[1].startsWith("module ")) out.add(m[1]);
  return out;
}

/** FileAttachment names this block expects, from the generated loader map. */
function attachmentsOf(src: string): string[] {
  const m = src.match(/const fileAttachments = new Map\(\[([\s\S]*?)\]\.map\(/);
  if (!m) return [];
  return [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]);
}

function checkNotebook(rel: string): Problem[] {
  return checkHtml(readFileSync(join(ROOT, rel), "utf8"));
}

export function checkHtml(html: string): Problem[] {
  const problems: Problem[] = [];
  const bs = blocks(html);
  const ids = new Set(bs.map((b) => b.id));

  const seen = new Set<string>();
  for (const b of bs) {
    if (seen.has(b.id)) problems.push({ kind: "duplicate", detail: b.id });
    seen.add(b.id);
  }

  const mods = bs.filter(isModuleBlock);
  const deps = new Map<string, string[]>();
  for (const b of mods) {
    try {
      transpiler.transformSync(b.content);
    } catch (e: any) {
      problems.push({ kind: "syntax", detail: `${b.id}: ${String(e.message).split("\n")[0].slice(0, 120)}` });
      continue; // a block that will not parse cannot be scanned for deps
    }
    deps.set(b.id, importsOf(b.content));
  }

  const conf = bootconf(html);
  if (!conf) problems.push({ kind: "bootconf", detail: "no parseable bootconf.json" });
  for (const main of conf?.mains ?? [])
    if (!ids.has(main)) problems.push({ kind: "missing-main", detail: `bootconf main ${main} not embedded` });

  // The Observable runtime is lazy: a module nobody imports is never instantiated,
  // so its unmet dependencies never resolve and never throw. Only the closure
  // reachable from bootconf.mains actually runs at boot, and only breakage inside
  // that closure is a real failure. Outside it, record separately — informative
  // (and worth fixing) but not a boot regression.
  const reached = new Set<string>();
  const queue = [...(conf?.mains ?? [])];
  while (queue.length) {
    const id = queue.pop()!;
    if (reached.has(id) || !deps.has(id)) continue;
    reached.add(id);
    queue.push(...deps.get(id)!);
  }

  // Document order matters: a module's file attachments must appear BEFORE the
  // module block itself.
  const orderOf = new Map<string, number>();
  bs.forEach((b, i) => { if (!orderOf.has(b.id)) orderOf.set(b.id, i); });

  const byId = new Map(mods.map((b) => [b.id, b]));
  const namesOf = new Map<string, Set<string>>();
  for (const b of mods) namesOf.set(b.id, definedNames(b.content));

  for (const [id, imports] of deps) {
    const live = reached.has(id);
    for (const dep of imports)
      if (!ids.has(dep))
        problems.push({ kind: live ? "missing-import" : "missing-import-lazy", detail: `${id} imports ${dep}` });

    // A module can be present but too OLD to provide what the importer asks for.
    // Resyncing `observablejs-toolchain` into a notebook whose `acorn-8-11-3` predates
    // `acorn_walk_url` produced exactly this: every block present, nothing missing,
    // 44 cells failing at runtime with "acorn_walk_url is not defined".
    for (const [dep, sym] of importedSymbols(byId.get(id)!.content)) {
      const has = namesOf.get(dep);
      if (!has || has.has(sym) || BUILTINS.has(sym)) continue;
      problems.push({
        kind: live ? "missing-export" : "missing-export-lazy",
        detail: `${id} imports ${sym} from ${dep}, which does not define it`,
      });
    }
    for (const name of attachmentsOf(byId.get(id)!.content)) {
      const attId = ids.has(`${id}/${encodeURIComponent(name)}`)
        ? `${id}/${encodeURIComponent(name)}`
        : ids.has(`${id}/${name}`) ? `${id}/${name}` : null;
      if (!attId) {
        problems.push({ kind: live ? "missing-attachment" : "missing-attachment-lazy", detail: `${id} needs ${name}` });
      } else if (orderOf.get(attId)! > orderOf.get(id)!) {
        problems.push({ kind: "attachment-after-module", detail: `${id}: ${name} is emitted after its module block` });
      }
    }
  }

  // Blocks that belong to a module by id prefix but are not in its loader map are
  // still content the module reads (markdown-wiki scans the DOM for its own docs),
  // so the same ordering rule applies to them.
  for (const b of bs) {
    const slash = b.id.lastIndexOf("/");
    if (slash < 0) continue;
    const owner = b.id.slice(0, slash);
    if (!byId.has(owner)) continue;
    if (orderOf.get(b.id)! > orderOf.get(owner)!)
      problems.push({ kind: "attachment-after-module", detail: `${owner}: ${b.id.slice(slash + 1)} is emitted after its module block` });
  }

  // A block can be reached both via a loader map and by id prefix; report it once.
  const uniq = new Map<string, Problem>();
  for (const p of problems) uniq.set(p.kind + "\u0000" + p.detail, p);
  return [...uniq.values()];
}

// ------------------------------------------------------------------------ CLI

if (!import.meta.main) { /* imported for checkHtml; skip the CLI */ } else {

const argv = process.argv.slice(2);
const flagVal = (n: string) => (argv.indexOf(n) >= 0 ? argv[argv.indexOf(n) + 1] : null);
const jsonOut = flagVal("--json");
const baselineIn = flagVal("--baseline");
const doBoot = argv.includes("--boot");
const bootTimeout = Number(flagVal("--timeout") ?? 20000);
const explicit = argv.filter((a) => a.endsWith(".html"));

const targets = explicit.length
  ? explicit.map((p) => relative(ROOT, resolve(p)))
  : REPOS.flatMap((repo) => {
      const dir = join(ROOT, repo, "notebooks");
      if (!existsSync(dir)) return [];
      return readdirSync(dir).filter((f) => f.endsWith(".html")).sort()
        .map((f) => relative(ROOT, join(dir, f)));
    });

const report: Record<string, Problem[]> = {};
const byKind = new Map<string, number>();
const add = (rel: string, p: Problem) => {
  (report[rel] ??= []).push(p);
  byKind.set(p.kind, (byKind.get(p.kind) ?? 0) + 1);
};
for (const rel of targets) for (const p of checkNotebook(rel)) add(rel, p);

// --- optional second layer: really boot each notebook -----------------------
// Reuses bulk-smoke-test-worker.js verbatim (one boot implementation, not two).
// Bounded concurrency: each worker instantiates a ~2MB notebook in its own node.
if (doBoot) {
  const worker = join(ROOT, "tools", "bulk-smoke-test-worker.js");
  const boot = (rel: string) =>
    new Promise<void>((done) => {
      execFile("node", ["--experimental-vm-modules", worker, join(ROOT, rel), String(bootTimeout)],
        { timeout: bootTimeout * 2 + 10000, killSignal: "SIGKILL", maxBuffer: 10 << 20,
          env: { ...process.env, NODE_NO_WARNINGS: "1" } },
        (err, _out, stderr) => {
          const line = String(stderr || "").split("\n").find((l) => l.startsWith("__RESULT__"));
          let r: any = null;
          if (line) { try { r = JSON.parse(line.slice("__RESULT__".length)); } catch {} }
          if (!r) add(rel, { kind: "boot-crash", detail: err?.killed ? "timeout" : String(err?.message ?? "no result").slice(0, 120) });
          else if (r.status === "load-failed" || r.status === "crash")
            add(rel, { kind: "boot-failed", detail: `${r.status}: ${String(r.error ?? "").slice(0, 120)}` });
          else if (r.status === "tests-failed")
            for (const t of r.failedTests ?? []) add(rel, { kind: "test-failed", detail: `${t.name}: ${String(t.error ?? "").slice(0, 100)}` });
          done();
        });
    });
  const queue = [...targets];
  let bootDone = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let rel = queue.shift(); rel; rel = queue.shift()) {
      await boot(rel);
      if (++bootDone % 20 === 0) console.error(`  booted ${bootDone}/${targets.length}`);
    }
  }));
}

if (jsonOut) {
  // sorted for a stable before/after diff
  const stable: Record<string, Problem[]> = {};
  for (const k of Object.keys(report).sort())
    stable[k] = [...report[k]].sort((a, b) => (a.kind + a.detail).localeCompare(b.kind + b.detail));
  writeFileSync(jsonOut, JSON.stringify(stable, null, 2) + "\n");
  console.log(`wrote ${jsonOut}`);
}

const total = [...byKind.values()].reduce((a, b) => a + b, 0);
// Only breakage in the boot closure gates; `-lazy` findings never run.
const blocking = [...byKind].filter(([k]) => !k.endsWith("-lazy")).reduce((a, [, n]) => a + n, 0);
console.log(`\n${targets.length} notebook(s) checked${doBoot ? " (static + real boot)" : ""}; ` +
  `${Object.keys(report).length} with findings, ${total} finding(s), ${blocking} in the boot closure`);
for (const [k, n] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(5)}  ${k}`);

// --- gate ------------------------------------------------------------------
// With a baseline, only findings that were NOT there before matter — the corpus
// carries pre-existing ones, and failing on those would make the gate useless.
if (baselineIn) {
  const base: Record<string, Problem[]> = JSON.parse(readFileSync(baselineIn, "utf8"));
  const key = (rel: string, p: Problem) => `${rel}\u0000${p.kind}\u0000${p.detail}`;
  const had = new Set<string>();
  for (const [rel, ps] of Object.entries(base)) for (const p of ps) had.add(key(rel, p));
  const now = new Set<string>();
  for (const [rel, ps] of Object.entries(report)) for (const p of ps) now.add(key(rel, p));

  const added = [...now].filter((k) => !had.has(k)).filter((k) => !k.split("\u0000")[1].endsWith("-lazy"));
  const fixed = [...had].filter((k) => !now.has(k));
  console.log(`\nvs baseline ${baselineIn}:  ${added.length} NEW, ${fixed.length} resolved`);
  for (const k of added.slice(0, 30)) {
    const [rel, kind, detail] = k.split("\u0000");
    console.log(`  NEW  ${kind.padEnd(22)} ${rel.split("/").pop()}  ${detail}`);
  }
  if (added.length > 30) console.log(`  … ${added.length - 30} more`);
  process.exit(added.length ? 1 : 0);
}

if (explicit.length || blocking <= 40) {
  for (const [rel, ps] of Object.entries(report)) {
    console.log(`\n${rel}`);
    for (const p of ps.slice(0, 12)) console.log(`  ${p.kind.padEnd(20)} ${p.detail}`);
    if (ps.length > 12) console.log(`  … ${ps.length - 12} more`);
  }
}
process.exit(blocking ? 1 : 0);

}
