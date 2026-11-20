// The runtime module's declarations before the port (selfhost/out/runtime-inventory.pre-port.json, from
// selfhost/runtime-inventory.ts run on 2026-11-20 before any edit), each with its category and blocker group,
// and the line counts from the parse of the original files. Prints the totals. bun selfhost/rt/classify.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Node } from "../../lite/parse.ts";

// a: ported and checks; b: ports after a rewrite of its design; c: blocked by a language limit; d: blocked in principle
// group: the blocker group (NOTES-runtime-port.md); land: in lite/runtime.ss.ts
type Row = { cat: "a" | "b" | "c" | "d"; group: string; land?: boolean };
const C: Record<string, Row> = {
  // prelude.runtime.ts
  STATECELL: { cat: "c", group: "symbol" }, ACTION: { cat: "c", group: "symbol" }, REFHANDLE: { cat: "c", group: "symbol" },
  actionNames: { cat: "d", group: "container" }, actionNamer: { cat: "d", group: "container" },
  nameOf: { cat: "c", group: "weakmap-reader" },
  rt: { cat: "d", group: "container" },
  idle: { cat: "c", group: "reader" }, actionQueue: { cat: "c", group: "reader" },
  state: { cat: "c", group: "symbol" }, isStateCell: { cat: "c", group: "symbol" }, isRefHandle: { cat: "c", group: "symbol" },
  stores: { cat: "d", group: "container" }, over: { cat: "d", group: "container" },
  storeOf: { cat: "c", group: "weakmap-reader" },
  newStore: { cat: "a", group: "link-cycle", land: true },
  owner: { cat: "c", group: "reader" }, current: { cat: "c", group: "reader" },
  write: { cat: "d", group: "writer" }, handleOf: { cat: "d", group: "host-object" }, setStore: { cat: "d", group: "writer" },
  read: { cat: "c", group: "reader" },
  runs: { cat: "d", group: "container" }, ref: { cat: "d", group: "writer" }, commit: { cat: "d", group: "writer" },
  views: { cat: "d", group: "container" }, viewHandle: { cat: "d", group: "writer" },
  thenable: { cat: "a", group: "link-cycle", land: true },
  reportTo: { cat: "c", group: "free-effect" },
  entry: { cat: "d", group: "writer" }, finish: { cat: "d", group: "writer" }, pumping: { cat: "d", group: "writer" }, pump: { cat: "d", group: "writer" },
  run: { cat: "d", group: "writer" }, inAction: { cat: "d", group: "writer" }, action: { cat: "d", group: "writer" },
  mut: { cat: "a", group: "link-cycle", land: true }, freeze: { cat: "a", group: "link-cycle", land: true }, borrow: { cat: "a", group: "link-cycle", land: true },
  snapshot: { cat: "c", group: "intrinsics" },
  equals: { cat: "c", group: "reflection" },
  // boundary.ts
  describe: { cat: "c", group: "reflection" },
  want: { cat: "a", group: "switch", land: true },
  plain: { cat: "c", group: "reflection" },
  Mismatch: { cat: "b", group: "class-exception" },
  copy: { cat: "c", group: "reflection" },
  deepEqual: { cat: "c", group: "reflection" },
  last: { cat: "d", group: "container" }, crossings: { cat: "d", group: "container" }, cross: { cat: "d", group: "writer" },
  checkShape: { cat: "b", group: "class-exception" },
  // jsx/h.ts
  flat: { cat: "a", group: "", land: true },
  h: { cat: "c", group: "intrinsics" },
  // jsx/render.ts
  DOM_EVENTS: { cat: "a", group: "", land: true }, ptr: { cat: "a", group: "intrinsics", land: true }, PROPS: { cat: "a", group: "", land: true }, isElem: { cat: "a", group: "predicate", land: true },
  create: { cat: "d", group: "dom" }, patch: { cat: "d", group: "dom" },
  // browser/cells.ts
  guard: { cat: "d", group: "writer" },
  EVENTS: { cat: "c", group: "symbol" }, LISTENER: { cat: "c", group: "symbol" },
  hs: { cat: "d", group: "container" }, ls: { cat: "d", group: "container" }, attached: { cat: "d", group: "container" }, generating: { cat: "d", group: "container" },
  scheduler: { cat: "d", group: "container" },
  isEvents: { cat: "c", group: "weakmap-reader" }, isListener: { cat: "c", group: "symbol" }, on: { cat: "c", group: "listener-rule" },
  running: { cat: "c", group: "reader" }, pulling: { cat: "c", group: "weakmap-reader" },
  same: { cat: "a", group: "", land: true },
  stopGen: { cat: "d", group: "writer" }, events: { cat: "d", group: "writer" }, kick: { cat: "d", group: "writer" }, pull: { cat: "d", group: "writer" },
  fail: { cat: "d", group: "writer" },
  placeOf: { cat: "d", group: "container" }, setListenerOrder: { cat: "d", group: "writer" },
  orderOf: { cat: "b", group: "split-pure", land: true },
  ordered: { cat: "d", group: "container" }, listenerOrderChanged: { cat: "d", group: "writer" }, handleOfState: { cat: "d", group: "container" },
  deliver: { cat: "d", group: "writer" }, listen: { cat: "d", group: "writer" }, detach: { cat: "d", group: "writer" }, release: { cat: "d", group: "writer" },
  generation: { cat: "d", group: "writer" }, sweep: { cat: "d", group: "writer" }, bornAt: { cat: "d", group: "container" },
  // browser/workers.ts
  EXEC: { cat: "d", group: "foreign-source" }, WORKER: { cat: "d", group: "foreign-source" },
  superseded: { cat: "c", group: "intrinsics" },
  makePool: { cat: "d", group: "host-object" }, shared: { cat: "d", group: "container" }, pagePool: { cat: "d", group: "host-object" },
  // stdlib/runtime.ts
  rejected: { cat: "a", group: "", land: true },
  viewRef: { cat: "c", group: "boundary-function" },
  joined: { cat: "d", group: "container" }, joinCells: { cat: "d", group: "writer" },
  compileFor: { cat: "a", group: "", land: true },
  mount: { cat: "d", group: "dom" },
  lazyPool: { cat: "c", group: "getter-let" },
};

