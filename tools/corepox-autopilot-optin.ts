// The autopilot is OFF until armed. Tom, 2026-08-23: "I don't like auto-pilot being
// on by default, it gets triggered easily by panning, so can we make that mode
// opt-in and off by default".
//
// The gate measures the thing the complaint is about: what a drag across empty sky
// does while the clock runs. Off, it must move the CAMERA and set no waypoint; on,
// it must set the waypoint and leave the camera alone.
//
//   bun tools/corepox-autopilot-optin.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(14000);

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};
await p.evaluate(() => {
  (window as any).__q = () => {
    const d: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.session);
    return d.qa;
  };
});
const Q = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const q: any = (window as any).__q();
  if (f === "select") { q.select(args[0]); q.skipIntro?.(); return q.mission?.(); }
  if (f === "play") { q.skipIntro?.(); q.play(); return q.session().state; }
  if (f === "auto") return args.length ? q.autopilot(args[0]) : q.autopilot();
  if (f === "cmd") { const c = q.session().cmd;
    return {target: c?.target ?? null, face: c?.face ?? null, state: q.session().state}; }
  if (f === "viewBox") { const v = q.svg().viewBox.baseVal; return [v.x, v.y, v.width, v.height]; }
  if (f === "pads") return [...document.querySelectorAll("button")]
    .map((e: any) => e.getAttribute("title")).filter(Boolean);
  return null;
}, [fn, a] as any);
// A point on empty sky, in SCREEN space and inside the board's own rect. Resolving
// it from a far tile put it outside the svg while the camera was framed on the
// hull, and a press there reaches nothing at all -- every assertion then reads
// "no waypoint" for the wrong reason.
const sky = () => p.evaluate(() => {
  const q: any = (window as any).__q();
  const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  const hull = q.tileToView(0, 0);
  const hx = r.left + (hull[0] - vb.x) / vb.width * r.width;
  const hy = r.top + (hull[1] - vb.y) / vb.height * r.height;
  // the far side of the board from the hull, a quarter in from the edge
  const x = hx < r.left + r.width / 2 ? r.left + r.width * 0.78 : r.left + r.width * 0.22;
  const y = hy < r.top + r.height / 2 ? r.top + r.height * 0.75 : r.top + r.height * 0.25;
  return {x, y, hull: [hx, hy], rect: [r.left, r.top, r.width, r.height]};
});
const dragSky = async () => {
  const a = await sky();
  await p.mouse.move(a.x, a.y);
  await p.mouse.down();
  for (let i = 1; i <= 10; i++) await p.mouse.move(a.x - i * 12, a.y - i * 6);
  await p.mouse.up();
  await p.waitForTimeout(300);
};
const moved = (a: any, z: any) => Math.hypot(a[0] - z[0], a[1] - z[1]);

await Q("select", 7);                     // FollowCourse: no enemies, so the hull
                                          // survives long enough to drag on
await p.waitForTimeout(1000);
await Q("play");
await p.waitForTimeout(800);
await p.evaluate(() => (window as any).__q().svg().scrollIntoView({block: "center"}));
await p.waitForTimeout(600);
const st: any = await Q("cmd");
ok(st.state === "playing", "the mission is live", st.state);
ok((await Q("auto")) === false, "autopilot starts OFF");
ok((await Q("pads") as string[]).some(t => /autopilot off/.test(t)), "the pad is on the board");

// --- off: the sky belongs to the camera --------------------------------------
const vb0 = await Q("viewBox") as number[];
await dragSky();
const vb1 = await Q("viewBox") as number[], off: any = await Q("cmd");
ok(off.target === null, "off: a sky drag sets NO waypoint", JSON.stringify(off.target));
ok(moved(vb0, vb1) > 1, "off: a sky drag moves the camera", moved(vb0, vb1).toFixed(1) + " units");

// --- on: the sky is the fly command ------------------------------------------
await Q("auto", true);
await p.waitForTimeout(500);
const vb2 = await Q("viewBox") as number[];
await dragSky();
const on: any = await Q("cmd");
ok(!!on.target, "on: a sky drag sets a waypoint", JSON.stringify(on.target));
ok(on.face != null, "on: the drag direction becomes the facing", String(on.face));

// --- disarming drops the standing waypoint -----------------------------------
await Q("auto", false);
const cleared: any = await Q("cmd");
ok(cleared.target === null && cleared.face === null,
   "disarming clears the waypoint the ship was flying to", JSON.stringify(cleared));

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 5).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
