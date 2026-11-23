export const srcs: [string, string][] = [
  ["async-generic-T-promise", `const g = async () => { const f = async <T,>(x: T): Promise<T> => x; const y = await f(Promise.resolve(5)); return typeof y; };`],
  ["async-generic-id-promise", `const g = async () => { const f = async <T,>(x: T) => x; const y = await f(Promise.resolve(5)); return typeof y; };`],
  ["async-pp-cell", `const p = async (): Promise<Promise<number>> => Promise.resolve(5);\nconst g = (p: Promise<number>) => typeof p;`],
  ["key-comp-union-tag", `const g = () => { const C = (p: { readonly key?: "a" }) => <div>{p.key === undefined ? "none" : p.key}</div>; return <C key={"b"} />; };`],
];
