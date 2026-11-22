// 5b. a promise among a published function's captures whose value reaches something the cell still writes:
// indirections around [mut-capture]'s "holds" tracking. keep mode (freeze.ts walk(x, true)) copies no leaf.
import { C, L, W } from "./harness.ts";
const mk = (x: string, ty: string) => `const mk = async (x: ${ty}) => x; `;
const leaves: [string, string, string, string][] = [
  ["ta", "const t = new Uint8Array(2); ", "Uint8Array", "t[0] = 1;"],
  ["nmap", "const t = structuredClone(new Map<string, number>()); ", "Map<string, number>", "t.set(\"k\", 1);"],
  ["ab", "const t = new ArrayBuffer(2); ", "ArrayBuffer", "new Uint8Array(t)[0] = 1;"],
];
const holders: [string, (ty: string) => string][] = [
  ["mk-arg", (ty) => `const mk = async (x: ${ty}) => x; const p = mk(t); `],
  ["mk-rec-arg", (ty) => `const mk = async (x: { t: ${ty} }) => x; const p = mk({ t }); `],
  ["mk-arr-arg", (ty) => `const mk = async (x: ${ty}[]) => x; const p = mk([t]); `],
  ["mk-map-arg", (ty) => `const mk = async (x: Map<string, ${ty}>) => x; const p = mk(new Map([["k", t]])); `],
  ["mk-two-step", (ty) => `const mk = async (x: ${ty}) => x; const id = (x: ${ty}) => x; const p = mk(id(t)); `],
  ["mk-wrap-later", (ty) => `const mk = async (x: { t: ${ty} }) => x; const o = { t }; const p = mk(o); `],
  ["then-arg", (ty) => `const p = Promise.resolve(0).then((z: number) => z); const q = p.then(async () => 0); `],
  ["all-arg", (ty) => `const mk = async (x: ${ty}) => x; const p = Promise.all([mk(t)]); `],
  ["mk-gen", (ty) => `const mk = async (x: ${ty}) => { ${W} return x; }; const p = mk(t); `],
  ["mk-await", (ty) => `const mk = async (x: ${ty}) => { const y = await Promise.resolve(x); return y; }; const p = mk(t); `],
];
export const cands = leaves.flatMap(([ln, setup, ty, write]) => holders.flatMap(([hn, hold]) => [
  C(`kp-${ln}-${hn}-fn`, `const a = () => { ${setup}${hold(ty)}${L(write)}return () => p; };`),
  C(`kp-${ln}-${hn}-rec-fn`, `const a = () => { ${setup}${hold(ty)}${L(write)}return { g: () => p }; };`),
  C(`kp-${ln}-${hn}-obs`, `const a = () => { ${setup}${hold(ty)}${L(write)}return () => p; };\nconst obs = async function* (a: () => Promise<unknown>) { const v = await a(); yield JSON.stringify([v instanceof Map ? v.size : v]); ${W}${W}yield JSON.stringify([v instanceof Map ? v.size : v]); };`, { twice: ["obs"] }),
]));
