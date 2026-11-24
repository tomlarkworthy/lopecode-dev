import { callN, toSrcs, type Cand } from "./h.ts";
const EV = `type Ev = { readonly kind: "dep"; readonly n: number } | { readonly kind: "wd"; readonly n: number } | { readonly kind: "reset" };\n`;
export const cands: Cand[] = [
  { name: "accept-exhaustive-switch-returns", src: EV + `const step = () => (s: number, e: Ev): number => {
  switch (e.kind) {
    case "dep": return s + e.n;
    case "wd": return s - e.n;
    case "reset": return 0;
  }
};
const r = (step: (s: number, e: Ev) => number) => step(step(10, { kind: "dep", n: 5 }), { kind: "wd", n: 3 });`, show: ["r"] },
  { name: "reject-non-exhaustive-switch", src: EV + `const step = () => (s: number, e: Ev): number => {
  switch (e.kind) {
    case "dep": return s + e.n;
    case "wd": return s - e.n;
  }
};` },
  { name: "accept-switch-default-throw", src: EV + `const step = () => (s: number, e: Ev): number => {
  switch (e.kind) {
    case "dep": return s + e.n;
    default: throw new Error("bad");
  }
};`},
  { name: "reject-switch-fallthrough", src: `const f = () => (k: number): number => { let x = 0; switch (k) { case 1: x = 1; case 2: x = 2; break; } return x; };` },
  { name: "reject-switch-case-declaration", src: `const f = () => (k: number): number => { switch (k) { case 1: const y = 2; return y; default: return 0; } };` },
  { name: "accept-if-chain-narrowing", src: EV + `const step = () => (s: number, e: Ev): number => { if (e.kind === "dep") return s + e.n; if (e.kind === "wd") return s - e.n; return 0; };` },
  { name: "accept-early-return-in-action-taken", src: `const n = (): StateCell<number> => state(0);
const draft = (): StateCell<string> => state("");
const add = (n: State<number>, draft: State<string>) => action(() => { if (read(draft) === "") return; n.update((x) => x + 1); });`,
    drive: callN((p) => p.value("add"), 2, ["n"]) },
  { name: "accept-early-return-in-action-not-taken", src: `const n = (): StateCell<number> => state(0);
const draft = (): StateCell<string> => state("x");
const add = (n: State<number>, draft: State<string>) => action(() => { if (read(draft) === "") return; n.update((x) => x + 1); });`,
    drive: callN((p) => p.value("add"), 2, ["n"]) },
];
export const srcs = toSrcs(cands);
