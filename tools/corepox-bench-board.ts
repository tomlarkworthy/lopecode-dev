// The refit bench IS the board. This drives it the way a player does -- drag a
// chip out of the rail, drag a port to a port, scrub a disc -- and replaces
// corepox-bench-drive.ts and corepox-bench-menu.ts, which drove the mode rail and
// the tray that turn 9 retired ("Shipyard Concepts": "Refit is not a mode with its
// own furniture -- it is this board with the clock in HARD and the hold full").
// Those two went on passing against buttons a player can no longer see.
//
// It goes in through the MAP, not through the encounter's demo cell, because the
// map is the path a run actually takes and the bench inside a 675px map layer is
// where the launch control went missing last time.
//
//   bun tools/corepox-bench-board.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-map))");
await p.waitForTimeout(14000);
await p.click('[data-node="n1-1"]'); await p.waitForTimeout(300);
await p.click('[data-act="jump"]'); await p.waitForTimeout(2600);

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};
// Everything is read through the bench's own seam. Re-deriving the tile map here
// would be a copy that drifts the moment the camera does.
const read = () => p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  const s = el.value;
  return {parts: (s.components ?? []).map((c: any) => `${c.type}@${c.pos}:${c.dir ?? "up"}`).sort(),
          wires: (s.connections ?? []).map((k: any) => `${k.from}${k.fromPort}->${k.to}${k.toPort}`).sort(),
          hold: el.editor.qa.stock().map((i: any) => `${i.type}:${i.n}`).sort()};
});
const at = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  const q = el.editor.qa;
  const v = f === "tile" ? q.tileToView(args[0], args[1]) : q.portPoint(args[0], args[1], args[2]);
  if (!v) return null;
  const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return {x: r.left + (v[0] - vb.x) / vb.width * r.width,
          y: r.top + (v[1] - vb.y) / vb.height * r.height};
}, [fn, a] as any);
const tile = (px: number, py: number) => at("tile", px, py);
const port = (anchor: number[], name: string, kind: string) => at("port", anchor, name, kind);
// The DESTINATION is resolved after the press: arming a chip paints ghosts, and the
// camera feeds those in as focus points, so the viewBox moves between the moment a
// point is computed and the moment the finger arrives.
const dragTo = async (from: any, toFn: () => Promise<any>, steps = 12) => {
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  await p.mouse.move(from.x + 9, from.y + 9);
  await p.waitForTimeout(140);
  const to = await toFn();
  if (!to) { await p.mouse.up(); return false; }
  for (let i = 1; i <= steps; i++)
    await p.mouse.move(from.x + (to.x - from.x) * i / steps,
                       from.y + (to.y - from.y) * i / steps);
  await p.waitForTimeout(60);
  await p.mouse.up();
  await p.waitForTimeout(220);
  return true;
};
const chipBox = async (type: string) => {
  const l = p.locator(`[data-part="${type}"]`).first();
  return (await l.count()) ? await l.boundingBox() : null;
};
const centre = (bx: any) => ({x: bx.x + bx.width / 2, y: bx.y + bx.height / 2});
// A free cell touching the hull, from the board's own legality test via the ghosts
// it paints -- asking the ship directly would be a second offers() to keep in step.
// A cell the board will ACCEPT for this part, taken from the board's own ghost set
// rather than derived here. Re-deriving it as "any free neighbour" was fine while
// every part in play was one cell; an Engine is two, so once the hull had four
// Armour plates around it the derived cell was a ghost for an Armour and not for an
// Engine, and the drag placed nothing (2026-08-23, when the run start became a bare
// Brain and the gate started building differently).
const freeCell = (type: string) => p.evaluate((t) => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  return el.editor.qa.legal(t)[0] ?? null;
}, type);

const s0 = await read();
console.log("hull:", s0.parts.join(" "));
console.log("hold:", s0.hold.join(" ") || "empty");

// --- the rail IS the hold -------------------------------------------------
ok(await p.locator("[data-part]").count() > 0, "the bench opens on a rail of parts",
   `${await p.locator("[data-part]").count()} rows`);
ok(s0.hold.length > 0 && s0.hold.every((h: string) => !/:∞|:Infinity/.test(h)),
   "and the rail is the campaign's hold, not an unlimited palette", s0.hold.join(" "));

// --- place: one drag off a rail row ---------------------------------------
const type = s0.hold[0].split(":")[0];
const cell = await freeCell(type);
const cb = await chipBox(type);
ok(!!cb, `the rail offers a ${type} to drag`);
if (cb && cell) {
  await dragTo(centre(cb), () => tile(cell[0], cell[1]));
  await p.keyboard.press("Escape");
  const s1 = await read();
  ok(s1.parts.length === s0.parts.length + 1, "one drag off the rail places a part",
     `${s0.parts.length} -> ${s1.parts.length} parts`);
  const was = Number(s0.hold.find((h: string) => h.startsWith(type + ":"))!.split(":")[1]);
  const now = Number((s1.hold.find((h: string) => h.startsWith(type + ":")) ?? `${type}:0`).split(":")[1]);
  ok(now === was - 1, "and the hold pays for it", `${type} ${was} -> ${now}`);
}

