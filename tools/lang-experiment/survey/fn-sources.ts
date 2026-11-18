// Splits the FNH and FN sole-blocker cells (summary.ts's "sole-N-blocker" definition) by where the foreign
// function comes from: own module cell (1), Observable stdlib (2), third-party/vendored library (3), undetermined (4).
//   bun make-fnsrc-classifier.ts && bun fn-sources.ts > fn-sources.out
import { readFileSync } from "node:fs";
import { classifyModule, cellKind, facts, loadCorpus, vendoredReason } from "./classify-fnsrc.ts";

const { mods } = loadCorpus();
const baseName = (d: string) => d.replace(/^(viewof|mutable|initial) /, "");
const kindCache = new Map<string, Map<string, any>>();
const kindsOf = (id: string) => {
  if (kindCache.has(id)) return kindCache.get(id)!;
  const m = mods.get(id); const out = new Map<string, any>();
  if (m) for (const c of m.raw) if (c.kind === "cell" && c.name) {
    const k = cellKind(c, facts(c)); out.set(c.name, k);
    if (c.name.startsWith("viewof ")) out.set(baseName(c.name), "data"); if (c.name.startsWith("initial ")) out.set(baseName(c.name), k);
  }
  kindCache.set(id, out); return out;
};
const importKind = (from: string, name: string) => {
  const k = kindsOf(from).get(name); if (k) return k;
  const re = mods.get(from)?.raw.find((c) => c.kind === "import" && c.name === name);
  if (re) return kindsOf(re.importFrom!).get(re.importName!) ?? "unknown";
  return "unknown";
};
const surveyed = new Set<string>(), vendored = new Set<string>();
for (const [id, m] of mods) { const v = vendoredReason(id, m); if (!v) surveyed.add(id); else if (m.hasDefine) vendored.add(id); }

