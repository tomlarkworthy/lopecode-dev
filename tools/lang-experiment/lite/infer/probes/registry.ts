// Modules for rg-diff.ts that reach the declaration forms the corpus has fewer than five of (rg-diff.ts --census):
// generics with constraints and defaults, recursive and cyclic aliases and interfaces, merged interfaces, overloads,
// index signatures, tuples with rest, optional and named members, operators, literal unions, function types, declare
// values with markers and flags, classes, typeof queries, qualified names, type parameter shadowing. Cells are
// `() => (x: T) => ...` so the checker converts the parameter types (an injected parameter that names no cell is not).
import type { Sources } from "../../core.ts";

const generics = `type Box<T> = { v: T };
type Pair<A, B = number> = [A, B];
type Lim<T extends string> = T[];
interface Wrap<T> { w: T; get(): T }
interface Wrap2<T> extends Wrap<T> { x: number }
type BoxNum = Box<number>;
type Bad = Box;
type Bad2 = Box<number, string>;
type Nest<T> = Box<Box<T>>;
export const a = () => () => (b: Box<number>): number => b.v;
export const b2 = () => () => (w: Wrap<string>): string => w.get();
export const c = () => () => (w: Wrap2<string>): number => w.x;
export const d = () => () => (x: Bad): unknown => x;
export const e = () => () => (p: Pair<string>): string => p[0];
export const f = <T,>(x: T): T => x;
export const g = () => () => (x: Lim<"a">): number => x.length;
export const h = () => () => (n: Nest<number>): number => n.v.v;
export const i = () => () => (n: BoxNum, m: Bad2): number => n.v;
export const j = <T extends number>(x: T): T => x;
export const k = <T = string>(x: T): T => x;`;

const recursive = `type List = { v: number; next: List | null };
type Self = Self;
type Loop1 = Loop2;
type Loop2 = Loop1;
type Deep = { a: { b: { c: { d: { e: { f: { g: Deep } } } } } } };
interface Tree { kids: Tree[]; v: number }
interface Cyc extends Cyc { a: number }
interface CA extends CB { a: number }
interface CB extends CA { b: string }
interface Callable { (x: number): string; n: number }
interface Ext extends Callable { m: boolean }
interface NotObj extends Lits { z: number }
type Lits = "a" | "b";
type Loud = { a: Nope; b: number };
type LoudRef = Loud;
export const loud = () => () => (x: Loud, y: { b: number }): number => (x === y ? 1 : x.b);
export const loud2 = () => () => (x: LoudRef): { b: number } => x;
export const len = () => () => (l: List): number => (l.next === null ? 1 : 2);
export const h = () => () => (t: Tree): number => t.kids.length + t.v;
export const i = () => () => (c: Cyc): number => c.a;
export const j = () => () => (c: CA): string => c.b + c.a;
export const j2 = () => () => (c: CB): string => c.b;
export const k = () => () => (s: Self): number => 1;
export const l = () => () => (x: Loop1): number => 1;
export const m = () => () => (f: Callable): string => f(1);
export const n = () => () => (e: Ext): string => e(2);
export const o = () => () => (d: Deep): Deep => d.a.b.c.d.e.f.g;
export const p = () => () => (x: NotObj): number => x.z;
export const q = () => () => (a: List, b: Tree): boolean => a.v === b.v;`;

const merged = `interface M { a: number }
interface M { b: string }
interface F { b: string }
interface M2<T> { a: T }
interface M2<T> { b: T[] }
export const o = () => () => (m: M): string => m.b + m.a;
export const f = () => () => (x: F): string => x.b;
export const m2 = () => () => (x: M2<number>): number => x.a + x.b.length;`;
const mergedForeign = `interface F { a: number }
interface G { a: number }
interface G { c: boolean }
declare const fg: G;
declare const ff: F;`;

const decls = `export const a = (ov: unknown, eff: unknown) => 1;
export const b = (flagged, lv) => 2;
export const c = (rest, opt, destr, untyped, noAnn) => 3;
export const d = (rest: (...xs: number[]) => number) => rest(1, 2);
export const e = (o: O): number => o.m(1);
export const f = (pv) => pv;
export const g = (ov) => ov(1);`;
const declsForeign = `/** pure */ declare function ov(x: number): number;
declare function ov(x: string): string;
/** effect */ declare const eff: () => void;
// @mutates
declare const flagged: { push(x: number): void };
declare const noAnn;
declare let lv: number;
/** pure */ declare const pv: number, pw: string;
declare function rest(...xs: number[]): number;
declare function restBad(...xs: number): number;
declare function opt(a?: number): number;
declare function destr({ a }: { a: number }, [b]: [string]): number;
declare function untyped(a): number;
declare function gen<T extends number>(x: T): T;
interface O { m(x: number): number; m(x: string): string; /** @banned */ z(): void; /** @view @fresh */ y(): number[] }
declare class DC { x: number }
export const notDecl = 1;
type Ali = O;`;

