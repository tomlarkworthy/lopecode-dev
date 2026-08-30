// The board redesign ("Shipyard Concepts", Claude Design project f9a1c3c2, turns 7
// and 8), photographed through the gestures that replaced the menus. The headless
// gate and the click-through campaign both pass on the OLD flow too, because both
// go through the qa seam; only a real mouse drag from a shelf chip to a ghost, or
// from a port to a port, says whether the press table is wired to anything.
//
// usage: bun tools/corepox-board-shots.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1150}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text().slice(0, 220)); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
const shot = (n: string) => p.screenshot({path: `tools/screenshots/board-${n}.png`});
const qa = (fn: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa[f](...args);
}, [fn, a]);
// A tile in page pixels, from the game's own tileToView and the live viewBox --
// re-deriving the map here would be a copy that drifts the moment the camera does.
const pt = async (px: number, py: number) => p.evaluate(([x, y]: any) => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  const [vx, vy] = root.qa.tileToView(x, y);
  const svg = root.qa.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
  return {x: r.left + (vx - vb.x) / vb.width * r.width,
          y: r.top + (vy - vb.y) / vb.height * r.height};
}, [px, py]);
const drag = async (from: {x: number, y: number}, to: {x: number, y: number}, steps = 12) => {
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  for (let i = 1; i <= steps; i++)
    await p.mouse.move(from.x + (to.x - from.x) * i / steps,
                       from.y + (to.y - from.y) * i / steps);
  await p.mouse.up();
  await p.waitForTimeout(150);
};
const say = (k: string, v: any) => console.log(k.padEnd(30), v);

// ---- 1. place, by dragging a chip out of the shelf -------------------------
await p.waitForTimeout(600);
await shot("1-shelf");
const chip = p.locator('[data-part="Brain"]').first();
say("shelf has a Brain chip", await chip.count());
const cb = await chip.boundingBox();
await drag({x: cb!.x + cb!.width / 2, y: cb!.y + cb!.height / 2}, await pt(0, 0));
await p.waitForTimeout(300);
await shot("2-placed-by-drag");
say("parts after chip drag", (await qa("session")) && await p.evaluate(() => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa.session().player.live.map((c: any) => c.type).join(",");
}));

// ---- 2. wire, by dragging a port to a port ---------------------------------
await p.selectOption("select", "2");                  // `run`: teaches wiring, live
await skipIntro();
await p.waitForTimeout(1400);
await shot("3-ports-visible");
const wires0 = await p.evaluate(() => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa.session().player.conns.length;
});
// Constant at 0,1 -> Engine at 0,-1, which is the mission's own objective.
await p.mouse.move((await pt(0, 1)).x, (await pt(0, 1)).y);
await p.mouse.down();
const mid = await pt(0, 0);
await p.mouse.move(mid.x + 40, mid.y);
await p.waitForTimeout(120);
await shot("4-wire-mid-drag");
const end = await pt(0, -1);
await p.mouse.move(end.x, end.y); await p.mouse.up();
await p.waitForTimeout(400);
await shot("5-wired");
// A wire is a STRUCTURAL edit, so it takes a pause. `run` is live:true, so there
// was a clock running to take it from.
say("paused by the wire (structural)", await qa("paused"));
const wires1 = await p.evaluate(() => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  return root.qa.session().player.conns.length;
});
say("wires before / after one drag", `${wires0} -> ${wires1}`);

// ---- 3. scrub a value disc --------------------------------------------------
// `gunner` (ManualAim) is the mission that exists to make you type a number: its
// allow block is {modify: true} alone, and its Constant at 0,0 is the turret angle.
await p.selectOption("select", "3");
await skipIntro();
await p.waitForTimeout(1200);
const val = () => p.evaluate(() => {
  const root: any = [...document.querySelectorAll("div")].find((d: any) => d.qa);
  const c = root.qa.session().player.live.find((x: any) => x.type === "Constant");
  return c ? Number(c.param) : null;
});
say("paused on arrival at gunner", await qa("paused"));
const v0 = await val();
const disc = await pt(0, 0);
await p.mouse.move(disc.x, disc.y);
await p.mouse.down();
for (let i = 1; i <= 14; i++) await p.mouse.move(disc.x + i * 12, disc.y - i * 9);
await p.waitForTimeout(100);
await shot("6-scrub");
await p.mouse.up();
await p.waitForTimeout(300);
const v1 = await val();
say("constant, one scrub drag", `${v0} -> ${v1}`);

// ---- 4. a scrub does NOT pause ---------------------------------------------
// Tom, 2026-08-21: "I think its better if the game is not paused on adjusting
// values like constant. You need the feedback". This is the assertion that says
// the exemption is still wired -- if a later change routes setParam back through
// editPause it reads `true` here and nothing else in the suite would notice.
say("paused by the scrub (should be false)", await qa("paused"));
await shot("7-live-scrub");

// ---- 5. selection verbs, anchored ------------------------------------------
await qa("open", 0, 1);
await p.waitForTimeout(250);
say("anchored verbs", await p.locator("[data-verb]").count());
await shot("8-verbs");

// ---- 6. the phone ----------------------------------------------------------
// Back to a mission that HAS an inventory: `run` hands you a finished ship, so it
// has no shelf and would prove nothing about the phone's.
await p.selectOption("select", "0");
await skipIntro();
await p.waitForTimeout(900);
await qa("layout", "mobile");
await p.waitForTimeout(700);
await shot("9-phone");
await p.locator('[data-part]').first().click();
await p.waitForTimeout(400);
await shot("10-phone-holding");
say("phone shelf chips", await p.locator("[data-part]").count());

say("console errors", errs.length ? errs.join(" | ") : "none");
await b.close();
