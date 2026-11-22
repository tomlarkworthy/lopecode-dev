// bun lite/freeze-table.test.ts (a script: a late write that throws is an unhandled rejection, which bun:test counts
// as a failure of whatever test is running): the value table (freeze-table.ts) covers every `new`-able intrinsic, and
// each probe, published by one cell along every route and then written late by the cell that made it, changes
// nothing another cell holds (the write throws, or hits a private original). The programs run without the checker
// (the guarantee is the run time's); runCells runs the compiled cells' text.
import ts from "typescript";
import { INTRINSIC_DECLS } from "./intrinsics.ts";
import { VALUE_TABLE } from "./freeze-table.ts";
import { observeProgram } from "./infer/attack/observe.ts";

// a late write that throws rejects its helper's promise; that rejection is the fail-stop, not a test failure
const lateThrows: unknown[] = [];
process.on("unhandledRejection", (e) => void lateThrows.push(e));
let pass = 0, fail = 0;
const ok = (c: boolean, what: string) => { if (c) pass++; else { fail++; console.log(`FAIL ${what}`); } };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const W = "for (let i = 0; i < 300; i++) await null; ";
{
  const sf = ts.createSourceFile("i.ts", INTRINSIC_DECLS, ts.ScriptTarget.Latest, true);
  const newable: string[] = [];
  const visit = (n: ts.Node) => {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.type && ts.isTypeLiteralNode(n.type) && n.type.members.some((m) => ts.isConstructSignatureDeclaration(m))) newable.push(n.name.text);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const named = new Set(VALUE_TABLE.flatMap((r) => r.names));
  const missing = newable.filter((n) => !named.has(n));
  ok(newable.length > 10 && !missing.length, `every new-able intrinsic name (${newable.length}) has a row; missing ${JSON.stringify(missing)}`);
}
{
  const sf = ts.createSourceFile("i.ts", INTRINSIC_DECLS, ts.ScriptTarget.Latest, true);
  const members: string[] = [];
  sf.forEachChild((n) => { if (ts.isInterfaceDeclaration(n) && n.name.text === "URLSearchParams") for (const m of n.members) if (m.name && ts.isIdentifier(m.name)) members.push(m.name.text); });
  ok(same(members.toSorted(), ["get", "has", "toString"]), `URLSearchParams has no writer in the table: ${members}`);
}
// the routes: how the value is published, and through what the late write reaches t
const shapes: [string, (ty: string) => string, string][] = [
  ["value", (ty) => ty, "v"], ["kept closure", (ty) => `() => ${ty}`, "() => v"], ["record", (ty) => `{ v: ${ty} }`, "{ v }"],
  ["array", (ty) => `${ty}[]`, "[v]"], ["Map", (ty) => `Map<string, ${ty}>`, "new Map([[\"k\", v]])"],
  // holes8: the value a promise in a slot resolves to, a rejection reason, and a promise a kept function holds
  ["promise", (ty) => `{ p: Promise<${ty}> }`, "{ p: Promise.resolve(v) }"], ["rejection", () => "{ p: Promise<number> }", "{ p: Promise.reject(v) }"],
  ["kept promise", (ty) => `() => Promise<${ty}>`, "(() => { const p = Promise.resolve(v); return () => p; })()"],
];
const programs: { name: string; src: string; banned: boolean }[] = [];
for (const r of VALUE_TABLE) {
  const p = r.probe;
  if (p === null) continue;
  const late = (x: string, pre = "") => `const h = async () => { ${W}${pre}${p.write(x)} }; h();`;
  // through a promise in a slot, a banned value rejects the promise: the consumer awaits it, so it is the cell in error
  // Promise.resolve(thenable) adopts it inside the cell (it resolves to what then passes on), so nothing banned is published
  for (const [s, ty, pub] of shapes) programs.push({ name: `${r.kind} / ${s} / direct`, banned: r.treatment === "banned" && !(r.kind === "thenable" && s === "promise"), src: `const a = () => { ${p.setup} ${late("t")} return ${pub}; };\n${s === "promise" || s === "rejection" ? `const b = async (a: ${ty(p.ty)}) => ({ held: await a.p });` : `const b = (a: ${ty(p.ty)}) => ({ held: a });`}` });
  programs.push({ name: `${r.kind} / value / alias`, banned: r.treatment === "banned", src: `const a = () => { ${p.setup} ${late("r", "const r = t; ")} return v; };\nconst b = (a: ${p.ty}) => ({ held: a });` });
  programs.push({ name: `${r.kind} / record / helper`, banned: r.treatment === "banned", src: `const a = () => { ${p.setup} const get = () => t; ${late("get()")} return { v }; };\nconst b = (a: { v: ${p.ty} }) => ({ held: a });` });
  programs.push({ name: `${r.kind} / yielded`, banned: r.treatment === "banned", src: `const a = function* () { ${p.setup} yield { v }; ${p.write("t")} yield 0; };` });
}
const threw: string[] = [];
for (const q of programs) {
  const r = await observeProgram({ src: q.src });
  ok(r.silent.length === 0, `${q.name}: changed silently ${JSON.stringify(r.silent)}`);
  if (q.banned) ok(r.threw, `${q.name}: banned, so publishing it throws`);
  if (r.threw) threw.push(q.name);
}
console.log(`publish then throw at publish: ${threw.length} (${threw.join("; ")})`);
console.log(`freeze-table: ${programs.length} programs; late writes that threw: ${lateThrows.length}; ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
