// How deep a tree each stage survives before the JS stack runs out, on texts nested n deep: acorn (parse.ts), the
// adapter (adapter.ts nest), crossing (rec cross, no depth limit), deepEqual (re-delivery), and AST depth of the result.
// Binary search on n per stage. Run: bun probe-depth.ts
import { parse } from "./orig/lite/parse.ts";
import { nestParse } from "./adapter.ts";
const rec = await import("./rec/lite/boundary.ts");
const { checkSources } = await import("./recfix/lite/core.ts");
const { deepEqual } = await import("./rec/lite/runtime-ss.ts");
const shape = checkSources({ cells: (await Bun.file(import.meta.dir + "/ast-n.ss.ts").text()) + `\nexport const f = (x: NParse): number => 1;`, tsx: false, outside: [{ name: "x" }] }).facts.get("f").params[0].boundary.shape;
const TEXTS: Record<string, (n: number) => string> = {
  parens: (n) => `const x = ${"(".repeat(n)}1${")".repeat(n)};`,
  arrays: (n) => `const x = ${"[".repeat(n)}1${"]".repeat(n)};`,
  "a+a+…": (n) => `const x = ${Array(n).fill("a").join(" + ")};`,
  "nested arrows": (n) => `const x = ${"() => ".repeat(n)}1;`,
};
const depthOf = (n: any): number => { let d = 0; const w = (x: any, k: number) => { if (!x || typeof x !== "object") return; if (Array.isArray(x)) { x.forEach((y) => w(y, k)); return; } if (typeof x.type !== "string") return; d = Math.max(d, k); for (const key in x) if (key !== "loc") w(x[key], k + 1); }; w(n, 1); return d; };
const max = (ok: (n: number) => boolean) => { let lo = 1, hi = 200000; if (!ok(lo)) return 0; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (ok(m)) lo = m; else hi = m - 1; } return lo; };
const tryy = (f: () => unknown) => { try { f(); return true; } catch (e) { return false; } };
rec.LIMITS.depth = 1e9;
for (const [label, text] of Object.entries(TEXTS)) {
  const a = max((n) => tryy(() => parse(text(n))));
  const ad = max((n) => tryy(() => { const p = nestParse(text(n), false); if (!p.ok) throw new Error(p.message); }));
  // cross and deepEqual from the adapter's value at the deepest n the adapter survives, or below
  const c = max((n) => n <= ad && tryy(() => { const p = nestParse(text(n), false); rec.cross(p, shape, "f.x" + n); }));
  const de = max((n) => n <= ad && tryy(() => { const p = nestParse(text(n), false); deepEqual(p, structuredClone(p)); }));
  const at = Math.floor(Math.min(a, ad, c) / 2);
  let d: number | string; try { d = depthOf(parse(text(at)).program); } catch (e) { d = (e as Error).message; }
  console.log(`${label.padEnd(14)} acorn ${a}, adapter ${ad}, cross ${c}, deepEqual ${de}; AST depth at n=${at}: ${d}`);
}
