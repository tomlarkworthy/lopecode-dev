// every name a cell may not take, derived from the checker's own sets (core.ts RESERVED_INPUTS, intrinsics.ts
// PRELUDE_FNS, builtinTypeNames()), each tried as a cell, as a local and (types) as a type alias; run with probe.ts
import { RESERVED_INPUTS, builtinTypeNames } from "../../../lite/core.ts";
import { PRELUDE_FNS } from "../../../lite/intrinsics.ts";
const ident = (n: string) => /^[A-Za-z_$][\w$]*$/.test(n);
export const cellNames = [...new Set([...RESERVED_INPUTS, ...PRELUDE_FNS, "viewof", "mutable", "$1", "listen", "reduce", "push", "pop", "History", "Result", "Event", "Card", "Date", "console", "window", "document", "self", "Generators", "Inputs", "html", "md", "require", "invalidation", "visibility", "width", "h", "ss_x", "$ss$x"])].filter(ident);
export const typeNames = [...new Set([...builtinTypeNames(), "History", "Result", "Event", "Card", "Stack", "Row", "Todo"])].filter(ident);
const rows: [string, string][] = [];
for (const n of cellNames) {
  rows.push([`cell ${n}`, `const ${n} = () => 1;`]);
  rows.push([`local ${n}`, `const a = () => { const ${n} = 1; return ${n}; };`]);
}
for (const n of typeNames) rows.push([`type ${n}`, `type ${n} = { readonly v: number };\nconst a = (): ${n} => ({ v: 1 });`]);
rows.push(["type-and-cell-same-name", `type Card = { readonly title: string };\nconst Card = () => (p: Card): Elem => <div>{p.title}</div>;`]);
rows.push(["type-and-cell-same-name-plain", `type total = number;\nconst total = (): total => 3;`]);
rows.push(["param-named-like-prelude", `const a = () => [1].map((state) => state + 1);`]);
export const srcs = rows;
if (import.meta.main) { console.log("cell names tried:", cellNames.join(" ")); console.log("type names tried:", typeNames.join(" ")); }
