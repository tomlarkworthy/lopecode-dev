// bun selfhost/no-mut/part3.ts: the functions that take a Mut parameter (accepted cells, corpus + supplement,
// deduplicated by file:line), their call sites (the passes to a Mut parameter), and what each does with the parameter.
// Writes out/part3.md and out/part3.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rd = (f: string) => JSON.parse(readFileSync(join(import.meta.dir, f), "utf8"));
const jobsAll = [...rd("out/corpus.json").map((j: any) => ({ ...j, sup: false })), ...rd("out/corpus-module.json").map((j: any) => ({ ...j, sup: true }))];
const bucketOf = (j: any) => (j.sup ? (j.key === "module:tutorial" ? "tutorial/spec/examples" : "checker/toolchain") : j.bucket);
const cells = jobsAll.flatMap((j: any) => j.cells.filter((c: any) => c.status === "ok").map((c: any) => ({ ...c, bucket: bucketOf(j) })));
const seenC = new Set<string>();
const uniq = cells.filter((c: any) => { const k = `${c.at}|${c.name}`; if (seenC.has(k)) return false; seenC.add(k); return true; });

type P = any;
const params: P[] = [];
{ const s = new Set<string>(); for (const c of uniq) for (const p of c.params) { const k = `${p.at}|${p.name}`; if (s.has(k)) continue; s.add(k); params.push({ ...p, cell: c.name, bucket: c.bucket }); } }
const passes: any[] = [];
{ const s = new Set<string>(); for (const c of uniq) for (const x of c.passes) { const k = `${x.at}|${x.callee}|${x.root ?? ""}`; if (s.has(k)) continue; s.add(k); passes.push({ ...x, cell: c.name, bucket: c.bucket }); } }

