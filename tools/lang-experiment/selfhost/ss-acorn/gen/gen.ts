// Generates the typed tree of soundscript-acorn from out/node-types.json (the 155 node types on the AST of acorn and
// the TS plugin) and out/census.json (their fields: census + acorn.d.ts):
//   ss/acorn-types.ss.ts  one record per node type, each with nid start end line; a child field is AstNode,
//                         AstNode | null, AstNode[] or (AstNode | null)[]; plus Other, the typed catch-all row
//   ss/acorn-kids.ss.ts   childrenOf(n): the children with their keys, in acorn's key order, as GROUP cells of at most
//                         21 cases each (the owner's ruling on cell size) and one cell that asks each group in turn
//   out/table.json        per type, [key, how, nullable] in that order: what the shell needs to build a node
// A field seen absent, undefined or null is nullable: the shell gives null (a list: []). A Literal's value is null for a
// regex or a bigint (regex and bigint are kept). Run: bun gen/gen.ts
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const HERE = join(import.meta.dir, "..");
const types: string[] = Object.keys(JSON.parse(readFileSync(join(HERE, "out/node-types.json"), "utf8")).types).sort();
const census: Record<string, { count: number; fields: Record<string, string[]> }> = JSON.parse(readFileSync(join(HERE, "out/census.json"), "utf8"));
const orders: Record<string, Record<string, number>> = JSON.parse(readFileSync(join(HERE, "out/keyorder.json"), "utf8"));
const SKIP = ["type", "start", "end", "loc", "extra"];
type How = "node" | "list" | "value";
type Field = { key: string; how: How; nullable: boolean; ts: string };
const RECORDS: Record<string, string> = { "Literal.regex": "{ pattern: string; flags: string }", "TemplateElement.value": "{ raw: string; cooked: string | null }" };
export const problems: string[] = [];
// a key that holds a node (or a node list) on every type where the census saw a value under it: a field the census saw
// only null under that key is taken to be one too (TSMethodSignature.typeParameters), as acorn.d.ts declares the ES ones
const keyHow = new Map<string, Set<string>>();
for (const e of Object.values(census)) for (const [k, ks] of Object.entries(e.fields)) for (const x of ks) if (!["null", "undefined", "absent"].includes(x)) { if (!keyHow.has(k)) keyHow.set(k, new Set()); keyHow.get(k)!.add(x === "node" ? "node" : x.endsWith("[]") ? "list" : "value"); }
export const inferred: string[] = [];
function fieldsOf(t: string): Field[] {
  const out: Field[] = [];
  for (const [key, ks] of Object.entries(census[t]?.fields ?? {})) {
    if (SKIP.includes(key)) continue;
    const nullable = ks.some((k) => k === "null" || k === "undefined" || k === "absent");
    const core = ks.filter((k) => k !== "null" && k !== "undefined" && k !== "absent");
    if (core.length === 1 && core[0] === "node") out.push({ key, how: "node", nullable, ts: nullable ? "AstNode | null" : "AstNode" });
    else if (core.length && core.every((k) => k === "node[]" || k === "node?[]")) out.push({ key, how: "list", nullable, ts: core.includes("node?[]") ? "(AstNode | null)[]" : "AstNode[]" });
    else if (!core.length) {
      const h = keyHow.get(key);
      const how = h?.size === 1 ? ([...h][0] as How) : "value";
      if (how !== "value") inferred.push(`${t}.${key} as ${how}`);
      out.push({ key, how, nullable: true, ts: how === "node" ? "AstNode | null" : how === "list" ? "(AstNode | null)[]" : "null" });
    }
    else {
      if (core.some((k) => k === "node" || k.endsWith("[]"))) { problems.push(`${t}.${key}: mixed ${core.join(" ")}`); continue; }
      const ts = core.map((k) => (k === "regexp" || k === "bigint" ? "null" : k === "record" ? RECORDS[`${t}.${key}`] ?? (problems.push(`${t}.${key}: a record with no type`), "null") : k));
      out.push({ key, how: "value", nullable, ts: [...new Set([...ts, ...(nullable ? ["null"] : [])])].join(" | ") });
    }
  }
  // acorn's key order, merged over every order seen: a key goes before another when more nodes have it so (a type
  // whose nodes disagree, ArrowFunctionExpression, gets the majority order; out/gen.txt lists them)
  const keys = out.map((f) => f.key);
  const count = new Map<string, number>();
  for (const [seq, n] of Object.entries(orders[t] ?? {})) {
    const ks = seq.split(",").filter((k) => keys.includes(k));
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) count.set(`${ks[i]}<${ks[j]}`, (count.get(`${ks[i]}<${ks[j]}`) ?? 0) + n);
  }
  const before = new Map(keys.map((k) => [k, new Set<string>()]));
  for (const [p, n] of count) {
    const [a, b] = p.split("<") as [string, string];
    const back = count.get(`${b}<${a}`) ?? 0;
    if (n > back) before.get(b)!.add(a);
    if (back && n > back && out.find((f) => f.key === a)!.how !== "value" && out.find((f) => f.key === b)!.how !== "value") problems.push(`${t}: ${a} before ${b} on ${n} nodes, after it on ${back}; ${a} first`);
  }
  const sorted: Field[] = [];
  const left = new Set(keys);
  while (left.size) {
    const next = [...left].find((k) => [...before.get(k)!].every((b) => !left.has(b) || b === k));
    if (!next) { problems.push(`${t}: key orders conflict`); sorted.push(...out.filter((f) => left.has(f.key))); break; }
    sorted.push(out.find((f) => f.key === next)!); left.delete(next);
  }
  return sorted;
}
const spec = Object.fromEntries(types.map((t) => [t, fieldsOf(t)]));
const L: string[] = [`// GENERATED by selfhost/ss-acorn/gen/gen.ts from out/node-types.json and out/census.json; do not edit.
// ${types.length} node types (every type acorn 8 and @sveltejs/acorn-typescript name on the AST of their source) + Other.
// nid is the node's number in a pre-order walk (the shell numbers them), line is loc.start.line.
`];
for (const t of types) L.push(`export type ${t} = { ${[`type: "${t}"`, "nid: number", "start: number", "end: number", "line: number", ...spec[t]!.map((f) => `${f.key}: ${f.ts}`)].join("; ")} };`);
L.push(`export type OtherField = { key: string; list: boolean; nodes: (AstNode | null)[] };
export type OtherProp = { key: string; value: string | number | boolean | null };
// a node whose type is not above, or that has a field its record does not declare: its acorn type in kind, its
// child fields and its other fields as lists
export type Other = { type: "Other"; nid: number; start: number; end: number; line: number; kind: string; fields: OtherField[]; props: OtherProp[] };
export type AstNode =\n  | ${[...types, "Other"].join("\n  | ")};
export type Comment = { block: boolean; text: string; start: number; end: number };
export type Ast = { program: AstNode; comments: Comment[]; src: string; count: number };
// a parse: the tree, or acorn's error as a value
export type Parse = { ok: true; ast: Ast } | { ok: false; message: string; pos: number; line: number; column: number };
export type Kid = { key: string; node: AstNode };
`);
writeFileSync(join(HERE, "ss/acorn-types.ss.ts"), L.join("\n"));

