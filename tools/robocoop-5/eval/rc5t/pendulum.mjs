// Long task: the 2026-09-28 baseline took 1180s. Model runs need --timeout 1500000.
// rc5t-pendulum (20260928-0340-w38): a swinging pendulum with length/gravity sliders, a live
// 10-second angle plot and Pause/Resume; a slider change must not restart the swing.
// setup.collect (pendulum.collect.js) reads the angle from the drawing (an svg or canvas rod whose end
// carries a circle, else a rotate() transform, else a theta/angle value) and scores each part:
//   animates    the angle moves
//   plot        a line of >= 20 points changes within 1s
//   period      zero-crossing period within 5% of 4√(L/g)K(sin(θ0/2)) (= 2π√(L/g) at small amplitude)
//   continuity  moving the length slider mid-swing does not jump the angle (no reset to θ0)
//   pause       the angle is frozen for 1s after Pause
//   resume      it moves again after Resume, from the paused angle
//   singleLoop  timer/rAF callbacks per 3s do not grow after 5 slider moves and 3 cell redefinitions
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ORACLE_SRC = readFileSync(resolve(here, "pendulum.oracle.js"), "utf8");

export default {
  id: "rc5t-pendulum",
  category: "rc5-train",
  question: "Simulate a pendulum: sliders for length and gravity, an animation of it swinging, a live plot of the angle over the last 10 seconds, and a Pause/Resume button. Changing a slider should not restart the swing from scratch.",
  setup: {
    initScript: readFileSync(resolve(here, "pendulum.initscript.js"), "utf8"),
    init: String.raw`(() => {
      const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
      globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
    })()`,
    collect: readFileSync(resolve(here, "pendulum.collect.js"), "utf8"),
  },
  criteria: [
    { name: "collected_equals", args: { key: "animates", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "plot", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "period", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "continuity", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "pause", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "resume", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "singleLoop", equals: true }, weight: 2 },
    // always fails; carries the measurements into the feedback
    { name: "collected_equals", args: { key: "detail", equals: "" }, weight: 0 },
  ],
  oracle: [
    { tool: "write_file", args: { file_path: "/src/@user/pendulum.js", content: ORACLE_SRC }, settleMs: 3000 },
  ],
};