const FILES: Record<string, string> = {
  "../prelude.runtime.ts": "../selfhost/rt/orig/prelude.runtime.orig.ts", "boundary.ts": "../selfhost/rt/orig/boundary.orig.ts", "jsx/h.ts": "../selfhost/rt/orig/h.orig.ts",
  "jsx/render.ts": "../selfhost/rt/orig/render.orig.ts", "browser/cells.ts": "../selfhost/rt/orig/cells.orig.ts", "browser/workers.ts": "browser/workers.ts",
  "stdlib/runtime.ts": "../selfhost/rt/orig/stdlib-runtime.orig.ts",
};
const LITE = join(import.meta.dir, "../../lite");
const lines = new Map<string, { file: string; lines: number }>();
for (const [file, path] of Object.entries(FILES)) {
  const src = readFileSync(join(LITE, path), "utf8");
  const P = parse(src);
  for (const s of P.program.body as Node[]) {
    const d: Node = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s;
    const names: string[] = d.type === "FunctionDeclaration" || d.type === "ClassDeclaration" ? [d.id.name] : d.type === "VariableDeclaration" ? d.declarations.filter((x: Node) => x.id.type === "Identifier").map((x: Node) => x.id.name) : [];
    const n = P.line(s.end) - P.line(s.start) + 1;
    for (const name of names) if (name in C) lines.set(name, { file, lines: names.length > 1 ? 1 : n });
  }
}
const inv: { decls: string[] }[] = JSON.parse(readFileSync(join(import.meta.dir, "../out/runtime-inventory.pre-port.json"), "utf8"));
const inModule = new Set(inv.flatMap((r) => r.decls));
const missing = [...inModule].filter((n) => !(n in C)), extra = Object.keys(C).filter((n) => !inModule.has(n));
if (missing.length || extra.length) { console.log(`unclassified: ${missing.join(", ")}; not in the module: ${extra.join(", ")}`); process.exit(1); }
const tot = { a: [0, 0], b: [0, 0], c: [0, 0], d: [0, 0] } as Record<string, number[]>;
const groups = new Map<string, { cells: number; lines: number; names: string[] }>();
let landed = 0, landedLines = 0;
for (const [n, r] of Object.entries(C)) {
  const l = lines.get(n)!.lines;
  tot[r.cat][0]++; tot[r.cat][1] += l;
  if (r.land) { landed++; landedLines += l; }
  const g = groups.get(`${r.cat}:${r.group}`) ?? { cells: 0, lines: 0, names: [] };
  g.cells++; g.lines += l; g.names.push(n); groups.set(`${r.cat}:${r.group}`, g);
}
const all = Object.values(tot).reduce((a, x) => [a[0] + x[0], a[1] + x[1]], [0, 0]);
for (const k of ["a", "b", "c", "d"]) console.log(`${k}: ${tot[k][0]} declarations (${(100 * tot[k][0] / all[0]).toFixed(0)}%), ${tot[k][1]} lines (${(100 * tot[k][1] / all[1]).toFixed(0)}%)`);
console.log(`all: ${all[0]} declarations, ${all[1]} lines; landed ${landed} declarations, ${landedLines} lines`);
for (const [k, g] of [...groups].sort()) console.log(`${k}\t${g.cells}\t${g.lines}\t${g.names.join(" ")}`);
// Limit 1 of NOTES-runtime-port.md (a cell that uses a built-in took ss, which the runtime module builds from its own
// cells) is gone since 2026-11-20: a compiled cell takes each runtime cell it uses as its own input, and in the runtime
// module that input is the sibling cell. The port attempts that use a built-in, and their verdict there: a cell that
// is not ok is still blocked by its own messages (check.ts prints them).
{
  const { splitCells, declaredName } = await import("../../lite/toolchain/ss-toolchain.ts");
  const { checkCells } = await import("../../lite/stdlib/runtime.ts");
  const { globalRefs } = await import("../../lite/facts.ts");
  const { PRELUDE_FNS } = await import("../../lite/intrinsics.ts");
  const out: string[] = [];
  for (const f of ["prelude", "boundary", "jsx", "cells", "workers"]) {
    const tsx = f === "jsx";
    const texts = splitCells(readFileSync(join(import.meta.dir, `${f}.ss.ts`), "utf8"), tsx);
    const verdict = new Map(checkCells(texts, tsx).result.cells.map((c: any) => [c.name, c.status === "ok" && !c.errors.length ? "ok" : c.status]));
    for (const t of texts) {
      // the cell's value: a const's initialiser, or the function a declaration is
      const st = parse(t, { jsx: tsx }).program.body[0];
      const d = st.type === "ExportNamedDeclaration" ? st.declaration : st;
      const fn = d.type === "VariableDeclaration" ? d.declarations[0].init : d;
      const used = fn ? [...PRELUDE_FNS, "h"].filter((n) => globalRefs(fn, n).size > 0) : [];
      if (used.length) out.push(`${declaredName(t)} (${f}.ss.ts) uses ${used.join(", ")}: ${verdict.get(declaredName(t)!) ?? "?"}`);
    }
  }
  console.log(`port attempts that use a built-in: ${out.length}\n  ${out.join("\n  ")}`);
}