// --- the hold cannot be overdrawn -----------------------------------------
// Drag the same type until the rail says 0, then try once more. The old bench let
// the editor overdraw and reloaded the last affordable design afterwards; the rail
// is meant to never offer it in the first place.
let guard = 0;
while (guard++ < 12) {
  const s: any = await read();
  const left = Number((s.hold.find((h: string) => h.startsWith(type + ":")) ?? `${type}:0`).split(":")[1]);
  if (left <= 0) break;
  const c = await freeCell(); const bx = await chipBox(type);
  if (!c || !bx) break;
  await dragTo(centre(bx), () => tile(c[0], c[1]));
  await p.keyboard.press("Escape");
}
const sEmpty = await read();
const emptied = !sEmpty.hold.some((h: string) => h.startsWith(type + ":"));
ok(emptied, `the rail runs the ${type} down to nothing`, sEmpty.hold.join(" ") || "empty");
if (emptied) {
  const before = (await read()).parts.length;
  const c = await freeCell(); const bx = await chipBox(type);
  if (bx && c) { await dragTo(centre(bx), () => tile(c[0], c[1])); await p.keyboard.press("Escape"); }
  ok((await read()).parts.length === before, "and an exhausted row places nothing",
     `${before} parts, unchanged`);
}

// --- wire: one drag, port to port -----------------------------------------
// The run starts with a bare Brain now (Tom, 2026-08-23), so BOTH ends of this wire
// have to be placed first. A Brain and an Armour carry no ports at all, so with the
// old starting hull gone there was no `out` anywhere on the board and the pair
// lookup returned null -- the Engine went down at (2,0) and the gate still reported
// "placed an Engine to wire into". The Constant is the source, and it is the disc
// the scrub step drives afterwards.
const ccell = await freeCell("Constant");
const cbx = await chipBox("Constant");
if (cbx && ccell) { await dragTo(centre(cbx), () => tile(ccell[0], ccell[1]));
                    await p.keyboard.press("Escape"); }

// Wire to a part this gate PLACED. When the bench's starting ship was
// Brain/Constant/Engine its one legal wire was already in the spec, so an
// "any out -> any in" pick re-made the wire that was already there and the count
// never moved -- which is how this read as a failure the first time round. The start
// is a bare Brain now, but placing the sink here is still what makes the assertion
// about a wire the gate drew.
const sink = "Engine";
const scell = await freeCell(sink);
const sbx = await chipBox(sink);
if (sbx && scell) { await dragTo(centre(sbx), () => tile(scell[0], scell[1])); await p.keyboard.press("Escape"); }
const pair = await p.evaluate(([sx, sy]: any) => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
  const ps = el.editor.qa.ports();
  const i = ps.find((q: any) => q.kind === "in" && q.anchor[0] === sx && q.anchor[1] === sy);
  const o = ps.find((q: any) => q.kind === "out" &&
                    !(q.anchor[0] === sx && q.anchor[1] === sy));
  return o && i ? {o: {a: o.anchor, n: o.name}, i: {a: i.anchor, n: i.name}} : null;
}, scell as any);
if (pair) {
  const w0 = (await read()).wires.length;
  const from = await port(pair.o.a, pair.o.n, "out");
  if (from) await dragTo(from, () => port(pair.i.a, pair.i.n, "in"));
  const w1 = (await read()).wires.length;
  ok(w1 > w0, "one drag from a port to a port makes a wire", `${w0} -> ${w1}`);
} else ok(false, `placed an ${sink} to wire into`);

// --- scrub: the disc is the control ---------------------------------------
const con = (await read()).parts.find((x: string) => x.startsWith("Constant"));
if (con) {
  const [cx, cy] = con.split("@")[1].split(":")[0].split(",").map(Number);
  const v0 = await p.evaluate(([x, y]: any) => {
    const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
    return Number(el.editor.qa.session().player.at(x, y)?.param) || 0;
  }, [cx, cy]);
  const d = await tile(cx, cy);
  await p.mouse.move(d.x, d.y); await p.mouse.down();
  for (let i = 1; i <= 14; i++) await p.mouse.move(d.x + i * 3, d.y - i * 9);
  await p.mouse.up(); await p.waitForTimeout(220);
  const v1 = await p.evaluate(([x, y]: any) => {
    const el: any = [...document.querySelectorAll("div")].find((e: any) => e.editor?.qa);
    return Number(el.editor.qa.session().player.at(x, y)?.param) || 0;
  }, [cx, cy]);
  ok(v1 !== v0, "dragging a Constant's disc scrubs it", `${v0} -> ${v1}`);
} else ok(false, "found a Constant to scrub");

// --- the launch control is on the board and reachable ----------------------
const launch = p.locator("button", {hasText: /LAUNCH/}).first();
ok(await launch.count() > 0, "LAUNCH is on the board");
if (await launch.count()) {
  const bx = await launch.boundingBox();
  const vp = p.viewportSize()!;
  ok(!!bx && bx.y >= 0 && bx.y + bx.height <= vp.height,
     "and it is inside the viewport, not off the bottom of the layer",
     bx ? `y=${Math.round(bx.y)}..${Math.round(bx.y + bx.height)} of ${vp.height}` : "no box");
}

console.log("\nerrors:", errs.slice(0, 5));
if (errs.length) fail++;
console.log(fail ? `FAIL: ${fail}` : "PASS");
await b.close();
process.exit(fail ? 1 : 0);
