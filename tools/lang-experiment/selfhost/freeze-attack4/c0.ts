// detector controls (checker skipped, ctl: true) plus freeze-attack3's four; k-* is the known T2 root, checker on
import { C, W } from "../freeze-attack3/harness.ts";
import { cands as fa3 } from "../freeze-attack3/c0.ts";
export const cands = [
  ...fa3.map((c: any) => ({ ...c, name: `fa3-${c.name}` })),
  // a let captured by a kept function that writes it when called: the freeze cannot stop a binding write
  C("ctl-let-counter", "const a = () => { let n = 0; return () => { n++; return n; }; };", { ctl: true }),
  // a let written by an un-awaited async helper after the cell returned
  C("ctl-let-async", "const a = () => { let n = 0; const h = async () => { " + W + "n = 5; }; h(); return () => n; };", { ctl: true }),
  // a shared typed-array copy written by one consumer, read by a held function of another
  C("ctl-typed-shared", "const t = () => new Uint8Array(2);\nconst w = (t: Uint8Array) => { (t as any)[0] = 9; return 0; };\nconst r = (t: Uint8Array) => () => t[0];", { ctl: true }),
  // the known T2 root, checker on: silent only with SS_MEASURE_REG=0 (positive control of the switch)
  C("k-h9-r2-kept-returns-field", "const a = () => { const r: { readonly t: Mut<number[]> } = { t: [0] }; return (): Mut<number[]> => r.t; };\nconst c = (a: () => Mut<number[]>) => { a().push(1); return 0; };"),
];
