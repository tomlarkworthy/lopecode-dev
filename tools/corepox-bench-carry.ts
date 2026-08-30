// The refit bench must not heal the ship, and must not ratchet its ceiling down.
//
// The bench round-trips the hull through `specOf` inside shipBoard (corepox-board),
// NOT through `specOfShip` -- two copies of one rule. specOf wrote `hp: c.hp`, the
// CURRENT value, into the field the constructor reads as the MAXIMUM, which was
// invisible while campaign hulls were never damaged and became a compounding bug on
// 2026-08-21 when they started carrying wounds: a hull edited at 43/50 came back as
// 43/43, and every later refit ratcheted the ceiling again. Headless gates cannot
// see this -- shipEditor needs a DOM -- so it is measured in the browser.
//
//   bun tools/corepox-bench-carry.ts
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
const errs: string[] = [];
p.on("pageerror", e => errs.push(String(e.message)));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForTimeout(9000);

const out = await p.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const val = (mod: string, name: string) => {
    const m = rt.mains.get(mod);
    if (!m) return null;
    for (const [k, v] of m._scope) if (k === name) return (v as any)._value;
    return null;
  };
  const Ship = val("@tomlarkworthy/corepox-engine", "Ship");
  const loadShipSpec = val("@tomlarkworthy/corepox-engine", "loadShipSpec");
  const shipEditor = val("@tomlarkworthy/corepox-shipyard", "shipEditor");
  const SHIPS = val("@tomlarkworthy/corepox-missions", "SHIPS");
  if (!Ship || !shipEditor || !SHIPS)
    return {err: "missing: " + [...rt.mains.keys()].join(", ")};

  // a hull with one part wounded and one destroyed, expressed the way survivingHull
  // would hand it to the bench
  const s = new Ship(loadShipSpec(SHIPS.gunBoat).spec, {team: "a", x: 0, y: 0, a: 0});
  const hurt = s.comps.find((c: any) => c.type === "Engine");
  s.damage(hurt, 7);
  const wounded = {name: "hull",
    components: s.comps.map((c: any) => ({
      type: c.type, pos: [c.px, c.py],
      dir: ["up", "right", "down", "left"][(Math.round((c.dir ?? 0) / 90) % 4 + 4) % 4],
      ...(c.hp < c.maxHp ? {dmg: c.maxHp - c.hp} : {})})),
    connections: s.conns.map((k: any) => ({...k}))};

  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-4000px;top:0;width:900px;height:600px";
  document.body.append(host);
  const ed = shipEditor(wounded, {name: "hull", height: 400, span: 6, pad: 2, mode: "select"});
  host.append(ed);
  const first = JSON.parse(JSON.stringify(ed.value));
  ed.load?.(first);
  const second = JSON.parse(JSON.stringify(ed.value));
  const live = new Ship(loadShipSpec(first).spec, {team: "a"});
  const e2 = live.comps.find((c: any) => c.type === "Engine" && c.hp < c.maxHp);
  host.remove();
  return {first, second, hp: e2?.hp ?? null, maxHp: e2?.maxHp ?? null,
          wantHp: hurt.hp, wantMax: hurt.maxHp};
});

let fail = 0;
const say = (ok: boolean, s: string) => { if (!ok) fail++; console.log((ok ? "ok   " : "FAIL ") + s); };
if ((out as any).err) { console.log("FAIL " + (out as any).err); await b.close(); process.exit(1); }
const o = out as any;
const dmg = o.first.components.filter((c: any) => c.dmg != null);
console.log(`bench round-trip of a gunBoat with one Engine at ${o.wantHp}/${o.wantMax}\n`);
say(dmg.length === 1, `the wound survives the editor: ${dmg.length} component carries dmg ${dmg[0]?.dmg}`);
say(o.hp === o.wantHp, `reloads at ${o.hp} hp (wanted ${o.wantHp}) -- the bench did not heal it`);
say(o.maxHp === o.wantMax, `and maxHp is still ${o.maxHp} (wanted ${o.wantMax}) -- the ceiling held`);
say(JSON.stringify(o.first) === JSON.stringify(o.second),
    "load(value) then read is a fixed point -- refitting twice does not ratchet");
say(!errs.length, `no page errors` + (errs.length ? ": " + errs[0] : ""));
await b.close();
process.exit(fail ? 1 : 0);
