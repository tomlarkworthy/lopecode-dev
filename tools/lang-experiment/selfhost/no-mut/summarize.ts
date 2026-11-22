// bun selfhost/no-mut/summarize.ts: tables 1-4 from out/corpus.json and out/corpus-module.json into out/tables.md and
// out/rejects.json. Every table is over accepted cells (status ok). "dedup" counts a cell once per file:line and name
// (ss, ssx, sswith and the module jobs check the same text); the supplement column is deduplicated likewise, and
// "union" deduplicates the corpus and the supplement together.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rd = (f: string) => JSON.parse(readFileSync(join(import.meta.dir, f), "utf8"));
type C = any;
const flat = (o: any[], sup: boolean): C[] => o.flatMap((j: any) => j.cells.map((c: any) => ({ ...c, bucket: sup ? (j.key === "module:tutorial" ? "tutorial/spec/examples" : "checker/toolchain") : j.bucket, key: j.key, sup })));
const corpus = rd("out/corpus.json"), module = rd("out/corpus-module.json");
const ALL: C[] = [...flat(corpus, false), ...flat(module, true)];
const ok = ALL.filter((c) => c.status === "ok");
const dk = (c: C) => `${c.at}|${c.name}`;
const dedup = (cs: C[]) => { const s = new Set<string>(); return cs.filter((c) => !s.has(dk(c)) && (s.add(dk(c)), true)); };
const BUCKETS = ["checker/toolchain", "ports", "tutorial/spec/examples", "fixtures", "probes", "spec-rejects"];
// columns: each bucket of the corpus (dedup within), corpus dedup, supplement dedup, union dedup
const COLS: [string, (c: C) => boolean][] = [
  ...BUCKETS.map((b): [string, (c: C) => boolean] => [b, (c) => !c.sup && c.bucket === b]),
  ["corpus", (c) => !c.sup], ["supplement", (c) => c.sup], ["union", () => true],
];
const lines: string[] = [];
const p = (s = "") => lines.push(s);
function table(title: string, rows: [string, (cs: C[]) => number][], pop: C[] = ok) {
  p(`### ${title}`); p();
  p(`| measure | ${COLS.map(([n]) => n).join(" | ")} |`);
  p(`|---|${COLS.map(() => "---:").join("|")}|`);
  for (const [name, f] of rows) p(`| ${name} | ${COLS.map(([, sel]) => f(dedup(pop.filter(sel)))).join(" | ")} |`);
  p();
}
// items deduplicated by file:line within a population: an item's key is its own at plus its cell's
const items = (cs: C[], get: (c: C) => any[], key: (x: any, c: C) => string = (x, c) => `${x.at}|${x.how ?? x.pos ?? x.callee ?? ""}|${c.name}`) => { const s = new Set<string>(); let n = 0; for (const c of cs) for (const x of get(c)) { const k = key(x, c); if (!s.has(k)) { s.add(k); n++; } } return n; };
const cellsWith = (cs: C[], pred: (c: C) => boolean) => cs.filter(pred).length;

table("Denominators", [["cells", (cs) => cs.length]], ALL);
table("Denominators: accepted cells", [["accepted (status ok)", (cs) => cs.length]]);

