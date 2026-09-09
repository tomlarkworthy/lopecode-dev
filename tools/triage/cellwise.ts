// Triage a "minority smell": lope-sync can see that a canonical holds a version
// few notebooks share, but content hashes carry no ordering, so it cannot say
// whether that means AHEAD (just refreshed) or BEHIND (never refreshed). Ask the
// publish source instead.
//
// Compares, per cell and immune to cell reordering, each of
//   lopecode canonical / lopebooks canonical / the corpus majority
// against ObservableHQ.
//
// Both sides are split with `parseVariableGroups` (lope-push-ws), which takes each
// cell's definition from its acorn AST range and reads the name and dep list off the
// `$def` / `main.variable(observer(…)).define(…)` registration. Nothing about the two
// compilers' wrappers reaches the comparison, so there is no normalising to do: the
// lopecode `const _pid = …;` holder, Observable's bare declaration, and the
// materialised `(G,_) => G.input(_)` getters all reduce to the same definition text.
// The dep list is compared too — a change that only moves deps (adding `invalidation`
// to a cell, say) was invisible to the old text-only differ.
//
//   bun tools/triage/cellwise.ts @tomlarkworthy/themes ...
//   bun tools/triage/cellwise.ts --all-minority
import { deriveIndex, loadCanonical, upstreamFor } from "../lope-sync.ts";
import { parseVariableGroups } from "../lope-push-ws.js";
import * as acorn from "acorn";
import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dir, "../..");

export function contentOf(rel: string, moduleId: string): string | null {
  const html = readFileSync(resolve(ROOT, rel), "utf8");
  for (const m of html.matchAll(/<script\s+id="([^"]+)"([^>]*)>([\s\S]*?)<\/script>/g))
    if (m[1] === moduleId && /data-mime="application\/javascript"/.test(m[2]))
      return m[3].replace(/^\n/, "").replace(/\n$/, "");
  return null;
}

/** Undo the HTML embedding of a lopecode `<script type="text/plain">` block, so the
 *  bytes parse as the JS they were before being inlined. Mirrors exporter-3's
 *  `escapeScriptTags`, which rewrites `</script` — the close tag with no `>` yet, since
 *  that is what ends the block — so the inverse must not require one either. */
function unembed(s: string): string {
  return s
    .replace(/<\/scr\\ipt/g, "</script")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

export interface Cell {
  def: string;
  inputs: string[];
}

export interface Module {
  /** Cells keyed by the name they are registered under. Anonymous cells are renumbered
   *  by the compiler, so they cannot be keyed and are skipped. */
  cells: Map<string, Cell>;
  /** The names a module imports from its siblings. The module each one comes FROM is not
   *  comparable — Observable writes an id-referenced notebook as `from "4"` where lopecode
   *  writes the slug — but the names are, and a merge that forgets one leaves the cell that
   *  needed it undefined at runtime with nothing static to see. */
  imports: Set<string>;
}

export function parseModule(src: string): Module {
  const { groups, preformatted } = parseVariableGroups(unembed(src), acorn);
  const cells = new Map<string, Cell>();
  for (const group of groups ?? [])
    for (const v of group ?? [])
      if (v?._name) cells.set(v._name, { def: v._definition.trim(), inputs: v._inputs ?? [] });
  const imports = new Set<string>();
  for (const stmt of preformatted ?? []) {
    const m = String(stmt).match(/^import\s*\{([^}]*)\}/);
    if (!m) continue;
    // `remote as local` binds the LOCAL name, which is what the cells reference
    for (const part of m[1].split(",")) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim();
      // Compare on the base name. Importing `mutable x` also binds `x`, and the two
      // compilers keep different halves of that pair, so the prefix is noise here.
      // `_0`, `_1` … are anonymous cells the compiler renumbers, never real symbols.
      if (name && !/^_\d+$/.test(name)) imports.add(name.replace(/^(viewof|mutable|initial) /, ""));
    }
  }
  return { cells, imports };
}

export const cells = (src: string) => parseModule(src).cells;

/** Two compilers, one cell. Observable wraps a cell expression as
 *  `function _x(d){return(\n<expr>\n)}`; the lopecode exporter writes
 *  `function _x(d)\n{\n  return <expr>;\n}` and lays the braces out differently again.
 *  Compare the BODY — the returned expression, or the statement block when there is more
 *  than a return — as a token stream plus its comments. Wrapper shape and indentation stop
 *  being differences; code and prose stay one. */
