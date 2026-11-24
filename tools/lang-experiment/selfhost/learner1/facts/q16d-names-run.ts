// the reserved-name sites not covered by q16-names.ts (md-cell.ss.ts mdSyntax: a $ in a cell name, h bound in a JSX
// cell, reserved text), and a reader of each odd name q16 accepted, run: does the reader get the cell or the global?
import { toSrcs, type Cand } from "./h.ts";
const R = (n: string): Cand => ({ name: `run-cell-named-${n}`, src: `const ${n} = () => 5;\nconst reader = (${n}: number) => ${n} + 1;`, show: ["reader"] });
export const cands: Cand[] = [
  { name: "cell-name-with-dollar", src: `const x$ref = () => 1;` },
  { name: "h-local-in-jsx-cell", src: `const v = () => { const h = 1; return <span>{h}</span>; };` },
  { name: "h-local-in-non-jsx-cell", src: `const v = () => { const h = 1; return h + 1; };`, show: ["v"] },
  { name: "reserved-text-in-string", src: `const a = () => "/*ss-*/";` },
  ...["Date", "window", "document", "console", "width", "md", "self", "require", "Inputs", "listen", "reduce"].map(R),
  { name: "run-type-and-cell-same-name", src: `type Card = { readonly title: string };\nconst Card = () => (p: Card): Elem => <div>{p.title}</div>;\nconst page = (Card: (p: Card) => Elem) => <div><Card title="t" /></div>;`, show: ["page"] },
];
export const srcs = toSrcs(cands);
