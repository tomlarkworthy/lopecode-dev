import type { Attack } from "./harness.ts";
export const attacks: Attack[] = [
  { name: "ctrl-accept", src: "const a = () => { const g = mut({ t: mut([1]), n: 0 }); g.t.push(2); g.n = 3; return freeze(g); };", show: ["a"] },
  { name: "ctrl-reject", src: "const a = () => { const m = mut([1]); return m; };" },
];
