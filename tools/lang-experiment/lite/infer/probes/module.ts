// Modules for the whole-module comparison (diff.ts --module) that reach core.ts's module rules the corpus meets fewer
// than five times: foreign.d.ts, cells in other languages, compile options and boundaries, duplicates, the crash path.
import type { Sources } from "../../core.ts";

const foreign = `/** pure */ declare const pureN: number;
/** effect */ declare const fx: () => number;
declare const unmarked1: string;
declare const unmarked2: number;
/** pure */ declare const iter: Iterator<number>;
declare const unmarked3: boolean;
export const notDecl = 1;
/** pure */ declare const gen: Iterable<number>;
declare const unmarked4: string;
declare function unmarked5(x: number): string;
/** effect */ declare function fx2(): void;
/** pure */ declare const bad: Frob;`;
const outside = [{ name: "slider", view: true }, { name: "plain" }, { name: "f" }, { name: "g" }, { name: "h" }];

export const MODULE_PROBES: { key: string; src: Sources; opts?: { strictIndex?: boolean } }[] = [
  { key: "foreign", src: { cells: `export const a = (pureN: number) => pureN + 1;
export const b = (fx) => 1;
export const c = (fx, pureN) => 2;
export const d = (iter) => 3;
export const e = (gen) => 4;
export const e2 = (fx: () => number) => fx;
export const e3 = (fx) => fx;
export const e4 = (fx2, fx) => 5;
export const e5 = (fx2) => 6;
export const e6 = (unmarked5, bad) => 7;`, foreign } },
  { key: "boundary", src: { cells: `export const a = (plain) => 1;
export const b = (slider) => 2;
export const c = (f) => 3;
export const d = (g, h) => 4;
export const e = (plain: State<number>) => 5;
export const s1 = (slider: State<number>) => 6;
export const s2 = (slider: State<string>) => 7;
export const s3 = (slider: State<number>) => 8;
export const s4 = (slider: State<boolean>) => 9;
export const s5 = (slider: State<{ x: number }>) => 10;
export const s6 = (slider: State<string>) => 11;
export const t1 = (plain: Events<number>) => 12;
export const t2 = (plain: Promise<number>) => 13;
export const t3 = (plain: () => void) => plain;
export const t4 = (plain: Map<string, number>) => 14;
export const t5 = (plain: (x: number) => number) => plain(1);
export const t6 = (plain: <T>(x: T) => T) => 15;
export const u1 = (plain: (x: number) => number) => state(plain);
export const u2 = (u1: StateCell<(x: number) => number>) => 16;
export const u3 = function* (plain: (x: number) => number) { yield plain; };`, outside } },
  { key: "compile-options", src: { cells: `export const x = () => 1;
export const y = (x: number) => x + 1;
export const c1 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: { runtime: 1 } });
export const c2 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: 5 });
export const c3 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: { other: true } });
export const c4 = (compile, pool) => compile({ inputs: ["x"], outputs: ["y"], options: { runtime: pool } });
export const c7 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: { runtime: "w" } });
export const c8 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: { runtime: [1] } });
export const c9 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: { runtime: true, more: 1 } });
export const c10 = (compile, now) => compile({ inputs: ["x"], outputs: ["y"], options: { runtime: now } });
export const c5 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: "fast" });
export const c6 = (compile) => compile({ inputs: ["x"], outputs: ["y"], options: [1] });`, tsx: true } },
  { key: "compile-boundary", src: { cells: `export const f = () => (n: number) => n;
export const p = async () => 1;
export const m = () => mut([1]);
export const sc = () => state(1);
export const out1 = (f) => f;
export const out2 = (p: number) => p;
export const k1 = (compile) => compile({ inputs: ["f"], outputs: ["out1"] });
export const k2 = (compile) => compile({ inputs: ["p"], outputs: ["out2"] });
export const k3 = (compile) => compile({ refs: ["sc"], outputs: ["out2"] });
export const k4 = (compile) => compile({ inputs: ["nope"], outputs: ["out1"] });
export const k5 = (compile) => compile({ inputs: [x], outputs: ["out1"] });
export const k6 = (compile) => compile({ outputs: ["out1", "f"], inputs: ["f"] });
export const k7 = (compile) => compile({ outputs: ["m"] });`, tsx: true } },
  { key: "duplicates", src: { cells: `export const a = () => 1;
export const a = () => 2;
export const b = () => 3;
const b = 4;
function a() { return 5; }
export const s = () => 6;
export const c = () => 7;
export const c = () => 8;
export const c = () => 9;`, shell: `export const s = 1;\nexport function t() { return 2; }` } },
  { key: "module-level", src: { cells: `enum E { A }
namespace N { export const x = 1; }
class K {}
var v = 1;
1 + 1;
// @ts-ignore
export const a = () => 1;
type Map = number;
interface Array { x: number }
type Ok = number;
export const b = (): Ok => 2;
/* @ts-nocheck */
export const notFn = 3, alsoFn = () => 4;
import type { Q } from "./q";
// @ts-expect-error at the end`, tsx: false } },
  { key: "injection", src: { cells: `export const s = () => state(1);
export const g = function* () { yield 1; };
export const l = (g: Events<number>) => listen(g, () => {});
export const a1 = (s: State<number>) => 1;
export const a2 = (s: State<string>) => 2;
export const a3 = (g: Events<number>) => 3;
export const a4 = (g: Events<string>) => 4;
export const a5 = (g) => 5;
export const a6 = (l) => 6;
export const a7 = (s: Source<number>) => 7;
export const a8 = (s: Sub<number>) => 8;
export const a9 = ({ x }) => 9;
export const b1 = (now: State<number>) => 10;
export const b2 = (a1: Events<number>) => 11;
export const b3 = (a1: string) => 12;
export const b4 = (zzz) => 13;
export const b5 = (s: State) => 14;
export const b6 = (a1: Unknown) => 15;
export const b7 = (now, random, fetch, log, invalidation) => action(() => [now, random, log]);`, tsx: true } },
  { key: "value-rules", src: { cells: `export const u = () => state<number | undefined>(1);
export const n = () => state<{ s: State<number> }>(null as never);
export const it = () => [1].values();
export const li = (g: Events<number>) => [listen(g, () => {})];
export const g = function* () { yield 1; };
export const ok = () => state<number | null>(null);
export const u2 = () => state<unknown>(1);
export const u3 = () => state<void>(undefined);
export const n2 = () => state<StateCell<number>[]>([]);
export const it2 = () => ({ i: [1].values() });
export const it3 = function* () { yield [1].values(); };`, tsx: true } },
  { key: "cycles", src: { cells: `export const a = (b) => 1;
export const b = (c) => 2;
export const c = (a) => 3;
export const d = (d) => 4;
export const e = (f, a) => 5;
export const f = (e) => 6;`, tsx: true } },
  { key: "reserved", src: { cells: `export const $0 = () => 1;
export const ok = () => { const o = { viewof: 1, mutable: 2, $1: 3 }; return o.viewof; };
export const r = ($2) => 1;`, tsx: true } },
  { key: "lax", src: { cells: `export const r = (): Record<string, number> => ({ a: 1 });
export const s = (r: Record<string, number>) => r.b + 1;
export const t = (r) => r["c"];`, tsx: true }, opts: { strictIndex: false } },
  { key: "strict", src: { cells: `export const r = (): Record<string, number> => ({ a: 1 });
export const s = (r: Record<string, number>) => r.b + 1;
export const t = (r) => r["c"];`, tsx: true } },
];
