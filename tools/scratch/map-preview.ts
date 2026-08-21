import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-map.js", {
  overrides: { md: (s: any) => String(s), Inputs: {}, html: () => {}, Generators: {}, invalidation: new Promise(() => {}) }
});
const g: any = {};
for (const k of ["genRun","runStates","mapScene","mapTopBar","mapPanel","mapLegend","mapHazTags","mapCss"]) g[k] = await m.value(k);
const run = g.genRun({ seed: 41, galaxy: 2, jumps: 7 });
const st: any = { at: run.start.id, visited: [], selected: null, scrap: 214, hull: 82, clock: "18:24" };
// advance two jumps so taken/visited/locked states are all on screen
for (let i = 0; i < 2; i++) {
  const S = g.runStates(run, st);
  const next = run.nodes.filter((n: any) => S.nodeState.get(n.id) === "reachable");
  st.visited.push(st.at); st.at = next[Math.min(i, next.length - 1)].id;
}
const S = g.runStates(run, st);
st.selected = run.nodes.filter((n: any) => S.nodeState.get(n.id) === "reachable")[0]?.id ?? null;
const body = g.mapScene(run, st, S) + g.mapTopBar(run, st) + g.mapHazTags(run) + g.mapPanel(run, st, S) + g.mapLegend();
await Bun.write("tools/scratch/map-preview.html",
  `<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:#04050a}${g.mapCss}</style>` +
  `<div style="position:relative;width:1600px;height:900px;color:#e8ecf5;font-family:ui-monospace,monospace">${body}</div>`);
console.log("wrote tools/scratch/map-preview.html");
