export const srcs: [string, string][] = [
  ["key-comp-read", `const g = () => { const C = (p: { readonly key?: { readonly n: number } }) => <div>{p.key === undefined ? "none" : typeof p.key.n}</div>; return <div><C key={5} /></div>; };`],
  ["key-comp-fn", `const g = () => { const C = (p: { readonly n: number }) => <div>{p.n}</div>; return <C n={1} key={1} />; };`],
];
