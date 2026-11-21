// bun selfhost/typed-imports/forge2.ts: forges the text comparison cannot see (a closure, the runtime inputs), how
// Function.prototype.toString reads a Proxy and a bound function, the indirect routes by which an action could be
// seeded as a value, and the gate over a module holding `import type`.
import { build, gateInput, type Built } from "./rt.ts";
import { gate } from "./gate.ts";
import { checkProgram } from "./ti-link.ts";

const verdict = (b: Built) => Object.fromEntries([...gate(gateInput(b)).verdicts].map(([k, v]) => [k, v.ss ? "SoundScript" : `another language (${v.why})`]));
const redefine = (b: Built, m: string, n: string, inputs: string[], fn: unknown) => {
  for (const v of b.runtime._variables) if (v._module === b.modules.get(m) && v._name === n) { v.define(n, inputs, fn); return; }
  throw new Error(`no ${m}.${n}`);
};
const T = Function.prototype.toString;

// 1. same text, a closure that shadows a free name
{
  const b = build([{ name: "@b", cells: "export const n = () => Math.max(1, 2);" }, { name: "@a", cells: "const m = (k) => k * 2;", imports: [{ local: "k", imported: "n", from: "@b" }] as any }], "typed");
  const d = b.compiled.get("@b")!.find((x) => x.name === "n")!;
  const forged = (0, eval)(`(() => { const Math = { max: () => "s" }; return (${d.definition}); })()`);
  redefine(b, "@b", "n", d.inputs, forged);
  console.log(`closure shadowing Math: text equal ${T.call(forged) === d.definition}; @b.n = ${JSON.stringify(await b.value("@b", "n"))}; @a.m = ${await b.value("@a", "m")}; gate ${JSON.stringify(verdict(b))}`);
}
// 2. a forged runtime input: ss_h, the JSX builder an Elem cell takes
{
  const b = build([{ name: "@b", cells: "export const el = () => <div>ok</div>;" }], "typed");
  redefine(b, "@b", "ss_h", [], () => () => "forged");
  console.log(`ss_h redefined: @b.el = ${JSON.stringify(await b.value("@b", "el"))}; gate ${JSON.stringify(verdict(b))}`);
}
// 3. Proxy and bound function
{
  const f = function _n() { return 1; };
  console.log(`Function.prototype.toString of a Proxy: ${JSON.stringify(T.call(new Proxy(f, {})))}; of a bound function: ${JSON.stringify(T.call(f.bind(null)))}`);
}
// 4. an action through an alias, an interface, a record, and an Elem
const ROUTES: [string, string, string][] = [
  ["alias", "export type Go = Action<[], void>;\nexport const s = () => state(1);\nexport const go = (s: State<number>): Go => action(() => s.set(2));", "go"],
  ["record of an alias", "export type Box = { readonly go: Action<[], void> };\nexport const s = () => state(1);\nexport const box = (s: State<number>): Box => ({ go: action(() => s.set(2)) });", "box"],
  ["interface", "export interface Box { readonly go: Action<[], void> }\nexport const s = () => state(1);\nexport const box = (s: State<number>): Box => ({ go: action(() => s.set(2)) });", "box"],
  ["inferred record", "export const s = () => state(1);\nexport const box = (s: State<number>) => ({ go: action(() => s.set(2)) });", "box"],
  ["Elem with an action", "export const s = () => state(1);\nexport const btn = (s: State<number>) => <button onClick={action(() => s.set(1))}>x</button>;", "btn"],
];
for (const [what, src, name] of ROUTES) {
  const P = checkProgram([{ name: "@b", cells: src, outside: [], imports: [] }, { name: "@a", cells: `const m = (${name}) => 1;`, outside: [], imports: [{ local: name, imported: name, from: "@b", view: false }] }]);
  const r = P.modules.get("@b")!, e = r.exports.find((x) => x.name === name);
  const c = r.result.cells.find((x) => x.name === name)!, a = P.modules.get("@a")!.result.cells.find((x) => x.name === "m")!;
  console.log(`${what}: @b.${name} ${c.status}${c.errors.map((x) => ` [${x.rule}]`).join("")}; export kind ${e?.kind} type ${e?.t === null ? "null" : "set"}; @a.m ${a.status}${a.errors.map((x) => ` [${x.rule}] ${x.msg}`).join("")}`);
}
// 5. the gate over a module holding `import type`
{
  const C = "export type P = { readonly x: number };\nexport const p = (): P => ({ x: 1 });";
  const A = 'import type { P } from "@c";\nconst f = (p: P) => p.x + 1;';
  const b = build([{ name: "@c", cells: C }, { name: "@a", cells: A, imports: [{ local: "p", imported: "p", from: "@c" }] as any }], "typed");
  console.log(`import type: @a.f = ${await b.value("@a", "f")}; variables ${b.compiled.get("@a")!.map((d) => d.name)}; gate ${JSON.stringify(verdict(b))}; errors ${JSON.stringify(b.errors)}`);
}
