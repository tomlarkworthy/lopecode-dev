// The lab, driven. Two gestures that could each silently do nothing: dragging an
// enemy on the level board, and running a match to a verdict. A screenshot proves
// neither, so both are asserted here and the shots are the evidence, not the test.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-lab))");
await p.waitForFunction(() => document.body.innerText.includes("objectives"), {timeout: 60000});
await p.waitForTimeout(1500);

const view = (name: string) => p.evaluateHandle((n) => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-lab");
  for (const [k, v] of m._scope) if (k === "viewof " + n) return (v as any)._value.qa;
}, name);

// ---- level editor: drag an enemy -----------------------------------------
// Mission 3 (Cocoon) is the first with enemies to drag.
await p.selectOption("select", {index: 3});
await p.waitForTimeout(800);
const lvl = await view("levelEditor");
const before = await p.evaluate((q: any) => structuredClone(q.mission().enemies?.[0]), lvl);
if (!before) { console.log("FAIL: that mission has no enemy to drag"); process.exit(1); }
const from = await p.evaluate(([q, e]: any) => { q.svg().scrollIntoView({block: "center"});
  return q.worldToClient(e.x, e.y); }, [lvl, before] as any);
const to = await p.evaluate(([q, e]: any) => q.worldToClient(e.x + 3, e.y - 2), [lvl, before] as any);
await p.mouse.move(from.x, from.y);
await p.mouse.down();
await p.mouse.move(to.x, to.y, {steps: 8});
await p.mouse.up();
await p.waitForTimeout(400);
const after = await p.evaluate((q: any) => structuredClone(q.mission().enemies[0]), lvl);
await p.screenshot({path: "tools/screenshots/corepox-lab-level.png"});
console.log(`enemy 0  (${before.x}, ${before.y}) -> (${after.x}, ${after.y})` +
            `   wanted (${before.x + 3}, ${before.y - 2})`);
const moved = Math.hypot(after.x - (before.x + 3), after.y - (before.y - 2));
if (moved > 0.35) { console.log(`FAIL: drag landed ${moved.toFixed(2)} tiles off`); process.exit(1); }

// ---- arena: run a match to a verdict --------------------------------------
const ar = await view("arena");
// The default pair at the default separation: the mine detonates on the
// manualAim and takes its Brain at 1.2s. Overriding the gap here would test a
// separation the matrix says nothing resolves at.
await p.evaluate((q: any) => { q.setup({}); }, ar);
await p.evaluate((q: any) => q.world() && document.querySelectorAll("svg").length, ar);
await p.waitForTimeout(300);
await p.evaluate((q: any) => q.start(), ar);
await p.waitForFunction((q: any) => !q.state().running, ar, {timeout: 90000});
const st = await p.evaluate((q: any) => q.state(), ar);
// Scroll the arena board into view before the shot, or the picture is of the
// level editor with a passing arena assertion underneath it.
await p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-lab");
  for (const [k, v] of m._scope) if (k === "viewof arena")
    (v as any)._value.scrollIntoView({block: "center"});
});
await p.waitForTimeout(400);
await p.screenshot({path: "tools/screenshots/corepox-lab-arena.png"});
console.log(`arena  ${st.state}  after ${st.t.toFixed(1)}s`);
console.log("errors:", errs.slice(0, 5));
await b.close();
if (!st.state || st.state === "ready" || st.state.startsWith("draw")) {
  console.log("FAIL: the match never resolved to a kill"); process.exit(1);
}
console.log("PASS: an enemy drags to where it is dropped, and a match reaches a verdict");
