#!/usr/bin/env bun
/**
 * lope-pid-match.ts — carry persistent ids across a re-export.
 *
 * A pid is `contentHash(v._name + v._definition.toString())` (runtime-sdk
 * `persistentId`), so it is a function of the COMPILED text of the cell, not of the
 * cell's identity. Observable's compiler and exporter-3 lay the same cell out
 * differently (`{return(x)}` against `{ return x; }`, brace placement, dep order), so
 * a jumpgate down re-mints a pid for every cell it round-trips even when nothing about
 * the cell changed. Measured 2026-09-27 against the declared canonicals:
 *
 *   exporter-3   95 of 161 pids changed
 *   lopepage-2    7 of  55 pids changed
 *
 * pids address cells for anything that stores a reference to one — annotations,
 * lopepage-2's scroll anchor (`lp2_anchor` records `{pid, offset}`), code-facts
 * subjects — so churn silently detaches that state. This tool rewrites the new
 * module's pids back to the old ones wherever the cell can be identified with
 * certainty, and leaves the rest alone.
 *
 *   bun tools/lope-pid-match.ts <new> <old> [--module @a/b] [--write] [--json]
 *
 * <new> and <old> are each either a notebook `.html` or a single module `.js`. With two
 * .html files every module block present in both is processed (restrict with --module,
 * repeatable). Default is a dry run.
 *
 * Matching is by cell NAME, which is the half of the hash input that does not depend on
 * the compiler. A name must be unique on both sides. Anonymous cells (`$def` name
 * `null`) have no name to match, so they fall back to their normalised body — the same
 * `sig()` comparison `triage/cellwise.ts` uses, which is immune to the five cosmetic
 * differences between the two compilers — and are only matched when that body is unique
 * among the anonymous cells on both sides. Everything else keeps its fresh pid: a wrong
 * pid is worse than a new one, because it points stored state at the wrong cell.
 */
import * as acorn from "acorn";
import { readFileSync, writeFileSync } from "fs";
import { extname } from "path";
import { blockSpans, guardedWrite } from "./lib/notebook-blocks.ts";
import { sig } from "./triage/cellwise.ts";

/** One pid occurrence in the source: a range whose text is exactly the pid. */
type Site = { start: number; end: number };

type Cell = {
  pid: string;
  /** `$def`'s 2nd argument; null for an anonymous cell. */
  name: string | null;
  /** The cell's definition text, as written. */
  def: string;
  sites: Site[];
};

/**
 * The pid sites in a compiled lopecode module block.
 *
 * exporter-3 emits a pid at two structural places per cell — the holder binding
 * (`const <pid> = function …`) and the registration (`$def("<pid>", name, deps,
 * <pid>)`) — and the holder identifier is the pid verbatim (`variableToDefinition`
 * interpolates the same `pid(v)` into both). A notebook-kit cell registers with
 * `$nk("<pid>", name, <pid>, [[pid,name],…])` instead, whose 4th argument carries a
 * pid per output variable. Nothing else in the block is a pid, which is why this is an
 * AST pass and not a search-and-replace: exporter-3's own test fixtures contain the
 * literal text `$def("_e3keep", "n", [], _e3keep);` inside a template, and a textual
 * rename would rewrite it.
 */
