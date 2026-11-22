// 5d. keep mode with a typed array: [mut-capture] tracks what a promise holds by its type, so a promise typed
// Promise<unknown> / Promise<object> holding the cell's typed array is accepted
import { C, L, W } from "./harness.ts";
const OBS = (ty: string) => `\nconst obs = async function* (a: ${ty}) { const v = await a(); yield JSON.stringify(v); ${W}${W}yield JSON.stringify(v); };`;
const leaves: [string, string, string, string][] = [
  ["ta", "const t = new Uint8Array(2); ", "Uint8Array", "t[0] = 1;"],
  ["f64", "const t = new Float64Array(2); ", "Float64Array", "t.fill(2.5);"],
  ["ab", "const t = new Uint8Array(2); const b = t.buffer; ", "ArrayBuffer", "t[1] = 3;"],
  ["sub", "const t = new Uint8Array(4); const s = t.subarray(1, 3); ", "Uint8Array", "t[1] = 9;"],
  ["rec", "const t = new Uint8Array(2); const o = { t }; ", "{ t: Uint8Array }", "t[0] = 4;"],
  ["nmap", "const t = structuredClone(new Map<string, number>()); ", "Map<string, number>", "t.set(\"k\", 1);"],
];
const arg = (ln: string) => (ln === "ab" ? "b" : ln === "sub" ? "s" : ln === "rec" ? "o" : "t");
const erasers: [string, (ty: string) => string][] = [
  ["unknown-ret", (ty) => `const mk = async (x: ${ty}): Promise<unknown> => x; `],
  ["unknown-param", () => `const mk = async (x: unknown): Promise<unknown> => x; `],
  ["object-ret", (ty) => `const mk = async (x: ${ty}): Promise<object> => x; `],
  ["unknown-await", (ty) => `const mk = async (x: ${ty}): Promise<unknown> => { await null; return x; }; `],
];
export const cands = leaves.flatMap(([ln, setup, ty, write]) => erasers.flatMap(([en, er]) => [
  C(`ku-${ln}-${en}-fn`, `const a = () => { ${setup}${er(ty)}const p = mk(${arg(ln)}); ${L(write)}return () => p; };`),
  C(`ku-${ln}-${en}-obs`, `const a = () => { ${setup}${er(ty)}const p = mk(${arg(ln)}); ${L(write)}return () => p; };` + OBS("() => Promise<unknown>"), { twice: ["obs"] }),
  C(`ku-${ln}-${en}-slot`, `const a = () => { ${setup}${er(ty)}const p = mk(${arg(ln)}); ${L(write)}return { p }; };`),
]));
