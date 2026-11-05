import { tablesOf, brainRowsOf } from "./live.js";
import { layout, render } from "./engine.js";
import { chapters } from "./chapters.js";
const t = tablesOf(JSON.parse(await Bun.file(new URL("./cb4-public.json", import.meta.url)).text()));
const R = brainRowsOf(t);
let html = "<body style='background:#f6f7f9;font:12px system-ui'>";
for (const [k, v] of Object.entries(chapters)) {
  const L = layout({ view: v, ...R, folds: v.folds || [] });
  const { svg, geometry } = render(L);
  console.log(k, "rows", L.rows.length, "lines", JSON.stringify(L.lines), "cols", L.cols.length, "w", Math.round(geometry.width), "h", Math.round(geometry.height), "edges", L.liftedEdges.length, "sccs", JSON.stringify(L.sccs.map(s=>s.members)), "excl", L.excluded.length);
  html += `<h3>${v.name}</h3>` + svg;
}
await Bun.write("/private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/f737f017-f007-4769-9dc9-f6254d5f1565/scratchpad/chapters.html", html);