// childrenOf in groups
const withKids = types.filter((t) => spec[t]!.some((f) => f.how !== "value"));
const PER = 21;
const groups: string[][] = [];
for (let i = 0; i < withKids.length; i += PER) groups.push(withKids.slice(i, i + PER));
const K: string[] = [`// GENERATED by selfhost/ss-acorn/gen/gen.ts; do not edit. childrenOf(n): the children of n, each with the key of the
// field holding it, in acorn's key order. A null child or hole is left out. ${withKids.length} node types have child
// fields; each group cell handles ${PER} of them and gives null for any other type.
export const kidOne = () => (key: string, x: AstNode | null): Kid[] => (x === null ? [] : [{ key, node: x }]);
export const kidMany = (kidOne) => (key: string, xs: (AstNode | null)[]): Kid[] => xs.flatMap((x) => kidOne(key, x));`];
groups.forEach((g, gi) => {
  K.push(`export const kidsGroup${gi + 1} = (kidOne, kidMany) => (n: AstNode): Kid[] | null => {`, `  switch (n.type) {`);
  for (const t of g) {
    const parts = spec[t]!.filter((f) => f.how !== "value").map((f) => f.how === "list" ? `...kidMany("${f.key}", n.${f.key})` : f.nullable ? `...kidOne("${f.key}", n.${f.key})` : `{ key: "${f.key}", node: n.${f.key} }`);
    K.push(`    case "${t}": return [${parts.join(", ")}];`);
  }
  K.push(`    default: return null;`, `  }`, `};`);
});
const gs = groups.map((_, i) => `kidsGroup${i + 1}`);
K.push(`export const childrenOf = (kidMany, ${gs.join(", ")}) => (n: AstNode): Kid[] =>`, `  n.type === "Other" ? n.fields.flatMap((f) => kidMany(f.key, f.nodes)) : ${gs.map((g) => `${g}(n)`).join(" ?? ")} ?? [];`, ``);
writeFileSync(join(HERE, "ss/acorn-kids.ss.ts"), K.join("\n"));
writeFileSync(join(HERE, "out/table.json"), JSON.stringify(Object.fromEntries(types.map((t) => [t, spec[t]!.map((f) => [f.key, f.how === "node" ? 1 : f.how === "list" ? 2 : 0, f.nullable ? 1 : 0])]))));
console.log(`${types.length} records + Other; ${withKids.length} with children in ${groups.length} groups; ${Object.values(spec).reduce((s, f) => s + f.length, 0)} fields; problems: ${problems.length ? problems.join("; ") : "none"}`);
console.log(`fields seen only null, taken as children because the key holds one on other types: ${inferred.join(", ") || "none"}`);
