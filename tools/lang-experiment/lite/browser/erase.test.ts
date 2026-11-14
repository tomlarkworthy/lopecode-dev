// bun lite/browser/erase.test.ts
import { erase } from "./erase.ts";

const cases: [string, string][] = [
  ["export const a = () => ([1, 2]) as const;", "const a = () => ([1, 2]) ;"],
  ["export const b = (x: number) => (x as number) satisfies number;", "const b = (x) => (x ) ;"],
  ["export const c = (xs: number[]) => xs[0]! + 1;", "const c = (xs) => xs[0] + 1;"],
  ["export const d = () => [1, 2] as const;", "const d = () => [1, 2] ;"],
  ["export const e = (x: number) => (x /* as */) as number;", "const e = (x) => (x /* as */) ;"],
  ["export const f = (x: number) => (x) /* as */ as /* as */ number;", "const f = (x) => (x) /* as */ ;"],
];
let fail = 0;
for (const [src, want] of cases) {
  const got = erase(src);
  let parses = true;
  try { new Function(got); } catch { parses = false; }
  if (got !== want || !parses) { fail++; console.log(`FAIL ${src}\n  got  ${got}\n  want ${want}\n  parses ${parses}`); }
}
console.log(`${cases.length - fail} pass, ${fail} fail`);
if (fail) process.exit(1);
