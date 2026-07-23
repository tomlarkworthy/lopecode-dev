import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/svg-lens.js");
const V = async (n: string) => await m.value(n);
const attrVal = await V("attrVal"), pathHandles = await V("pathHandles");
const pathSmooth = await V("pathSmooth"), vertexAddress = await V("vertexAddress");
const cmds = await V("svgCommands");
const toggleCmd = cmds.find((c: any) => c.id === "toggle-smooth");
const nodeAt = await V("nodeAt");

const D = (s: string) => `<svg viewBox="0 0 200 200">\n  <path d="${s}"/>\n</svg>`;
const dOf = (s: string) => attrVal(s, 1, "d");
const run = (src: string, d: any) => {
  const list = d === null ? [] : [].concat(d);
  for (const x of list as any[]) src = x.apply(src);
  return src;
};
const env = (src: string, verts: any[]) => ({
  src, paths: [], vertices: verts, options: {}, scope: [0],
  index: (p: number[]) => nodeAt(src, p).index, childCount: () => 0,
  clipboard: () => [], target: () => null
});
const A = vertexAddress.of;

console.log("--- corner (polyline of lines) -> smooth on the middle anchor ---");
const L = D("M 10 100 L 60 40 L 110 100");
console.log("before:", dOf(L), "| smooth?", pathSmooth.smooth(pathHandles(L, 1), 1));
const S1 = run(L, toggleCmd.plan(env(L, [A([0, 0], "anchor", 1)])));
console.log("after :", dOf(S1), "| smooth?", pathSmooth.smooth(pathHandles(S1, 1), 1));

console.log("\n--- and back to a corner ---");
const C1 = run(S1, toggleCmd.plan(env(S1, [A([0, 0], "anchor", 1)])));
console.log("after :", dOf(C1), "| smooth?", pathSmooth.smooth(pathHandles(C1, 1), 1));

console.log("\n--- a cubic corner becomes smooth without adding a command ---");
const K = D("M 10 100 C 20 60 30 60 60 40 C 70 20 100 90 110 100");
console.log("before:", dOf(K), "| smooth?", pathSmooth.smooth(pathHandles(K, 1), 1));
const S2 = run(K, toggleCmd.plan(env(K, [A([0, 0], "anchor", 1)])));
console.log("after :", dOf(S2), "| smooth?", pathSmooth.smooth(pathHandles(S2, 1), 1));
console.log("same command letters:",
  (dOf(K).match(/[A-Za-z]/g) || []).join("") === (dOf(S2).match(/[A-Za-z]/g) || []).join(""));

console.log("\n--- declines ---");
console.log("the M anchor has no incoming segment:",
  toggleCmd.plan(env(L, [A([0, 0], "anchor", 0)])) === null);
console.log("the last anchor has no outgoing segment:",
  toggleCmd.plan(env(L, [A([0, 0], "anchor", 2)])) === null);
console.log("two vertices held:",
  toggleCmd.plan(env(L, [A([0, 0], "anchor", 1), A([0, 0], "anchor", 2)])) === null);
const ARC = D("M 10 100 A 30 30 0 0 1 60 40 L 110 100");
console.log("an arc is not ours to rewrite:",
  toggleCmd.plan(env(ARC, [A([0, 0], "anchor", 1)])) === null);

console.log("\n--- drag one handle of a smooth anchor: the partner mirrors ---");
const before = pathSmooth.around(pathHandles(S2, 1), 1);
console.log("in :", [before.inH.x, before.inH.y], "out:", [before.outH.x, before.outH.y]);
const moved = pathSmooth.couple(S2, 1, before.inH.key, before.inH.x - 5, before.inH.y - 12);
console.log("coupled d:", moved);
const S3 = D(moved);
const after = pathSmooth.around(pathHandles(S3, 1), 1);
console.log("in :", [after.inH.x, after.inH.y], "out:", [after.outH.x, after.outH.y]);
console.log("still smooth:", pathSmooth.smooth(pathHandles(S3, 1), 1));
console.log("the partner's length is unchanged:",
  Math.abs(Math.hypot(after.outH.x - after.anchor.x, after.outH.y - after.anchor.y)
         - Math.hypot(before.outH.x - before.anchor.x, before.outH.y - before.anchor.y)) < 1e-6);
console.log("a corner anchor's handle is not coupled:",
  pathSmooth.couple(K, 1, pathHandles(K, 1).filter((h: any) => h.kind === "ctrl")[1].key, 5, 5) === null);

console.log("\n--- promoting a line draws the identical curve ---");
console.log(dOf(pathSmooth.promote(L, 1, 1, "in")));
