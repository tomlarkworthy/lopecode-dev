// What does a drag MEAN? The same gesture is bound differently in build and play,
// and a design doc should not have to take the code's word for it.
//
// During play the viewBox moves on its own (the camera follows the ship), so a
// single reading cannot say whether a drag panned it. The play arm is therefore a
// CONTROLLED pair: identical mission, identical elapsed time, drag in one arm and
// an equal wait in the other. The engine is deterministic (tools/corepox-duel-check.ts
// reports "same seed twice: IDENTICAL"), so any difference is the drag.
import {chromium} from "playwright";
const b = await chromium.launch();
const run = async (dragIt: boolean, buildArm = false) => {
  const p = await b.newPage({viewport: {width: 1280, height: 900}});
  await p.goto("file://" + process.cwd() +
    "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
  await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 90000});
  const qa = () => p.evaluateHandle(() => {
    const el: any = [...document.querySelectorAll("*")].find((e: any) => e.qa);
    return el.qa;
  });
  const read = async () => p.evaluate((q: any) => {
    const S = q.session(), v = q.svg();
    return {state: S.state, vb: v.getAttribute("viewBox"),
            cmd: S.cmd ? {target: S.cmd.target?.map((n: number) => +n.toFixed(2)) ?? null,
                          face: S.cmd.face == null ? null : +S.cmd.face.toFixed(1)} : null};
  }, await qa());
  const box = async () => {
    await p.evaluate((q: any) => q.svg().setAttribute("data-board", "1"), await qa());
    return (await p.locator("svg[data-board]").boundingBox())!;
  };
  const drag = async (fx: number, fy: number, tx: number, ty: number) => {
    const r = await box();
    await p.mouse.move(r.x + r.width * fx, r.y + r.height * fy);
    await p.mouse.down();
    await p.mouse.move(r.x + r.width * tx, r.y + r.height * ty, {steps: 12});
    await p.mouse.up();
  };
  await p.evaluate((q: any) => q.skipIntro(), await qa());
  await p.selectOption("select", "9");                    // FollowBoss has a build phase
  await p.evaluate((q: any) => q.skipIntro(), await qa());
  await p.waitForTimeout(500);

  const out: string[] = [];
  if (buildArm) {                                         // reported once, not part of the pair
    const a = await read();
    await drag(0.25, 0.3, 0.55, 0.6); await p.waitForTimeout(250);
    const c = await read();
    out.push(`BUILD  state=${a.state}`,
             `  viewBox     ${a.vb}  ->  ${c.vb}`,
             `  pilot cmd   ${JSON.stringify(c.cmd)}`,
             `  recentre pad appears: ${await p.locator('[title="recentre"]').count() > 0}`);
  }
  if (buildArm) { await p.close(); return {out, vb: ""}; }
  await p.evaluate((q: any) => q.play(), await qa());
  await p.waitForTimeout(300);
  const a = await read();
  if (dragIt) await drag(0.25, 0.3, 0.55, 0.6);
  await p.waitForTimeout(900);
  const c = await read();
  out.push(`PLAY   ${dragIt ? "with drag" : "control, no drag"}`,
           `  viewBox     ${a.vb}  ->  ${c.vb}`,
           `  pilot cmd   ${JSON.stringify(c.cmd)}`);
  await p.close();
  return {out, vb: c.vb!};
};
const bld = await run(false, true), ctl = await run(false), dr = await run(true);
console.log([...bld.out, ...ctl.out, ...dr.out].join("\n"));
const d = (a: string, b: string) => a.split(/\s+/).map(Number)
  .map((v, i) => +(v - b.split(/\s+/).map(Number)[i]).toFixed(1)).join(" ");
console.log(`\nplay viewBox, drag arm minus control arm: ${d(dr.vb, ctl.vb)}`);
console.log("(x y w h; a pan shows as x/y moving with w/h unchanged)");
await b.close();
