// Phase 1: today's compiled SoundScript variables through the standard OJS toolchain.
// compiled -> OJS decompile -> OJS compile -> compare; SoundScript decompileVariable on the result; run both.
// Run: bun tools/lang-experiment/ojs-roundtrip/current.ts [--verbose]
import { compileCorpus } from "./compile-corpus.ts";
import { loadOjs } from "./ojs.ts";
import { T, run, diffRuns, ACTIONS, type Var } from "./harness.ts";
const verbose = process.argv.includes("--verbose");
const ojs = await loadOjs();
const { vars } = compileCorpus();

// group as lope-push-ws.js does: x with input `viewof x` goes with `viewof x`, the viewof first
const groups: (typeof vars)[] = [];
const byKey = new Map<string, typeof vars>();
for (const v of vars) {
  const key = v.name.startsWith("viewof ") ? v.name : v.inputs.includes(`viewof ${v.name}`) ? `viewof ${v.name}` : null;
  if (!key) { groups.push([v]); continue; }
  if (!byKey.has(key)) { byKey.set(key, []); groups.push(byKey.get(key)!); }
  if (v.name.startsWith("viewof ")) byKey.get(key)!.unshift(v); else byKey.get(key)!.push(v);
}
const rows: string[][] = [];
const recompiled: Var[] = [];
for (const g of groups) {
  const head = g[0];
  let text = "", err = "";
  try { text = await ojs.decompile(g.map((v) => ({ _name: v.name, _inputs: v.inputs, _definition: v.definition }))); } catch (e) { err = (e as Error).message; }
  let rec: any[] = [];
  if (!err) try { rec = ojs.compile(text); } catch (e) { err = `compile: ${(e as Error).message}`; }
  const stub = rec.some((r) => /_sourceExpression/.test(r._definition));
  for (const r of rec) recompiled.push({ name: r._name, inputs: r._inputs, definition: r._definition });
  const diffs: string[] = [];
  for (const v of g) {
    const r = rec.find((x) => x._name === v.name);
    if (!r) { diffs.push(`${v.name}: missing`); continue; }
    const same = (a: string[], b: string[]) => a.join() === b.join();
    if (!same(v.inputs, r._inputs)) diffs.push(`${v.name} inputs ${JSON.stringify(v.inputs)}->${JSON.stringify(r._inputs)}`);
    if (v.definition !== r._definition) diffs.push(`${v.name} def changed`);
  }
  for (const r of rec) if (!g.some((v) => v.name === r._name)) diffs.push(`extra ${r._name}`);
  // SoundScript recovery from the round-tripped definition of the cell's source-carrying variable
  const carrier = g.find((v) => T.decompileVariable(v.definition) !== null);
  const rcar = carrier && rec.find((x) => x._name === carrier.name);
  let recovered = "n/a";
  if (carrier) {
    try { const s = rcar ? T.decompileVariable(rcar._definition) : null; recovered = s === carrier.text ? "yes" : s === null ? "no (not ss)" : "no (differs)"; } catch (e) { recovered = `no (${(e as Error).message.slice(0, 50)})`; }
  }
  rows.push([head.label, g.map((v) => v.name).join(" + "), err ? `ERR ${err.slice(0, 60)}` : stub ? "syntax-error stub" : "ok", diffs.join("; ") || "identical", recovered]);
  if (verbose) console.log(`### ${g.map((v) => v.name).join(" + ")}\n${err || text}\n${rec.map((r) => `  -> ${r._name} ${JSON.stringify(r._inputs)} ${r._definition.slice(0, 160)}`).join("\n")}\n`);
}
console.log("| cell | variables | OJS decompile -> compile | recompile vs original | SS source recovered |\n|---|---|---|---|---|");
for (const r of rows) console.log(`| ${r.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`);

const a = await run(vars), b = await run(recompiled);
const d = diffRuns(a, b);
console.log(`\nrun: ${d.names} names, ${d.rows.length} differ (snapshots: settled, then after each of ${ACTIONS.map((x) => x[0]).join(", ")})`);
console.log("| variable | original | round-tripped |\n|---|---|---|");
for (const [n, x, y] of d.rows) console.log(`| ${n} | ${x.slice(0, 90).replace(/\|/g, "/")} | ${y.slice(0, 90).replace(/\|/g, "/")} |`);
ojs.dispose();
process.exit(0);
