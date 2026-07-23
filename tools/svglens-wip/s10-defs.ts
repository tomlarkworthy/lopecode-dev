import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const cmdAddGradient = await V("cmdAddGradient");
const cmdAddMarker = await V("cmdAddMarker");
const mintId = await V("mintId");
const defsInsert = await V("defsInsert");
const idsIn = await V("idsIn");
const copyMarkup = await V("copyMarkup");
const pasteMarkup = await V("pasteMarkup");
const nodeAt = await V("nodeAt");
const attrVal = await V("attrVal");
const pathOfId = await V("pathOfId");
const refsOf = await V("refsOf");
const attrTextLens = await V("attrTextLens");

const ok = (c: boolean, msg: string) => console.log(`  ${c ? "✅" : "❌ FAIL"}  ${msg}`);

const DOC = `<svg viewBox="0 0 200 200">
  <rect x="10" y="10" width="80" height="60" fill="#F5B840"/>
  <path d="M 10 120 L 90 120" stroke="#2F6BFF"/>
</svg>`;
const RECT = [0, 0], PATH = [0, 1];
const IDX = (src: string, p: number[]) => nodeAt(src, p).index;   // flat index for attrVal
const fillOf = (src: string, p: number[]) => attrVal(src, IDX(src, p), "fill");

console.log("--- mintId never collides ---");
ok(mintId(DOC, "grad") === "grad1", `first grad id is grad1 (${mintId(DOC, "grad")})`);
const withOne = `<svg><defs><linearGradient id="grad1"/></defs><rect/></svg>`;
ok(mintId(withOne, "grad") === "grad2", `next grad id skips the taken one (${mintId(withOne, "grad")})`);

console.log("\n--- add-gradient: fill points at a new gradient in defs ---");
const g1 = cmdAddGradient.plan({ paths: [RECT], src: DOC }).apply(DOC);
const gid = /url\(#(grad\d+)\)/.exec(fillOf(g1, RECT))?.[1] ?? null;
ok(fillOf(g1, RECT) === `url(#${gid})`, `rect fill is now ${fillOf(g1, RECT)}`);
ok(pathOfId(g1, gid!) !== null, `${gid} exists in the document`);
ok(nodeAt(g1, pathOfId(g1, gid!)!).tag === "linearGradient", "the target is a linearGradient");
const defsNode = nodeAt(g1, [0]).children.find((c: any) => c.tag === "defs");
ok(!!defsNode, "a <defs> was created");
ok(g1.includes(`stop-color="#F5B840"`), "the shape's original fill became the first stop");
ok(refsOf(g1, RECT).some((r: any) => r.attribute === "fill" && r.path !== null),
   "refsOf resolves the fill reference to the gradient");

console.log("\n--- add-gradient twice: the two gradients never share an id (S10 falsifier) ---");
const g2 = cmdAddGradient.plan({ paths: [PATH], src: g1 }).apply(g1);
const ids = [...idsIn(g2)];
ok(ids.filter((i) => i.startsWith("grad")).length === 2, `two distinct gradient ids: ${ids}`);
ok(new Set(ids).size === ids.length, "no id appears twice in the document");

console.log("\n--- editing a <stop> repaints the shape (source lens carries defs, S10 falsifier) ---");
const stopPath = (() => { let p: any = null; const walk = (n: any) => { if (n.tag === "stop" && n.attrs["stop-color"]?.value === "#F5B840") p = n.path; n.children.forEach(walk); }; walk(nodeAt(g1, [])); return p; })();
ok(stopPath !== null, "the first stop is addressable in the tree");
const edited = attrTextLens(nodeAt(g1, stopPath).index, "stop-color").put("#00AA00", g1);
ok(edited.includes(`stop-color="#00AA00"`), "editing the stop changes the source");
ok(!edited.includes(`stop-color="#F5B840"`), "the old stop colour is gone");
ok(fillOf(edited, RECT) === fillOf(g1, RECT), "the shape still references the same gradient (repaints via the ref)");

console.log("\n--- add-marker: marker-end points at a new arrowhead ---");
const mk = cmdAddMarker.plan({ paths: [PATH], src: DOC }).apply(DOC);
const aid = /url\(#(arrow\d+)\)/.exec(attrVal(mk, IDX(mk, PATH), "marker-end"))?.[1] ?? null;
ok(attrVal(mk, IDX(mk, PATH), "marker-end") === `url(#${aid})`, `path marker-end is now ${attrVal(mk, IDX(mk, PATH), "marker-end")}`);
ok(aid !== null && nodeAt(mk, pathOfId(mk, aid)!).tag === "marker", "the target is a <marker>");
ok(mk.includes(`fill="#2F6BFF"`), "the arrowhead is coloured by the path's stroke");
ok(cmdAddMarker.plan({ paths: [RECT], src: DOC }) === null, "a rect (not a stroked path) declines the marker command");

console.log("\n--- pasting a copy of a gradient renames it (paste-collision falsifier) ---");
const grad = copyMarkup(g1, [pathOfId(g1, gid!)!]);
const pasted = pasteMarkup(g1, [0], null, grad);
const gradIds = [...idsIn(pasted)].filter((i) => i.startsWith("grad"));
ok(gradIds.length === 2, `the pasted gradient got a fresh id: ${gradIds}`);
ok(new Set(gradIds).size === 2, "the copy and the original do not share an id");

console.log("\n--- T1: a command that is planned is never a no-op source; a declined one returns null ---");
ok(cmdAddGradient.plan({ paths: [RECT, PATH], src: DOC }) === null, "two selected shapes decline add-gradient (one referrer only)");
ok(cmdAddGradient.plan({ paths: [], src: DOC }) === null, "empty selection declines");
