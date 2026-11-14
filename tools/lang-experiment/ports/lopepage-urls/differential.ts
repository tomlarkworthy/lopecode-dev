// Differential check: original lopepage-urls cell functions vs this port. Run: bun ports/lopepage-urls/differential.ts
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const ORIG = join(mkdtempSync(join(tmpdir(), "lpu-")), "orig.mjs");
const LE = "/Users/tom.larkworthy/dev/lopecode-dev/tools/lang-experiment";
const P = await import(`${LE}/prelude.runtime.ts`);
Object.assign(globalThis, { mut: P.mut, freeze: P.freeze, ref: P.ref, action: P.action, equals: P.equals });
const src = readFileSync("/Users/tom.larkworthy/dev/lopecode-dev/modules/@tomlarkworthy/lopepage-urls.js", "utf8");
const body = src.slice(0, src.indexOf("export default function define"));
const names = [...body.matchAll(/^const (_\w+) = /gm)].map((m) => m[1]);
writeFileSync(ORIG, body + `\nexport { ${names.join(", ")} };\n`);
const O = await import(ORIG);
const C = await import(`${LE}/ports/lopepage-urls/cells.ts`);
const pr = (await import(`${LE}/ports/lopepage-urls/foreign.runtime.ts`)).default;

// original cells
const oParse = O._2cnj2o(), oConv = O._hndgd1(), oNorm = O._krxfrx();
const oGolden = O._1xjlhra(oParse, oConv, oNorm), oSer = O._99c7dq(), oTitles = O._gp1gp2();
const oList = O._u6m5s3(oTitles, oGolden), oGetCell = O._zzaa1z(oTitles, oGolden), oNav = O._1buu6oo();
const oLink = O._bsoqwx(() => false), oExtract = O._cb1ope();
// port cells
const pParse = C.parseViewDSL(), pConv = C.convertToGoldenLayout(), pNorm = C.normalizeWeights();
const pGolden = C.parseGoldenDSL(pParse, pConv, pNorm), pSer = C.serializeGoldenDSL(), pTitles = C._getModuleTitles();
const pList = C.listModules(pTitles, pGolden), pGetCell = C.getCell(pTitles, pGolden), pNav = C.navHref();
const pLink = C.linkToWith(pr.parseUrl), pExtract = C.extractNotebookAndCell();

const enc = (v: unknown): string => JSON.stringify(v, (k, x) => x instanceof Map ? { $map: [...x] } : x === undefined ? "$undef" : x) ;
const keysDeep = (v: any): unknown => Array.isArray(v) ? v.map(keysDeep) : v && typeof v === "object" ? (v instanceof Map ? [...v].map(([k, x]) => [k, keysDeep(x)]) : Object.entries(v).map(([k, x]) => [k, keysDeep(x)])) : v;
const run = (f: () => unknown) => { try { return "ok:" + JSON.stringify(keysDeep(f())); } catch (e) { return "throw:" + (e as Error).constructor.name + ":" + (e as Error).message; } };
let n = 0, bad = 0;
const cmp = (label: string, a: () => unknown, b: () => unknown) => {
  n++; const x = run(a), y = run(b);
  if (x !== y) { bad++; console.log(`DIFF ${label}\n  orig ${x.slice(0, 300)}\n  port ${y.slice(0, 300)}`); }
};
const dsl = [...C.dslExamples(), "", "view=", "R100(@a, S50(@b))", "C100(@a, @b)", "R100(@a, R50(@b, @c))", "S100(@a, @b)",
  " R (@a , @b ) ", "R100(C0(@a),@b)", "S(@x#c1,d/abc@12)", "@a,@b", "12", "R100(@a", "R100(@a))", "X", "view=@a,", "R100(@a,,@b)", "S50()", "C33(S10(@a),S20(@b),S70(@c))", "R(d/ff,@x)", "d/x)", "R100(@a)extra", "@", "S 5"];