const scope = (p: P) => (p.fnClass === "cellfn" || p.fnClass === "kept" ? "cross-cell" : "local");
const TYPED = /^Mut<(Float32Array|Float64Array|Int8Array|Uint8Array|Uint8ClampedArray|Int16Array|Uint16Array|Int32Array|Uint32Array)>/;
function klass(p: P): string {
  const w: string[] = p.writes, r: string[] = p.reads;
  const m = (xs: string[], ...ns: string[]) => xs.some((x) => ns.some((n) => x === "method:" + n || x === "read:" + n));
  if (!w.length) return p.passedOn > 0 ? (p.recursesWithIt ? "builder passed down a recursion (writes only below)" : "passes it on, no write here") : "no write, not passed on";
  if (p.recursesWithIt) return "builder passed down a recursion";
  if (m(w, "set", "add") && m(r, "get", "has")) return "memo / cache (reads and inserts)";
  if (TYPED.test(p.tShow) && w.every((x) => x === "index-assign" || x === "update")) return "fills a buffer (typed array)";
  if (w.every((x) => x === "method:push" || x === "method:unshift")) return "appends to the caller's array";
  if (w.every((x) => x.startsWith("method:set") || x.startsWith("method:add") || x === "method:delete" || x === "method:clear")) return "inserts into the caller's map/set";
  if (w.every((x) => x === "member-assign" || x === "update")) return "updates fields of the caller's record";
  if (w.every((x) => x === "index-assign" || x === "update")) return "fills an array by index";
  return "mixed writes (" + [...new Set(w)].sort().join(",") + ")";
}
const rows = params.map((p) => ({ ...p, scope: scope(p), klass: klass(p) }));
// call sites: passes whose callee names the function (a helper's const, or a cell's value function called through the
// input named after its cell); a callee reached through a record field (".check") is counted apart
const fnKey = (p: P) => `${p.fnAt}|${p.fnName}`;
const fns = new Map<string, any>();
for (const p of rows) { const k = fnKey(p); const f = fns.get(k) ?? { fnAt: p.fnAt, fnName: p.fnName, cell: p.cell, bucket: p.bucket, scope: p.scope, params: [] as P[] }; f.params.push(p); fns.set(k, f); }
const nameOfFn = (f: any) => (f.fnName.startsWith("<") ? f.cell : f.fnName);
const callsByName = new Map<string, number>();
for (const x of passes) callsByName.set(x.callee, (callsByName.get(x.callee) ?? 0) + 1);
// a call site is one call expression; passes count each Mut argument, so group by at + callee
const siteSet = new Map<string, Set<string>>();
for (const x of passes) { const s = siteSet.get(x.callee) ?? new Set(); s.add(x.at); siteSet.set(x.callee, s); }
const out: string[] = [];
const p_ = (s = "") => out.push(s);
p_(`Mut parameters (deduplicated by file:line): ${rows.length}, in ${fns.size} functions. Passes to a Mut parameter: ${passes.length} (arguments), at ${[...siteSet.values()].reduce((s, x) => s + x.size, 0)} call lines.`);
p_();
p_("| scope | class | parameters | functions | buckets |"); p_("|---|---|---:|---:|---|");
const K = new Map<string, P[]>();
for (const r of rows) { const k = `${r.scope}|${r.klass}`; K.set(k, [...(K.get(k) ?? []), r]); }
for (const [k, rs] of [...K].sort((a, b) => b[1].length - a[1].length)) {
  const [sc, kl] = k.split("|");
  const bk = new Map<string, number>(); for (const r of rs) bk.set(r.bucket, (bk.get(r.bucket) ?? 0) + 1);
  p_(`| ${sc} | ${kl} | ${rs.length} | ${new Set(rs.map(fnKey)).size} | ${[...bk].map(([b, n]) => `${b} ${n}`).join(", ")} |`);
}
p_();
// call sites per scope
const local = [...fns.values()].filter((f) => f.scope === "local"), cross = [...fns.values()].filter((f) => f.scope === "cross-cell");
const sites = (fs: any[]) => fs.reduce((s, f) => s + (siteSet.get(nameOfFn(f))?.size ?? 0), 0);
p_(`Local helpers taking a Mut: ${local.length} functions, ${local.reduce((s, f) => s + f.params.length, 0)} parameters, ${sites(local)} call lines naming them.`);
p_(`Cross-cell functions (a cell's value function, or one it returns) taking a Mut: ${cross.length} functions, ${cross.reduce((s, f) => s + f.params.length, 0)} parameters, ${sites(cross)} call lines naming them (calls through a cell input of that name; calls through a record field are below).`);
p_(`Call lines through a record field (".name"): ${[...siteSet].filter(([k]) => k.startsWith(".")).reduce((s, [, v]) => s + v.size, 0)}; callee not resolved ("?"): ${siteSet.get("?")?.size ?? 0}.`);
p_();
p_("Parameter types of the cross-cell Mut parameters (top 25):"); p_();
const ty = new Map<string, number>(); for (const r of rows.filter((r) => r.scope === "cross-cell")) ty.set(r.tShow.slice(0, 60), (ty.get(r.tShow.slice(0, 60)) ?? 0) + 1);
for (const [t, n] of [...ty].sort((a, b) => b[1] - a[1]).slice(0, 25)) p_(`- ${n} \`${t}\``);
p_();
p_("Every local helper taking a Mut:"); p_();
for (const f of local) p_(`- ${f.fnAt} \`${f.fnName}\` in \`${f.cell}\` (${f.bucket}): ${f.params.map((x: P) => `${x.name}: ${x.tShow} [${x.klass}; writes ${[...new Set(x.writes)].join(",") || "none"}; passed on ${x.passedOn}]`).join("; ")}; ${siteSet.get(nameOfFn(f))?.size ?? 0} call lines`);
writeFileSync(join(import.meta.dir, "out/part3.md"), out.join("\n"));
writeFileSync(join(import.meta.dir, "out/part3.json"), JSON.stringify({ params: rows, passes }, null, 1));
console.log(out.join("\n"));
