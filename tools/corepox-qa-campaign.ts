// Play the whole campaign through the browser with real clicks. The headless gate
// (corepox-play-missions.ts) hands the engine a finished ship, so it passes even
// when the thing a player actually touches is broken -- that is how the anchor-only
// port picker survived 9/9. This drives the UI instead: pick a part, click a tile,
// click a connector then another, type a number in.
import {chromium} from "playwright";
import {importNotebookModule} from "./notebook-import.ts";

const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const only = process.argv[2];

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1200}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => document.body.innerText.includes("1/9"), {timeout: 60000});

const qa = () => p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
});
// tile -> client point, via the game's OWN tileToView and the live viewBox
const pt = async (px: number, py: number) => {
  const h = await qa();
  return await p.evaluate(([q, px, py]: any) => {
    const [vx, vy] = q.tileToView(px, py);
    const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return {x: r.left + (vx - vb.x) / vb.width * r.width,
            y: r.top + (vy - vb.y) / vb.height * r.height};
  }, [h, px, py] as any);
};
const clickTile = async (px: number, py: number) => {
  const c = await pt(px, py); await p.mouse.click(c.x, c.y); await p.waitForTimeout(160);
};
const btn = async (re: RegExp) => {
  const l = p.locator("button", {hasText: re}).first();
  if (!(await l.count())) return false;
  await l.click(); await p.waitForTimeout(200); return true;
};
const shipNow = () => p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game")
    return JSON.parse(JSON.stringify((v as any)._value.value));
});

// what the reference solution adds on top of what the player is handed
const key = (c: any) => `${c.type}@${c.pos[0]},${c.pos[1]}`;        // identity: what to place
const full = (c: any) => key(c) + (c.param != null ? `=${c.param}` : "");  // + state: what to verify
const ckey = (w: any) => `${w.from}|${w.fromPort}|${w.to}|${w.toPort}`;
const norm = (w: any) => ({from: String(w.from), fromPort: w.fromPort ?? "out",
                           to: String(w.to), toPort: w.toPort ?? "in"});

