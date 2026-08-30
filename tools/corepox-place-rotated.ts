// Placing a part already turned. Tom, 2026-08-23: "we should be able to place
// components rotated, I think there should be a rotate button above the shelf,
// which will rotate all the parts in the shelf and also when placed. Also I think
// the ghosts are not rotated currently."
//
// Three claims, all measured on the refit bench: the button turns the RAIL (not one
// chip), the ghost outline is the rotated footprint, and what lands carries the
// rotation. The Engine is the part that shows it -- two cells, so up and right are
// different shapes rather than the same square drawn twice.
//
//   bun tools/corepox-place-rotated.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel-encounter))");
await p.waitForTimeout(14000);

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};
await p.evaluate(() => {
  (window as any).__q = () => {
    const d: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
    return d.editor.qa;
  };
  (window as any).__q().svg().scrollIntoView({block: "center"});
});
await p.waitForTimeout(600);
const Q = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const q: any = (window as any).__q();
  const ship = () => q.session().player;
  if (f === "state") return ship().comps.map((c: any) =>
    `${c.type}@${c.px},${c.py}:${c.dir} [${c.tiles.map((t: any) => t.join(",")).join(" ")}]`);
  if (f === "rot") return args.length ? q.rot(args[0]) : q.rot();
  if (f === "pick") { q.pick(args[0]); return q.picked(); }
  if (f === "legal") return q.legal(args[0]);
  // Every ghost cell the overlay actually DREW, in tile coordinates, read back off
  // the rects rather than recomputed -- the point is whether the outline agrees
  // with the legality test, so it cannot be derived from the same source.
  if (f === "ghosts") {
    const svg = q.svg();
    const out: any[] = [];
    for (const g of svg.querySelectorAll("g[transform]")) {
      for (const r of g.querySelectorAll(":scope > rect[stroke-dasharray], :scope > rect")) {
        const t = g.getAttribute("transform");
        const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(t ?? "");
        if (!m || !r.getAttribute("rx")) continue;
        out.push({at: [+m[1], +m[2]], x: +r.getAttribute("x"), y: +r.getAttribute("y")});
      }
    }
    return out.length;
  }
  return null;
}, [fn, a] as any);
// The board's own tile map, so the press lands where the ghost is.
const at = (px: number, py: number) => p.evaluate(([x, y]: any) => {
  const q: any = (window as any).__q(), v = q.tileToView(x, y);
  const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return {x: r.left + (v[0] - vb.x) / vb.width * r.width,
          y: r.top + (v[1] - vb.y) / vb.height * r.height};
}, [px, py]);
const eq = (a: any[], z: any[]) => JSON.stringify(a.map(String).sort()) === JSON.stringify(z.map(String).sort());

console.log("start", JSON.stringify(await Q("state")));

// --- the button is above the shelf and turns the whole rail -------------------
const rotBtn = p.locator("[data-rot]").first();
ok(await rotBtn.count() > 0, "there is a rotate control on the shelf");
ok((await Q("rot")) === 0, "and the rail starts pointing up", String(await Q("rot")));
await rotBtn.click();
await p.waitForTimeout(300);
ok((await Q("rot")) === 90, "one press turns it a quarter", String(await Q("rot")));

// --- the legal set is the ROTATED footprint ----------------------------------
// An Engine is [[0,0],[0,-1]]. At 0 it needs the cell below its anchor; at 90 it
// needs the one to the left, so the two sets are genuinely different.
await Q("rot", 0);
const up = await Q("legal", "Engine") as any[];
await Q("rot", 90);
const right = await Q("legal", "Engine") as any[];
ok(!eq(up, right), "turning the rail changes which anchors an Engine may take",
   `up ${JSON.stringify(up)}  right ${JSON.stringify(right)}`);

// --- the ghost is drawn, and what lands carries the rotation ------------------
await Q("pick", "Engine");
await p.waitForTimeout(900);
ok((await Q("ghosts") as number) > 0, "ghosts are painted while a part is held",
   String(await Q("ghosts")));
const cell = (await Q("legal", "Engine") as any[])[0];
const pt = await at(cell[0], cell[1]);
await p.mouse.click(pt.x, pt.y);
await p.waitForTimeout(500);
const after = await Q("state") as string[];
const placed = after.find((x) => x.startsWith("Engine@" + cell.join(",")));
ok(!!placed, `an Engine lands on ${cell.join(",")}`, after.join("  "));
ok(!!placed && placed.includes(":90"), "and it lands TURNED, not upright", placed ?? "-");
// [0,0]+[-1,0] is the 90-degree footprint; [0,0]+[0,-1] would be upright.
const want = `${cell[0]},${cell[1]} ${cell[0] - 1},${cell[1]}`;
ok(!!placed && placed.includes(want), "its cells are the rotated pair", placed ?? "-");

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 5).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
