// Does the 2026-08-10 annotation round render? Ten annotations, four of them new
// cells (hexTaster, hexOverlay, combineDiagram, ringLatticeDiagram) and one a
// refactor of hexFrameReport onto the shared overlay, so "it synced" is not
// evidence of anything -- a cell that throws is invisible in the file and obvious
// on the page.
//
// Replaces the page-colour prose checks this file used to carry: _pgw1.._pgw6 were
// deleted by annotation a2uhttehgk, so those assertions could no longer fail.
import { chromium } from "playwright";
import { resolve } from "node:path";
const IN = resolve("lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html");
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 200)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`file://${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
// whenVisible gates the taster and the ring diagram, so the page has to be walked
// rather than merely waited on.
for (let i = 0; i < 40; i++) {
  await page.evaluate((k) => window.scrollTo(0, k * 1200), i);
  await page.waitForTimeout(400);
}
await page.waitForTimeout(25000);

const out = await page.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const vars = [...rt._variables].filter((v: any) => v._module === mod);
  const byName = (n: string) => vars.find((v: any) => v._name === n);
  const val = (n: string) => { const v: any = byName(n); return v ? v._value : undefined; };
  const node = (n: string) => { const x: any = val(n); return x && x.querySelectorAll ? x : null; };

  const cellText = (needle: string) => {
    const n = [...document.querySelectorAll("#lopepage-2 .observablehq")]
      .find((z) => (z.textContent || "").includes(needle));
    return n ? (n.textContent || "").replace(/\s+/g, " ").trim() : null;
  };

  const r: any = { cells: {}, prose: {}, sections: {}, tests: {} };

  for (const n of ["hexTaster", "hexOverlay", "combineDiagram", "ringLatticeDiagram",
                   "hexFrameReport", "rowWalkBox", "rowWalkGroups", "rowWalkEdges", "rowWalkFrame"]) {
    const v: any = byName(n);
    const el = node(n);
    r.cells[n] = {
      defined: !!v,
      // whenVisible-gated cells (hexTaster, ringLatticeDiagram, hexFrameReport) resolve
      // only once scrolled to; resolved:false here is "not reached", not "threw".
      resolved: !!el,
      canvas: el ? el.querySelectorAll("canvas").length : 0,
      error: v && v._value instanceof Error ? String(v._value).slice(0, 120) : null,
      svg: el ? el.querySelectorAll("svg").length : (n === "hexOverlay" || n === "rowWalkBox" ? "n/a" : 0),
      img: el ? el.querySelectorAll("img,image").length : 0,
      caption: el ? (el.querySelector("figcaption")?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 210) : null
    };
  }

  // The three row-aligned figures must share one box, which is the annotation.
  const box = val("rowWalkBox");
  r.box = box ? { STRIP: box.STRIP, w: box.w, boxW: box.boxW, style: box.style } : null;
  const vb = (n: string) => { const el = node(n); const s = el && el.querySelector("svg"); return s ? s.getAttribute("viewBox") : null; };
  r.viewBoxes = { frame: vb("rowWalkFrame"), edges: vb("rowWalkEdges"), groups: vb("rowWalkGroups") };
  const fw = (n: string) => { const el = node(n); const f = el && (el.tagName === "FIGURE" ? el : el.querySelector("figure")); return f ? (f as any).getBoundingClientRect().width.toFixed(1) : null; };
  r.figureWidths = { frame: fw("rowWalkFrame"), edges: fw("rowWalkEdges"), groups: fw("rowWalkGroups") };

  // The coloured table replaced a markdown one.
  const axes = node("axes_md");
  r.axesTable = axes ? {
    tables: axes.querySelectorAll("table").length,
    bars: axes.querySelectorAll("div[style*=width]").length,
    colours: [...new Set([...axes.querySelectorAll("td")].map((t: any) => t.style.color).filter(Boolean))]
  } : null;

  for (const [k, t] of [
    ["cascade", "Adjacent parrallel scanlines"],
    ["constrains", "None of this runs in the live detector"],
    ["plane", "worth more than the two numbers"],
    ["wasm", "not a copy sitting in this page"],
    ["fillin", "eye balled for correctness of fit"]
  ] as any) {
    const txt = cellText(t);
    r.prose[k] = txt ? { chars: txt.length, tail: txt.slice(-90) } : "NOT RENDERED";
  }

  const idx = val("sectionIndex");
  if (idx) for (const k of ["relabel", "lattice", "constrains", "next"])
    r.sections[k] = idx.get(k) ? `${idx.get(k).num} ${idx.get(k).title}` : "MISSING";

  const strip = (x: any) => typeof x === "string" ? x : (x && x.textContent) || String(x);
  for (const n of ["sectionAudit", "manSceneTest", "manAxesTest"]) {
    const el: any = val(n);
    r.tests[n] = el ? strip(el).replace(/\s+/g, " ").trim().slice(0, 340) : "MISSING";
  }
  return r;
});

console.log(JSON.stringify(out, null, 1));
console.log("pageerrors:", errs.length ? errs.slice(0, 6) : "none");
await browser.close();
