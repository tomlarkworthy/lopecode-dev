// The Radar sightline, on the board. Loads a mission's reference solution through
// the qa seam so both radars (player's and the Gun Boat's) have something to lock.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const root = () => p.evaluateHandle(() => document.querySelector(".cpx-game") ?? document.body);
for (const arg of process.argv.slice(2)) {
  const [i, secs] = arg.split(":");
  await p.selectOption("select", i);
  await p.evaluate(() => {
    const el: any = [...document.querySelectorAll("*")].find((e: any) => e.qa);
    el.qa.skipIntro();
    const S = el.qa.session();
    const spec = S.mission.solution;
    if (spec) {
      const W: any = S.world, Ship = S.player.constructor;
      const q = new Ship({name: "player", ...spec}, {team: "player", x: 0, y: 0, a: 0});
      W.ships[0] = q; S.player = q;
    }
    el.qa.play();
  });
  await p.waitForTimeout(Number(secs ?? 5) * 1000);
  await p.screenshot({path: `tools/screenshots/radar-${i}.png`});
  console.log("shot", i, await p.evaluate(() => {
    const el: any = [...document.querySelectorAll("*")].find((e: any) => e.qa);
    const S = el.qa.session();
    return S.world.ships.flatMap((s: any) => s.live.filter((c: any) => c.type === "Radar")
      .map((c: any) => `${s.team} radar lock=${c.lock ? c.lock.map((v: number) => v.toFixed(1)).join(",") : "none"}`));
  }));
}
await b.close();
