// c0: freeze-attack4's controls (checker skipped) and its switch control, plus the new switch control: the spec's own
// "Not specified" S4.10 example (an inferred tuple holding a Mut local), with a drive that calls it once after the run
// so the registration-on throw is printed.
import { C } from "../freeze-attack3/harness.ts";
import { cands as fa4 } from "../freeze-attack4/c0.ts";
const callAll = { drive: async (p: any) => { const v = p.value("a"); const fs: [string, any][] = typeof v === "function" ? [["a", v]] : Object.entries(v ?? {}).filter(([, f]) => typeof f === "function"); return fs.map(([n, f]) => { try { return `${n}() = ${JSON.stringify(f())}`; } catch (e) { return `${n}() threw ${(e as Error).message}`; } }).join("; "); } };
export const cands = [
  ...fa4.map((c: any) => ({ ...c, name: `fa4-${c.name}` })),
  C("k5-spec-not-specified-tuple", "const a = () => { const xs = [0]; const t = [xs, 1] as const; return () => { t[0].push(1); return t[0].length; }; };", callAll),
  C("k5-ternary", "const a = () => { const xs = [0]; const t = xs.length > 0 ? xs : null; return () => { if (t) t.push(1); return t ? t.length : -1; }; };", callAll),
  C("k5-asconst-rec-map", "const a = () => { const m = new Map<string, number>(); const t = { m } as const; return () => { t.m.set(String(t.m.size), 1); return t.m.size; }; };", callAll),
];
