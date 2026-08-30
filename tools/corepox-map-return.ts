// One node, end to end, through the map: JUMP, launch, take the spoils, and land back
// on the map. What it guards is the TRANSITION, not the spoils -- taking a card used
// to leave the player looking at the finished battlefield with a "back to the map"
// button to press, which is a screen they had already left.
//
//   bun tools/corepox-map-return.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForSelector("[data-node]", {timeout: 60000});
await p.waitForTimeout(1500);

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};
const hit = (sel: string) => p.evaluate((s) => (document.querySelector(s) as any)
  ?.dispatchEvent(new MouseEvent("click", {bubbles: true})), sel);
const mapValue = () => p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-map");
  for (const [k, v] of m._scope) if (k === "viewof galaxyMap") return (v as any)._value.value;
});
const layerShown = () => p.evaluate(() =>
  [...document.querySelectorAll("div")].some((d: any) =>
    d.style.zIndex === "5" && d.style.display !== "none"));

// Selecting a node TOGGLES it, so the search must not re-click the one it settles on.
// Instant kinds first: a duel would spend the full 60s limit proving a transition.
const ids: string[] = await p.evaluate(() =>
  [...document.querySelectorAll("[data-node]")].map((n: any) => n.dataset.node));
const INSTANT = /race|debris|rescue/i;
let picked: string | null = null, fallback: string | null = null, kind = "";
for (const id of ids) {
  await hit(`[data-node="${id}"]`);
  await p.waitForTimeout(220);
  const info = await p.evaluate(() => {
    const j = document.querySelector(".cpm-jump") as HTMLElement;
    const panel = document.querySelector('[style*="width:320px"]') as HTMLElement;
    return {can: j ? j.style.cursor : "none", kind: (panel?.innerText ?? "").split("\n")[0].trim()};
  });
  if (info.can !== "pointer") continue;
  fallback ??= id;
  if (INSTANT.test(info.kind)) { picked = id; kind = info.kind; break; }
  await hit(`[data-node="${id}"]`);        // deselect, and keep looking
  await p.waitForTimeout(120);
}
if (!picked) { picked = fallback; kind = "(first reachable)";
               if (picked) { await hit(`[data-node="${picked}"]`); await p.waitForTimeout(220); } }
ok(!!picked, "a reachable node", `${picked} ${kind}`);

const before: any = await mapValue();
await hit(".cpm-jump");
await p.waitForTimeout(1200);
ok(await layerShown(), "JUMP opens the encounter layer");
await p.evaluate(() => {
  const b: any = [...document.querySelectorAll("button")].find(x => x.textContent!.includes("LAUNCH"));
  b.scrollIntoView({block: "center"}); b.click();
});
await p.waitForSelector(".cpx-spoils", {timeout: 150000});
console.log("  " + (await p.locator(".cpx-spoils").innerText()).split("\n")[0]);

// the one click that has to be the whole transition
await p.evaluate(() => { const el: any = document.querySelector(".cpx-spoils"); el.qa.take(); });
await p.waitForTimeout(600);
ok(!(await layerShown()), "taking the spoils lands back on the map, with no second click");
ok(await p.locator(".cpx-spoils").count() === 0, "and the popup is gone with it");
ok(!(await p.locator("text=back to the map").count()), "no 'back to the map' button is left behind");
const after: any = await mapValue();
ok(after.at === picked, "the marker moved to the node", `${before.at} -> ${after.at}`);
ok(after.visited.includes(before.at), "and the node it came from is visited",
   JSON.stringify(after.visited));
ok(await p.locator("[data-node]").count() > 0, "the map is on screen again");

console.log("\nconsole errors: " + (errs.length ? errs.slice(0, 4).join(" | ") : "none"));
if (errs.length) fail++;
await b.close();
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