function sig(def: string): string {
  const comments: acorn.Comment[] = [], tokens: acorn.Token[] = [];
  let node: any;
  try {
    const prog: any = acorn.parse(`(${def})`, { ecmaVersion: "latest", onComment: comments, onToken: tokens });
    node = prog.body[0]?.expression ?? prog.body[0];
  } catch {
    return def; // unparseable: fall back to the bytes rather than call it equal
  }
  let body = node?.body;
  if (body?.type === "BlockStatement") {
    const only = body.body.length === 1 ? body.body[0] : null;
    if (only?.type === "ReturnStatement" && only.argument) body = only.argument;
  }
  const [lo, hi] = body ? [body.start, body.end] : [0, def.length + 2];
  const within = (x: { start: number; end: number }) => x.start >= lo && x.end <= hi;
  return tokens.filter(within).map((t) => `${t.type.label}\u0002${t.value ?? ""}`).join("\u0001") +
    "\u0003" + comments.filter(within).map((c) => c.value.replace(/\s+/g, " ").trim()).join("\u0001");
}

export const sameDef = (a: Cell, b: Cell) => a.def === b.def || sig(a.def) === sig(b.def);

// The Observable runtime's builtin scope. A dep is a real dataflow edge when it names a
// cell in either module or one of these; anything else — `fetch`, `DOMParser`,
// `MutationObserver` — is a free global, and the two compilers disagree about those by
// construction (Observable omits them from the dep list, the lopecode exporter keeps them),
// so comparing them reports a difference on every cell that touches a browser API.
const RUNTIME_BUILTINS = new Set([
  "invalidation", "visibility", "now", "width", "Mutable", "Generators", "Promises", "DOM",
  "Files", "FileAttachment", "@variable", "md", "html", "svg", "tex", "dot", "mermaid", "_",
  "d3", "Plot", "Inputs", "L", "topojson", "vl", "aq", "Arrow", "DuckDBClient", "htl",
  "require", "resolve", "SQLite", "SQLiteDatabaseClient", "importShim",
]);

/** Dep lists compare as SETS: the parameter order is the compiler's, and each compiler
 *  reorders it freely — the body names its inputs, so a reorder is invisible there too. */
export function sameInputs(a: Cell, b: Cell, known: (n: string) => boolean): boolean {
  const real = (c: Cell) =>
    [...new Set(c.inputs.filter((i) => known(i) || RUNTIME_BUILTINS.has(i.replace(/^(viewof|mutable|initial) /, ""))))].sort();
  return real(a).join("\u0000") === real(b).join("\u0000");
}

if (import.meta.main) await main();

async function main() {
const idx = deriveIndex();
const canon = loadCanonical();

let mods = process.argv.slice(2);
if (mods[0] === "--all-minority") {
  mods = Object.keys(canon).filter((m) => {
    const refs = idx.get(m) ?? [];
    const counts = new Map<string, number>();
    for (const r of refs) counts.set(r.sha, (counts.get(r.sha) || 0) + 1);
    if (counts.size < 2) return false;
    const top = Math.max(...counts.values());
    return Object.entries(canon[m]).some(([k, rel]) => {
      if (k === "upstream" || typeof rel !== "string") return false;
      const sha = refs.find((r) => r.rel === rel)?.sha;
      return sha !== undefined && (counts.get(sha) ?? 0) < top;
    });
  }).sort();
}

// One fetch per module against api.observablehq.com, and the run does nothing else
// while it waits — measured 0.39 s/module and 18% CPU serially, so the whole corpus is
// ~105 s of idling. Fetch ahead of the report at a fixed width; output order is the
// argument order either way.
const upstream = new Map<string, { status: number; text: string }>();
await (async () => {
  const jobs = mods.map((m) => [m, upstreamFor(m)] as const).filter(([, up]) => up.kind !== "none");
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(8, jobs.length) }, async () => {
    for (let i = next++; i < jobs.length; i = next++) {
      const [mod, up] = jobs[i];
      try {
        const res = await fetch(`https://api.observablehq.com/${up.slug}.js?v=4`);
        upstream.set(mod, { status: res.status, text: res.ok ? await res.text() : "" });
      } catch (e) {
        // One dropped connection must not take the other 266 reports with it
        upstream.set(mod, { status: 0, text: String((e as Error).message) });
      }
    }
  }));
})();