function parseCells(src: string): { cells: Cell[]; warnings: string[]; top: Set<string> } {
  const warnings: string[] = [];
  const ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }) as any;

  // Every top-level binding, by name. Cell holders are the function-valued ones, but the
  // whole set is needed to know which identifiers a rename must not collide with.
  const holders = new Map<string, { id: Site; def: Site }>();
  for (const node of ast.body) {
    if (node.type === "VariableDeclaration") {
      for (const d of node.declarations) {
        if (d.id?.type === "Identifier" && d.init)
          holders.set(d.id.name, {
            id: { start: d.id.start, end: d.id.end },
            def: { start: d.init.start, end: d.init.end },
          });
      }
    } else if (node.type === "FunctionDeclaration" && node.id) {
      holders.set(node.id.name, {
        id: { start: node.id.start, end: node.id.end },
        def: { start: node.start, end: node.end },
      });
    }
  }

  const registrations: any[] = [];
  walk(ast, (node) => {
    if (node.type === "CallExpression" && node.callee?.type === "Identifier" &&
        (node.callee.name === "$def" || node.callee.name === "$nk"))
      registrations.push(node);
  });

  const cells: Cell[] = [];
  for (const call of registrations) {
    const a = call.arguments;
    if (a[0]?.type !== "Literal" || typeof a[0].value !== "string") {
      warnings.push(`${call.callee.name} at ${call.start} has a non-literal pid — left alone`);
      continue;
    }
    const pid: string = a[0].value;
    const nameArg = a[1];
    const name = nameArg?.type === "Literal" && typeof nameArg.value === "string" ? nameArg.value : null;

    const sites: Site[] = [{ start: a[0].start + 1, end: a[0].end - 1 }];
    // $def(pid, name, deps, fn) | $nk(pid, name, fn, extras)
    const fnArg = call.callee.name === "$nk" ? a[2] : a[3];
    let def: string;
    if (fnArg?.type === "Identifier") {
      const holder = holders.get(fnArg.name);
      if (!holder) {
        warnings.push(`${pid}: registration names ${fnArg.name}, which is not a top-level binding`);
        continue;
      }
      def = src.slice(holder.def.start, holder.def.end);
      if (fnArg.name === pid) {
        sites.push({ start: fnArg.start, end: fnArg.end });
        sites.push(holder.id);
      } else {
        warnings.push(`${pid}: holder is named ${fnArg.name}, not the pid — only the registration string is rewritten`);
      }
    } else if (fnArg) {
      def = src.slice(fnArg.start, fnArg.end);   // inline function expression
    } else {
      warnings.push(`${pid}: no definition argument`);
      continue;
    }

    // $nk's `extras` lists [pid, name] for the cell's other output variables.
    if (call.callee.name === "$nk" && a[3]?.type === "ArrayExpression") {
      for (const el of a[3].elements) {
        const p = el?.elements?.[0];
        if (p?.type === "Literal" && typeof p.value === "string")
          cells.push({ pid: p.value, name: el.elements[1]?.value ?? null, def, sites: [{ start: p.start + 1, end: p.end - 1 }] });
      }
    }

    cells.push({ pid, name, def, sites });
  }

  for (const c of cells)
    for (const s of c.sites)
      if (src.slice(s.start, s.end) !== c.pid)
        throw new Error(`pid site check failed: expected ${JSON.stringify(c.pid)} at ${s.start}, ` +
          `found ${JSON.stringify(src.slice(s.start, s.end))}`);

  return { cells, warnings, top: new Set(holders.keys()) };
}

function walk(node: any, visit: (n: any) => void): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) { for (const n of node) walk(n, visit); return; }
  if (typeof node.type === "string") visit(node);
  for (const k in node) if (k !== "type" && k !== "start" && k !== "end") walk(node[k], visit);
}

/** Names that occur exactly once. A duplicate name is ambiguous, and a wrong pid is
 *  worse than a fresh one. */
function uniqueBy<T>(items: T[], key: (t: T) => string | null): Map<string, T> {
  const counts = new Map<string, number>();
  for (const it of items) { const k = key(it); if (k !== null) counts.set(k, (counts.get(k) ?? 0) + 1); }
  const out = new Map<string, T>();
  for (const it of items) { const k = key(it); if (k !== null && counts.get(k) === 1) out.set(k, it); }
  return out;
}

export type Match = { pid: string; oldPid: string; name: string | null; how: "name" | "body" };
export type Report = {
  module: string;
  cells: number;
  changed: number;
  matched: Match[];
  unmatched: Array<{ pid: string; name: string | null; why: string }>;
  dropped: Match[];
  warnings: string[];
};

