// bun lite/jsx/proof.ts [fixture dir] [--browser]
// --browser runs the cells with lite/browser/run.ts (no TypeScript, no Bun.Transpiler) instead of run.ts.
// Checks a .tsx port with lite, lowers its JSX to h(...) calls, runs it with the existing harness
// (run.ts loadPort), renders the `app` cell into happy-dom, and drives it with DOM events.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Window } from "happy-dom";
import { checkPort } from "../check.ts";
import { lowerJsx } from "./lower.ts";
import { h } from "./h.ts";
import { create, patch } from "./render.ts";
import { loadPort } from "../../run.ts";
import { runCells } from "../browser/run.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const BROWSER = process.argv.includes("--browser");
const dir = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(HERE, "../../fixtures/lite-jsx/accept-suminagashi-controls"));

const c = checkPort(dir);
const n = (s: string) => c.cells.filter((x) => x.status === s).length;
console.log(`lite: ${c.cells.length} cells: ok ${n("ok")}, rejected ${n("rejected")}, unsupported ${n("unsupported")}, blocked ${n("blocked")}`);
for (const x of c.cells) for (const e of x.errors) console.log(`  ${x.name} [${e.rule}] ${e.msg}`);

const build = join(HERE, "../.jsx-build", basename(dir));
mkdirSync(build, { recursive: true });
writeFileSync(join(build, "cells.ts"), lowerJsx(readFileSync(join(dir, "cells.tsx"), "utf8")));
(globalThis as any).h = h;
const port = BROWSER ? browserPort() : await loadPort(build);
function browserPort() {
  const p = runCells(readFileSync(join(dir, "cells.tsx"), "utf8"), { tsx: true });
  const results = () => p.cells.map((c) => ({ name: c.name, test: c.name.startsWith("test_") ? (p.status(c.name) === "fulfilled" ? "pass" : "fail") : undefined, error: p.error(c.name) }));
  return { ...p, results };
}
console.log(`runner: ${BROWSER ? "lite/browser/run.ts" : "run.ts loadPort"}`);
await port.settle();

const win = new Window();
const doc = win.document as unknown as Document;
let canvasesCreated = 0;
const createElement = doc.createElement.bind(doc);
(doc as any).createElement = (tag: string) => { if (tag === "canvas") canvasesCreated++; return createElement(tag); };
const root = create(doc, port.value("app")) as any;
doc.body.appendChild(root);
const rerender = async () => { await port.settle(); patch(root, port.value("app") as any); };

let failures = 0;
const check = (what: string, ok: boolean, got?: unknown) => {
  if (!ok) failures++;
  console.log(`${ok ? "pass" : "FAIL"}  ${what}${ok ? "" : `  (got ${JSON.stringify(got)})`}`);
};
const q = (sel: string) => root.querySelector(sel) as any;
const radios = (legend: string) => [...root.querySelectorAll("fieldset")].find((f: any) => f.querySelector("legend").textContent === legend).querySelectorAll("input");
const fire = (node: any, type: string, init: object = {}) => node.dispatchEvent(new (win as any).MouseEvent(type, { bubbles: true, ...init }));

const canvas0 = q("canvas");
check("renders 2 radio groups, 3 ranges, a checkbox, a button and a canvas",
  root.querySelectorAll("fieldset").length === 2 && root.querySelectorAll("input[type=range]").length === 3 &&
  root.querySelectorAll("input[type=checkbox]").length === 1 && !!canvas0 && !!q("button"));
check("tool starts as brush, its radio checked", port.value("tool") === "brush" && radios("tool")[0].checked === true);
const canvasEvals0 = port.evals("canvas_view");

fire(radios("tool")[1], "click");
await rerender();
check("clicking the blow radio sets tool", port.value("tool") === "blow", port.value("tool"));
check("the blow radio is now the checked one", radios("tool")[1].checked === true && radios("tool")[0].checked === false);
check("the canvas is the same DOM node after the handler changed", q("canvas") === canvas0);
check("canvas_view was described again (its pointerDown input changed)", port.evals("canvas_view") > canvasEvals0, port.evals("canvas_view"));

