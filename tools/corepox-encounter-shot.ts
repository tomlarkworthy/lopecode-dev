// Drive the map to an encounter and photograph the layer it opens. The refit
// bench only exists inside that layer, so a change to it cannot be checked from
// the module page -- the encounter has to be reached the way a player reaches it:
// select a reachable node of the right kind, JUMP, wait for the bench to mount.
//
//   KIND=duel bun tools/corepox-encounter-shot.ts        # duel, mining, shop, boss...
//   -> tools/screenshots/corepox-encounter.png (+ -crop.png of the AGAINST panel)
//
// Selecting a node TOGGLES it, so the loop must not re-click the node it settled
// on; doing that deselects it and JUMP silently does nothing.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForSelector("[data-node]", {timeout: 60000});
await p.waitForTimeout(1500);
const want = process.env.KIND ?? "duel";
const ids: string[] = await p.evaluate(() =>
  [...document.querySelectorAll("[data-node]")].map((n: any) => n.dataset.node));
const hit = (sel: string) => p.evaluate((s) => (document.querySelector(s) as any)
  ?.dispatchEvent(new MouseEvent("click", {bubbles: true})), sel);
let picked: string | null = null;
for (const id of ids) {
  await hit(`[data-node="${id}"]`);
  await p.waitForTimeout(250);
  const info = await p.evaluate(() => {
    const j = document.querySelector(".cpm-jump") as HTMLElement;
    const panel = document.querySelector('[style*="width:320px"]') as HTMLElement;
    return {can: j ? j.style.cursor : "none",
            kind: (panel?.innerText ?? "").split("\n")[0].trim()};
  });
  if (info.can === "pointer") console.log("reachable:", id, info.kind);
  if (info.can === "pointer" && new RegExp(want, "i").test(info.kind)) { picked = id; break; }
}
console.log("picked", picked);
await p.waitForTimeout(400);
if (!picked) { console.log("no reachable node of that kind"); await b.close(); process.exit(1); }
await hit(".cpm-jump");
await p.waitForTimeout(3000);
console.log(await p.evaluate(() => {
  const d = [...document.querySelectorAll("div")].find(e => e.textContent.trim().startsWith("AGAINST"));
  const svg = d?.querySelector("svg");
  if (!svg) return "no svg in AGAINST panel; html=" + (d?.innerHTML.slice(0, 300) ?? "no panel");
  const r = svg.getBoundingClientRect();
  return `svg ${svg.getAttribute("viewBox")} box ${r.width}x${r.height} kids ${svg.innerHTML.length} uses ${svg.querySelectorAll("use").length}`;
}));
await p.screenshot({path: "tools/screenshots/corepox-encounter.png"});
{ const el = await p.$('[style*="border:1px solid #3a2530"]');
  if (el) await el.screenshot({path: "tools/screenshots/corepox-encounter-crop.png"}); }
console.log(await p.evaluate(() => document.body.innerText.slice(0, 300).replace(/\n+/g, " | ")));
await b.close();
