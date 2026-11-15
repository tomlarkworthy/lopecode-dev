// bun horde/play-input.ts [--headed] : drives game.html with real Playwright keyboard and mouse events (no bot) and
// checks each control against the engine's state (window.__engine). Then stands still at wave 8 until the horde
// kills the player, and restarts with R.
import { chromium } from "../../../node_modules/playwright/index.mjs";
import { resolve } from "node:path";
const headed = process.argv.includes("--headed");
const url = "file://" + resolve(import.meta.dir, "proto/game.html");
const browser = await chromium.launch({ headless: !headed });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on("pageerror", (e) => console.log("pageerror", e.message));
const E = (expr: string) => page.evaluate(`(() => { const e = window.__engine; return ${expr}; })()`) as Promise<any>;
const wait = (ms: number) => page.waitForTimeout(ms);
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, detail: string) => { results.push([name, ok, detail]); console.log(ok ? "ok  " : "FAIL", name, detail); };

await page.goto(`${url}?n=20000&mode=transfer&workers=4&w=1280&h=800`);
await page.waitForFunction(() => (window as any).__engine && (window as any).__engine.frame > 30);
await page.mouse.move(640, 400);
let p0 = await E("[...e.player]");
await page.keyboard.down("d"); await wait(800); await page.keyboard.up("d");
let p1 = await E("[...e.player]");
check("D moves right", p1[0] > p0[0] + 1, `x ${p0[0].toFixed(2)} -> ${p1[0].toFixed(2)}`);
await page.keyboard.down("w"); await wait(800); await page.keyboard.up("w");
let p2 = await E("[...e.player]");
check("W moves up", p2[1] < p1[1] - 1, `y ${p1[1].toFixed(2)} -> ${p2[1].toFixed(2)}`);
// aim: mouse to the left of the ship's screen position
await page.mouse.move(100, 400);
await wait(200);
const aim = await E("e.aim");
check("mouse aims", Math.abs(Math.abs(aim) - Math.PI) < 0.8, `aim ${aim.toFixed(2)} rad with the mouse at the left edge`);
await page.mouse.down({ button: "left" }); await wait(300);
const nb = await E("e.bullets.length / 4");
await wait(700); await page.mouse.up({ button: "left" });
check("left button fires", nb > 10, `${nb} bullets in flight while held`);
await wait(1200);
const nb2 = await E("e.bullets.length / 4");
check("release stops fire", nb2 === 0, `${nb2} bullets 1.2 s after release`);
await page.keyboard.down(" "); await wait(700);
const ch = await E("e.charge");
await page.keyboard.up(" "); await wait(100);
const cd = await E("e.cooldown");
check("space charges, release fires a shockwave", ch > 0.5 && cd > 2.5, `charge ${ch.toFixed(2)} after 0.7 s, cooldown ${cd.toFixed(2)} after release`);
await page.mouse.down({ button: "right" }); await wait(300); await page.mouse.up({ button: "right" }); await wait(100);
const cd2 = await E("e.cooldown");
check("right button during cooldown does nothing", cd2 > 2 && cd2 < cd, `cooldown ${cd2.toFixed(2)}`);
await page.keyboard.press("p"); await wait(300);
const f0 = await E("e.frame"); await wait(500); const f1 = await E("e.frame");
check("P pauses", (await E("e.paused")) && f1 === f0, `frame ${f0} -> ${f1} over 0.5 s`);
await page.keyboard.press("p"); await wait(500);
check("P resumes", (await E("e.frame")) > f1, `frame ${await E("e.frame")}`);
await page.keyboard.press("t"); await wait(400);
const m1 = await E("e.mode + '/' + e.poolSize"), hud1 = await page.textContent("#tog");
await page.keyboard.press("t"); await wait(400);
const m2 = await E("e.mode + '/' + e.poolSize"), hud2 = await page.textContent("#tog");
check("T toggles workers", m1 === "main/0" && m2 === "transfer/4", `${m1} (${hud1}), then ${m2} (${hud2})`);
await page.click("#tog"); await wait(400);
check("HUD button toggles workers", (await E("e.mode")) === "main", await page.textContent("#tog") ?? "");
await page.click("#tog"); await wait(300);
await page.$eval("#wk", (el: any) => { el.value = "12"; el.dispatchEvent(new Event("input")); }); await wait(400);
check("pool slider sets worker count", (await E("e.poolSize")) === 12, `pool ${await E("e.poolSize")}`);
await page.keyboard.press("r"); await wait(200);
check("R restarts", (await E("e.frame")) < 30 && (await E("e.score")) === 0, `frame ${await E("e.frame")} score ${await E("e.score")}`);

// game over: stand still at wave 8 (no bot, no input) until health reaches 0
await page.goto(`${url}?n=60000&wave=8&mode=transfer&workers=8&w=1280&h=800`);
await page.waitForFunction(() => (window as any).__engine);
const t0 = Date.now();
await page.waitForFunction(() => (window as any).__engine.over, null, { timeout: 180000, polling: 500 });
const overText = await page.textContent("#center");
check("health runs out: game over", true, `after ${((Date.now() - t0) / 1000).toFixed(0)} s standing still: "${overText}"`);
await page.keyboard.press("r"); await wait(500);
check("R after game over restarts", !(await E("e.over")) && (await E("e.health")) === 100, `over ${await E("e.over")} health ${await E("e.health")}`);
console.log(`${results.filter((r) => r[1]).length}/${results.length} ok (${headed ? "headed" : "headless"})`);
await browser.close();
