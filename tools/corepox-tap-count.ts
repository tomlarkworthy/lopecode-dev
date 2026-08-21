// Play the whole campaign through the browser with real clicks. The headless gate
// (corepox-play-missions.ts) hands the engine a finished ship, so it passes even
// when the thing a player actually touches is broken -- that is how the anchor-only
// port picker survived 9/9. This drives the UI instead.
//
// Rewritten 2026-08-21 for the "Shipyard Concepts" board. Every step here is now a
// DRAG, because the menus it used to click are gone: a part is dragged off a shelf
// chip onto a ghost, a wire is dragged from one port to another, and a Constant is
// scrubbed off its own disc. That is the point of the rewrite -- the old gate went
// on passing against buttons the player can no longer see.
//
// Instrumented copy of corepox-qa-campaign.ts: counts what a player must DO. A
// drag counts as one, because a gesture is the unit the redesign trades taps for
// -- counting its intermediate pointermoves would report the new board as more
// expensive than the menus it replaced, which is the opposite of the truth.
import {chromium} from "playwright";
let TAPS = 0, PHASE = "nav";
const BY: Record<string, number> = {};
let BY0: Record<string, number> = {};
const tap = () => { TAPS++; BY[PHASE] = (BY[PHASE] ?? 0) + 1; };
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
// the HUD counter is "1/<n>", and n moves whenever a mission is added
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
// A mission's intro cutscene covers the board (corepox-game `cutscene`), so a
// tool that drives the board has to get past it the way a player does.
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();

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
  const c = await pt(px, py); tap(); await p.mouse.click(c.x, c.y); await p.waitForTimeout(160);
};
// A port's DRAWN point, from the game's own drawnPorts, named by COMPONENT and
// PORT rather than by cell -- on a Constant the cell centre belongs to the value
// disc, and on FollowCourse a rotated Binary's `out` shares cell (0,-1) with the
// Radar's `dist`. Asking by cell picked whichever was first in `live` order.
const portPt = async (anchor: number[], name: string, kind: string) => {
  const h = await qa();
  return await p.evaluate(([q, anchor, name, kind]: any) => {
    const v = q.portPoint(anchor, name, kind);
    if (!v) return null;
    const svg = q.svg(), r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    return {x: r.left + (v[0] - vb.x) / vb.width * r.width,
            y: r.top + (v[1] - vb.y) / vb.height * r.height};
  }, [h, anchor, name, kind] as any);
};
const pxPerTile = async () => {
  const a = await pt(0, 0), b = await pt(1, 0);
  return Math.max(8, Math.hypot(b.x - a.x, b.y - a.y));
};
// The DESTINATION is resolved after the press, not before it. Arming a chip paints
// ghosts, and `camera()` feeds those ghosts in as focus points, so the viewBox
// moves between the moment a point is computed and the moment the finger arrives:
// Cocoon placed 2 of 3, TwinTurrets 7 of 9 and FollowBoss 1 of 7 against endpoints
// measured a frame too early (2026-08-21). Recomputing mid-drag costs one extra
// round trip and removes the whole class.
const dragTo = async (from: any, toFn: () => Promise<any>, steps = 12) => {
  tap();
  await p.mouse.move(from.x, from.y);
  await p.mouse.down();
  await p.mouse.move(from.x + 9, from.y + 9);       // arm, and let the camera settle
  await p.waitForTimeout(140);
  const to = await toFn();
  for (let i = 1; i <= steps; i++)
    await p.mouse.move(from.x + (to.x - from.x) * i / steps,
                       from.y + (to.y - from.y) * i / steps);
  await p.waitForTimeout(60);
  await p.mouse.up();
  await p.waitForTimeout(180);
};
const btn = async (re: RegExp) => {
  const l = p.locator("button", {hasText: re}).first();
  if (!(await l.count())) return false;
  tap(); await l.click(); await p.waitForTimeout(200); return true;
};
const byTitle = async (t: string) => {
  const l = p.locator(`button[title="${t}"]`).first();
  if (!(await l.count())) return false;
  // A gate that dies on a 30s Playwright timeout says "not visible" and nothing
  // about WHAT is covering it. Leave the frame behind.
  tap(); try { await l.click({timeout: 8000}); }
  catch (e) {
    const shot = `tools/screenshots/qa-campaign-${t}-blocked.png`;
    await p.screenshot({path: shot});
    console.log(`      ${t} BUTTON NOT CLICKABLE -> ${shot}`);
    console.log(`      open buttons: ` + JSON.stringify(
      (await p.locator("button:visible").allTextContents()).slice(0, 24)));
    return false;
  }
  await p.waitForTimeout(200); return true;
};
// PLACE: carry the chip out of the shelf and drop it on the ghost. One gesture,
// which is the claim turn 7c makes ("3 taps / part -> 1") and therefore the thing
// worth testing -- a tap-to-stick path would not notice if the drag were dead.
const placedAt = async (type: string, px: number, py: number) => {
  const s: any = await shipNow();
  return (s.ship.components ?? []).some((c: any) =>
    c.type === type && c.pos[0] === px && c.pos[1] === py);
};
const placePart = async (type: string, px: number, py: number) => {
  let found = false;
  // Verified, and retried. A drag that lands a cell out is a silent miss -- the
  // old gate reported `place Armour@0,1` for a part that never arrived.
  for (let k = 0; k < 3; k++) {
    const chip = p.locator(`[data-part="${type}"]`).first();
    if (!(await chip.count())) break;
    found = true;
    const b = await chip.boundingBox();
    if (!b) break;
    await dragTo({x: b.x + b.width / 2, y: b.y + b.height / 2}, () => pt(px, py));
    await p.keyboard.press("Escape");        // put back whatever stayed armed
    if (await placedAt(type, px, py)) return true;
  }
  return found ? false : false;
};
// Selecting a component floats its verbs beside it; there is no menu to open.
const openMenu = async (px: number, py: number) => {
  await clickTile(px, py);
  return (await p.locator("[data-verb]").count()) > 0;
};
const verb = async (id: string) => {
  const l = p.locator(`[data-verb="${id}"]`).first();
  if (!(await l.count())) return false;
  tap(); await l.click(); await p.waitForTimeout(200); return true;
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
  await skipIntro();
  await p.waitForTimeout(700);

  const handed = m.ship ?? {components: [], connections: []};
  const sol = m.solution ?? handed;
  const have = new Set((handed.components ?? []).map(key));
  const toPlace = (sol.components ?? []).filter((c: any) => !have.has(key(c)));
  const haveW = new Set((handed.connections ?? []).map((w: any) => ckey(norm(w))));
  const toWire = (sol.connections ?? []).filter((w: any) => !haveW.has(ckey(norm(w))));
  const tap0 = TAPS; PHASE = "nav";
  const steps: string[] = [];

  PHASE = "build";
  // BUILD -- pick the part in the tray, click the destination cell
  if (toPlace.length) {
    for (const c of toPlace) {
      if (!await placePart(c.type, c.pos[0], c.pos[1])) {
        steps.push(`no ${c.type} in stock`); continue; }
      steps.push(`place ${c.type}@${c.pos}`);
    }
  }
  PHASE = "rotate";
  // ROTATE -- click a component until its dir matches
  for (const c of (sol.components ?? [])) {
    if (!c.dir) continue;
    const h = (handed.components ?? []).find((x: any) => key(x) === key(c));
    if (h && (h.dir ?? 0) === c.dir) continue;
    if (!(m.allow?.rotate)) continue;
    if (!await openMenu(c.pos[0], c.pos[1])) { steps.push(`no menu at ${c.pos}`); continue; }
    for (let k = 0; k < 4; k++) {
      const s: any = await shipNow();
      const now = (s.ship.components.find((x: any) => x.pos[0] === c.pos[0] && x.pos[1] === c.pos[1]) ?? {}).dir ?? 0;
      if (now === c.dir) break;
      await verb("rotate");
    }
    await p.keyboard.press("Escape");
    steps.push(`rotate ${c.type}@${c.pos}->${c.dir}`);
  }
  PHASE = "wire";
  // CONNECT -- click the source connector cell, then the sink connector cell
  if (toWire.length) {
    for (const w of toWire) {
      const a = (typeof w.from === "string" ? JSON.parse(w.from) : w.from);
      const z = (typeof w.to === "string" ? JSON.parse(w.to) : w.to);
      // The gate no longer resolves cells itself. It used to re-derive the PORTS
      // rotation here, which is a copy of the game's own and drifted the moment a
      // cell could carry two ports: `cellOf` answered (0,-1) for FollowCourse's
      // rotated Binary and the board read that cell as the Radar's.
      const off = await portPt(a, w.fromPort ?? "out", "out");
      const off2 = await portPt(z, w.toPort ?? "in", "in");
      if (!off || !off2) { steps.push(`no port for ${JSON.stringify(w)}`); continue; }
      // One drag, port to port. Release on an exact port commits; the confirm tick
      // only appears when the release was near two sinks and on neither, so it is
      // tried and not required. Verified and retried for the same reason a
      // placement is: a drag that lands short is a silent miss, and reporting the
      // step as done is how FollowCourse's wrong wire went unnoticed.
      const wired = async () => {
        const s: any = await shipNow();
        return (s.ship.connections ?? []).some((k: any) => ckey(norm(k)) === ckey(norm(w)));
      };
      let ok = false;
      for (let k = 0; k < 3 && !ok; k++) {
        await dragTo(await portPt(a, w.fromPort ?? "out", "out"),
                     () => portPt(z, w.toPort ?? "in", "in"));
        await byTitle("finish connecting");
        ok = await wired();
      }
      steps.push(`${ok ? "wire" : "MISSED wire"} ${a}.${w.fromPort} -> ${z}.${w.toPort}`);
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
  PHASE = "param";
  if (toSet.length && m.allow?.modify) {
    for (const c of toSet) {
      const read = async () => {
        const s: any = await shipNow();
        const h = (s.ship.components ?? []).find((x: any) =>
          x.pos[0] === c.pos[0] && x.pos[1] === c.pos[1]) ?? {};
        return c.type === "Binary" ? String(h.param ?? "") : (Number(h.param) || 0);
      };
      // A Binary's operator is an enum: the disc cycles it in place, one tap each.
      if (c.type === "Binary") {
        let ok = false;
        for (let k = 0; k < 8; k++) {
          if (await read() === c.param) { ok = true; break; }
          await clickTile(c.pos[0], c.pos[1]);
        }
        steps.push(ok ? `cycle ${c.type}@${c.pos} to ${c.param}`
                      : `could not cycle ${c.type}@${c.pos} to ${c.param}`);
        continue;
      }
      // A Constant is scrubbed off its own disc, in ONE press. The loop is closed
      // inside the drag -- pull out to set a rate from the size of the remaining
      // error, move up or down, read, repeat -- which is what makes the test
      // independent of however the ramp is calibrated on the day.
      const want = Number(c.param) || 0;
      const disc = await pt(c.pos[0], c.pos[1]);
      const T = await pxPerTile();
      tap();                                  // one press, one gesture
      await p.mouse.move(disc.x, disc.y);
      await p.mouse.down();
      let y = disc.y, ok = false;
      for (let k = 0; k < 160; k++) {
        const now = await read() as number;
        if (now === want) { ok = true; break; }
        const err = want - now;
        // dist(rate) inverts the module's rate = 10^((dist - 0.6) / 1.7)
        const rate = Math.max(1, Math.min(100, Math.abs(err) / 3));
        const outT = 0.6 + 1.7 * Math.log10(rate);
        y += (err > 0 ? -1 : 1) * T * 0.2;
        await p.mouse.move(disc.x + outT * T, y);
      }
      await p.mouse.up();
      await p.waitForTimeout(150);
      // The last unit, on the pads the design keeps for exactly this.
      if (!ok && await openMenu(c.pos[0], c.pos[1]))
        for (let k = 0; k < 12; k++) {
          const now = await read() as number;
          if (now === want) { ok = true; break; }
          await btn(new RegExp("^" + (want > now ? "\\+" : "−") + "$"));
        }
      await p.keyboard.press("Escape");
      steps.push(ok ? `scrub ${c.type}@${c.pos} to ${c.param}`
                    : `could not scrub ${c.type}@${c.pos} to ${c.param}`);
    }
  }

  PHASE = "play";
  // did the UI actually produce the solution?
  const built: any = await shipNow();
  const bc = new Set((built.ship.components ?? []).map(full));
  const missing = (sol.components ?? []).filter((c: any) => !bc.has(full(c))).map(full);
  const bw = new Set((built.ship.connections ?? []).map((w: any) => ckey(norm(w))));
  const missW = (sol.connections ?? []).filter((w: any) => !bw.has(ckey(norm(w))))
    .map((w: any) => `${w.from}.${w.fromPort}->${w.to}.${w.toPort}`);

  await byTitle("launch") || await byTitle("resume");
  // poll for the verdict instead of guessing a wall-clock: the browser steps at
  // rAF speed, so a fixed wait either wastes minutes or clips a slow mission
  // 160 x 500ms = 80s of wall clock. It was 40s, which was enough while every
  // reference solution won inside ~10s of simulated time; TwinTurrets' 2026-08-21
  // re-solve takes 28.5s and the browser runs the sim at roughly wall speed, so a
  // real win was being read as no verdict at all.
  let txt = "";
  for (let k = 0; k < 160; k++) {
    txt = await p.evaluate(() => document.body.innerText);
    if (/VICTORY|DEFEAT|OUT OF TIME/i.test(txt)) break;
    await p.waitForTimeout(500);
  }
  const won = /VICTORY/i.test(txt);
  console.log(`${String(i + 1).padStart(2)}. ${m.id.padEnd(14)} ${won ? "WIN " : "----"}` +
    `  built ${(sol.components ?? []).length - missing.length}/${(sol.components ?? []).length} parts` +
    ` ${(sol.connections ?? []).length - missW.length}/${(sol.connections ?? []).length} wires`);
  if (!won || missing.length || missW.length) {
    const verdict = (txt.match(/VICTORY|DEFEAT|OUT OF TIME/i) ?? ["no verdict in 80s"])[0];
    const state = await p.evaluate((q: any) => {
      const S = q.session();
      const sum = (t: string) => S.world.ships.filter((s: any) => s.team === t)
        .map((s: any) => s.live.length).join("+") || "0";
      const dead = S.world.ships.filter((s: any) => s.team === "player")
        .flatMap((s: any) => s.comps.filter((c: any) => c.hp <= 0)
          .map((c: any) => `${c.type}@${c.px},${c.py}`));
      return `t=${S.world.t.toFixed(1)}s player ${sum("player")} enemy ${sum("enemy")}` +
             (dead.length ? ` lost ${dead.join(",")}` : "");
    }, await qa());
    console.log(`      VERDICT ${verdict}  ${state}`);
    // Where the UI left the ship. A hull built part by part does not sit where the
    // same hull built in one go sits (`rebuild` pins the parts already down), and
    // for FollowBoss that difference alone is the match -- see
    // tools/corepox-build-pose.ts. Printed on every failure because a spec that
    // matches the solution exactly, losing anyway, reads as a UI fault until you
    // can see the pose.
    console.log(`      POSE ` + await p.evaluate((q: any) => {
      const P = q.session().player;
      return `x ${P.x.toFixed(3)} y ${P.y.toFixed(3)} a ${P.a.toFixed(1)}` +
             `  com ${P.cx.toFixed(3)},${P.cy.toFixed(3)}`;
    }, await qa()));
    console.log(`      BUILT ORDER ${(built.ship.components ?? []).map(full).join(" ")}`);
    console.log(`      SPEC  ORDER ${(sol.components ?? []).map(full).join(" ")}`);
    console.log(`      BUILT WIRES ${(built.ship.connections ?? []).map((w: any) => ckey(norm(w))).join(" ")}`);
    console.log(`      SPEC  WIRES ${(sol.connections ?? []).map((w: any) => ckey(norm(w))).join(" ")}`);
    for (const s of steps) console.log(`      · ${s}`);
    if (missing.length) console.log(`      MISSING PARTS ${missing.join(" ")}`);
    if (missW.length) console.log(`      MISSING WIRES ${missW.join(" ")}`);
  }
  console.log(`TAPS ${String(TAPS - tap0).padStart(4)}  ${m.id.padEnd(21)}` +
    `${String((sol.components ?? []).length).padStart(2)} parts ` +
    `${String((sol.connections ?? []).length).padStart(2)} wires   ` +
    Object.entries(BY).map(([k, v]) => `${k} ${v - (BY0[k] ?? 0)}`).join("  "));
  BY0 = {...BY};
  if (won) pass++;
}
console.log(`\n${pass}/${ran} completed by clicking, not by handing the engine a ship`);
if (errs.length) console.log("console errors:", [...new Set(errs)].slice(0, 6));
await b.close();
process.exit(pass === ran ? 0 : 1);