const forms = `type Ix = { [k: string]: number };
type IxN = { [k: number]: string };
type Tup = [number, string];
type TupR = [number, ...string[]];
type TupO = [number, string?];
type TupN = [a: number, b: string];
type RO = readonly number[];
type ROT = readonly [number, string];
type KO = keyof Ix;
type Lits = "a" | "b" | 1 | -2 | true;
type Tmpl = \`x\`;
type Big = 1n;
type FnT = (a: number, b?: string, ...r: boolean[]) => void;
type FnR = (...r: number) => void;
type FnD = ({ a }: { a: number }, [b]: [string]) => number;
type FnU = (a) => number;
type Q = typeof Math;
type QN = Ix.B;
type Ctor = { new (x: number): Ctor2 };
type Ctor2 = { v: number };
type Comp = { ["k"]: number; 1: string; "q": boolean };
type Acc = { get x(): number };
type RecT = Record<string, number>;
type RecB = Record<number, string>;
type Act = Action<[number]>;
type ActB = Action;
type One = Mut<number[], string>;
type VO = ValueOf<number>;
type J = Js;
type U = Undeclared;
type I2 = number & string;
type Cond = number extends string ? 1 : 2;
type Obj = object;
type Sym = symbol;
type Nev = never;
type BigT = bigint;
type Und = undefined;
type Par = (number | string)[];
type Opt = { a?: number; readonly b: string };
type Meth = { m(): void; m(x: number): void; n?: () => void };
type CallS = { (x: number): string; <T>(y: T): T };
export const a = () => (x: Ix): number => x.k ?? 0;
export const b = () => (t: Tup, r: TupR, o: TupO, n: TupN): number => t[0];
export const c = () => (r: RO, k: KO, l: Lits): number => r.length;
export const d = () => (f: FnT, g: FnR, h: FnD, u: FnU): number => 1;
export const e = () => (q: Q, c: Ctor, cp: Comp, ac: Acc): number => 1;
export const f = () => (r: RecT, rb: RecB, a: Act, ab: ActB, o: One, v: VO, j: J, u: U, i: I2, cd: Cond): number => 1;
export const g = () => (o: Obj, s: Sym, b: BigT, u: Und, p: Par, op: Opt, m: Meth, cs: CallS): number => 1;
export const h = () => (x: Tmpl, y: Big, z: ROT, w: QN): number => 1;`;

const shadow = `type G<T> = <T>(x: T) => T;
type H<T> = { f: <U>(x: U, y: T) => U; g: <T>(x: T) => T };
interface S<T> { f<T>(x: T): T; g(x: T): T }
type MA = Mut<number[]>;
type MB = MA;
type BA = Borrowed<number[]>;
type NM = MB[];
export const s1 = <T,>(x: T, f: <T>(y: T) => T): T => f(x);
export const s2 = () => () => (g: G<number>, h: H<string>, s: S<boolean>): string => h.f("a", "b");
export const mu = () => () => (m: MA): void => { m.push(1); };
export const mv = () => () => (m: MB): number => m.length;
export const mw = () => () => (b: BA, n: NM): number => b.length;
export const tq = () => () => (x: number) => { const y: typeof x = x; return y; };
export const tq2 = () => () => (x: number, f: (y: typeof x) => number): number => f(x);
export const tq3 = () => () => (x: number) => { const z: typeof w = 1; return z; };
class K { }`;

const exported = `export type EA = { a: number };
export interface EI { b: string }
export type Date = number;
type Tm = \`a\${string}\`;
export const a = () => (x: EA, y: EI): string => y.b + x.a;
export const b = () => (t: Tm): number => 1;`;
const otherForms = `type OM = { m?(): void };
type NT = { p };
type Set1 = { set x(v: number) };
export const a = () => () => (x: OM, y: NT): number => 1;`;

const noRet = `export const a = (nr) => 1;`;
const noRetForeign = `declare function nr(x: number);`;

export const REGISTRY_PROBES: { key: string; src: Sources; opts?: { strictIndex?: boolean } }[] = [
  { key: "generics", src: { cells: generics } },
  { key: "recursive", src: { cells: recursive } },
  { key: "merged", src: { cells: merged, foreign: mergedForeign } },
  { key: "decls", src: { cells: decls, foreign: declsForeign } },
  { key: "forms", src: { cells: forms } },
  { key: "forms-lax", src: { cells: forms }, opts: { strictIndex: false } },
  { key: "forms-tsx", src: { cells: forms, tsx: true } },
  { key: "shadow", src: { cells: shadow } },
  { key: "exported", src: { cells: exported } },
  { key: "other-forms", src: { cells: otherForms } },
  { key: "no-return-type", src: { cells: noRet, foreign: noRetForeign } },
];
