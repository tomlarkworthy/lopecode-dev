// Probes of tag dispatch (recdisp/lite/boundary.ts dispatchOf): the tag read through a getter or Proxy, inherited,
// missing, of the wrong type; unions that mix records with null, a primitive, an array; two members sharing a tag;
// an unknown tag deep in an AST. Each against rec/ (ordered scan) for the same value and shape.
// Run: bun probes-disp.ts
const D = import.meta.dir + "/";
const load = async (name: string) => ({ name, checkSources: (await import(`${D}${name}/lite/core.ts`)).checkSources, ...(await import(`${D}${name}/lite/boundary.ts`)) }) as any;
const rec = await load("rec"), disp = await load("recdisp");
const shapeIn = (types: string, ann: string) => rec.checkSources({ cells: `${types}\nexport const f = (x: ${ann}): number => 1;`, tsx: false, outside: [{ name: "x" }] }).facts!.get("f")!.params[0]!.boundary!.shape;
const attempt = (c: any, v: unknown, s: unknown) => { try { return `crosses ${JSON.stringify(c.cross(v, s, "f.x")).slice(0, 90)}`; } catch (e: any) { return `throws ${e.constructor.name}: ${String(e.message).slice(0, 150)}`; } };
const both = (label: string, v: () => unknown, s: unknown) => console.log(`${label}\n  rec:     ${attempt(rec, v(), s)}\n  recdisp: ${attempt(disp, v(), s)}`);
const T = `type A = { type: "a"; x: number }; type B = { type: "b"; y: string }; type AB = A | B;`;
const sAB = shapeIn(T, "AB");
both("tag a, well-formed", () => ({ type: "a", x: 1 }), sAB);
let reads = 0;
both("tag getter: 'a' on the first read, 'b' after", () => { reads = 0; return { get type() { return reads++ === 0 ? "a" : "b"; }, x: 1, y: "s" }; }, sAB);
console.log(`  (recdisp read the getter ${reads} time(s))`);
both("tag getter: 'b' on the first read, 'a' after (a value of both)", () => { reads = 0; return { get type() { return reads++ === 0 ? "b" : "a"; }, x: 1, y: "s" }; }, sAB);
both("Proxy whose type alternates", () => { let n = 0; return new Proxy({ x: 1, y: "s" }, { get: (t: any, k) => (k === "type" ? (n++ % 2 ? "a" : "b") : t[k]), has: () => true }); }, sAB);
both("type inherited from the prototype", () => Object.assign(Object.create({ type: "a" }), { x: 1 }), sAB);
both("type missing", () => ({ x: 1 }), sAB);
both("type a number", () => ({ type: 1, x: 1 }), sAB);
both("unknown tag", () => ({ type: "c", x: 1 }), sAB);
const sMix = shapeIn(T, "AB | null | number | string[]");
both("union with null, number, array: null", () => null, sMix);
both("union with null, number, array: 3", () => 3, sMix);
both("union with null, number, array: ['s']", () => ["s"], sMix);
both("union with null, number, array: B", () => ({ type: "b", y: "s" }), sMix);
const sDup = shapeIn(`type A = { type: "a"; x: number }; type A2 = { type: "a"; y: string };`, "A | A2");
both("two members share tag a: a value of the second", () => ({ type: "a", y: "s" }), sDup);
const sOpt = shapeIn(`type A = { type?: "a"; x: number }; type B = { type: "b"; y: string };`, "A | B");
both("optional tag on one member: {x: 1}", () => ({ x: 1 }), sOpt);
// an AST with a Bogus node deep in it
const { nestParse } = await import(`${D}adapter.ts`);
const sN = shapeIn(await Bun.file(`${D}ast-n.ss.ts`).text(), "NParse");
both("AST with a node of type Bogus at program.body[0].declarations[0].init.body.property", () => { const p: any = nestParse("const f = (x) => x.y;", false); p.ast.program.body[0].declarations[0].init.body.property.type = "Bogus"; return p; }, sN);
both("AST with an Identifier missing its name, same place", () => { const p: any = nestParse("const f = (x) => x.y;", false); delete p.ast.program.body[0].declarations[0].init.body.property.name; return p; }, sN);
