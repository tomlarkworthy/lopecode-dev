// Does a real mission run under manual control? Drives S.cmd through stepSession
// — the same path the UI uses — and checks the player actually flies and the
// objectives still evaluate.
import {importNotebookModule} from "./notebook-import.ts";
const eng = await importNotebookModule("modules/@tomlarkworthy/corepox-engine.js");
const names = ["Ship", "World", "TYPES", "PORTS", "geom", "DT", "pilot", "pilotActuators", "flightModel", "loadShipSpec"];
const E: any = {};
for (const n of names) E[n] = await eng.value(n);
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js", {overrides: {md: (s: any) => String(s)}});
const MISSIONS: any[] = await mis.value("MISSIONS");
const game = await importNotebookModule("modules/@tomlarkworthy/corepox-game.js", {
  overrides: {...Object.fromEntries(Object.entries(E).filter(([k]) => k !== "loadShipSpec")), MISSIONS, md: (s: any) => String(s), htl: {html: () => {}}, battlefield: null, componentNode: null, TILE: null}
});
const newSession: any = await game.value("newSession");
const stepSession: any = await game.value("stepSession");
const evaluateObjectives: any = await game.value("evaluateObjectives");

const want = process.argv[2];
for (const m of MISSIONS) {
  const id = m.id ?? m.name ?? "?";
  if (want && id !== want) continue;
  const S = newSession(m);
  S.state = "run";
  const free = E.pilotActuators(S.player);
  const start = [S.player.x, S.player.y];
  // fly a square: four waypoints 12 tiles out, 10s each
  const legs: [number, number][] = [[12, 0], [12, -12], [0, -12], [0, 0]];
  let leg = 0, moved = 0, out = "playing", ticks = 0;
  S.cmd = {target: legs[0]};
  for (let k = 0; k < 40 / E.DT && out === "playing"; k++) {
    if (k % Math.round(10 / E.DT) === 0 && k) S.cmd = {target: legs[++leg % legs.length]};
    const objs = evaluateObjectives(S);
    out = stepSession(S, objs);
    moved = Math.max(moved, Math.hypot(S.player.x - start[0], S.player.y - start[1]));
    ticks = k;
  }
  console.log(`${id.padEnd(20)} engines(free)=${free.length} maxRange=${moved.toFixed(1)} tiles  ` +
              `outcome=${out} @${(ticks * E.DT).toFixed(1)}s  objectives=${evaluateObjectives(S).map((o: any) => o.done ? "*" : ".").join("")}`);
}