fire(q("canvas"), "pointerdown", { clientX: 10, clientY: 20 });
await rerender();
let p = port.value("pointer") as any;
check("pointerdown with blow: pointer set, turn unchanged", p?.tool === "blow" && p.x === 10 && p.y === 20 && p.down === true && port.value("turn") === 0, { p, turn: port.value("turn") });
fire(q("canvas"), "pointermove", { clientX: 30, clientY: 40 });
await rerender();
p = port.value("pointer");
check("pointermove moves a down pointer", p?.x === 30 && p.y === 40, p);
fire(q("canvas"), "pointerup");
await rerender();
check("pointerup releases it", (port.value("pointer") as any)?.down === false, port.value("pointer"));

fire(radios("tool")[0], "click");
await rerender();
fire(q("canvas"), "pointerdown", { clientX: 5, clientY: 5 });
await rerender();
p = port.value("pointer");
check("pointerdown with brush: turn 1, fluid sequence[0] = 2", port.value("turn") === 1 && p?.fluid === 2 && p.tool === "brush", { turn: port.value("turn"), p });
fire(q("canvas"), "pointerdown", { clientX: 6, clientY: 6 });
await rerender();
p = port.value("pointer");
check("a second brush pointerdown: turn 2, fluid sequence[1] = 0", port.value("turn") === 2 && p?.fluid === 0, { turn: port.value("turn"), p });

// two pointerdowns with no settle between them: the second must see the first's turn
const turnBefore = port.value("turn") as number;
fire(q("canvas"), "pointerdown", { clientX: 7, clientY: 7 });
fire(q("canvas"), "pointerdown", { clientX: 8, clientY: 8 });
await rerender();
check("two pointerdowns before a settle advance turn by 2", port.value("turn") === turnBefore + 2, { before: turnBefore, after: port.value("turn") });

const range = [...root.querySelectorAll("input[type=range]")][0] as any;
range.value = "800";
range.dispatchEvent(new (win as any).Event("input", { bubbles: true }));
await rerender();
check("the height range sets height", port.value("height") === 800, port.value("height"));
check("the canvas takes the new height and is still the same node", q("canvas").getAttribute("height") === "800" && q("canvas") === canvas0, q("canvas").getAttribute("height"));

// mainLoop's finishPicture, called by the world: a touch empties the tray only 2 s after the finish
const finishPicture = port.value("finishPicture") as (at: number, why: string) => void;
const resetsBefore = port.value("reset") as number;
finishPicture(1e15, "finished in the future"); // so every touch now is less than 2 s after it
await rerender();
fire(q("canvas"), "pointerdown", { clientX: 1, clientY: 1 });
await rerender();
check("a touch less than 2 s after the finish is ignored", port.value("reset") === resetsBefore && !!port.value("finished"), { reset: port.value("reset"), finished: port.value("finished") });
finishPicture(-1e15, "finished long ago");
await rerender();
fire(q("canvas"), "pointerdown", { clientX: 1, clientY: 1 });
await rerender();
check("a touch more than 2 s after the finish empties the tray", port.value("reset") === resetsBefore + 1 && port.value("finished") === false && port.value("turn") === 0, { reset: port.value("reset"), finished: port.value("finished") });

fire(q("button"), "click");
await rerender();
check("empty the tray: reset 2, turn 0", port.value("reset") === 2 && port.value("turn") === 0, { reset: port.value("reset"), turn: port.value("turn") });

for (const name of ["test_canvas_is_a_canvas", "test_two_downs_take_two_turns", "test_finished_waits_two_seconds"]) {
  const t = port.results().find((r) => r.name === name);
  check(`checked test ${name} passes`, t?.test === "pass", t);
}
console.log(`evaluations: canvas_view ${port.evals("canvas_view")}, pointerDown ${port.evals("pointerDown")}, step ${port.evals("step")}, app ${port.evals("app")}; canvas DOM nodes created: ${canvasesCreated}`);
port.dispose();
await win.happyDOM.close();
console.log(failures ? `${failures} failure(s)` : "all checks pass");
process.exit(failures ? 1 : 0);
