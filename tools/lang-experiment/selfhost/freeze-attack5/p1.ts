export const srcs: [string, string][] = [
  ["u-plain-alias", "const a = () => { const xs = [0]; const c: readonly number[] = xs; return () => c; };\nconst c = (a) => { a().push(1); return 0; };"],
  ["u-readonly-fresh", "const a = () => { const c: readonly number[] = [0]; return () => c; };\nconst c = (a) => { a().push(1); return 0; };"],
  ["u-data", "const a = () => [0];\nconst c = (a) => { a.push(1); return 0; };"],
  ["u-data-fn-fresh", "const a = () => () => [0];\nconst c = (a) => { a().push(1); return 0; };"],
  ["u-annotated-plain", "const a = () => { const xs = [0]; const t = [xs] as const; return () => t[0]; };\nconst c = (a: () => number[]) => { a().push(1); return 0; };"],
  ["u-annotated-readonly", "const a = () => { const xs = [0]; const t = [xs] as const; return () => t[0]; };\nconst c = (a: () => readonly number[]) => { a().push(1); return 0; };"],
  ["u-unann-tuple-read", "const a = () => { const xs = [0]; const t = [xs] as const; return () => t[0]; };\nconst c = (a) => a().length;"],
  ["u-unann-mut-param-fn", "const a = () => (ys: Mut<number[]>) => ys;\nconst c = (a) => { const r = a([0]); r.push(1); return r.length; };"],
  ["u-unann-ternary", "const a = () => { const xs = [0]; const t = xs.length > 0 ? xs : null; return () => t; };\nconst c = (a) => { const r = a(); if (r) r.push(1); return 0; };"],
  ["u-unann-rec-field", "const a = () => { const xs = [0]; const t = { k: xs } as const; return { get: () => t.k }; };\nconst c = (a) => { a.get().push(1); return 0; };"],
  ["u-unann-two-hops", "const a = () => { const xs = [0]; const t = [xs] as const; return () => t[0]; };\nconst b = (a) => a;\nconst c = (b) => { b().push(1); return 0; };"],
];