const STDLIB = new Set("md htl html svg Inputs Plot d3 require width Generators Promises DOM FileAttachment Files tex mermaid dot katex Mutable now invalidation visibility SQLite SQLiteDatabaseClient DuckDBClient Arrow aq vl L topojson _ __query Lodash resolve".split(" "));
const libName = (src: string) => {
  const m = /\b(?:require|import)\(\s*(?:["'`])([^"'`]+)/.exec(src); if (!m) return null;
  let s = m[1].replace(/^https?:\/\/[^/]+\/(npm\/|gh\/)?/, "").replace(/^\+\//, "");
  s = s.replace(/^(@[^/@]+\/[^/@]+|[^/@]+).*$/, "$1"); return s;
};
// resolve a dep of cell in module id to {src: 1|2|3|4, name, lib?, ownModule?}
function resolve(id: string, raw: any[], d: string, depth = 0): any {
  const cells = raw.filter((c) => c.kind === "cell");
  const imp = raw.find((c) => c.kind === "import" && c.name === d);
  if (imp) {
    const from = imp.importFrom as string;
    if (vendored.has(from)) return { src: 3, name: d, lib: "vendored " + from };
    if (!mods.has(from) || !surveyed.has(from)) return { src: 4, name: d, why: "import from unsurveyed " + from };
    const r = resolve(from, mods.get(from)!.raw, imp.importName, depth + 1);
    if (r.src === 1) return { ...r, src: 1, ownModule: r.ownModule ?? from, imported: true };
    return r;
  }
  const local = cells.find((c) => c.name === d || c.name === "initial " + d || c.name === "viewof " + baseName(d)) ;
  if (local) {
    const lib = libName(local.src);
    const k = cellKind(local, facts(local));
    if (k === "library" && lib) return { src: 3, name: d, lib };
    if (k === "library") return { src: 3, name: d, lib: "(unparsed loader) " + d };
    return { src: 1, name: d, ownModule: id, imported: depth > 0 };
  }
  if (STDLIB.has(d)) return { src: 2, name: d };
  return { src: 4, name: d, why: "unresolved name" };
}

const jsonl = readFileSync(new URL("./cells.jsonl", import.meta.url), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const ref = new Map(jsonl.map((c) => [c.module + "#" + c.pid, c]));
const H_LEVEL = ["FNH", "FILE", "INPUTS", "BUILTIN"];
const tally: any = { FNH: {}, FN: {} };
const add = (o: any, k: string, l: number) => { o[k] ??= [0, 0]; o[k][0]++; o[k][1] += l; };
const stdNames: any = { FNH: {}, FN: {} }, libs: any = { FNH: {}, FN: {} }, undet: any = { FNH: {}, FN: {} };
const ownImp = new Map<string, { mods: Set<string>; cells: number; lines: number }>();
let mismatch = 0, noTrig = 0, checked = 0;
for (const id of [...surveyed].sort()) {
  const raw = mods.get(id)!.raw;
  const out: any[] = classifyModule(id, raw, importKind);
  for (const c of out) {
    const r0 = ref.get(id + "#" + c.pid); checked++;
    if (!r0 || r0.verdict !== c.verdict || r0.blockers.join() !== c.blockers.join()) { mismatch++; continue; }
    if (c.verdict !== "N" && c.verdict !== "H") continue;
    const nb = c.blockers.filter((b: string) => (c.verdict === "N" ? !H_LEVEL.includes(b) : true));
    if (nb.length !== 1 || !["FN", "FNH"].includes(nb[0])) continue;
    const X = nb[0];
    const trig = c.triggers.filter((t: any) => t.b === X);
    if (!trig.length) { noTrig++; add(tally[X], "no trigger", c.lines); continue; }
    const rs = [...new Map(trig.map((t: any) => [t.dep, resolve(id, raw, t.dep)])).values()] as any[];
    const det = rs.filter((r) => r.src !== 4);
    const hard = det.length ? Math.max(...det.map((r) => r.src)) : 4;
    add(tally[X], String(hard), c.lines);
    if (hard === 1) add(tally[X], det.some((r) => r.ownModule !== id) ? "1b" : "1a", c.lines);
    const share = (o: any, key: string) => add(o, key, c.lines);
    if (hard === 2) for (const n of new Set(det.filter((r) => r.src === 2).map((r) => r.name))) share(stdNames[X], n as string);
    if (hard === 3) for (const n of new Set(det.filter((r) => r.src === 3).map((r) => r.lib))) share(libs[X], n as string);
    if (hard === 4) for (const r of rs) share(undet[X], r.name + (r.why ? " [" + r.why + "]" : ""));
    for (const r of rs) if (r.src === 1 && r.ownModule !== id) {
      const e = ownImp.get(r.ownModule) ?? { mods: new Set(), cells: 0, lines: 0 }; e.mods.add(id); e.cells++; e.lines += c.lines; ownImp.set(r.ownModule, e);
    }
  }
}
console.log(`cells re-classified ${checked}, mismatching cells.jsonl ${mismatch}, sole FN/FNH cells with no recorded trigger ${noTrig}`);
const label: any = { "1": "own module cell", "1a": "  of which same module only", "1b": "  of which imported from another surveyed module", "2": "Observable stdlib", "3": "third-party / vendored lib", "4": "undetermined", "no trigger": "no trigger" };
for (const X of ["FNH", "FN"]) {
  const tot = ["1", "2", "3", "4", "no trigger"].reduce((a, k) => a + (tally[X][k]?.[1] ?? 0), 0);
  console.log(`\n${X} sole-blocker: source\tcells\tlines\t%lines`);
  for (const k of ["1", "1a", "1b", "2", "3", "4", "no trigger"]) if (tally[X][k]) console.log(`${label[k]}\t${tally[X][k][0]}\t${tally[X][k][1]}\t${Math.round((100 * tally[X][k][1]) / tot)}`);
  const top = (o: any, n: number, t: string) => { console.log(`\n${X} ${t}: name\tcells\tlines`); for (const [k, v] of Object.entries(o).sort((a: any, b: any) => b[1][1] - a[1][1]).slice(0, n)) console.log(`${k}\t${(v as any)[0]}\t${(v as any)[1]}`); };
  top(stdNames[X], 10, "stdlib names (cell counted under each)"); top(libs[X], 10, "libraries"); top(undet[X], 10, "undetermined deps");
}
console.log(`\nown modules imported as functions (FN/FNH sole cells of other modules): module\timporting modules\timporting cells\tlines`);
for (const [k, v] of [...ownImp].sort((a, b) => b[1].mods.size - a[1].mods.size || b[1].cells - a[1].cells).slice(0, 15)) console.log(`${k}\t${v.mods.size}\t${v.cells}\t${v.lines}`);
