// The keys, through the real press path: window listener -> S.cmd -> pilot -> the
// engines. Tom, 2026-08-24: "I don't think the WASDQE controls work at all."
//
// tools/corepox-drive-keys.ts calls `pilot` directly, so it cannot see a broken
// listener, a typing guard that swallows the key, or a session that never built a
// cmd. This presses the key.
//
// Avoid is the case that matters: both its engines are wired, so before the fix the
// pilot had nothing to drive and every key was inert.
//
//   bun tools/corepox-drive-browser.ts
import {chromium} from "playwright";
import {importNotebookModule} from "./notebook-import.ts";

const mis = await importNotebookModule("modules/@tomlarkworthy/corepox-missions.js");
const MISSIONS: any[] = await mis.value("MISSIONS");
const idx = MISSIONS.findIndex(m => m.id === "Avoid");

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
// Avoid is a mission you can LOSE, and a lost mission stops the clock -- so each
// key gets its own fresh run rather than sharing one that may already be over.
const restart = async () => {
  await p.selectOption("select", "0");
  await p.selectOption("select", String(idx));
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
  await p.waitForTimeout(500);
};
await restart();

const qa = () => p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
});
const look = async () => p.evaluate((q: any) => {
  const S = q.session(), s = S.player;
  const eng = s.comps.filter((c: any) => c.type === "Engine");
  return {state: S.state, drive: S.cmd?.drive ? "held" : "none",
          override: s.override ? s.override.length : 0,
          throttles: eng.map((c: any) => Math.round(c.in.in)),
          wired: eng.filter((c: any) =>
            s.conns.some((k: any) => k.to[0] === c.px && k.to[1] === c.py)).length,
          a: s.a, vx: s.vx, vy: s.vy};
}, await qa());

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!c) fail++;
};

const idle = await look();
console.log("idle  " + JSON.stringify(idle));
ok(idle.state === "playing", "the clock is running", `state ${idle.state}`);
ok(idle.wired > 0, "and every engine on this hull is driven by a wire", `${idle.wired} wired`);
ok(idle.override === 0, "with no key down the program owns the engines");

// Q FIRST, and that ordering is not cosmetic: Avoid is a mission you can lose, and
// flying it forward for a second loses it -- after which the clock is stopped and a
// turn measured on it is a reading of nothing.
const a0 = (await look()).a;
await p.keyboard.down("q");
await p.waitForTimeout(1000);
const mid = await look();
await p.keyboard.up("q");
console.log("Q     " + JSON.stringify(mid));
ok(mid.state === "playing", "the clock is still running for the turn", `state ${mid.state}`);
ok(mid.drive === "held", "the press reaches the session", `cmd.drive ${mid.drive}`);
ok(mid.override > 0, "and the pilot claims the WIRED engines", `${mid.override} claimed`);
ok(JSON.stringify(mid.throttles) !== JSON.stringify(idle.throttles),
   "and they run the pilot's number, not the wire's",
   `${JSON.stringify(idle.throttles)} -> ${JSON.stringify(mid.throttles)}`);
const turned = Math.abs(((mid.a - a0 + 540) % 360) - 180);
ok(turned > 5, "Q turns the ship", `${a0.toFixed(1)} -> ${mid.a.toFixed(1)} deg`);

await p.waitForTimeout(300);
const idle2 = await look();
ok(idle2.override === 0, "and letting go hands the engines back to the program",
   `${idle2.override} claimed`);

// W is the other half: thrust, on the same wired hull, in its own run.
await restart();
const idle3 = await look();
await p.keyboard.down("w");
await p.waitForTimeout(450);
const held = await look();
await p.keyboard.up("w");
console.log("W     " + JSON.stringify(held));
ok(held.state === "playing", "the clock is still running for the burn", `state ${held.state}`);
ok(held.override > 0, "W claims the engines too", `${held.override} claimed`);
ok(Math.hypot(held.vx, held.vy) > 0.5, "and it drives",
   `${Math.hypot(idle3.vx, idle3.vy).toFixed(2)} -> ${Math.hypot(held.vx, held.vy).toFixed(2)} tiles/s`);

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 4).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
