// Q2 and Q4 numbers: what the adapter costs per parse against a bare acorn parse and parse.ts parse, what cross()
// costs per layout, the parse error as a value against the thrown error, the adapter's size, the distinctNames
// retries, and the per-keystroke cost of completionsAt's variants.
// Run: bun selfhost/flat-ast/q2.ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as acorn from "../../lite/node_modules/acorn/dist/acorn.mjs";
import { tsPlugin } from "../../lite/node_modules/@sveltejs/acorn-typescript/index.js";
import { parse } from "../../lite/parse.ts";
import { checkSources } from "../../lite/core.ts";
import { cross } from "../../lite/boundary.ts";
import { flatParse, flatDistinct, SPECS } from "./adapter.ts";
import { corpus } from "./corpus.ts";

const HERE = import.meta.dir;
const TS = acorn.Parser.extend(tsPlugin() as any), TSX = acorn.Parser.extend(tsPlugin({ jsx: true }) as any);
const bare = (src: string, jsx: boolean) => { const cs: unknown[] = []; return (jsx ? TSX : TS).parse(src, { ecmaVersion: "latest", sourceType: "module", locations: true, onComment: (b: boolean, t: string, s: number, e: number) => cs.push({ b, t, s, e }) } as any); };
const inputs = corpus().filter((c) => { try { parse(c.src, { jsx: c.tsx }); return true; } catch { return false; } });
const median = (xs: number[]) => xs.toSorted((a, b) => a - b)[xs.length >> 1]!;
// total ms over all inputs for f, median of `rounds` rounds after one warm-up round
function bench(f: (c: (typeof inputs)[number]) => unknown, rounds = 7): number {
  for (const c of inputs) f(c);
  const ts: number[] = [];
  for (let r = 0; r < rounds; r++) { const t0 = performance.now(); for (const c of inputs) f(c); ts.push(performance.now() - t0); }
  return median(ts);
}
// the boundary shape checkSources computes for a parameter typed `ty`, given the type file
function shapeFor(typesFile: string, ty: string): unknown {
  const r = checkSources({ cells: readFileSync(join(HERE, typesFile), "utf8") + `\nexport const take = (flatParse: ${ty}): number => 1;`, tsx: false, outside: [{ name: "flatParse" }] });
  const s = r.facts?.get("take")?.params[0]?.boundary?.shape;
  if (!s) throw new Error(`no shape for ${ty}: ${JSON.stringify(r.cells[r.cells.length - 1])}`);
  return s;
}
// code lines: lines holding a character outside whitespace and comments (as selfhost/checker-survey/inventory.ts counts)
export function codeLines(file: string, from = 0, to = Infinity): number {
  const src = readFileSync(file, "utf8"), P = parse(src);
  const inComment = new Uint8Array(src.length);
  for (const c of P.comments) inComment.fill(1, c.start, c.end);
  const lines = new Set<number>();
  for (let i = Math.max(0, from); i < Math.min(src.length, to); i++) if (!inComment[i] && !/\s/.test(src[i]!)) lines.add(P.line(i));
  return lines.size;
}

