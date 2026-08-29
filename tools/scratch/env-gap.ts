// For every mission: which cells its own ship occupies that its build ENVELOPE
// does not contain. Move a part off one of those and nothing can be placed back.
import {importNotebookModule} from "../notebook-import.ts";
const m = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await m.value("MISSIONS");
for (const M of MISSIONS) {
  const env = M.envelope ?? [];
  const key = (c: any[]) => c[0] + "," + c[1];
  const inEnv = new Set(env.map(key));
  const anchors = (M.ship?.components ?? []).map((c: any) => c.pos);
  const gap = anchors.filter((a: any) => !inEnv.has(key(a)));
  console.log(String(M.id ?? M.name).padEnd(22),
    "env", String(env.length).padStart(2),
    "parts", String(anchors.length).padStart(2),
    "outside:", gap.map(key).join(" ") || "-");
}