export function remapPids(newSrc: string, oldSrc: string, module = ""):
    { src: string; report: Report } {
  const { cells: nc, warnings: nw, top: topNew } = parseCells(newSrc);
  const { cells: oc, warnings: ow } = parseCells(oldSrc);

  const oldByName = uniqueBy(oc, (c) => c.name);
  const newByName = uniqueBy(nc, (c) => c.name);
  const anonOld = uniqueBy(oc.filter((c) => c.name === null), (c) => sig(c.def));
  const anonNew = uniqueBy(nc.filter((c) => c.name === null), (c) => sig(c.def));

  const matched: Match[] = [];
  const unmatched: Report["unmatched"] = [];
  for (const c of nc) {
    if (c.name !== null) {
      if (!newByName.has(c.name)) { unmatched.push({ pid: c.pid, name: c.name, why: "name not unique in new" }); continue; }
      const o = oldByName.get(c.name);
      if (!o) { unmatched.push({ pid: c.pid, name: c.name, why: "name absent or not unique in old" }); continue; }
      if (o.pid !== c.pid) matched.push({ pid: c.pid, oldPid: o.pid, name: c.name, how: "name" });
      continue;
    }
    const key = sig(c.def);
    const o = anonOld.get(key);
    if (!o || !anonNew.has(key)) {
      unmatched.push({ pid: c.pid, name: null, why: o ? "body not unique in new" : "no anonymous cell in old with this body" });
      continue;
    }
    if (o.pid !== c.pid) matched.push({ pid: c.pid, oldPid: o.pid, name: null, how: "body" });
  }

  // Injectivity. A proposal that would collide with any other cell's FINAL pid is
  // dropped rather than resolved: two cells sharing a pid is the one outcome that is
  // worse than churn, since `persistentIdToVariableRef` is keyed by it. A pid is also a
  // top-level JS identifier, so a name already bound by something that is NOT a pid
  // holder is occupied too — renaming onto it would shadow that binding.
  const proposals = new Map(matched.map((m) => [m.pid, m]));
  const pidNames = new Set(nc.map((c) => c.pid));
  const occupied = new Set([...topNew].filter((n) => !pidNames.has(n)));
  const dropped: Match[] = [];
  for (;;) {
    const finals = new Map<string, string[]>();
    for (const c of nc) {
      const f = proposals.get(c.pid)?.oldPid ?? c.pid;
      (finals.get(f) ?? finals.set(f, []).get(f)!).push(c.pid);
    }
    const clash = [...finals.entries()].find(([to, from]) => new Set(from).size > 1 || occupied.has(to));
    if (!clash) break;
    for (const pid of clash[1]) {
      const p = proposals.get(pid);
      if (p) { dropped.push(p); proposals.delete(pid); }
    }
  }

  const edits: Array<{ start: number; end: number; to: string }> = [];
  for (const c of nc) {
    const p = proposals.get(c.pid);
    if (p) for (const s of c.sites) edits.push({ start: s.start, end: s.end, to: p.oldPid });
  }
  edits.sort((a, b) => b.start - a.start);
  let src = newSrc;
  for (const e of edits) src = src.slice(0, e.start) + e.to + src.slice(e.end);

  return {
    src,
    report: {
      module, cells: nc.length, changed: proposals.size,
      matched: [...proposals.values()], unmatched, dropped,
      warnings: [...nw.map((w) => `new: ${w}`), ...ow.map((w) => `old: ${w}`)],
    },
  };
}

