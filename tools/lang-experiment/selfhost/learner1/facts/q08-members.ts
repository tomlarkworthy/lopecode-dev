// derives every declared member of the intrinsics from INTRINSIC_DECLS (parsed with lite's parser) and makes one probe
// per member read, plus one per common TypeScript member the declarations leave out (ABSENT); run with probe.ts
import { parseTree } from "../../../lite/acorn/index.ts";
import { INTRINSIC_DECLS } from "../../../lite/intrinsics.ts";
const text = INTRINSIC_DECLS;
const ast: any = (parseTree(text, false) as any).ast.program;
const flagsAt = (start: number) => { const pre = text.slice(Math.max(0, text.lastIndexOf("\n", start - 1)), start); return [...pre.matchAll(/@(\w+)/g)].map((m) => m[1]); };
const nameOf = (m: any) => m.key?.name ?? (m.type === "TSConstructSignatureDeclaration" ? "new" : m.type === "TSCallSignatureDeclaration" ? "(call)" : "?");
export const table = new Map<string, Map<string, Set<string>>>();
const add = (owner: string, members: any[]) => {
  const t = table.get(owner) ?? new Map<string, Set<string>>(); table.set(owner, t);
  for (const m of members) { const n = nameOf(m); const s = t.get(n) ?? new Set<string>(); for (const f of flagsAt(m.start)) s.add(f); t.set(n, s); }
};
for (const d of ast.body) {
  if (d.type === "TSInterfaceDeclaration") add(`interface ${d.id.name}`, d.body.body);
  else if (d.type === "VariableDeclaration") for (const v of d.declarations) { const ta = v.id.typeAnnotation?.typeAnnotation; if (ta?.type === "TSTypeLiteral") add(`static ${v.id.name}`, ta.members); else add(`global ${v.id.name}`, []); }
  else if (d.type === "TSDeclareFunction") add(`function ${d.id.name}`, []);
}
const INST: Record<string, string> = { Array: "number[]", String: "string", Number: "number", Boolean: "boolean", RegExp: "RegExp", RegExpMatchArray: "RegExpMatchArray", Map: "Map<string, number>", Set: "Set<number>", Error: "Error", Promise: "Promise<number>", ArrayBuffer: "ArrayBuffer", URLSearchParams: "URLSearchParams", URL: "URL", Float64Array: "Float64Array" };
const probe = (owner: string, m: string): string | null => {
  const [kind, n] = owner.split(" ");
  if (m === "new" || m === "(call)") return null;
  if (kind === "interface" && INST[n!]) return `const a = () => (x: ${INST[n!]}) => x.${m};`;
  if (kind === "static") return `const a = () => ${n}.${m};`;
  return null;
};
// members a TypeScript programmer reaches for that the declarations leave out
export const ABSENT: Record<string, string[]> = {
  "interface Array": ["flat", "findLastIndex", "reduceRight", "toLocaleString"],
  "static Array": [],
  "interface String": ["codePointAt", "normalize", "search", "matchAll", "concat", "substr", "localeUpperCase", "trimLeft", "split"],
  "interface RegExp": ["lastIndex", "global", "exec", "test"],
  "interface Number": ["toLocaleString", "valueOf"],
  "static Number": [],
  "static Math": ["clz32", "imul", "log1p", "expm1", "sinh", "cosh", "tanh", "random"],
  "static JSON": [],
  "static Object": ["assign", "freeze", "create", "getOwnPropertyNames", "hasOwn", "groupBy", "isFrozen"],
  "interface Map": ["getOrInsert"],
  "static Map": ["groupBy"],
  "interface Set": ["union", "intersection", "difference", "isSubsetOf"],
  "interface Promise": ["catch", "finally"],
  "static Promise": ["race", "allSettled", "any", "reject", "withResolvers"],
  "interface Error": ["stack", "cause"],
  "interface URLSearchParams": ["set", "append", "getAll", "entries"],
};
const rows: [string, string][] = [];
for (const [owner, ms] of table) {
  for (const m of ms.keys()) { const s = probe(owner, m); if (s) rows.push([`${owner}.${m}`, s]); }
  for (const m of ABSENT[owner] ?? []) if (!ms.has(m)) { const s = probe(owner, m); if (s) rows.push([`ABSENT ${owner}.${m}`, s]); }
}
export const srcs = rows;
if (import.meta.main) for (const [owner, ms] of table) console.log(`${owner}: ${[...ms].map(([n, f]) => n + (f.size ? `[${[...f].join(",")}]` : "")).join(" ")}`);
