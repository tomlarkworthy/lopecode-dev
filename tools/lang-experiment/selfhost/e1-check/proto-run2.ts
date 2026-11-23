export const cands = [
  { name: "read-inherited", src: `const a = () => ({ x: 1 } as const);\nconst k = () => "toString";\nconst c = (k: string) => { const m: { [k: string]: number } = { x: 1 }; const v = m[k]; return v === undefined ? "undef" : typeof v; };`, show: ["c"] },
  { name: "read-inherited-in", src: `const k = () => "toString";\nconst c = (k: string) => { const m: { [k: string]: number } = { x: 1 }; return k in m ? "in" : "out"; };`, show: ["c"] },
];