// ---------------------------------------------------------------------------- CLI

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const only: string[] = [];
  let write = false, json = false;
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--module") only.push(argv[++i]);
    else if (argv[i] === "--write") write = true;
    else if (argv[i] === "--json") json = true;
    else positional.push(argv[i]);
  }
  const [newPath, oldPath] = positional;
  if (!newPath || !oldPath) {
    console.error("usage: bun tools/lope-pid-match.ts <new> <old> [--module @a/b] [--write] [--json]");
    process.exit(2);
  }

  const isHtml = (p: string) => extname(p).toLowerCase() === ".html";
  const reports: Report[] = [];

  if (isHtml(newPath) !== isHtml(oldPath)) {
    console.error("both sides must be the same kind (.html or .js)");
    process.exit(2);
  }

  if (!isHtml(newPath)) {
    const { src, report } = remapPids(readFileSync(newPath, "utf8"), readFileSync(oldPath, "utf8"), newPath);
    reports.push(report);
    if (write && report.changed) writeFileSync(newPath, src);
  } else {
    let html = readFileSync(newPath, "utf8");
    const oldHtml = readFileSync(oldPath, "utf8");
    const isModule = (h: string, s: { start: number; end: number }) =>
      /data-mime="application\/javascript"/.test(h.slice(s.start, h.indexOf(">", s.start)));
    const oldSpans = new Map(blockSpans(oldHtml).filter((s) => isModule(oldHtml, s)).map((s) => [s.id, s]));
    const body = (h: string, s: { start: number; end: number }) => {
      const b = h.slice(s.start, s.end);
      return b.slice(b.indexOf(">") + 1, b.lastIndexOf("</script>"));
    };
    // Right-to-left so earlier spans keep their offsets.
    for (const span of blockSpans(html).filter((s) => isModule(html, s)).reverse()) {
      if (only.length && !only.includes(span.id)) continue;
      const os = oldSpans.get(span.id);
      if (!os) continue;
      const inner = body(html, span);
      // A vendored library bundle has no pids and need not even parse as a module
      // (`@observablehq/runtime@6.0.0` throws "Identifier directly after number"). Cheap
      // text test first, so those are not reported as skips.
      if (!/\$def\(|\$nk\(/.test(inner)) continue;
      const start = span.start + html.slice(span.start, span.end).indexOf(">") + 1;
      let out;
      try {
        out = remapPids(inner, body(oldHtml, os), span.id);
      } catch (e) {
        reports.push({ module: span.id, cells: 0, changed: 0, matched: [], unmatched: [], dropped: [],
          warnings: [`SKIPPED: ${(e as Error).message}`] });
        continue;
      }
      reports.push(out.report);
      if (out.report.changed) html = html.slice(0, start) + out.src + html.slice(start + inner.length);
    }
    if (write && reports.some((r) => r.changed))
      guardedWrite(newPath, readFileSync(newPath, "utf8"), html, "", "lope-pid-match");
  }

  // NB: no process.exit() after this — bun truncates a piped stdout at 64 KiB if the
  // process exits before the write drains, which silently cut the report in half.
  if (json) console.log(JSON.stringify(reports, null, 2));
  else {

  const total = reports.reduce((n, r) => n + r.changed, 0);
  const cells = reports.reduce((n, r) => n + r.cells, 0);
  for (const r of reports.slice().reverse()) {
    if (!r.changed && !r.warnings.length && !r.dropped.length) continue;
    console.log(`\n### ${r.module}  ${r.cells} cells, ${r.changed} pid(s) restored`);
    for (const m of r.matched.slice(0, 200))
      console.log(`  ${m.pid.padEnd(12)} -> ${m.oldPid.padEnd(12)} by ${m.how}  ${m.name ?? "(anonymous)"}`);
    for (const d of r.dropped) console.log(`  DROPPED (would collide) ${d.pid} -> ${d.oldPid}  ${d.name ?? "(anonymous)"}`);
    for (const w of r.warnings) console.log(`  ! ${w}`);
  }
  const un = reports.reduce((n, r) => n + r.unmatched.length, 0);
  console.log(`\n${total} pid(s) ${write ? "restored" : "would be restored"} across ${reports.length} module(s), ` +
    `${cells} cells seen, ${un} left with a fresh pid.`);
  if (!write) console.log("dry run — pass --write to apply.");
  }
}
