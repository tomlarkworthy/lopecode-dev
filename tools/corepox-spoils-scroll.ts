// "When Duel cleared has multiple rows of items, the items part should scroll, not
// the whole dialoge so that the TAK button is offscreen" (Tom, 2026-08-23).
//
// Mounts spoilsPopup with enough cards to wrap onto a second row, in a viewport
// short enough to force the overflow, and asserts the TAKE button is inside the
// viewport and the panel is not taller than it.
//
//   bun tools/corepox-spoils-scroll.ts            -> tools/screenshots/spoils-scroll-*.png
import {chromium} from "playwright";
const b = await chromium.launch();
const errs: string[] = [];
const CASES = [
  // Tom's report, read off the screenshot: a 1930x1090 capture at dpr 2, so a
  // 965x545 CSS viewport. The panel is width:min(1060px,100%) yet spans nearly the
  // whole image, and the grid falls to 2 columns -- both only true at ~965 CSS px.
  {name: "reported-965x545", w: 965, h: 545, n: 3},
  {name: "6-cards-short", w: 1400, h: 760, n: 6},
  {name: "6-cards-tiny",  w: 1400, h: 560, n: 6},
  {name: "2-cards-tall",  w: 1400, h: 1000, n: 2},
  {name: "narrow-stack",  w: 720,  h: 760, n: 4},
];
let bad = 0;
for (const c of CASES) {
  const p = await b.newPage({viewport: {width: c.w, height: c.h}});
  p.on("pageerror", e => errs.push("pageerror: " + e.message));
  await p.goto("file://" + process.cwd() +
    "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel-encounter))");
  await p.waitForFunction(() => !!(window as any).__ojs_runtime, {timeout: 60000});
  await p.waitForTimeout(1200);
  const res = await p.evaluate(async (n: number) => {
    // corepox-board is imported, not booted, so it is not in `mains`; the encounter
    // module is, and it imports spoilsPopup -- read it out of that scope the way
    // tools/corepox-encounter-spoils.ts does.
    const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-duel-encounter");
    const cell = (k: string) => { for (const [n2, v] of m._scope) if (n2 === k) return (v as any)._value; };
    const pop = cell("spoilsPopup");
    const TYPES = cell("TYPES");
    const names = Object.keys(TYPES).filter(t => !/Rock|Ore|Vein|Slab|Spar/.test(t));
    // the real card shape spoilsOffer emits: {items: [{type, n}], rarity}
    const cards = Array.from({length: n}, (_, i) => ({
      items: [{type: names[i % names.length], n: 1 + (i % 3)}],
      rarity: ["common", "uncommon", "rare"][i % 3]}));
    // a real-sized stage, the way the encounter layer mounts it
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;inset:0;z-index:9999";
    document.body.append(stage);
    stage.append(pop({verb: "DUEL CLEARED", meta: "duel · column 1", note: "hull held",
                      cards, takeLabel: "TAKE & JUMP", onDone: () => {}}));
    await new Promise(r => setTimeout(r, 400));
    const btns = [...stage.querySelectorAll("*")].filter((e: any) =>
      /TAKE & JUMP/.test(e.textContent ?? "") && e.children.length === 0);
    const take = btns[btns.length - 1] as any;
    const panel: any = stage.querySelector(".cpx-spoils > div");
    const grid = [...stage.querySelectorAll("div")].find((d: any) =>
      d.scrollHeight > d.clientHeight + 2 && getComputedStyle(d).overflowY === "auto");
    const tb = take?.getBoundingClientRect();
    const pb = panel?.getBoundingClientRect();
    return {
      takeVisible: !!tb && tb.bottom <= innerHeight + 0.5 && tb.top >= -0.5,
      takeBottom: tb ? +tb.bottom.toFixed(1) : null,
      viewportH: innerHeight,
      panelH: pb ? +pb.height.toFixed(1) : null,
      panelFits: !!pb && pb.height <= innerHeight + 0.5,
      panelScrolls: panel ? panel.scrollHeight > panel.clientHeight + 2 : null,
      gridScrolls: !!grid,
      gridOverflow: grid ? grid.scrollHeight - grid.clientHeight : 0,
      gridBarPx: grid ? grid.offsetWidth - grid.clientWidth : null,
      chain: (() => {
        const out: string[] = [];
        let e: any = take;
        while (e && e !== stage) {
          const cs = getComputedStyle(e);
          out.push(`${e.tagName.toLowerCase()}${e.className ? "." + e.className : ""} ` +
            `h=${e.getBoundingClientRect().height.toFixed(0)} scroll=${e.scrollHeight} ` +
            `flex=${cs.flex} minH=${cs.minHeight} ovY=${cs.overflowY}`);
          e = e.parentElement;
        }
        return out;
      })(),
      cardCols: (() => {
        const g: any = [...stage.querySelectorAll("div")]
          .find((d: any) => getComputedStyle(d).display === "grid");
        return g ? getComputedStyle(g).gridTemplateColumns.split(" ").length : null;
      })()
    };
  }, c.n);
  await p.screenshot({path: `tools/screenshots/spoils-scroll-${c.name}.png`});
  if (process.env.CHAIN) res.chain.forEach((l: string) => console.log("       | " + l));
  const ok = res.takeVisible && res.panelFits && !res.panelScrolls;
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${c.name.padEnd(15)} ${c.w}x${c.h}, ${c.n} cards`);
  console.log(`       TAKE bottom ${res.takeBottom} of ${res.viewportH} viewport   panel ${res.panelH}px`);
  console.log(`       ${res.cardCols} card columns   panel scrolls ${res.panelScrolls}   grid scrolls ${res.gridScrolls}` +
              (res.gridScrolls ? ` (${res.gridOverflow}px hidden, ${res.gridBarPx}px bar)` : ""));
  await p.close();
}
await b.close();
if (errs.length) { console.log("\npage errors:"); errs.slice(0, 5).forEach(e => console.log("  " + e)); }
console.log(bad ? `\nFAIL: ${bad} of ${CASES.length} layouts put TAKE out of reach` : "\nPASS");
process.exit(bad || errs.length ? 1 : 0);
