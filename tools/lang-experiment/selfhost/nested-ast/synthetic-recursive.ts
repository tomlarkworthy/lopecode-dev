// Inputs for verdicts.ts where a recursive alias really holds what each fixed walk looks for (holdsWith: Listener;
// iterIn: an iterator; hidden/mayHide: a function or unknown member; sub: alias against a union holding it), two levels
// inside a cycle and behind a second alias, and one generic recursive alias. Each should be judged as orig judges it.
const T = [
  `type L1 = { next: L2 | null; on: Listener | null }; type L2 = { back: L1; v: number };`,
  `type I1 = { kids: I2[]; it: Iterator<number> | null }; type I2 = { up: I1 | null };`,
  `type F1 = { kids: F2[]; f: (() => number) | null }; type F2 = { up: F1 | null; u: unknown };`,
  `type G<T> = { v: T; next: G<T> | null };`,
  `type U1 = { k: "a"; next: U2 | null }; type U2 = { k: "b"; prev: U1 } | number;`,
].join("\n");
const cells = [
  `const mk = (ev: Events<number>, s: State<number>): L1 => ({ next: { back: { next: null, on: null }, v: 1 }, on: on(ev, (x) => s.set(x)) });`,
  `const ret = (ev: Events<number>, s: State<number>): L2 => ({ back: { next: null, on: on(ev, (x) => s.set(x)) }, v: 1 });`,
  `const iter = (x: I1): number => { const k = x.kids[0]; return k !== undefined && k.up !== null && k.up.it !== null ? 1 : 0; };`,
  `const hide = (x: F1): number => { const k = x.kids[0]; if (k === undefined || k.up === null) return 0; const f = k.up.f; return f !== null ? f() : 0; };`,
  `const hideU = (x: F2): number => { const u = x.u; return typeof u === "number" ? u : 0; };`,
  `const gen = (g: G<string>): string => g.next !== null ? g.next.v : g.v;`,
  `const genBad = (g: G<string>): number => g.v;`,
  `const subU = (x: U1): U2 => x.next ?? 1;`,
  `const subBad = (x: U2): U1 => x;`,
  `const keepFn = (x: F1, s: State<number>) => action(() => { const f = x.f; if (f !== null) s.set(f()); });`,
];
export const SYNTHETIC_REC = cells.map((c, i) => ({ id: `rec-${i}`, src: `${T}\n${c}`, tsx: false }));
