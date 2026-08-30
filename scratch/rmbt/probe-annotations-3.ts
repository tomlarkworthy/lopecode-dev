// The 2026-08-11 annotation round, verified rendered rather than synced.
//
//   a2d7frapv3  the section should say "One scanline, 3 degrees-of-freedom"
//   a2kyvwghbb  the encoding diagram's axes should have FIXED domains, so
//               moving tilt visibly changes the fitted line's angle
//   a2nraiz7ij  enumerate the geometric pruning gates in a table, with values
//               linked to the live diagram
//
// The axis one cannot be checked by reading the source: the test is that the
// line's ANGLE moves when the tilt slider moves, so this drives the real slider
// and measures the drawn line at three tilts.
import { chromium } from "playwright";
import { resolve } from "node:path";
// An http URL is accepted so the same checks can run against the rate-limited
// server, where a block genuinely has not arrived yet when the boot wants it.
const ARG = process.argv[2] ?? "lopebooks/notebooks/tomlarkworthy_coded-landmark-tracking.html";
const IN = /^https?:/.test(ARG) ? ARG : "file://" + resolve(ARG);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 } });
const errs: string[] = [];
page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
await page.addInitScript(() => {
  const orig = (window as any).Runtime; let cap = false;
  Object.defineProperty(window, "Runtime", { get() { return orig; }, set(N: any) {
    const W = function (this: any, ...a: any[]) { const i = new N(...a); if (!cap) { (window as any).__ojs_runtime = i; cap = true; } return i; };
    W.prototype = N.prototype; Object.assign(W, N); return W; } });
});
await page.goto(`${IN}#view=S100(@tomlarkworthy/coded-landmark-tracking)`, { waitUntil: "networkidle", timeout: 300000 });
await page.waitForFunction(() => !!(window as any).__ojs_runtime, { timeout: 300000 });
await page.waitForFunction(() => document.querySelectorAll("#lopepage-2 .observablehq").length > 20, { timeout: 300000 });
for (let i = 0; i < 40; i++) { await page.evaluate((k) => window.scrollTo(0, k * 1100), i); await page.waitForTimeout(300); }
await page.waitForTimeout(18000);
// hexFrameReport is lazy AND slow (16 frames through the cascade). The reservation
// check is meaningless until its content is actually in, so wait for it.
await page.evaluate(() => {
  const el = document.querySelector('[cell="hexFrameReport"]');
  if (el) el.scrollIntoView();
});
await page.waitForFunction(() => {
  const el = document.querySelector('[cell="hexFrameReport"]');
  const inner = el && el.firstElementChild;
  return !!inner && inner.getBoundingClientRect().height > 40;
}, { timeout: 180000 }).catch(() => console.log("WARN hexFrameReport never rendered"));
await page.waitForTimeout(2000);

