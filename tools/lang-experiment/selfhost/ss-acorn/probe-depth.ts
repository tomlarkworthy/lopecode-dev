// Deep inputs, stage by stage: for each shape of source text, the largest n each stage takes without throwing, by
// doubling and then bisecting n (at most 40000). Stages: acorn (base/lite/parse.ts); today's checker (base checkSources
// of the cell, which returns without throwing); the shell (acornParse); the boundary copy (checkShape of the shell's
// value) with no limit, with the record-depth limit, and with the nested prototype's count (arrays as levels); the
// module's checked cells (preorder, byNid); the consumer (syntaxCheck). Run: bun probe-depth.ts > out/probe-depth.txt
import { parse } from "./base/lite/parse.ts";
import { checkSources } from "./base/lite/core.ts";
import { M, acornParse, checkShape, PARSE_SHAPE } from "./mod.ts";
import { COPY } from "./mod.ts";
const { LIMITS = { depth: 0, countArrays: false } } = await import(`./${COPY}/lite/boundary.ts`) as any;
console.log(`copy: ${COPY}`);

const SHAPES: Record<string, (n: number) => string> = {
  "a+a+…": (n) => `export const f = () => { const a = 1; return ${Array(n).fill("a").join("+")}; };`,
  "[[…]]": (n) => `export const f = () => ${"[".repeat(n)}1${"]".repeat(n)};`,
  "x => x => …": (n) => `export const f = () => ${"(x: number) => ".repeat(n)}1;`,
  "g(g(…))": (n) => `export const f = (g: (x: number) => number) => ${"g(".repeat(n)}1${")".repeat(n)};`,
  "a.b.b.…": (n) => `export const f = () => { const a = { b: null }; return a${".b".repeat(n)}; };`,
  "((…))": (n) => `export const f = () => ${"(".repeat(n)}1${")".repeat(n)};`,
};
const builtin = new Set<string>();
const withLimit = (depth: number, arrays: boolean, f: () => unknown) => () => { const d = LIMITS.depth, a = LIMITS.countArrays; LIMITS.depth = depth; LIMITS.countArrays = arrays; try { return f(); } finally { LIMITS.depth = d; LIMITS.countArrays = a; } };
const raw = (s: string) => acornParse(s, false) as any;
const STAGES: Record<string, (s: string) => unknown> = {
  "acorn": (s) => parse(s),
  "today's checker (returns)": (s) => { checkSources({ cells: s, tsx: false }); },
  "today's checker (cell ok)": (s) => { const r = checkSources({ cells: s, tsx: false }); const c = r.cells[0]; if (!c || c.status !== "ok") throw new Error(`${c?.status}: ${JSON.stringify(c?.errors?.[0]?.msg ?? r.module[0]?.msg).slice(0, 100)}`); },
  "shell": (s) => raw(s),
  "copy, no limit": (s) => withLimit(Infinity, false, () => checkShape(raw(s), PARSE_SHAPE, "x"))(),
  "copy, 2000 records": (s) => withLimit(2000, false, () => checkShape(raw(s), PARSE_SHAPE, "x"))(),
  "copy, 5000 records": (s) => withLimit(5000, false, () => checkShape(raw(s), PARSE_SHAPE, "x"))(),
  "copy, 2000 levels incl. arrays (nested)": (s) => withLimit(2000, true, () => checkShape(raw(s), PARSE_SHAPE, "x"))(),
  "preorder": (s) => { const r = raw(s); if (!r.ok) throw new Error(`no parse: ${r.message}`); const p = withLimit(Infinity, false, () => checkShape(raw(s), PARSE_SHAPE, "x"))() as any; if (!M.preorder(p.ast)) throw new Error("preorder false"); },
  "byNid": (s) => { const r = raw(s); if (!r.ok) throw new Error(`no parse: ${r.message}`); const p = withLimit(Infinity, false, () => checkShape(raw(s), PARSE_SHAPE, "x"))() as any; M.byNid(p.ast); },
  "consumer syntaxCheck": (s) => { const r = withLimit(Infinity, false, () => M.syntaxCheck(s, false, builtin, new Set()))(); if (!r.ok) throw new Error(r.message); },
};
const errOf = (f: () => unknown): string | null => { try { const r: any = f(); if (r && r.ok === false) return `ok:false ${r.message}`; return null; } catch (e: any) { return `${e?.constructor?.name}: ${String(e?.message).slice(0, 140)}`; } };
const MAX = 40000;
for (const [shape, mk] of Object.entries(SHAPES)) {
  const parts: string[] = [];
  for (const [stage, f] of Object.entries(STAGES)) {
    let lo = 1, hi = 2, why: string | null = errOf(() => f(mk(1)));
    if (why) { parts.push(`  ${stage}: fails at 1: ${why}`); continue; }
    while (hi <= MAX && !(why = errOf(() => f(mk(hi))))) { lo = hi; hi *= 2; }
    if (hi > MAX) { parts.push(`  ${stage}: takes ${MAX / 2 < lo ? lo : MAX} (no failure up to ${lo})`); continue; }
    let last = why;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; const w = errOf(() => f(mk(m))); if (w) { hi = m; last = w; } else lo = m; }
    parts.push(`  ${stage}: largest ${lo}; at ${hi}: ${last}`);
  }
  console.log(`${shape}\n${parts.join("\n")}`);
}
