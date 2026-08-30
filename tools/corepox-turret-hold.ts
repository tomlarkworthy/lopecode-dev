// A turret must keep pointing where it was pointing while you scrub the number that
// aims it. Tom, 2026-08-24: "turret angle resets itself as the constant is changed,
// it looks very glitchy on the aim mission".
//
// `setParam` rebuilds the whole ship on every scrub -- deliberately, because Tom
// asked for the feedback and a pause hides it -- and a rebuilt component is a NEW
// object built from the spec. `turret` (where the barrel is pointing), `t` (how far
// through its firing cycle a gun is) and `lock` (what a radar has found) are running
// state that no spec carries, so every one of them was dropped, tick after tick.
//
// ManualAim is the exact case: its Constant is wired straight into the turret's
// angle and typing a number into it IS the mission.
//
//   bun tools/corepox-turret-hold.ts
import {chromium} from "playwright";
import {importNotebookModule} from "./notebook-import.ts";

const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const idx = MISSIONS.findIndex(m => m.id === "ManualAim");
if (idx < 0) throw new Error("corepox-turret-hold: ManualAim is not in MISSIONS");

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await p.selectOption("select", String(idx));
for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
  await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
}
await p.waitForTimeout(600);

const qa = () => p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
});
const turret = async () => {
  const h = await qa();
  return await p.evaluate((q: any) => {
    const S = q.session();
    const c = S.player.comps.find((x: any) => x.type === "LaserTurret2");
    return {turret: c?.turret ?? null, want: c?.in?.angle ?? null, t: c?.t ?? null,
            state: S.state};
  }, h);
};
const setParam = async (v: number) => {
  const h = await qa();
  await p.evaluate(([q, v]: any) => q.setParam(String(v), 0, 0), [await qa(), v] as any);
};

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!c) fail++;
};

// Aim it somewhere far from zero and let the barrel get there.
await setParam(-60);   // AWAY from the enemy at +45: a won or lost mission stops the clock
await p.waitForTimeout(2500);
const settled = await turret();
console.log(`settled at ${JSON.stringify(settled)}`);
ok(settled.state === "playing", "the clock is still running", `state ${settled.state}`);
ok(settled.turret != null && Math.abs(settled.turret) > 20,
   "the barrel reaches the angle it is given", `turret ${settled.turret?.toFixed(1)}`);

// Now SCRUB, the way a drag on the value disc does: many small writes, close together.
const seen: number[] = [];
const wants: number[] = [];
const ts: number[] = [];
for (let i = 0; i < 12; i++) {
  await setParam(-60 + i * 3);       // -60 -> -27, three degrees a step
  await p.waitForTimeout(120);
  const r = await turret();
  seen.push(r.turret ?? 0); wants.push(Number(r.want ?? 0)); ts.push(Number(r.t ?? 0));
  if (r.state !== "playing") {
    console.log(`the mission ended (${r.state}) after ${i + 1} samples -- nothing below is a reading`);
    break;
  }
}
console.log("commanded:  " + wants.map(v => v.toFixed(0).padStart(5)).join(" "));
console.log("barrel:     " + seen.map(v => v.toFixed(1).padStart(5)).join(" "));
console.log("cycle t:    " + ts.map(v => v.toFixed(2).padStart(5)).join(" "));
const worst = Math.min(...seen.map(Math.abs));
ok(worst > 20, "and does not snap back to zero while the number is scrubbed",
   `closest approach to 0 was ${worst.toFixed(1)} deg`);
// Holding position is not enough: it has to still FOLLOW. The slew is err*0.05 a
// tick, so a few degrees of lag behind the number is the barrel working.
const lag = Math.max(...seen.map((v, i) => Math.abs(v - wants[i])));
ok(lag < 6, "and keeps tracking the number as it moves", `worst lag ${lag.toFixed(1)} deg`);

// The firing cycle is the same kind of state: a gun whose `t` restarts on every
// rebuild never reaches BEAM_CYCLE, so a ship being tuned cannot shoot at all.
const before = (await turret()).t ?? 0;
await setParam(-27);
const after = (await turret()).t ?? 0;
ok(after >= before - 1e-9, "the firing cycle survives a rebuild",
   `t ${before.toFixed(3)} -> ${after.toFixed(3)}`);

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 4).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
