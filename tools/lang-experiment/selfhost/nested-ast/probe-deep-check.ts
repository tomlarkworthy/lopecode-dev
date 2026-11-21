// Deep left-nested a+a+...: does today's checker (orig checkSources) take it, and does the checked port (syntaxPass of
// visit-n, linked) take the crossed tree? n where each first fails.
// Run: bun probe-deep-check.ts
import { checkSources } from "./orig/lite/core.ts";
import { nestParse } from "./adapter.ts";
import { SHAPE, linkN, byNid } from "./diff.ts";
const { cross, LIMITS } = await import("./recdisp/lite/boundary.ts");
const L = linkN();
const tryy = (f: () => unknown) => { try { const v = f(); return { ok: true, v }; } catch (e: any) { return { ok: false, v: `${e?.constructor?.name}: ${String(e?.message).slice(0, 90)}` }; } };
for (const n of [500, 1000, 1990, 2500, 3000, 5000, 15000]) {
  const src = `export const f = (a: number): number => ${Array(n).fill("a").join(" + ")};`;
  const chk = tryy(() => { const r = checkSources({ cells: src, tsx: false }); return `${r.cells[0]?.status} ${JSON.stringify(r.cells[0]?.errors.map((e: any) => e.rule)).slice(0, 80)}`; });
  LIMITS.depth = 1e9;
  const crossed: any = tryy(() => cross(nestParse(src, false), SHAPE, `deep${n}.nestedParse`));
  LIMITS.depth = 2000;
  const port = crossed.ok ? tryy(() => { const prog = (crossed.v as any).ast.program; return `${L.moduleShape(prog, new Set(), new Set()).cells.map((c: any) => L.syntaxPass(c.fn).length)} diags; captures ${L.moduleShape(prog, new Set(), new Set()).cells.map((c: any) => L.captures(c.fn, new Map()).length)}`; }) : { ok: false, v: "not crossed" };
  console.log(`n=${n}: orig checkSources ${chk.ok ? chk.v : chk.v}; cross (no depth limit) ${crossed.ok ? "ok" : crossed.v}; port ${port.v}`);
}
