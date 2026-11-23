// r3: G1 and G2 in round 7's b7 form: the earlier reading is taken by snap, an action of another cell (t.set(read(s)())),
// called between the publish and the write; v = s() and w = t are further cells. Checker on (Q1 route: st read first).
import { C } from "./lib.ts";
const S2 = "const s = () => state<() => number>(() => -1);\nconst t = () => state(-1);\nconst v = (s: () => number) => s();\nconst w = (t: number) => t;\nconst snap = (s: State<() => number>, t: State<number>) => action(() => { t.set(read(s)()); });\n";
const PUT = (b: string) => `const put = (s: State<() => number>, snap: Action<[]>) => ({ go: action(() => { const st = s.set; ${b} }) });`;
const two = async (p: any) => {
  try { p.value("put").go(); } catch (e) { return `threw at the call: ${(e as Error).message.slice(0, 120)}`; }
  await p.settle(400);
  const v = p.value("v"), w = p.value("w");
  return `${v !== w ? "DIFF" : "same"} v = s() = ${v}, w = what snap read = ${w}`;
};
export const cands = [
  C("r3-I-snap", S2 + PUT("const xs = [0]; const i: readonly number[] = xs; const F = () => i.length; st(F); snap(); xs.push(1);"), { drive: two }),
  C("r3-SH-snap", S2 + PUT("const ss_closure = <T,>(f: T, g: unknown): T => f; const xs = [0]; const c: readonly number[] = xs; const F = () => c.length; st(F); snap(); xs.push(1);"), { drive: two }),
  C("r3-I-method-snap", S2 + PUT("const xs = [0]; const i: readonly number[] = xs; const o = { m() { return i.length; } }; st(o.m); snap(); xs.push(1);"), { drive: two }),
  C("r3-CTL-c-snap", S2 + PUT("const xs = [0]; const c: readonly number[] = xs; const F = () => c.length; st(F); snap(); xs.push(1);"), { drive: two, ctl: true }),
];
