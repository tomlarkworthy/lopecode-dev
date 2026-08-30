// A panned camera used to keep sliding, because `pan` is an offset from the
// auto-frame and the auto-frame re-measures every framed ship and focus point on
// every draw. The claim to test is not "can I pan" but "does the view stay where I
// left it while the scene changes underneath".
//
// It is tested against a CONTROL, because "the viewBox did not change" passes for
// a scene that never changed. The same action is performed twice -- attached, where
// it must move the camera, and detached, where it must not. Arming a rail chip is
// the action: its ghosts are fed to the camera as focus points, so it perturbs the
// auto-frame's box without changing the ship.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push(e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(14000);
await p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.play);
  el.qa.skipIntro?.();
});
await p.waitForTimeout(2000);

let fail = 0;
const ok = (c: any, l: string, d = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${l}${d ? "   " + d : ""}`); if (!c) fail++;
};
const box = () => p.evaluate(() => {
  const el: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.play);
  const vb = el.qa.svg().viewBox.baseVal;
  return [vb.x, vb.y, vb.width, vb.height].map((n: number) => Math.round(n));
});
const svgRect = async () => {
  const h: any = await p.evaluateHandle(() => {
    const d: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.play);
    return d.qa.svg();
  });
  return (h as any).asElement().boundingBox();
};
const drift = (a: number[], c: number[]) => Math.round(Math.hypot(a[0] - c[0], a[1] - c[1]));
const reset = async () => {
  const c = p.locator('button[title="recentre"]');
  if (await c.count()) { await c.click(); await p.waitForTimeout(900); }
};
// Arm the chip, sample, disarm. The press is a pointerdown on the rail row, which
// is what a player does; clicking it also arms, and Escape puts it back.
const armAndMeasure = async () => {
  const before = await box();
  await p.locator("[data-part]").first().click();
  await p.waitForTimeout(700);
  const during = await box();
  await p.keyboard.press("Escape");
  await p.waitForTimeout(400);
  return {before, during, moved: drift(before, during)};
};

// --- control: attached, the same action MUST move the camera -----------------
await reset();
const ctl = await armAndMeasure();
ok(ctl.moved > 8, "CONTROL — attached, arming a chip moves the camera",
   `${ctl.before.join(" ")} -> ${ctl.during.join(" ")}, ${ctl.moved}px`);

// --- pan, which should detach ------------------------------------------------
const r = (await svgRect())!;
await p.keyboard.down("Space");
await p.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.5);
await p.mouse.down();
for (let i = 1; i <= 10; i++)
  await p.mouse.move(r.x + r.width * 0.5 - i * 14, r.y + r.height * 0.5 - i * 9);
await p.mouse.up();
await p.keyboard.up("Space");
await p.waitForTimeout(600);
const panned = await box();
ok(drift(panned, ctl.before) > 20, "the pan moved the view", panned.join(" "));

// --- and now the same action must NOT ----------------------------------------
const det = await armAndMeasure();
ok(det.moved <= 2, "detached, arming the same chip leaves the camera alone",
   `${det.before.join(" ")} -> ${det.during.join(" ")}, ${det.moved}px`);
ok(drift(det.during, panned) <= 2, "and it is still where the pan left it",
   `${panned.join(" ")} vs ${det.during.join(" ")}`);

// --- the recentre pad is the only way back, so it has to be offered ----------
const centre = p.locator('button[title="recentre"]');
ok(await centre.count() > 0, "the recentre pad is offered while detached");
if (await centre.count()) {
  await centre.click(); await p.waitForTimeout(900);
  const back = await box();
  ok(drift(back, panned) > 20, "and it re-attaches", `${panned.join(" ")} -> ${back.join(" ")}`);
  const again = await armAndMeasure();
  ok(again.moved > 8, "re-attached, the camera follows again", `${again.moved}px`);
}
console.log("errors:", errs.slice(0, 3));
if (errs.length) fail++;
console.log(fail ? `FAIL: ${fail}` : "PASS");
await b.close();
process.exit(fail ? 1 : 0);
