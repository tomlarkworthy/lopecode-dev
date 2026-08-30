// What pose does the UI actually leave, per mission? corepox-build-pose.ts models
// it; this reads it, so the model can be checked rather than assumed.
import {chromium} from "playwright";
import {importNotebookModule} from "../notebook-import.ts";
const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1200}});
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
const skip = async () => { for (let i=0;i<8 && await p.locator(".cpx-cutscene").count();i++){ await p.click(".cpx-cutscene"); await p.waitForTimeout(90);} };
await skip();
for (const id of (process.argv.slice(2).length ? process.argv.slice(2) : ["FollowBoss","TwinTurrets"])) {
  const i = MISSIONS.findIndex(m => m.id === id);
  await p.selectOption("select", String(i)); await skip(); await p.waitForTimeout(900);
  await p.evaluate(() => { (window as any).__r=[...document.querySelectorAll("div")].find((d:any)=>d.qa); });
  const m = MISSIONS[i];
  const have = new Set((m.ship?.components ?? []).map((c:any)=>`${c.type}@${c.pos}`));
  for (const c of (m.solution?.components ?? [])) {
    if (have.has(`${c.type}@${c.pos}`)) continue;
    const chip = p.locator(`[data-part="${c.type}"]`).first();
    if (!await chip.count()) continue;
    const bb = await chip.boundingBox(); if (!bb) continue;
    const c0 = {x: bb.x+bb.width/2, y: bb.y+bb.height/2};
    await p.mouse.move(c0.x, c0.y); await p.mouse.down();
    await p.mouse.move(c0.x+9, c0.y+9); await p.waitForTimeout(130);
    const to = await p.evaluate(([x,y]:any)=>{ const r:any=(window as any).__r;
      const [vx,vy]=r.qa.tileToView(x,y); const s=r.qa.svg(), q=s.getBoundingClientRect(), vb=s.viewBox.baseVal;
      return {x:q.left+(vx-vb.x)/vb.width*q.width, y:q.top+(vy-vb.y)/vb.height*q.height};}, c.pos as any);
    for (let k=1;k<=12;k++) await p.mouse.move(c0.x+(to.x-c0.x)*k/12, c0.y+(to.y-c0.y)*k/12);
    await p.mouse.up(); await p.keyboard.press("Escape"); await p.waitForTimeout(140);
  }
  console.log(id.padEnd(16), await p.evaluate(()=>{ const r:any=(window as any).__r; const P=r.qa.session().player;
    return `x ${P.x.toFixed(3)} y ${P.y.toFixed(3)}  parts ${P.live.length}`; }));
}
await b.close();
