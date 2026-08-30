// Four reports from Tom, 2026-08-22, all about what a press is allowed to do:
//
//   1. "when moving components on the shipyard, a rotated component does not
//      compute its footprint rotated"
//   2. "on missions the auto player does not shoot weapons when space is pressed"
//   3. "if a component is selected for placement, you cannot access the rotation
//      menu for anything, this feels off"
//   4. "after moving a component to leave a space, I cannot place a component
//      back into that space"
//
// 1 and 3 are driven on the refit bench (freeBuild, every verb allowed); 2 and 4
// need a MISSION, because 4 is a property of the recorded build envelope and 2 of
// the clock. SideShooter is the mission for 4: all three of its ship's parts sit
// outside its own 6-cell envelope (tools/scratch/env-gap.ts).
//
//   bun tools/corepox-move-place.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};
const boot = async (module: string) => {
  await p.goto("file://" + process.cwd() +
    `/lopebooks/notebooks/corepox.html#view=R100(S100(${module}))`);
  await p.waitForTimeout(14000);
  await p.evaluate((f) => { (window as any).__cpxFind = f; }, FIND);
  // The board sits below the fold in a one-pane layout, and a click at a y the
  // viewport does not contain lands nowhere at all -- observed as a press that
  // changed neither the selection nor the held chip (tools/scratch/bug3.ts).
  await p.evaluate(() => (0, eval)((window as any).__cpxFind).svg()
    .scrollIntoView({block: "center"}));
  await p.waitForTimeout(700);
};
// Everything goes through the board's own seam; a second copy of the tile map here
// would drift the moment the camera does.
// The bench hangs its seam on `.editor.qa`, the campaign on `.qa` -- one finder
// for both, so the same driver runs on either screen.
const FIND = `(() => { const d = [...document.querySelectorAll("div")]
  .find(e => e.editor?.qa?.session || e.qa?.session);
  return d.editor?.qa ?? d.qa; })()`;
const Q = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const q: any = (0, eval)((window as any).__cpxFind);
  const ship = () => q.session().player;          // REPLACED by every edit
  if (f === "state") return {
    parts: ship().comps.map((c: any) => `${c.type}@${c.px},${c.py}:${c.dir}`),
    tiles: Object.fromEntries(ship().comps.map((c: any) =>
      [`${c.type}@${c.px},${c.py}`, c.tiles.map((t: any) => t.join(",")).join(" ")])),
    stock: q.stock().map((i: any) => `${i.type}x${i.n}`),
    sel: q.sel(), picked: q.picked(), state: q.session().state,
    fire: q.session().cmd?.fire ?? null};
  if (f === "open") { q.open(args[0], args[1]); return q.sel(); }
  if (f === "menu") return q.menu(args[0]);
  if (f === "pick") { q.pick(args[0]); return q.picked(); }
  if (f === "legal") return q.legal(args[0]);
  if (f === "legalFor") return q.legalFor(args[0], args[1]);
  if (f === "env") return (q.session().mission.envelope ?? []).map((c: any) => c.join(","));
  if (f === "select") { q.select(args[0]); q.skipIntro?.(); return q.mission?.(); }
  if (f === "play") { q.skipIntro?.(); q.play(); return q.session().state; }
  if (f === "verbs") return [...document.querySelectorAll("[data-verb]")].map((e: any) =>
    e.getAttribute("data-verb"));
  return null;
}, [fn, a] as any);
const has = (l: any, x: number, y: number) => !!l?.some((c: any) => c[0] === x && c[1] === y);
const screen = (px: number, py: number) => p.evaluate(([x, y]: any) => {
  const q: any = (0, eval)((window as any).__cpxFind), v = q.tileToView(x, y);
  const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return {x: r.left + (v[0] - vb.x) / vb.width * r.width,
          y: r.top + (v[1] - vb.y) / vb.height * r.height};
}, [px, py]);

// ---- 1 and 3, on the refit bench -------------------------------------------
await boot("@tomlarkworthy/corepox-duel-encounter");
const start: any = await Q("state");
console.log("bench", JSON.stringify(start.parts), JSON.stringify(start.stock));

// An Engine is [[0,0],[0,-1]]. Turned once it is [[0,0],[-1,0]], so anchoring it
// at (1,0) would put its second cell on the Brain at (0,0). The unrotated test
// reads (1,0)+(1,-1), both free, and offers the drop.
await Q("open", 0, -1);
await Q("menu", "rotate");
const rot: any = await Q("state");
ok(rot.tiles["Engine@0,-1"] === "0,-1 -1,-1", "1. engine turns",
   rot.tiles["Engine@0,-1"]);
const lf = await Q("legalFor", 0, -1);
ok(!has(lf, 1, 0), "1. rotated footprint refuses the cell that overlaps the Brain",
   JSON.stringify(lf));

// 3. arm a chip, then reach past it and press the hull: the chip goes back and the
//    part's verbs appear. Before the fix the chip stayed armed and verbBar()
//    returned null, so the selection had no menu at all.
await p.keyboard.press("Escape");                 // drop the selection the rotate left
await p.waitForTimeout(200);
await Q("pick", "Armour");
// Arming a chip paints ghosts and the camera takes them as focus points, so the
// viewBox is still easing for several frames -- resolve the target AFTER it settles.
await p.waitForTimeout(1200);
const brain = await screen(0, 0);
await p.mouse.click(brain.x, brain.y);
await p.waitForTimeout(300);
const after3: any = await Q("state");
const verbs = await Q("verbs") as string[];
ok(after3.picked == null, "3. pressing the hull puts the held chip back", String(after3.picked));
ok(after3.sel && after3.sel.px === 0 && after3.sel.py === 0, "3. that press selects the part",
   JSON.stringify(after3.sel));
ok(verbs.includes("rotate"), "3. the verb bar is reachable", JSON.stringify(verbs));

// ---- 2 and 4, on a mission --------------------------------------------------
await boot("@tomlarkworthy/corepox-game");
await Q("select", 10);                            // SideShooter
await p.waitForTimeout(1200);
const env = await Q("env") as string[];
const m: any = await Q("state");
console.log("mission", JSON.stringify(m.parts), "env", JSON.stringify(env));

// 4. The Lazer at (0,1) is outside the envelope. Move it, then ask whether the
//    cell it left is offered to something coming off the rail.
const lz = await Q("legalFor", 0, 1) as any[];
const dest = lz.find((c: any) => !(c[0] === 0 && c[1] === 1));
ok(!!dest, "4. the part can move at all", JSON.stringify(lz));
await Q("open", 0, 1); await Q("menu", "move"); await Q("open", dest[0], dest[1]);
const moved: any = await Q("state");
ok(moved.parts.some((s: string) => s.startsWith(`Lazer@${dest[0]},${dest[1]}`)),
   "4. the move commits", JSON.stringify(moved.parts));
const back = await Q("legal", "Armour");
ok(has(back, 0, 1), "4. the vacated cell is offered again", JSON.stringify(back));

// 2. Space, while the clock runs, fires.
await Q("play");
await p.waitForTimeout(600);
const playing: any = await Q("state");
ok(playing.state === "playing", "2. the mission is live", playing.state);
await p.keyboard.down("Space");
await p.waitForTimeout(120);
const down: any = await Q("state");
await p.keyboard.up("Space");
await p.waitForTimeout(120);
const up: any = await Q("state");
ok(down.fire === true, "2. space down fires", String(down.fire));
ok(up.fire === false, "2. space up stops", String(up.fire));

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 5).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