const out = await page.evaluate(async () => {
  const rt = (window as any).__ojs_runtime;
  const mod = rt.mains.get("@tomlarkworthy/coded-landmark-tracking");
  const V = (n: string) => [...rt._variables].find((z: any) => z._module === mod && z._name === n);
  const val = (n: string) => { const v: any = V(n); return v ? v._value : undefined; };
  const r: any = {};

  // --- a2d7frapv3: the heading text
  const idx = val("sectionIndex");
  const s = idx && idx.get("scanline");
  r.section = s ? `${s.num} ${s.title}` : "MISSING";

  // --- a2nraiz7ij: the pruning table
  const pt: any = val("pruningTable");
  r.pruning = pt && pt.querySelectorAll ? {
    tables: pt.querySelectorAll("table").length,
    rows: pt.querySelectorAll("tr").length,
    funnel: (pt.textContent || "").replace(/\s+/g, " ").match(/([\d]+) edges → ([\d]+) candidate groups → ([\d]+) locked/)?.[0] ?? null,
    gates: [...pt.querySelectorAll("td")].map((t: any) => t.textContent.trim()).filter((t: string) => /^(minEdges|minSpan|gapFrac|maxEdges|groupCap)$/.test(t)),
    values: (pt.textContent || "").replace(/\s+/g, " ").slice(0, 0)
  } : (pt instanceof Error ? "ERROR " + String(pt).slice(0, 120) : "NOT RENDERED");
  // the derived numbers must equal 2*(nT+1)+6 and +3, not hand-copied constants
  const L: any = await V("manLayout")._promise;
  r.derived = { nT: L.nT, maxEdges: 2 * (L.nT + 1) + 6, groupCap: 2 * (L.nT + 1) + 3,
                shown: (pt && pt.textContent || "").includes(String(2 * (L.nT + 1) + 3)) };

  // --- a2kyvwghbb: does the fitted line's ANGLE move with tilt?
  const form: any = V("viewof encodingCfg")._value;
  const orig = { ...form.value };
  const sleep = (ms: number) => new Promise((z) => setTimeout(z, ms));
  const angleAt = async (tilt: number) => {
    form.value = { ...form.value, tilt };
    form.dispatchEvent(new Event("input", { bubbles: true }));
    await sleep(140);
    const el: any = val("encodingDiagram");
    // panel C is the last svg; its fit line is the first <line> with stroke #5af
    const svgs = el.querySelectorAll("svg");
    const c = svgs[svgs.length - 1];
    const ln = [...c.querySelectorAll("line")].find((z: any) => z.getAttribute("stroke") === "#5af");
    if (!ln) return null;
    const x1 = +ln.getAttribute("x1"), y1 = +ln.getAttribute("y1");
    const x2 = +ln.getAttribute("x2"), y2 = +ln.getAttribute("y2");
    return +(Math.atan2(y1 - y2, x2 - x1) * 180 / Math.PI).toFixed(2);
  };
  r.angles = { t0: await angleAt(0), t24: await angleAt(24), t60: await angleAt(60) };

  // The four prose cells shortened on 2026-08-12. Word counts are measured off
  // the md body, the same way the before-figures were, so they compare.
  const byPid = (p: string) => [...rt._variables].find((z: any) => z._module === mod && z.pid === p);
  r.prose = ["_4liiby", "_11vsmkp", "_nb5x", "_wsmw0"].map((p) => {
    const v: any = byPid(p);
    if (!v) return `${p} MISSING`;
    const body = String(v._definition);
    let text = "";
    for (const mm of body.matchAll(/\bmd`/g)) {
      let j = mm.index! + mm[0].length;
      while (j < body.length) { if (body[j] === "\\") { j += 2; continue; } if (body[j] === "`") break; j++; }
      text += body.slice(mm.index! + mm[0].length, j);
    }
    const w = text.replace(/\$\{[^}]*\}/g, " ").replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length;
    const val = v._value;
    return `${p} ${w}w ${val instanceof Error ? "ERROR " + val.message.slice(0, 60) : (val && val.tagName) || typeof val}`;
  });
  // a2ais7vd8x: the module reference is an aside. It carried no link at all
  // until 2026-08-13, when the external/internal convention landed -- the
  // Observable original is now reachable, but only through externalLink, so
  // the check is that any link in there is marked as leaving the page.
  const w: any = byPid("_wsmw0")._value;
  const asideLinks = [...(w?.querySelectorAll?.("a") ?? [])] as any[];
  r.aside = { asides: w?.querySelectorAll?.("aside").length ?? -1,
              links: asideLinks.map((a: any) => a.getAttribute("href")),
              unmarked: asideLinks.filter((a: any) => a.target !== "_blank" || !a.querySelector("svg")).length };
  // and the whole page: no reader-visible "mark" left in rendered prose
  const page = document.querySelector("#lopepage-2") as HTMLElement;
  const pageText = page?.innerText ?? "";
  r.markHits = pageText.match(/\b[Mm]arks?\b/g)?.length ?? 0;
  r.markWhere = [...pageText.matchAll(/\b[Mm]arks?\b/g)].map((m: any) =>
    pageText.slice(Math.max(0, m.index - 60), m.index + 60).replace(/\s+/g, " "));

  // a2sonqjpro: autosave must start OFF
  const rig: any = val("hexRigAutosave");
  const cb = rig?.querySelector?.("input[type=checkbox]");
  r.autosave = cb ? { checked: cb.checked } : "NO CHECKBOX";

  // a2usaazrq2: the truth rims are the imaged ellipse, not a circle. Measure the
  // drawn path against the circle it replaced (radiusPx about the same centre).
  const rw: any = val("rowWalkFrame");
  const paths = [...(rw?.querySelectorAll?.("path") ?? [])].filter((p: any) =>
    (p.getAttribute("stroke") || "") === "#e05ad0");
  const bank: any = val("hexFrameBank");
  const cfg: any = val("rowWalkCfg");
  const truth = bank?.[cfg?.frame]?.truth ?? [];
  const stats = paths.map((p: any) => {
    const d = p.getAttribute("d") || "";
    const pts = d.slice(1, -1).split("L").map((q: string) => q.split(",").map(Number));
    const cx = pts.reduce((a: number, q: number[]) => a + q[0], 0) / pts.length;
    const cy = pts.reduce((a: number, q: number[]) => a + q[1], 0) / pts.length;
    const rs = pts.map((q: number[]) => Math.hypot(q[0] - cx, q[1] - cy));
    const near = truth.reduce((b: any, t: any) =>
      !b || Math.hypot(t.x - cx, t.y - cy) < Math.hypot(b.x - cx, b.y - cy) ? t : b, null);
    return { aspect: Math.max(...rs) / Math.min(...rs),
             devPx: near ? Math.max(...rs.map((v: number) => Math.abs(v - near.radiusPx))) : null };
  });
  r.rims = { paths: paths.length, truth: truth.length,
             aspect: stats.length ? Math.max(...stats.map((s: any) => s.aspect)) : null,
             worstDevVsCirclePx: stats.length ? Math.max(...stats.map((s: any) => s.devPx ?? 0)) : null };

  // a2xam2pr75: the lazy-height reservation must come down once content lands
  const rep = document.querySelector('[cell="hexFrameReport"]') as HTMLElement | null;
  const inner = rep?.firstElementChild as HTMLElement | null;
  r.reserve = rep ? {
    hostH: Math.round(rep.getBoundingClientRect().height),
    contentH: inner ? Math.round(inner.getBoundingClientRect().height) : 0,
    minHeight: getComputedStyle(rep).minHeight,
    ruleFor: (document.getElementById("lazy-reserve-style")?.textContent ?? "").includes("hexFrameReport")
  } : "NOT MOUNTED";

  const strip = (x: any) => (typeof x === "string" ? x : (x && x.textContent) || String(x));
  r.audit = strip(val("sectionAudit")).replace(/\s+/g, " ").trim();
  form.value = orig; form.dispatchEvent(new Event("input", { bubbles: true }));
  return r;
});

