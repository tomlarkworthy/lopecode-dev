// The camera, as three questions a screenshot cannot answer:
//   does the wheel hold the point under the cursor, does a drag pan, and does
//   opening a menu move the view? All three are Tom's, 2026-08-20.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1200, height: 900}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await p.selectOption("select", "2");            // run: a Constant, an Engine, one wire to make
await p.waitForTimeout(1500);

// the game's OWN svg, via the QA seam. Picking it out of the document by size
// found a 16px toolbar icon instead, and every measurement came back 16 or NaN.
const qa0 = await p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
});
const box = () => p.evaluate((q: any) => {
  const svg = q.svg();
  const v = svg.viewBox.baseVal, r = svg.getBoundingClientRect();
  return {x: v.x, y: v.y, w: v.width, h: v.height,
          l: r.left, t: r.top, rw: r.width, rh: r.height};
}, qa0);
// the world point sitting under a client pixel
const under = (B: any, cx: number, cy: number) =>
  [B.x + (cx - B.l) / B.rw * B.w, B.y + (cy - B.t) / B.rh * B.h];

let fails = 0;
const say = (ok: boolean, s: string) => { if (!ok) fails++; console.log((ok ? "ok   " : "FAIL ") + s); };

// 1. wheel is anchored on the cursor, not on the centre
const B0 = await box();
const cx = B0.l + B0.rw * 0.80, cy = B0.t + B0.rh * 0.25;   // well off centre
const [wx0, wy0] = under(B0, cx, cy);
await p.mouse.move(cx, cy);
await p.mouse.wheel(0, -600);
await p.waitForTimeout(900);
const B1 = await box();
const [wx1, wy1] = under(B1, cx, cy);
const zoomed = B1.w / B0.w;
const slip = Math.hypot(wx1 - wx0, wy1 - wy0) / B1.w;       // as a fraction of the view
say(zoomed < 0.9, `wheel zooms in           ${B0.w.toFixed(0)} -> ${B1.w.toFixed(0)} view units`);
say(slip < 0.03, `point under cursor holds  slipped ${(slip * 100).toFixed(1)}% of the view` +
    `  (centre-anchored zoom would slip ~${(Math.abs(0.80 - 0.5) * (1 - zoomed) * 100).toFixed(0)}%)`);

// 2. drag pans
const B2 = await box();
await p.mouse.move(B2.l + B2.rw / 2, B2.t + B2.rh / 2);
await p.mouse.down();
await p.mouse.move(B2.l + B2.rw / 2 - 200, B2.t + B2.rh / 2, {steps: 8});
await p.mouse.up();
await p.waitForTimeout(400);
const B3 = await box();
const want = 200 / B2.rw * B2.w, got = B3.x - B2.x;
say(Math.abs(got - want) / want < 0.15, `drag pans                 moved ${got.toFixed(1)}, wanted ${want.toFixed(1)} view units`);
say(Math.abs(B3.w - B2.w) < 1, `drag does not zoom        ${B2.w.toFixed(0)} -> ${B3.w.toFixed(0)}`);

// 3. THE complaint: opening menus must not move the camera
const qa = qa0;
const shipComp = await p.evaluate((q: any) => {
  const c = q.session().player.live[0]; return [c.px, c.py];
}, qa);
const B4 = await box();
await p.evaluate(([q, c]: any) => q.open(c[0], c[1]), [qa, shipComp] as any);
await p.waitForTimeout(500);
const B5 = await box();
say(Math.abs(B5.w - B4.w) < 1 && Math.abs(B5.x - B4.x) < 1,
    `select+menu holds view    ${B4.w.toFixed(0)}x${B4.h.toFixed(0)} -> ${B5.w.toFixed(0)}x${B5.h.toFixed(0)}`);
await p.evaluate((q: any) => q.menu("info"), qa);
await p.waitForTimeout(500);
const B6 = await box();
say(Math.abs(B6.w - B4.w) < 1, `info panel holds view     ${B4.w.toFixed(0)} -> ${B6.w.toFixed(0)}`);

// 4. connect arms itself on a single-port component
await p.evaluate((q: any) => q.open(0, 0), qa);
const armed = await p.evaluate((q: any) => {
  const one = q.session().player.live.find((c: any) => c.type === "Constant");
  if (!one) return "no Constant";
  q.open(one.px, one.py);
  if (!q.menu("connect")) return "connect refused";
  const w = q.wire();
  return w ? `armed ${w.from.port} at ${w.from.cell}` : "not armed";
}, qa);
say(armed.startsWith("armed"), `connect self-arms         ${armed}`);

// 5. what replaced the `busy` rule: the view opens when the SHIP moves, not when a
// menu does. `run` is live from frame one and its ship sits still until the Engine
// is wired, so the widening is attributable to motion and nothing else.
await p.selectOption("select", "2");
await p.waitForTimeout(1200);
const B7 = await box();
const started = await p.evaluate((q: any) => {
  const s = q.session(); return [s.player.x, s.player.y];
}, qa);
// The Engine's `in` cell is a rotated port offset, so probe the neighbourhood for
// it rather than assuming: whichever tap fills wire.to is the port.
const wired = await p.evaluate((q: any) => {
  const s = q.session();
  const con = s.player.live.find((c: any) => c.type === "Constant");
  const eng = s.player.live.find((c: any) => c.type === "Engine");
  const arm = () => { q.open(con.px, con.py); q.menu("connect"); };
  arm();
  for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [0, -2], [0, 2]]) {
    q.open(eng.px + dx, eng.py + dy);
    if (q.wire()?.to) { q.confirm(); return `wired at ${eng.px + dx},${eng.py + dy}`; }
    if (!q.wire()) arm();
  }
  return "no in port found";
}, qa);
console.log(`     ${wired}`);
console.log("     " + JSON.stringify(await p.evaluate((q: any) => {
  const s = q.session();
  return {state: s.state, thrust: s.player.live.find((c: any) => c.type === "Constant")?.param,
          conns: (s.player.spec?.connections ?? s.player.connections ?? []).length};
}, qa)));
for (let k = 0; k < 60; k++) {
  const d = await p.evaluate(([q, h]: any) => {
    const s = q.session(); return Math.hypot(s.player.x - h[0], s.player.y - h[1]);
  }, [qa, started] as any);
  if (d > 2.5) { console.log(`     ship moved ${d.toFixed(1)} tiles`); break; }
  if (k === 59) console.log(`     ship moved only ${d.toFixed(2)} tiles in 15s`);
  await p.waitForTimeout(250);
}
await p.waitForTimeout(600);
const B8 = await box();
say(B8.w > B7.w * 1.5, `view opens when the SHIP moves  ${B7.w.toFixed(0)} -> ${B8.w.toFixed(0)} view units`);

console.log(fails ? `\n${fails} FAILED` : "\nall camera + connect checks pass");
await b.close();
process.exit(fails ? 1 : 0);