for (const d of dsl) {
  cmp(`parseViewDSL ${JSON.stringify(d)}`, () => oParse(d), () => pParse(d));
  cmp(`convert ${JSON.stringify(d)}`, () => oConv(oParse(d)), () => pConv(pParse(d)));
  cmp(`golden ${JSON.stringify(d)}`, () => oGolden(d), () => pGolden(d));
  cmp(`serialize ${JSON.stringify(d)}`, () => oSer(oGolden(d)), () => pSer(pGolden(d)));
  cmp(`roundtrip ${JSON.stringify(d)}`, () => oGolden(oSer(oGolden(d))), () => pGolden(pSer(pGolden(d))));
  cmp(`listModules ${JSON.stringify(d)}`, () => oList(d), () => pList(d));
  cmp(`getCell ${JSON.stringify(d)}`, () => oGetCell(d, "x"), () => pGetCell(d, "x"));
}
// serialize on hand-made layouts
const lays = [{ type: "row", size: 50, content: [] }, { type: "stack", size: 12, content: [{ type: "component", title: "@n" }] }, { type: "row", size: "33.3%", content: [{ type: "stack", size: "200", content: [{ type: "component", title: "@a" }] }] }, { type: "column", size: "12.5", content: [] }, { type: "stack", size: "abc%" }, { type: "weird", size: "1fr" }, { type: "row" }];
for (const l of lays) cmp(`serialize ${JSON.stringify(l)}`, () => oSer(structuredClone(l)), () => pSer(structuredClone(l) as any));
// normalize on direct input including weight 0, root stack keeping weight
const norms = [oConv(oParse("S100(@a)")), oConv(oParse("R(@a,0@b,40@c)")), { type: "component", title: "x", weight: 5 }, { type: "row", weight: 3, content: [] }];
for (const x of norms) cmp(`normalize ${JSON.stringify(x)}`, () => { const y = structuredClone(x); oNorm(y); return y; }, () => pNorm(structuredClone(x) as any));
// navHref
const navT: any[] = ["#x", "@a/b", "@a/b#c", "", null, undefined, { module: "@m" }, { open: "@o", cell: "c" }, { close: "@c" }, { focus: "@f", source: "s" }, { op: "close", module: "@m" }, { cell: "only" }, { module: "", op: "focus" }];
for (const t of navT) for (const o of [undefined, {}, { op: "close", source: "q" }]) cmp(`navHref ${JSON.stringify(t)} ${JSON.stringify(o)}`, () => oNav(t, o), () => pNav(t, o));
// linkTo
const bases = [...C.links(), "file:///a/b.html", "file:///a/b.html#cc=1&view=R(@a)&open=@x&from=y&k&z=", "https://h/p?q#", "not a url", "https://h/#foo=1&close=2"];
const lt: any[] = [...C.targets(), "#raw", "", null, undefined, { module: "@m", source: "src" }, { open: "@o", cell: "c" }, { focus: "@f" }, { close: "@c" }, { op: "k", module: "@m" }, { cell: "x" }, { module: "" }];
for (const b of bases) for (const t of lt) for (const extra of [{}, { op: "close" }, { source: "me" }, { op: "k" }]) {
  for (const onObservable of [false, true])
    cmp(`linkTo ${JSON.stringify(t)} ${b} ${JSON.stringify(extra)} obs=${onObservable}`, () => oLink(t, { baseURI: b, onObservable, ...extra }), () => pLink(t, { baseURI: b, onObservable, ...extra }));
}
// extract
for (const h of [...C.href_examples(), "https://observablehq.com/@a/b@12", "e/abc@3", "abc@12#x", "nope nope", "https://x.y/z/w#c-d", "plain", "@a/b#c#d"]) cmp(`extract ${h}`, () => oExtract(h), () => pExtract(h));
// tests' values
cmp("test_linkTo value", () => O._1f44wsz(O._gxaxgb(), O._17e89y0(), oLink), () => C.test_linkTo(C.links(), C.targets(), pLink));
cmp("test_bareModulesWrappedInRC", () => O._1uzvyu(oConv, oParse), () => C.test_bareModulesWrappedInRC(pConv, pParse));
cmp("_6", () => O._1d8nta8(), () => C._6());
// data cells against the original literals
cmp("dslExamples", () => O._5m77lz(), () => C.dslExamples());
cmp("links", () => O._gxaxgb(), () => C.links());
cmp("targets", () => O._17e89y0(), () => C.targets());
cmp("href_examples", () => O._1gllckt(), () => C.href_examples());
// every test end to end, original deps vs port deps
const oL = O._zhsr87(O._5m77lz(), oGolden), pL = C.layouts(C.dslExamples(), pGolden);
cmp("layouts", () => oL, () => pL);
cmp("test_parseViewDSL", () => O._1v8gzuh(O._5m77lz(), oParse), () => C.test_parseViewDSL(C.dslExamples(), pParse));
cmp("test_reserialized", () => O._y0dnb4(O._5m77lz(), oConv, oParse), () => C.test_reserialized(C.dslExamples(), pConv, pParse));
const oTS = O._1famjgd(oL, oSer), pTS = C.test_serializeGoldenDSL(pL, pSer);
cmp("test_serializeGoldenDSL", () => oTS, () => pTS);
cmp("test_parseGoldenDSL", () => O._13bri8r(oTS, oGolden), () => C.test_parseGoldenDSL(pTS, pGolden));
cmp("test_list_modules", () => O._1dpn90d(O._5m77lz(), oList), () => C.test_list_modules(C.dslExamples(), pList));
cmp("test_extractNotebookAndCell", () => O._133ucsn(O._1gllckt(), oExtract), () => C.test_extractNotebookAndCell(C.href_examples(), pExtract));
cmp("test_linkTo (orig linkTo vs port linkToWith, orig data)", () => O._1f44wsz(O._gxaxgb(), O._17e89y0(), oLink), () => C.test_linkTo(C.links(), C.targets(), pLink));
// the shell linkTo wrapper (imported by 21 modules in the frozen modules/ extraction), including its defaults, against the original
const S = await import(`${LE}/ports/lopepage-urls/shell.ts`);
for (const href of ["file:///x/nb.html#cc=T&view=R(@a)&k=v", "https://abc.observableusercontent.com/worker#x=1", "blob:https://abc.observableusercontent.com/z#q"]) {
  const loc = { href };
  (globalThis as any).document = { baseURI: href };
  const oLT = O._bsoqwx(O._1xjzq9r(loc));
  const pLT = S.linkTo(S.isOnObservableCom(loc), pLink);
  for (const t of lt) for (const o of [undefined, {}, { op: "close" }, { source: "me" }, { baseURI: "https://h/#a=b" }, { onObservable: true }, { onObservable: false }])
    cmp(`shell linkTo ${href} ${JSON.stringify(t)} ${JSON.stringify(o)}`, () => oLT(t, o), () => pLT(t, o));
}
console.log(`${n} comparisons, ${bad} differ`);
