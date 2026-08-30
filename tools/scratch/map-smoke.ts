import { importNotebookModule } from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-map.js", {
  overrides: { md: (s: any) => String(s), Inputs: {}, html: () => {}, Generators: {}, invalidation: new Promise(() => {}) }
});
const genRun: any = await m.value("genRun");
const runStates: any = await m.value("runStates");
const mapScene: any = await m.value("mapScene");
const bar: any = await m.value("mapTopBar");
const panel: any = await m.value("mapPanel");
const legend: any = await m.value("mapLegend");
const haz: any = await m.value("mapHazTags");
for (const seed of [41, 7, 123]) {
  const run = genRun({ seed, galaxy: 2, jumps: 7 });
  let st: any = { at: run.start.id, visited: [], selected: null, scrap: 214, hull: 82, clock: "18:24" };
  // walk a whole run greedily
  let hops = 0;
  while (true) {
    const S = runStates(run, st);
    const next = run.nodes.filter((n: any) => S.nodeState.get(n.id) === "reachable");
    const html = mapScene(run, st, S) + bar(run, st) + haz(run) + panel(run, { ...st, selected: next[0]?.id ?? null }, S) + legend();
    if (!html.includes("<svg")) throw new Error("no svg");
    if (!next.length) break;
    st.visited.push(st.at); st.at = next[0].id; hops++;
    if (hops > 20) throw new Error("no terminus");
  }
  const st2 = runStates(run, st);
  console.log(`seed ${seed}: ${run.nodes.length} nodes, ${run.edges.length} edges, walked ${hops} hops, ended on ${run.nodes.find((n:any)=>n.id===st.at).kind}, hazards ${run.hazards.map((h:any)=>h.kind).join("+")}, locked ${[...st2.nodeState.values()].filter(v=>v==="locked").length}`);
}
