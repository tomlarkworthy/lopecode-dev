import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);

const attrVal = await V("attrVal"), tokenize = await V("tokenize");
const toolPen = await V("toolPen"), vertexAddress = await V("vertexAddress");
const cmds = await V("svgCommands");
const byId = (id: string) => cmds.find((c: any) => c.id === id);

const DOC = `<svg viewBox="0 0 200 200">
  <path d="M 10 10 L 40 40 L 70 20" fill="none" stroke="#333"/>
  <path d="M 100 10 L 130 40 L 160 20 Z" fill="#5B7A5E"/>
  <polygon points="20,100 40,70 60,100 40,120"/>
</svg>`;

const ctxOf = (src: string) => ({
  doc: () => src,
  elems: () => tokenize(src).map((e: any) => ({ localName: e.tag })),
  attr: (t: string, i: number, n: string) => attrVal(t, i, n),
  options: {}
});

console.log("--- G20: pick up a free end ---");
const c = ctxOf(DOC);
console.log("on the open path's last anchor [70,20]:", JSON.stringify(toolPen.freeEnd(c, [70, 20])));
console.log("on its *first* anchor [10,10]      :", JSON.stringify(toolPen.freeEnd(c, [10, 10])));
console.log("on the closed path's end [160,20]  :", JSON.stringify(toolPen.freeEnd(c, [160, 20])));
console.log("out in the open [150,150]          :", JSON.stringify(toolPen.freeEnd(c, [150, 150])));
console.log("just outside the radius [70,29]    :", JSON.stringify(toolPen.freeEnd(c, [70, 29])));

const run = (src: string, d: any): string => {
  const list = d === null ? [] : Array.isArray(d) ? d : [d];
  for (const x of list) { if (x.kind !== "command") throw new Error("not a command: " + x.kind); src = x.apply(src); }
  return src;
};
// element index for a structural path, via the module's own parser
const nodeAt = await V("nodeAt");
const mkEnv = (src: string, paths: any[], vertices: any[] = []) => ({
  src, paths, vertices, options: {}, scope: [0],
  index: (p: number[]) => nodeAt(src, p).index,
  childCount: () => 0, clipboard: () => [], target: () => null
});

console.log("\n--- G23: close / open ---");
const closed = run(DOC, byId("close-path").plan(mkEnv(DOC, [[0, 0]])));
console.log(attrVal(closed, 1, "d"));
console.log("closing an already-closed path declines:",
  byId("close-path").plan(mkEnv(DOC, [[0, 1]])) === null);
console.log("opening it again is byte-identical:",
  run(closed, byId("open-path").plan(mkEnv(closed, [[0, 0]]))) === DOC);
console.log("a polygon has no `d`, so it declines:",
  byId("close-path").plan(mkEnv(DOC, [[0, 2]])) === null);

console.log("\n--- G23: delete a held vertex ---");
const A = vertexAddress.of;
console.log("nothing held declines:", byId("delete-vertex").plan(mkEnv(DOC, [[0, 2]], [])) === null);
const p2 = run(DOC, byId("delete-vertex").plan(mkEnv(DOC, [[0, 2]], [A([0, 2], "anchor", 1)])));
console.log("polygon minus anchor 1:", attrVal(p2, 3, "points"));
const p3 = run(DOC, byId("delete-vertex").plan(
  mkEnv(DOC, [[0, 2]], [A([0, 2], "anchor", 1), A([0, 2], "anchor", 3)])));
console.log("polygon minus 1 and 3 :", attrVal(p3, 3, "points"));
console.log("all four would leave one point, so it declines:",
  byId("delete-vertex").plan(mkEnv(DOC, [[0, 2]],
    [0, 1, 2].map((n) => A([0, 2], "anchor", n)))) === null);
const q = run(DOC, byId("delete-vertex").plan(mkEnv(DOC, [[0, 0]], [A([0, 0], "anchor", 2)])));
console.log("path minus its last anchor:", attrVal(q, 1, "d"));
console.log("the M anchor terminates no segment, so it declines:",
  byId("delete-vertex").plan(mkEnv(DOC, [[0, 0]], [A([0, 0], "anchor", 0)])) === null);
console.log("two elements at once declines:",
  byId("delete-vertex").plan(mkEnv(DOC, [], [A([0, 0], "anchor", 1), A([0, 2], "anchor", 1)])) === null);

console.log("\nregistry:", cmds.map((c: any) => c.id).join(", "));