for (const mod of mods) {
  const refs = idx.get(mod) ?? [];
  const counts = new Map<string, number>();
  for (const r of refs) counts.set(r.sha, (counts.get(r.sha) || 0) + 1);
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const up = upstreamFor(mod);
  if (up.kind === "none") {
    console.log(`\n### ${mod}\n  NO UPSTREAM (declared) — the notebook is the origin; nothing to compare against.`);
    continue;
  }
  const res = upstream.get(mod)!;
  if (res.status !== 200) {
    console.log(`\n### ${mod}\n  observable ${res.status} — not published under ${up.slug}. Consider "upstream": null.`);
    continue;
  }
  const { cells: obs, imports: obsImports } = parseModule(res.text);

  const variants: [string, string][] = [];
  for (const repo of ["lopecode", "lopebooks"]) {
    const rel = (canon as any)[mod]?.[repo];
    if (typeof rel === "string") variants.push([`${repo} canonical`, rel]);
  }
  // the biggest version that is NOT a canonical — what the consumers actually run
  const canonShas = new Set(variants.map(([, rel]) => refs.find((r) => r.rel === rel)?.sha));
  const maj = ranked.find(([sha]) => !canonShas.has(sha)) ?? ranked[0];
  variants.push([`majority ×${maj[1]}`, refs.find((r) => r.sha === maj[0])!.rel]);

  console.log(`\n### ${mod}   (observable: ${obs.size} named cells)`);
  const score: Record<string, number> = {};
  for (const [label, rel] of variants) {
    const { cells: v, imports: vImports } = parseModule(contentOf(rel, mod)!);
    const impAbsent = [...obsImports].filter((k) => !vImports.has(k));
    const impExtra = [...vImports].filter((k) => !obsImports.has(k));
    const absent = [...obs.keys()].filter((k) => !v.has(k));
    const extra = [...v.keys()].filter((k) => !obs.has(k));
    const known = (n: string) => v.has(n) || obs.has(n) ||
      v.has(n.replace(/^(viewof|mutable|initial) /, "")) || obs.has(n.replace(/^(viewof|mutable|initial) /, ""));
    const differ = [...obs.keys()]
      .filter((k) => v.has(k) && !(sameDef(v.get(k)!, obs.get(k)!) && sameInputs(v.get(k)!, obs.get(k)!, known)))
      // a cell whose body matches but whose dep list moved is a real change the old
      // text-only differ could not see; say which kind it is
      .map((k) => (sameDef(v.get(k)!, obs.get(k)!) ? `${k} (deps)` : k));
    const imp = impAbsent.length + impExtra.length;
    score[label] = absent.length + extra.length + differ.length + imp;
    console.log(
      `  ${label.padEnd(20)} ${score[label] === 0 ? "== OBSERVABLE" : `absent ${absent.length}  extra ${extra.length}  differ ${differ.length}${imp ? `  imports ${imp}` : ""}`}`
    );
    if (absent.length) console.log(`      absent: ${absent.slice(0, 8).join(", ")}`);
    if (extra.length) console.log(`      extra : ${extra.slice(0, 8).join(", ")}`);
    if (differ.length) console.log(`      differ: ${differ.slice(0, 8).join(", ")}`);
    if (impAbsent.length) console.log(`      imports absent: ${impAbsent.slice(0, 8).join(", ")}`);
    if (impExtra.length) console.log(`      imports extra : ${impExtra.slice(0, 8).join(", ")}`);
  }
  const canonScores = variants.filter((v) => v[0].endsWith("canonical")).map((v) => score[v[0]]);
  const majScore = score[variants[variants.length - 1][0]];
  const best = Math.min(...canonScores);
  // Distance to Observable does NOT give direction. A canonical that differs while
  // the majority matches is just as likely to hold unpublished local work as to
  // have missed a refresh — observed both ways here: at-write's canonical carries
  // cover-image/bsky/standard.site features Observable has never seen, and
  // blank-notebook's carries three local welcome cells. Never call that "behind"
  // without reading the cells.
  console.log("  => " + (
    best === 0 ? "CANONICAL CURRENT — smell is 'ahead of consumers', no action"
    : majScore === 0 ? "CANONICAL DIVERGES from upstream while the majority matches it — READ THE CELLS: local-only work (ahead) or a missed refresh (behind)?"
    : best < majScore ? `both differ from Observable; canonical is closer (${best} vs ${majScore})`
    : best > majScore ? `both differ; MAJORITY is closer (${majScore} vs ${best}) — canonical may be behind, read the cells`
    : `both differ from Observable equally (${best}) — a shared local divergence, not a skew`
  ));
}
}
