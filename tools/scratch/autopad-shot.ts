import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(14000);
await p.evaluate(() => { (window as any).__q = () => {
  const d: any = [...document.querySelectorAll("div")].find((e: any) => e.qa?.session); return d.qa; }; });
const Q = (f: string, ...a: any[]) => p.evaluate(([f, args]: any) => {
  const q: any = (window as any).__q();
  if (f === "select") { q.select(args[0]); q.skipIntro?.(); return q.mission?.(); }
  if (f === "play") { q.skipIntro?.(); q.play(); return q.session().state; }
  if (f === "auto") { q.autopilot(args[0]); return q.autopilot(); }
  return null;
}, [f, a] as any);
await Q("select", 7); await p.waitForTimeout(900);
await Q("play"); await p.waitForTimeout(1200);
const el = async () => (await p.evaluateHandle(() => (window as any).__q().svg().parentElement) as any).asElement();
for (const [name, on] of [["off", false], ["armed", true]] as any) {
  await Q("auto", on); await p.waitForTimeout(500);
  const e = await el(); await e.scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
  await e.screenshot({path: `tools/screenshots/autopilot-${name}.png`});
  console.log(name, "shot");
}
await b.close();
