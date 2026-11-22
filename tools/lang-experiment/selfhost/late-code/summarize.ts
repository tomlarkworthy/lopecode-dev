// bun selfhost/late-code/summarize.ts: tables 1-5 from out/corpus.json into out/tables.md and out/r-rejects.json.
// Every table is over accepted cells (status ok), by bucket, as enumerated; "dedup" counts a cell once per file:line
// and name (ss, ssx and sswith check the same text). The "all" rows add cells rejected for other reasons.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MODULE = process.argv.includes("--module");
const o = JSON.parse(readFileSync(join(import.meta.dir, MODULE ? "out/corpus-module.json" : "out/corpus.json"), "utf8"));
const BUCKETS = MODULE ? [...new Set<string>(o.map((j: any) => j.key))] : ["checker/toolchain", "ports", "tutorial/spec/examples", "fixtures", "probes", "spec-rejects"];
type C = any;
const all: C[] = o.flatMap((j: any) => j.cells.map((c: any) => ({ ...c, bucket: j.bucket, key: j.key })));
const dk = (c: C) => `${c.at}|${c.name}`;
const lines: string[] = [];
const p = (s = "") => lines.push(s);
const real = (h: any) => h.uses.some((u: any) => !u.fresh);
const wr = (h: any) => h.uses.some((u: any) => !u.fresh && u.write);

// a table: rows = measures, columns = buckets + total + dedup total; f(cells) -> number of items
function table(title: string, rows: [string, (cs: C[]) => number][], pop: (c: C) => boolean = (c) => c.status === "ok") {
  p(`### ${title}`); p();
  p(`| measure | ${BUCKETS.join(" | ")} | total | dedup |`);
  p(`|---|${BUCKETS.map(() => "---:").join("|")}|---:|---:|`);
  for (const [name, f] of rows) {
    const per = BUCKETS.map((b) => f(all.filter((c) => c.bucket === b && pop(c))));
    const seen = new Set<string>(), uniq = all.filter((c) => pop(c) && !seen.has(dk(c)) && (seen.add(dk(c)), true));
    p(`| ${name} | ${per.join(" | ")} | ${f(all.filter(pop))} | ${f(uniq)} |`);
  }
  p();
}
const fnsOf = (cs: C[], pred: (f: any) => boolean) => cs.flatMap((c) => c.fns.filter(pred).map((f: any) => ({ c, f })));
const hitsOfFn = (c: C, f: any, kind: string) => c.ya.filter((h: any) => h.kind === kind && h.fnLine === f.line && h.fnClass === f.fnClass && real(h));
const count = (xs: any[]) => xs.length;

table("Denominator", [
  ["cells", (cs) => cs.length],
], () => true);
table("Denominator (accepted, status ok)", [["accepted cells", (cs) => cs.length]]);

