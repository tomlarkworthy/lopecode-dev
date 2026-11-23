export const srcs: [string, string][] = [
  ["pp-cell-as-promise", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`],
  ["pp-cell-as-number", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p: number) => typeof p;`],
  ["pp-cell-unann-consumer", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p) => typeof p;`],
  ["plain-async-cell-as-promise", `const p = async () => 5;\nconst g = (p: Promise<number>) => typeof p;`],
  ["resolve-cell-as-promise", `const p = async () => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`],
  ["generic-cell-as-promise", `const p = async () => { const f = async <T,>(x: T) => x; return f(Promise.resolve(5)); };\nconst g = (p: Promise<number>) => typeof p;`],
  ["sync-cell-promise-ret", `const p = () => Promise.resolve(Promise.resolve(5));\nconst g = (p: Promise<number>) => typeof p;`],
];