if (import.meta.main) {
  const nodes = inputs.reduce((s, c) => s + (flatParse(c.src, c.tsx) as any).ast.nodes.length, 0);
  const chars = inputs.reduce((s, c) => s + c.src.length, 0);
  console.log(`corpus: ${inputs.length} inputs that parse, ${chars} chars, ${nodes} nodes`);
  // two passes over the five; the second is reported (the first warms every path)
  let tBare = 0, tParse = 0, tA = 0, tAll = 0, tB = 0;
  for (let pass = 0; pass < 2; pass++) {
    tBare = bench((c) => bare(c.src, c.tsx));
    tParse = bench((c) => parse(c.src, { jsx: c.tsx }));
    tA = bench((c) => flatParse(c.src, c.tsx, SPECS.a));
    tAll = bench((c) => flatParse(c.src, c.tsx, SPECS.all));
    tB = bench((c) => flatParse(c.src, c.tsx, "B"));
  }
  const per = (ms: number) => `${ms.toFixed(1)} ms total, ${(ms * 1000 / inputs.length).toFixed(0)} µs per input, ${(ms * 1000 / nodes).toFixed(2)} µs per node`;
  console.log(`bare acorn + TS plugin parse:       ${per(tBare)}`);
  console.log(`parse.ts parse:                     ${per(tParse)}`);
  console.log(`flatParse, layout A (121 records):  ${per(tA)}`);
  console.log(`flatParse, layout A-all (133):      ${per(tAll)}`);
  console.log(`flatParse, layout B (generic row):  ${per(tB)}`);

  // cross() of the value, per layout
  const shapeA = shapeFor("ast-a.ss.ts", "Parse"), shapeB = shapeFor("ast-b.ss.ts", "ParseB");
  const valsA = inputs.map((c) => flatParse(c.src, c.tsx, SPECS.a)), valsB = inputs.map((c) => flatParse(c.src, c.tsx, "B"));
  const crossAll = (vals: unknown[], shape: unknown) => { const ts: number[] = []; for (let r = 0; r < 5; r++) { const t0 = performance.now(); for (const v of vals) cross(v, shape as any, "take.flatParse"); ts.push(performance.now() - t0); } return median(ts); };
  const cA = crossAll(valsA, shapeA), cB = crossAll(valsB, shapeB);
  console.log(`cross(), layout A: ${per(cA)}; shape JSON ${JSON.stringify(shapeA).length} chars`);
  console.log(`cross(), layout B: ${per(cB)}; shape JSON ${JSON.stringify(shapeB).length} chars`);
  // control: a row of a type the union lacks must be rejected
  const bad = structuredClone(valsA.find((v) => v.ok)!) as any;
  bad.ast.nodes[1] = { ...bad.ast.nodes[1], type: "Bogus" };
  try { cross(bad, shapeA as any, "take.flatParse"); console.log("control: a Bogus row crossed (wrong)"); } catch (e) { console.log(`control: a Bogus row is rejected: ${(e as Error).message.slice(0, 120)}`); }

  // the error as a value: truncated corpus texts, against the thrown error
  let errs = 0, same = 0, cut = 0;
  const firstBad: string[] = [];
  for (const c of inputs) for (const f of [0.3, 0.5, 0.7]) {
    const t = c.src.slice(0, Math.floor(c.src.length * f));
    cut++;
    let thrown: any = null;
    try { parse(t, { jsx: c.tsx }); } catch (e) { thrown = e; }
    const v = flatParse(t, c.tsx);
    if (!thrown) { if (!v.ok) firstBad.push(`${c.id}@${f}: value error, no throw`); continue; }
    errs++;
    if (!v.ok && v.message === thrown.message && v.pos === thrown.pos && v.line === thrown.loc.line && v.column === thrown.loc.column) same++;
    else if (firstBad.length < 3) firstBad.push(`${c.id}@${f}: ${JSON.stringify(v).slice(0, 120)} vs ${thrown.message}`);
  }
  console.log(`parse errors: ${cut} truncated texts, ${errs} throw; value (message, pos, line, column) equal to the thrown error in ${same} ${firstBad.join(" | ")}`);
  const ex = inputs.map((c) => c.src.slice(0, Math.floor(c.src.length * 0.5))).map((t, i) => flatParse(t, inputs[i]!.tsx)).find((v) => !v.ok);
  console.log(`  e.g. ${JSON.stringify(ex)}`);

  // distinctNames in the shell: how many parses each input takes
  const retries = corpus().map((c) => ({ id: c.id, n: flatDistinct(c.src, c.tsx).parses }));
  console.log(`distinctNames (whole corpus, ${retries.length} inputs): inputs needing more than one parse: ${retries.filter((r) => r.n > 1).map((r) => `${r.id} (${r.n})`).join(", ") || "none"}`);

  // Q4: completionsAt checks 4 variants of the module per keystroke; what the parse side costs for each, per module
  const big = inputs.toSorted((a, b) => b.src.length - a.src.length).slice(0, 3);
  for (const c of big) {
    const v = flatParse(c.src, c.tsx) as any;
    const tp = bench(() => flatParse(c.src, c.tsx), 5) / inputs.length, tc = (() => { const ts: number[] = []; for (let r = 0; r < 5; r++) { const t0 = performance.now(); cross(v, shapeA as any, "take.flatParse"); ts.push(performance.now() - t0); } return median(ts); })();
    const tcB = (() => { const vb = flatParse(c.src, c.tsx, "B"); const ts: number[] = []; for (let r = 0; r < 5; r++) { const t0 = performance.now(); cross(vb, shapeB as any, "take.flatParse"); ts.push(performance.now() - t0); } return median(ts); })();
    console.log(`completionsAt on ${c.id} (${v.ast.nodes.length} nodes): flatParse ${(tp).toFixed(2)} ms per variant; cross A ${tc.toFixed(1)} ms, B ${tcB.toFixed(1)} ms per variant; 4 variants: ${(4 * (tp + tc)).toFixed(1)} ms (A), ${(4 * (tp + tcB)).toFixed(1)} ms (B)`);
  }

  // adapter size
  const ad = join(HERE, "adapter.ts"), P = parse(readFileSync(ad, "utf8"));
  const spans = P.program.body.map((s: any) => { const d = s.type === "ExportNamedDeclaration" && s.declaration ? s.declaration : s; const name = d.id?.name ?? d.declarations?.[0]?.id?.name ?? s.type; return `${name} ${codeLines(ad, s.start, s.end)}`; });
  console.log(`adapter.ts: ${codeLines(ad)} code lines: ${spans.join(", ")}`);
  for (const f of ["out/spec-a.json", "out/spec-a-all.json"]) { const s = JSON.parse(readFileSync(join(HERE, f), "utf8")); console.log(`${f}: ${Object.keys(s).length} node types, ${Object.values(s).reduce((n: number, fs: any) => n + fs.length, 0)} field entries (generated by gen.ts, ${codeLines(join(HERE, "gen.ts"))} code lines; census.ts ${codeLines(join(HERE, "census.ts"))})`); }
  console.log(`ast-a.ss.ts ${codeLines(join(HERE, "ast-a.ss.ts"))} code lines, ast-a-all.ss.ts ${codeLines(join(HERE, "ast-a-all.ss.ts"))}, ast-b.ss.ts ${codeLines(join(HERE, "ast-b.ss.ts"))}`);
}
