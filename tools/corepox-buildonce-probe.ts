// buildOnce is FollowBoss and only FollowBoss (mission-settings.json). Pressing
// play must take the BUILD stock away there and leave it alone everywhere else,
// and a restart must give back the ship you took into the fight rather than the
// bare core the scene starts from (MissionResponse.retry with current_json).
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const qa = () => p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
});
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();
let bad = 0;
for (const [i, name, once] of [[1, "Cocoon", false], [9, "FollowBoss", true]] as [number, string, boolean][]) {
  await p.selectOption("select", String(i));
  await skipIntro();
  await p.waitForTimeout(400);
  const h = await qa();
  const r = await p.evaluate(async (q: any) => {
    const before = q.stock().length, parts0 = q.session().player.comps.length;
    // one extra part, so a restart that forgets is visible as a part count
    const item = q.stock()[0];
    for (const [x, y] of q.session().mission.envelope ?? [[0, -3]]) {
      if (!item || q.session().player.comps.length > parts0) break;
      q.pick(item.type); q.open(x, y);
    }
    const parts1 = q.session().player.comps.length;
    q.play();
    await new Promise(r => setTimeout(r, 300));
    const after = q.stock().length;
    q.restart();
    await new Promise(r => setTimeout(r, 300));
    return {before, after, parts0, parts1, parts2: q.session().player.comps.length,
            state: q.session().state};
  }, h);
  const gone = r.after === 0 && r.before > 0;
  const remembered = r.parts2 === r.parts1;
  const ok = once ? (gone && remembered) : (!gone && r.parts2 === r.parts0);
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(11)} stock ${r.before}->${r.after}` +
              `  parts ${r.parts0}->${r.parts1} restart ${r.parts2}`);
}
await b.close();
console.log(bad ? `${bad} failed` : "buildOnce models FollowBoss and nothing else");
process.exit(bad ? 1 : 0);
