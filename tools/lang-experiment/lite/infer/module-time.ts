// bun lite/infer/module-time.ts [--rounds R] [--reps N]: checkSources against the md cells' entry, end to end, on the
// whole-module corpus of diff.ts (without the lite/infer module) and on the 47-cell tutorial module; and the port's
// time by pass, from wrappers around the cells and the glue that do each pass. Run from tools/lang-experiment.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { execSync } from "node:child_process";
import * as acorn from "acorn";
import { checkSources, type Sources } from "../core.ts";
import { parse } from "../parse.ts";
import { linkMd, mdRegistry, MD_GIVEN, IX_CELLS, MD_CELLS } from "./index.ts";

const arg = (k: string) => { const i = process.argv.indexOf(k); return i < 0 ? null : process.argv[i + 1] ?? ""; };
const ROUNDS = Number(arg("--rounds") ?? 5), REPS = Number(arg("--reps") ?? 20);
const ROOT = resolve(import.meta.dir, "../..");
const sh = (c: string) => { try { return execSync(c, { encoding: "utf8" }).trim(); } catch { return "?"; } };
const env = () => `${sh("pmset -g batt | head -1")}; ${sh("uptime | sed 's/.*load/load/'")}`;

const T: Record<string, number> = {};
(globalThis as Record<string, unknown>).__mdT = T;
const timed = (name: string, f: (...a: never[]) => unknown) => (...a: never[]) => { const t = performance.now(); try { return f(...a); } finally { T[name] = (T[name] ?? 0) + performance.now() - t; } };
const over: Record<string, (...inputs: never[]) => unknown> = {};
const cells = { ...IX_CELLS, ...MD_CELLS } as Record<string, (...a: never[]) => unknown>;
for (const name of ["mdInferFn", "owCheckIn", "owTaintCaptures", "owOpaqueCaptures"]) {
  const f = cells[name];
  const params = (acorn.parseExpressionAt(`(${String(f)})`, 0, { ecmaVersion: "latest" }) as any).params.map((p: any) => p.name).join(", ");
  over[name] = new Function(`return (${params}) => { const v = (${String(f)})(${params}); return (...a) => { const t = performance.now(); try { return v(...a); } finally { globalThis.__mdT.${name} = (globalThis.__mdT.${name} ?? 0) + performance.now() - t; } }; };`)();
}
const G = MD_GIVEN as Record<string, (...a: never[]) => unknown>;
const LT = linkMd(over, { parseTree: timed("parseTree", G.parseTree), syntaxBans: timed("syntaxBans", G.syntaxBans) });
const LP = linkMd();

function portRun(L: typeof LP, src: Sources, opts: { strictIndex?: boolean }, time: boolean) {
  const R = mdRegistry(opts.strictIndex ?? true);
  const R2 = time ? { ...R, loadUser: timed("loadUser", R.loadUser), loadForeign: timed("loadForeign", R.loadForeign) } : R;
  try { return L.mdCheckSources(R2, { cells: src.cells, tsx: !!src.tsx, foreign: src.foreign ?? null, shell: src.shell ?? null, name: src.name ?? null, outside: (src.outside ?? []).map((o) => ({ name: o.name, view: !!o.view })), probe: null }); } finally { R.finish(); }
}
// the corpus: diff.ts's module jobs as its last full --module run wrote them
const corpus: { key: string; src: Sources; opts: { strictIndex?: boolean } }[] = JSON.parse(readFileSync(join(ROOT, "lite/soundscript/.scratch/infer-port/module-sources.json"), "utf8"));
const tutJ = JSON.parse(readFileSync(join(ROOT, "lite/soundscript/.scratch/switch-cost/tutorial.json"), "utf8"));
const tut: Sources = { cells: tutJ.texts.join("\n\n"), tsx: true, outside: tutJ.outside };
const ok = (f: () => unknown) => { try { f(); return true; } catch { return false; } };
const runnable = corpus.filter((j) => ok(() => checkSources(j.src, j.opts)) && ok(() => portRun(LP, j.src, j.opts, false)));
console.log(`${runnable.length} of ${corpus.length} corpus sources (the rest throw on both sides); tutorial module ${tutJ.texts.length} cells`);
const mm = (xs: number[]) => `${Math.min(...xs).toFixed(1)}–${Math.max(...xs).toFixed(1)}`;
// a module with a name declared twice does not parse as it is (checkSources renames first): its parse is timed to the throw
const parseOnce = (s: Sources) => { const t = performance.now(); try { parse(s.cells, { jsx: !!s.tsx }); } catch {} return performance.now() - t; };
for (const [label, set, reps] of [["corpus", runnable, 1], ["tutorial", [{ key: "tutorial", src: tut, opts: {} }], REPS]] as const) {
  const real: number[] = [], port: number[] = [], pp: number[] = [], byPass: Record<string, number[]> = {};
  console.log(`${label} before: ${env()}`);
  for (let r = 0; r < ROUNDS; r++) {
    let a = 0, b = 0, c = 0;
    for (let i = 0; i < reps; i++) for (const j of set) {
      let t = performance.now(); checkSources(j.src, j.opts); a += performance.now() - t;
      t = performance.now(); portRun(LP, j.src, j.opts, false); b += performance.now() - t;
      c += parseOnce(j.src);
    }
    real.push(a / reps); port.push(b / reps); pp.push(c / reps);
    for (const k of Object.keys(T)) delete T[k];
    let tot = 0;
    for (let i = 0; i < reps; i++) for (const j of set) { const t = performance.now(); portRun(LT, j.src, j.opts, true); tot += performance.now() - t; }
    const part = (k: string) => (T[k] ?? 0) / reps;
    const rows: Record<string, number> = {
      "parse+crossing (typed tree)": part("parseTree"), "registry glue (parse.ts parse + load)": part("loadUser") + part("loadForeign"),
      syntax: part("syntaxBans"), inference: part("mdInferFn"), ownership: part("owCheckIn"), captures: part("owTaintCaptures") + part("owOpaqueCaptures"),
    };
    rows["module rules and the rest"] = tot / reps - Object.values(rows).reduce((x, y) => x + y, 0);
    rows["total (timed run)"] = tot / reps;
    for (const [k, v] of Object.entries(rows)) (byPass[k] ??= []).push(v);
  }
  console.log(`${label} after: ${env()}`);
  console.log(`${label}: ms per ${label === "corpus" ? "corpus pass" : "module check"} over ${ROUNDS} rounds${reps > 1 ? ` of ${reps} checks` : ""}: checkSources ${mm(real)}, port ${mm(port)} (ratio ${mm(port.map((p, i) => p / real[i]!))}); parse.ts parse alone ${mm(pp)}, port less one parse.ts parse ${mm(port.map((p, i) => p - pp[i]!))}`);
  for (const [k, v] of Object.entries(byPass)) console.log(`  ${k.padEnd(40)} ${mm(v)}`);
}