// 1. Y
const gen = (f: any) => f.kind === "gen" || f.kind === "asyncgen";
table("1. Y: generator functions (accepted cells)", [
  ["generator functions (cell + nested)", (cs) => count(fnsOf(cs, gen))],
  ["  of which the cell itself", (cs) => count(fnsOf(cs, (f) => gen(f) && f.fnClass === "cell"))],
  ["  that yield a non-primitive value", (cs) => count(fnsOf(cs, (f) => gen(f) && f.yieldsNonPrim))],
  ["with a Mut/let local used across a yield", (cs) => fnsOf(cs, gen).filter(({ c, f }) => hitsOfFn(c, f, "Y").length).length],
  ["  written after (some binding)", (cs) => fnsOf(cs, gen).filter(({ c, f }) => hitsOfFn(c, f, "Y").some(wr)).length],
  ["  only read after", (cs) => fnsOf(cs, gen).filter(({ c, f }) => { const h = hitsOfFn(c, f, "Y"); return h.length && !h.some(wr); }).length],
  ["  ... and the function yields a non-primitive", (cs) => fnsOf(cs, gen).filter(({ c, f }) => f.yieldsNonPrim && hitsOfFn(c, f, "Y").length).length],
  ["bindings used across a yield", (cs) => cs.flatMap((c) => c.ya.filter((h: any) => h.kind === "Y" && real(h))).length],
  ["  Mut-typed", (cs) => cs.flatMap((c) => c.ya.filter((h: any) => h.kind === "Y" && real(h) && h.mut)).length],
  ["  let, not Mut-typed", (cs) => cs.flatMap((c) => c.ya.filter((h: any) => h.kind === "Y" && real(h) && !h.mut)).length],
  ["  let holding a primitive", (cs) => cs.flatMap((c) => c.ya.filter((h: any) => h.kind === "Y" && real(h) && h.prim)).length],
  ["  captured from an encloser (used across the inner function's yield)", (cs) => cs.flatMap((c) => c.ya.filter((h: any) => h.kind === "Y" && real(h) && h.captured)).length],
  ["generator functions with a non-primitive hit (Mut, or let of an object)", (cs) => fnsOf(cs, gen).filter(({ c, f }) => hitsOfFn(c, f, "Y").some((h: any) => !h.prim)).length],
  ["only fresh-per-iteration hits (excluded above)", (cs) => cs.flatMap((c) => c.ya.filter((h: any) => h.kind === "Y" && !real(h))).length],
]);
// 2. A
const asy = (f: any) => f.kind === "async";
const hitsA = (c: C, f: any) => (f.kind === "asyncgen" ? hitsOfFn(c, f, "Y") : hitsOfFn(c, f, "A"));
const aRows = (label: string, pred: (f: any) => boolean): [string, (cs: C[]) => number][] => [
  [`${label}: functions`, (cs) => count(fnsOf(cs, pred))],
  [`${label}: with Mut/let used across an await`, (cs) => fnsOf(cs, pred).filter(({ c, f }) => hitsA(c, f).length).length],
  [`${label}:   written after`, (cs) => fnsOf(cs, pred).filter(({ c, f }) => hitsA(c, f).some(wr)).length],
  [`${label}:   only read after`, (cs) => fnsOf(cs, pred).filter(({ c, f }) => { const h = hitsA(c, f); return h.length && !h.some(wr); }).length],
  [`${label}:   with a non-primitive hit`, (cs) => fnsOf(cs, pred).filter(({ c, f }) => hitsA(c, f).some((h: any) => !h.prim)).length],
  [`${label}:   with a captured-binding hit`, (cs) => fnsOf(cs, pred).filter(({ c, f }) => hitsA(c, f).some((h: any) => h.captured)).length],
];
table("2. A: async functions (accepted cells)", [
  ...aRows("async cell (not visible before end)", (f) => asy(f) && f.fnClass === "cell"),
  ...aRows("async helper, only called", (f) => asy(f) && f.fnClass === "helper"),
  ["  of which visible", (cs) => count(fnsOf(cs, (f) => asy(f) && f.fnClass === "helper" && f.visible))],
  ...aRows("kept async function (visible)", (f) => asy(f) && f.fnClass === "kept"),
  ...aRows("async generator, any (visible; awaits and yields)", (f) => f.kind === "asyncgen"),
]);
// 3. K
const kRows: [string, (cs: C[]) => number][] = [
  ["kept functions capturing a Mut/let local", (cs) => cs.reduce((s, c) => s + new Set(c.k.map((h: any) => h.fnLine + ":" + h.at)).size, 0)],
  ["captures (kept fn x binding)", (cs) => cs.flatMap((c) => c.k).length],
  ["  Mut-typed", (cs) => cs.flatMap((c) => c.k.filter((h: any) => h.mut)).length],
  ["  let, not Mut-typed", (cs) => cs.flatMap((c) => c.k.filter((h: any) => !h.mut)).length],
  ["  let holding a primitive", (cs) => cs.flatMap((c) => c.k.filter((h: any) => h.prim)).length],
  ["  written through the capture", (cs) => cs.flatMap((c) => c.k.filter((h: any) => h.write)).length],
  ["  only read", (cs) => cs.flatMap((c) => c.k.filter((h: any) => !h.write)).length],
  ["  encloser writes it after the kept fn is made", (cs) => cs.flatMap((c) => c.k.filter((h: any) => h.laterWrite)).length],
  ["  only read, no later write", (cs) => cs.flatMap((c) => c.k.filter((h: any) => !h.write && !h.laterWrite)).length],
  ["cells with any", (cs) => cs.filter((c) => c.k.length).length],
];
table("3. K: kept functions capturing a Mut or let local (accepted cells)", kRows);
table("3. K: the same over every cell (for comparison; rejected cells' facts may be partial)", kRows, () => true);
const rejK = (c: C) => c.rules.includes("mut-capture") || c.rules.includes("let-capture");
table("3. K: cells rejected today carrying [mut-capture] or [let-capture]", [
  ["cells", (cs) => cs.length],
  ["  with a K hit our counter found", (cs) => cs.filter((c) => c.k.length).length],
  ["  with a write-through or late-write hit", (cs) => cs.filter((c) => c.k.some((h: any) => h.write || h.laterWrite)).length],
], (c) => rejK(c));
// 4. P
table("4. captured promises / generators / iterators in kept functions", [
  ["accepted cells: captures", (cs) => cs.flatMap((c) => c.p).length],
  ["accepted cells: cells with any", (cs) => cs.filter((c) => c.p.length).length],
]);
table("4. the same over every cell", [
  ["captures", (cs) => cs.flatMap((c) => c.p).length],
  ["  of which in a cell rejected today", (cs) => cs.filter((c) => c.status !== "ok").flatMap((c) => c.p).length],
], () => true);