// 1. explicit Mut in a type, inside cells
const POS = ["param-nested", "param-cell", "return", "local", "field", "type-arg", "in-function-type", "cast", "other"];
const posOf = (x: any) => (POS.includes(x.pos) ? x.pos : "other");
table("1. Explicit Mut<…> in a cell's text, by position: occurrences", [
  ...POS.map((ps): [string, (cs: C[]) => number] => [ps, (cs) => items(cs, (c) => c.explicit.filter((x: any) => posOf(x) === ps))]),
  ["all", (cs) => items(cs, (c) => c.explicit)],
]);
table("1. Explicit Mut<…> in a cell's text, by position: distinct cells", [
  ...POS.map((ps): [string, (cs: C[]) => number] => [ps, (cs) => cellsWith(cs, (c) => c.explicit.some((x: any) => posOf(x) === ps))]),
  ["any position", (cs) => cellsWith(cs, (c) => c.explicit.length > 0)],
  ["no explicit Mut, but names an alias that is Mut<…> (type X = Mut<…>)", (cs) => cellsWith(cs, (c) => !c.explicit.length && c.aliasIs.length > 0)],
  ["no explicit Mut, no such alias, but names a type that holds a Mut (a field, an element)", (cs) => cellsWith(cs, (c) => !c.explicit.length && !c.aliasIs.length && c.aliasHas.length > 0)],
  ["writes through a Mut-typed parameter with no Mut in the cell's text (an alias)", (cs) => cellsWith(cs, (c) => !c.explicit.length && c.writes.some((w: any) => w.group === "c"))],
]);
// what the explicitly Mut-annotated locals are bound to (top-level Mut only: "local" with no via)
{
  const seen = new Set<string>(), k = new Map<string, number>();
  for (const c of dedup(ok)) for (const x of c.explicit) if (x.pos === "local" && !seen.has(x.at)) { seen.add(x.at); const d = x.detail.replace(/^local = /, ""); k.set(d, (k.get(d) ?? 0) + 1); }
  p("### 1. Initializers of the locals annotated with Mut (union, by file:line)"); p();
  p("| initializer | locals |"); p("|---|---:|");
  for (const [d, n] of [...k].sort((a, b) => b[1] - a[1])) p(`| ${d} | ${n} |`);
  p();
}
// outside cells: type aliases and interfaces, by file:line (corpus + supplement, per population)
{
  const outs = (pred: (j: any) => boolean) => { const s = new Map<string, any>(); for (const j of [...corpus.map((x: any) => ({ ...x, sup: false })), ...module.map((x: any) => ({ ...x, sup: true }))].filter(pred)) for (const x of j.outside ?? []) s.set(`${x.at}|${x.pos}`, x); return [...s.values()]; };
  p("### 1. Explicit Mut<…> outside cells (type aliases and interfaces), deduplicated by file:line"); p();
  p("| position | corpus | supplement | union |"); p("|---|---:|---:|---:|");
  for (const ps of [...POS, "alias-body"]) p(`| ${ps} | ${outs((j) => !j.sup).filter((x) => (ps === "alias-body" ? x.pos === ps : posOf(x) === ps && x.pos !== "alias-body")).length} | ${outs((j) => j.sup).filter((x) => (ps === "alias-body" ? x.pos === ps : posOf(x) === ps && x.pos !== "alias-body")).length} | ${outs(() => true).filter((x) => (ps === "alias-body" ? x.pos === ps : posOf(x) === ps && x.pos !== "alias-body")).length} |`);
  p(`| all | ${outs((j) => !j.sup).length} | ${outs((j) => j.sup).length} | ${outs(() => true).length} |`);
  const names = (pred: (j: any) => boolean, k: string) => new Set([...corpus.map((x: any) => ({ ...x, sup: false })), ...module.map((x: any) => ({ ...x, sup: true }))].filter(pred).flatMap((j: any) => j[k] ?? []));
  p(); p(`Aliases that are Mut<…> (union): ${[...names(() => true, "aliasIs")].sort().join(", ")}`); p();
  p(`Aliases and interfaces that hold a Mut below the top (union): ${[...names(() => true, "aliasHas")].sort().join(", ")}`); p();
}

// 2. writes by group
const GROUPS = ["a", "g-fresh", "g-copy", "b", "b2", "c", "d", "e", "g-ret", "h"];
const primary = (w: any) => (w.captured ? "f" : w.group);
const wkey = (w: any, c: C) => `${w.at}|${w.how}|${c.name}|${w.root ?? ""}`;
table("2. Writes by what they write through: writes (a write in a captured binding is f, whatever its root)", [
  ...["a", "g-fresh", "g-copy", "b", "b2"].map((g): [string, (cs: C[]) => number] => [g, (cs) => items(cs, (c) => c.writes.filter((w: any) => primary(w) === g), wkey)]),
  ["c (parameter of the function a cell returns)", (cs) => items(cs, (c) => c.writes.filter((w: any) => primary(w) === "c" && w.cParam === "cellfn"), wkey)],
  ["c (parameter of a nested function)", (cs) => items(cs, (c) => c.writes.filter((w: any) => primary(w) === "c" && w.cParam !== "cellfn"), wkey)],
  ...["d", "e", "g-ret", "h"].map((g): [string, (cs: C[]) => number] => [g, (cs) => items(cs, (c) => c.writes.filter((w: any) => primary(w) === g), wkey)]),
  ["f (captured; any root)", (cs) => items(cs, (c) => c.writes.filter((w: any) => w.captured), wkey)],
  ...GROUPS.map((g): [string, (cs: C[]) => number] => [`  f with root ${g}`, (cs) => items(cs, (c) => c.writes.filter((w: any) => w.captured && w.group === g), wkey)]),
  ...["callback", "helper", "kept", "cellfn", "other"].map((k): [string, (cs: C[]) => number] => [`  f, written from a ${k}`, (cs) => items(cs, (c) => c.writes.filter((w: any) => w.captured && w.capKind === k), wkey)]),
  ["all writes", (cs) => items(cs, (c) => c.writes, wkey)],
  ["passes to a parameter typed Mut (not a write; the write is in the callee)", (cs) => items(cs, (c) => c.passes, (x, c) => `${x.at}|${x.callee}|${c.name}|${x.root ?? ""}`)],
]);
const G2: [string, (w: any) => boolean][] = [
  ...["a", "g-fresh", "g-copy", "b", "b2"].map((g): [string, (w: any) => boolean] => [g, (w) => primary(w) === g]),
  ["c (cell's returned function)", (w) => primary(w) === "c" && w.cParam === "cellfn"], ["c (nested function)", (w) => primary(w) === "c" && w.cParam !== "cellfn"],
  ...["d", "e", "g-ret", "h", "f"].map((g): [string, (w: any) => boolean] => [g, (w) => primary(w) === g]),
];
table("2. Writes by group: distinct cells holding one", [
  ...G2.map(([n, f]): [string, (cs: C[]) => number] => [n, (cs) => cellsWith(cs, (c) => c.writes.some(f))]),
  ["any write", (cs) => cellsWith(cs, (c) => c.writes.length > 0)],
  ["passes a value to a Mut parameter", (cs) => cellsWith(cs, (c) => c.passes.length > 0)],
]);

