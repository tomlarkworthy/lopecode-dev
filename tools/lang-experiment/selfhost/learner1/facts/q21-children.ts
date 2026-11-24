import { toSrcs, type Cand } from "./h.ts";
const C = (name: string, body: string, params = "(flag: boolean, xs: readonly string[])"): Cand => ({ name, src: `const flag = () => true;\nconst xs = () => (): readonly string[] => ["a", "b"];\nconst v = ${params.replace("xs: readonly string[]", "xs: () => readonly string[]")} => ${body};`, show: ["v"] });
export const cands: Cand[] = [
  C("accept-child-elem-or-array", `<div>{flag ? <span>one</span> : xs().map((x) => <span key={x}>{x}</span>)}</div>`),
  C("accept-child-and-and", `<div>{flag && <span>shown</span>}</div>`),
  C("accept-child-null-undefined", `<div>{null}{undefined}<span>x</span></div>`),
  C("accept-child-conditional-null", `<div>{flag ? null : <span>x</span>}</div>`),
  C("reject-child-array-of-strings", `<div>{xs()}</div>`),
  C("accept-child-array-of-strings-wrapped", `<div>{xs().map((x) => <span key={x}>{x}</span>)}</div>`),
  C("reject-child-array-with-null", `<div>{xs().map((x) => (x === "a" ? null : <span key={x}>{x}</span>))}</div>`),
  C("accept-child-filter-then-map", `<div>{xs().filter((x) => x !== "a").map((x) => <span key={x}>{x}</span>)}</div>`),
  C("accept-text-and-holes", `<span>n = {xs().length} of {"many"} {flag}</span>`),
  C("reject-nested-array-child", `<div>{[xs().map((x) => <span key={x}>{x}</span>)]}</div>`),
  { name: "accept-if-branches-return-different-jsx", src: `const flag = () => true;\nconst v = (flag: boolean) => { if (flag) return <span>yes</span>; return <div><p>no</p></div>; };`, show: ["v"] },
  { name: "accept-elem-local-then-child", src: `const flag = () => false;\nconst v = (flag: boolean) => { const extra = flag ? <strong>!</strong> : null; return <div>{extra}<span>x</span></div>; };`, show: ["v"] },
];
export const srcs = toSrcs(cands);