let pass = 0, ran = 0;
for (let i = 0; i < MISSIONS.length; i++) {
  const m = MISSIONS[i];
  if (only && m.id !== only) continue;
  ran++;
  await p.selectOption("select", String(i));
  await p.waitForTimeout(700);

  const handed = m.ship ?? {components: [], connections: []};
  const sol = m.solution ?? handed;
  const have = new Set((handed.components ?? []).map(key));
  const toPlace = (sol.components ?? []).filter((c: any) => !have.has(key(c)));
  const haveW = new Set((handed.connections ?? []).map((w: any) => ckey(norm(w))));
  const toWire = (sol.connections ?? []).filter((w: any) => !haveW.has(ckey(norm(w))));
  const steps: string[] = [];

  // BUILD -- pick the part in the tray, click the destination cell
  if (toPlace.length) {
    await btn(/^build$/);
    for (const c of toPlace) {
      if (!await btn(new RegExp("^" + c.type + " ×"))) { steps.push(`no ${c.type} in tray`); continue; }
      await clickTile(c.pos[0], c.pos[1]);
      steps.push(`place ${c.type}@${c.pos}`);
    }
  }
  // ROTATE -- click a component until its dir matches
  for (const c of (sol.components ?? [])) {
    if (!c.dir) continue;
    const h = (handed.components ?? []).find((x: any) => key(x) === key(c));
    if (h && (h.dir ?? 0) === c.dir) continue;
    if (!(m.allow?.rotate)) continue;
    await btn(/^rotate$/);
    for (let k = 0; k < 4; k++) {
      const s: any = await shipNow();
      const now = (s.ship.components.find((x: any) => x.pos[0] === c.pos[0] && x.pos[1] === c.pos[1]) ?? {}).dir ?? 0;
      if (now === c.dir) break;
      await clickTile(c.pos[0], c.pos[1]);
    }
    steps.push(`rotate ${c.type}@${c.pos}->${c.dir}`);
  }
  // CONNECT -- click the source connector cell, then the sink connector cell
  if (toWire.length) {
    await btn(/^connect$/);
    for (const w of toWire) {
      const a = (typeof w.from === "string" ? JSON.parse(w.from) : w.from);
      const z = (typeof w.to === "string" ? JSON.parse(w.to) : w.to);
      const cellOf = (anchor: any, port: string, sink: boolean) =>
        p.evaluate(([anchor, port, sink]: any) => {
          const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
          let PORTS: any, qa: any;
          for (const [k, v] of m._scope) {
            if (k === "PORTS") PORTS = (v as any)._value;
            if (k === "viewof game") qa = (v as any)._value.qa;
          }
          const c = qa.session().player.live.find((c: any) =>
            c.px === anchor[0] && c.py === anchor[1]);
          if (!c) return null;
          const o = ((sink ? PORTS[c.type]?.ins : PORTS[c.type]?.outs) ?? {})[port];
          if (!o) return null;
          const d = ((Math.round((c.dir ?? 0) / 90) % 4 + 4) % 4) * 90;
          const rot: any = {0: (x: number, y: number) => [x, y],
                            90: (x: number, y: number) => [-y, x],
                            180: (x: number, y: number) => [-x, -y],
                            270: (x: number, y: number) => [y, -x]};
          const [dx, dy] = rot[d](o[0], o[1]);
          return [c.px + dx, c.py + dy];
        }, [anchor, port, sink] as any);
      const off = await cellOf(a, w.fromPort ?? "out", false);
      const off2 = await cellOf(z, w.toPort ?? "in", true);
      if (!off || !off2) { steps.push(`no cell for ${JSON.stringify(w)}`); continue; }
      await clickTile(off[0], off[1]);
      await clickTile(off2[0], off2[1]);
      steps.push(`wire ${a}.${w.fromPort} -> ${z}.${w.toPort}`);
    }
  }
  // MODIFY -- select the component, type the value. Computed from the LIVE ship,
  // not from the handed spec: a Constant the player just placed arrives with no
  // value at all, and both engine missions turn on typing one into it.
  const live: any = await shipNow();
  const toSet = (sol.components ?? []).filter((c: any) => {
    if (c.param == null) return false;
    const o = (live.ship.components ?? []).find((h: any) =>
      h.pos[0] === c.pos[0] && h.pos[1] === c.pos[1]);
    return !o || String(o.param) !== String(c.param);
  });
  if (toSet.length && m.allow?.modify) {
    await btn(/^modify$/);
    for (const c of toSet) {
      await clickTile(c.pos[0], c.pos[1]);
      const inp = p.locator("input:visible").last();   // not lopepage's command palette
      if (await inp.count()) {
        await inp.fill(String(c.param));
        await inp.dispatchEvent("change");   // the field commits on change, as it does on blur
        await p.waitForTimeout(150);
        steps.push(`set ${c.type}@${c.pos} = ${c.param}`);
      } else steps.push(`no input for ${c.type}@${c.pos}`);
    }
  }

  // did the UI actually produce the solution?
  const built: any = await shipNow();
  const bc = new Set((built.ship.components ?? []).map(full));
  const missing = (sol.components ?? []).filter((c: any) => !bc.has(full(c))).map(full);
  const bw = new Set((built.ship.connections ?? []).map((w: any) => ckey(norm(w))));
  const missW = (sol.connections ?? []).filter((w: any) => !bw.has(ckey(norm(w))))
    .map((w: any) => `${w.from}.${w.fromPort}->${w.to}.${w.toPort}`);

  await btn(/play/);
  // poll for the verdict instead of guessing a wall-clock: the browser steps at
  // rAF speed, so a fixed wait either wastes minutes or clips a slow mission
  let txt = "";
  for (let k = 0; k < 80; k++) {
    txt = await p.evaluate(() => document.body.innerText);
    if (/MISSION COMPLETE|LOST|OUT OF TIME/i.test(txt)) break;
    await p.waitForTimeout(500);
  }
  const won = /MISSION COMPLETE/i.test(txt);
  console.log(`${String(i + 1).padStart(2)}. ${m.id.padEnd(14)} ${won ? "WIN " : "----"}` +
    `  built ${(sol.components ?? []).length - missing.length}/${(sol.components ?? []).length} parts` +
    ` ${(sol.connections ?? []).length - missW.length}/${(sol.connections ?? []).length} wires`);
  if (!won || missing.length || missW.length) {
    for (const s of steps) console.log(`      · ${s}`);
    if (missing.length) console.log(`      MISSING PARTS ${missing.join(" ")}`);
    if (missW.length) console.log(`      MISSING WIRES ${missW.join(" ")}`);
  }
  if (won) pass++;
}
console.log(`\n${pass}/${ran} completed by clicking, not by handing the engine a ship`);
if (errs.length) console.log("console errors:", [...new Set(errs)].slice(0, 6));
await b.close();
process.exit(pass === ran ? 0 : 1);
