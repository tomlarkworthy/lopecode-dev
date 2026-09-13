// Reproduces "display cells get orphaned and don't move with the cell" on the lopepage-3 notebook:
// drags the two-display() cell below `k * n` by its hotbar and prints, before and after, the pane's
// DOM children and cell-map-2's cell order for the demo module.
//
// run: bun tools/lopepage-3/drag-repro.ts [notebook.html]   (SHOT=path for a screenshot)
import { chromium } from "playwright";
import { resolve } from "node:path";

const NOTEBOOK = resolve(process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_lopepage-3.html");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e.stack ?? e.message)));
await page.addInitScript(() => {
  const original = (window as any).Runtime;
  let captured = false;
  Object.defineProperty(window, "Runtime", {
    get: () => original,
    set(R: any) {
      const Wrapped = function (this: any, ...args: any[]) {
        const rt = new R(...args);
        if (!captured) { (window as any).__ojs_runtime = rt; captured = true; }
        return rt;
      };
      Wrapped.prototype = R.prototype;
      Object.assign(Wrapped, R);
      return Wrapped;
    }
  });
});
await page.goto(`file://${NOTEBOOK}`, { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => document.querySelectorAll(".lope-viz .lope-viz-nk").length >= 5, undefined, { timeout: 30000 });
await page.waitForTimeout(1500);

const snapshot = (label: string) => page.evaluate((label) => {
  const rt = (window as any).__ojs_runtime;
  const nk = document.querySelector(".lope-viz .lope-viz-nk") as any;
  const root = nk?.parentNode as Element;
  const describe = (v: any) => v ? (v._name ?? `<${String(v._definition).slice(0, 30).replace(/\s+/g, " ")}>`) : null;
  const dom = [...(root?.childNodes ?? [])].map((c: any) => {
    const kind = c.classList?.contains("lope-viz-nk") ? "NK" : c.classList?.contains("observablehq") ? "OBS" : c.classList?.contains("cell-editor") || c.querySelector?.(".hotbar") ? "editor" : (c.nodeName ?? "?");
    return `${kind.padEnd(6)} var=${describe(c.variable)} text=${JSON.stringify((c.textContent ?? "").trim().slice(0, 40))}`;
  });
  const mod = nk?.variable?._module;
  const map = [...rt._variables].find((v: any) => v._name === "liveCellMap2" && v._value instanceof Map)?._value;
  const cells = (map?.get(mod) ?? []).map((c: any) => `${c.type ?? "?"}:${c.name ?? "-"} [${c.variables.map(describe).join(", ")}]`);
  const order = [...rt._variables].filter((v: any) => v._module === mod).map((v: any) => `${describe(v)}${v._type === 2 ? "(shadow)" : ""}`);
  return { label, dom, cells, order };
}, label);

const print = (s: any) => {
  // one token per pane child: E = editor host, else the cell's text or variable
  const tokens = s.dom.map((l: string) => l.startsWith("editor") ? "E" : l.replace(/^(\S+)\s+var=(.*?) text=(.*)$/, (_m: string, k: string, v: string, t: string) => `${k}(${t !== '""' ? t.slice(0, 14) : v.slice(0, 14)})`));
  console.log(`=== ${s.label}\n  ${tokens.join(" ")}\n  cells: ${s.cells.map((c: string) => c.split(" [")[0]).join(" ")}`);
};
print(await snapshot("before"));

// drag the display() cell's hotbar to just below the `k * n` cell
const box = await page.evaluate(() => {
  const nodes = [...document.querySelectorAll(".lope-viz .lope-viz-nk")] as HTMLElement[];
  const disp = nodes.find((n) => (n.textContent ?? "").includes("n is 3"));
  const kn = nodes.find((n) => (n.textContent ?? "").trim() === "9");
  const hotbar = disp?.nextElementSibling?.querySelector(".hotbar") as HTMLElement | null;
  if (!disp || !kn || !hotbar) return null;
  hotbar.scrollIntoView({ block: "center" });
  const h = hotbar.getBoundingClientRect(), k = kn.getBoundingClientRect();
  return { hx: h.left + 60, hy: h.top + h.height / 2, ty: k.bottom + 4 };
});
if (!box) { console.log("could not find the display cell, the k * n cell or the hotbar"); process.exit(2); }
await page.mouse.move(box.hx, box.hy);
await page.mouse.down();
for (let i = 1; i <= 12; i++) await page.mouse.move(box.hx, box.hy + ((box.ty - box.hy) * i) / 12);
await page.mouse.up();
await page.waitForTimeout(2000);
print(await snapshot("2s after the drag"));
await page.waitForTimeout(4000);
print(await snapshot("6s after the drag"));
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });
console.log("\npage errors:", errors.length ? errors : "none");
await browser.close();