// 5. R
const why = (c: C, prims = true) => {
  const w: string[] = [];
  for (const h of c.ya) if (real(h) && (h.kind === "Y" || h.visible) && (prims || !h.prim)) w.push(`${h.kind === "Y" ? "Y" : "A"}:${h.name}(${h.mut ? "Mut" : h.bkind}${h.prim ? " primitive" : ""}${h.captured ? ", captured" : ""}${wr(h) ? ",written" : ",read"}) fn ${h.at} [${h.fnClass}/${h.fkind}] used ${h.uses.filter((u: any) => !u.fresh).map((u: any) => `${u.at.split(":").pop()}${u.write ? "w" : "r"}`).join(",")}`);
  for (const h of c.k) if (prims || !h.prim) w.push(`K:${h.name}(${h.mut ? "Mut" : h.bkind}${h.write ? ",written" : ",read"}${h.laterWrite ? ",late-write" : ""}) kept fn ${h.at}`);
  return w;
};
const rej = all.filter((c) => c.status === "ok" && why(c).length);
const seen = new Set<string>();
const uniq = rej.filter((c) => !seen.has(dk(c)) && (seen.add(dk(c)), true));
table("5. newly rejected under R (accepted cells)", [
  ["cells R rejects", (cs) => cs.filter((c) => why(c).length).length],
  ["  for Y", (cs) => cs.filter((c) => c.ya.some((h: any) => h.kind === "Y" && real(h))).length],
  ["  for A (visible async)", (cs) => cs.filter((c) => c.ya.some((h: any) => h.kind === "A" && h.visible && real(h))).length],
  ["  for K", (cs) => cs.filter((c) => c.k.length).length],
  ["R without primitive lets (Mut, or let of a non-primitive)", (cs) => cs.filter((c) => why(c, false).length).length],
]);
const texts = new Set(uniq.map((c) => c.textHash));
table("5. distinct cell texts R rejects (name + the cell function's own source)", [["distinct texts", (cs) => new Set(cs.filter((c) => why(c).length).map((c) => c.textHash)).size]]);
p(`### 5. list (deduplicated by location: ${uniq.length} cells; ${texts.size} distinct texts)`); p();
for (const c of uniq.sort((a, b) => a.at.localeCompare(b.at))) { p(`- \`${c.at}\` ${c.name} [text ${c.textHash}] (${c.bucket}; jobs: ${rej.filter((x) => dk(x) === dk(c)).map((x) => x.key.split(":")[0]).join(",")})`); for (const w of why(c)) p(`  - ${w}`); }
writeFileSync(join(import.meta.dir, MODULE ? "out/tables-module.md" : "out/tables.md"), lines.join("\n") + "\n");
writeFileSync(join(import.meta.dir, MODULE ? "out/r-rejects-module.json" : "out/r-rejects.json"), JSON.stringify(uniq.map((c) => ({ at: c.at, name: c.name, bucket: c.bucket, why: why(c) })), null, 1));
console.log(lines.join("\n"));