// 4. what D rejects
const legal = (variant: "D1" | "D2", loose: boolean) => (w: any) => !w.captured && (w.group === "a" || (loose && (w.group === "g-fresh" || w.group === "g-copy")) || (variant === "D2" && w.group === "b"));
const syntactic = (c: C) => c.explicit.length > 0 || c.aliasIs.length > 0 || c.aliasHas.length > 0;
const subst = (variant: "D1" | "D2", loose: boolean) => (c: C) => c.writes.some((w: any) => !legal(variant, loose)(w)) || c.passes.length > 0;
const rej = (variant: "D1" | "D2", loose: boolean) => (c: C) => syntactic(c) || subst(variant, loose)(c);
table("4. Cells D rejects (strict: only literal/new locals are fresh; loose: also intrinsic-fresh results and spread/copy-constructor copies)", [
  ["has an explicit Mut, or names a type alias/interface that is or holds one", (cs) => cellsWith(cs, syntactic)],
  ["  explicit Mut in the cell's own text", (cs) => cellsWith(cs, (c) => c.explicit.length > 0)],
  ["D1 strict: a write outside (a), or a pass to a Mut parameter", (cs) => cellsWith(cs, subst("D1", false))],
  ["D1 loose", (cs) => cellsWith(cs, subst("D1", true))],
  ["D2 strict: a write outside (a)+(b), or a pass", (cs) => cellsWith(cs, subst("D2", false))],
  ["D2 loose", (cs) => cellsWith(cs, subst("D2", true))],
  ["D1 strict, either reason", (cs) => cellsWith(cs, rej("D1", false))],
  ["D1 loose, either reason", (cs) => cellsWith(cs, rej("D1", true))],
  ["D2 strict, either reason", (cs) => cellsWith(cs, rej("D2", false))],
  ["D2 loose, either reason", (cs) => cellsWith(cs, rej("D2", true))],
  ["  only syntactic (a Mut type, no write outside (a)/(g) and no pass): D1 loose", (cs) => cellsWith(cs, (c) => syntactic(c) && !subst("D1", true)(c))],
  ["writes, but every one in (a) (D1 strict keeps it)", (cs) => cellsWith(cs, (c) => c.writes.length > 0 && !rej("D1", false)(c))],
]);
// 4 again, over the union (corpus and supplement deduplicated together), by bucket: the supplement's cells are
// checker/toolchain, except module:tutorial's
{
  const U = dedup(ok);
  p("### 4. Cells D rejects, union of corpus and supplement, by bucket"); p();
  p(`| measure | ${BUCKETS.join(" | ")} | total |`); p(`|---|${BUCKETS.map(() => "---:").join("|")}|---:|`);
  const row = (n: string, f: (c: C) => boolean) => p(`| ${n} | ${BUCKETS.map((b) => U.filter((c) => c.bucket === b && f(c)).length).join(" | ")} | ${U.filter(f).length} |`);
  row("accepted cells", () => true);
  row("a Mut type (explicit, or an alias/interface that is or holds one)", syntactic);
  row("D1 strict, a write or a pass", subst("D1", false));
  row("D1 loose, a write or a pass", subst("D1", true));
  row("D2 loose, a write or a pass", subst("D2", true));
  row("D1 strict, either", rej("D1", false));
  row("D1 loose, either", rej("D1", true));
  row("D2 strict, either", rej("D2", false));
  row("D2 loose, either", rej("D2", true));
  p();
}
writeFileSync(join(import.meta.dir, "out/tables.md"), lines.join("\n"));

// the rejected cells, deduplicated over the union, with why
const why = (c: C) => ({
  at: c.at, name: c.name, bucket: c.bucket, key: c.key,
  explicit: c.explicit.map((x: any) => `${x.pos}@${x.at}`), aliasIs: c.aliasIs, aliasHas: c.aliasHas,
  writes: c.writes.filter((w: any) => !legal("D1", true)(w)).map((w: any) => `${primary(w)}${w.captured ? "(" + w.group + "," + w.capKind + ")" : ""} ${w.how} ${w.root ?? ""} ${w.why} @${w.at}`),
  passes: c.passes.map((x: any) => `${x.callee}(${x.argGroup}) @${x.at}`),
  d1s: rej("D1", false)(c), d1l: rej("D1", true)(c), d2s: rej("D2", false)(c), d2l: rej("D2", true)(c), syn: syntactic(c), sub1l: subst("D1", true)(c),
});
const R = dedup(ok).filter((c) => rej("D1", false)(c)).map(why);
writeFileSync(join(import.meta.dir, "out/rejects.json"), JSON.stringify(R, null, 1));
console.log(lines.join("\n"));