const ok = (b: boolean) => (b ? "ok  " : "FAIL");
console.log(JSON.stringify(out, null, 1));
console.log(ok(/One scanline, 3 degrees-of-freedom/.test(out.section)), "section renamed");
console.log(ok(out.pruning?.tables === 2), "pruning table rendered");
console.log(ok(!!(out.pruning && out.pruning.funnel)), "funnel line present:", out.pruning?.funnel);
console.log(ok(out.pruning?.gates?.length === 5), "all five segmentation gates listed");
console.log(ok(out.derived.shown), `groupCap ${out.derived.groupCap} derived from nT=${out.derived.nT}, not hand-copied`);
const a = out.angles;
const spread = a.t0 !== null && a.t60 !== null ? Math.abs(a.t60 - a.t0) : 0;
console.log(ok(spread > 1), `fit-line angle moves with tilt: ${a.t0}° -> ${a.t24}° -> ${a.t60}° (spread ${spread.toFixed(2)}°)`);
console.log(ok(/PASS/.test(out.audit ?? "")), "sectionAudit:", (out.audit ?? "").slice(-60));
for (const line of out.prose ?? []) console.log(ok(/ DIV$/.test(line)), "prose", line);
console.log(ok(out.aside?.asides === 1 && out.aside?.unmarked === 0), "assembly-script is an aside, every link in it marked external:", JSON.stringify(out.aside));
// What is left is code surface, not prose: the section KEY, inspector property
// names (hexTarget.marks), and // comments inside the AssemblyScript source.
const CODEY = /[=(){}\[\]]|\/\/|⠿|=>/;
const prosey = (out.markWhere ?? []).filter((c: string) => !CODEY.test(c));
console.log(ok(prosey.length === 0), `rendered PROSE says "mark" ${prosey.length} times (${out.markHits} total, rest is code surface)`);
for (const c of prosey) console.log("     …" + c + "…");
console.log(ok(out.autosave?.checked === false), "autosave starts off:", JSON.stringify(out.autosave));
console.log(ok(out.rims?.paths > 0 && out.rims.paths === out.rims.truth && out.rims.aspect > 1.02),
  `truth rims are ellipses: ${out.rims?.paths}/${out.rims?.truth} drawn, worst aspect ${out.rims?.aspect?.toFixed(3)}, up to ${out.rims?.worstDevVsCirclePx?.toFixed(1)}px off the circle they replaced`);
const rs = out.reserve;
console.log(ok(!!rs && rs.contentH > 0 && Math.abs(rs.hostH - rs.contentH) < 24 && !rs.ruleFor),
  `hexFrameReport reservation released: host ${rs?.hostH}px vs content ${rs?.contentH}px (slack ${rs ? rs.hostH - rs.contentH : "?"}px), min-height ${rs?.minHeight}, rule still present: ${rs?.ruleFor}`);
console.log("pageerrors:", errs.length ? errs.slice(0, 4) : "none");
await browser.close();
