// freeze-attack14 class 4: a local, parameter, destructured name, catch binding or function declaration named after a
// prelude function (S2.6 says [prelude-shadow]); each used where the prelude name has a special meaning
import { tyRow, isNum, type Cand } from "./lib14.ts";
const R: Cand[] = [];
const names = ["state", "action", "mut", "freeze", "borrow", "snapshot", "equals", "on", "read", "messageOf", "memo", "cast", "h"];
for (const n of names) {
  R.push(tyRow(`p-local-${n}`, `const g = (): number => { const ${n} = (x: number): number => x + 1; return ${n}(1); };`, (v) => v === 2));
  R.push(tyRow(`p-param-${n}`, `const g = (): number => { const f = (${n}: (x: number) => number): number => ${n}(1); return f((x) => x + 1); };`, (v) => v === 2));
  R.push(tyRow(`p-destr-${n}`, `const g = (): number => { const { ${n} } = { ${n}: (x: number): number => x + 1 }; return ${n}(1); };`, (v) => v === 2));
  R.push(tyRow(`p-catch-${n}`, `const g = (): number => { try { throw 1; } catch (${n}) { return 2; } };`, (v) => v === 2));
  R.push(tyRow(`p-fdecl-${n}`, `const g = (): number => { function ${n}(x: number): number { return x + 1; } return ${n}(1); };`, (v) => v === 2));
  R.push(tyRow(`p-let-${n}`, `const g = (): number => { let ${n}: number = 1; return ${n}; };`, (v) => v === 1));
}
// cast and memo: a local whose call the checker might type as the prelude form
R.push(tyRow("p-cast-lie", `const g = (): number => { const cast = (x: unknown): string => "s"; return cast<number>(1); };`, isNum));
R.push(tyRow("p-memo-lie", `const g = (): number => { const memo = (f: unknown) => "s"; const m = memo((x: number) => x); return m(1); };`, isNum));
R.push(tyRow("p-cell-param", `const k = (): number => 1;\nconst g = (k: number, read: number): number => read;`, isNum));
R.push(tyRow("p-ctl", `const g = (): number => "s";`, isNum, true));
export const cands = R;
export const srcs: [string, string][] = R.map((c) => [c.name, c.src]);
