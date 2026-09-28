// rc5-train eval (20260928-0525-w28): debug an existing module with three bugs that all compute.
// setup.files seeds @user/grades (class statistics over 20 inline scores) with:
//   1. median sorts with a bare .sort(): numbers compare as strings, "9" lands between 88 and 90,
//      and the median reads 78 instead of 75.5
//   2. passCount lists "viewof passMark" and reads .value once, so it never reacts to the slider
//      (the sibling `passMark` cell is correct and unused)
//   3. letterGrade uses > where the module's own intro says "A 90 and above": the four scores on a
//      boundary (90, 80, 70, 60) drop a grade. The prompt does not mention this one.
// Every cell computes with no runtime error. setup.collect checks behaviour, not spelling: the median
// value, the letter grade at each boundary (a grade function if one exists, else a per-student array),
// and that moving the range input from 60 to 75 changes a shown pass count from 16 to 10.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// the buggy module the agent is asked to fix (20260928-0525-w28)
const BUGGY = readFileSync(resolve(here, "fixtures/grades-buggy.js"), "utf8");

const FIXED = BUGGY
  .replace("scores.map(d => d.score).sort();", "scores.map(d => d.score).sort((a, b) => a - b);")
  .replace(`score > 90 ? "A" : score > 80 ? "B" : score > 70 ? "C" : score > 60 ? "D" : "F"`,
           `score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F"`)
  .replace("function passCount(scores, viewof_passMark){return( scores.filter(d => d.score >= viewof_passMark.value).length )}",
           "function passCount(scores, passMark){return( scores.filter(d => d.score >= passMark).length )}")
  .replace(`["scores", "viewof passMark"], _passCount`, `["scores", "passMark"], _passCount`);
if (FIXED.split("\n").filter((l, i) => l !== BUGGY.split("\n")[i]).length !== 4) throw new Error("grades eval: FIXED did not apply 4 edits");

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/grades")); })()`;

const COLLECT = String.raw`(async () => {
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const vars = () => [...rt._variables].filter(v => mods.includes(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)) };
  if (!vars().length) return { ...out, error: "no @user/grades or new module" };
  const keepers = [];
  for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1500);
    const texts = () => vars().map(v => v._value instanceof Element ? v._value.textContent : "").join(" | ");
    const nums = () => new Map(vars().filter(v => typeof v._value === "number").map(v => [v._name, v._value]));
    // 1. median
    const med = [...nums()].filter(([n]) => /median/i.test(n)).map(([, x]) => x);
    out.medianValues = med;
    out.medianOk = (med.length ? med.every(x => x === 75.5) : /75\.5/.test(texts())) && !/median\W{0,6}78\b/i.test(texts());
    // 2. grade boundaries: a grade function, else a per-student array
    const EXPECT = { 90: "A", 89: "B", 80: "B", 79: "C", 70: "C", 69: "D", 60: "D", 59: "F" };
    const fns = vars().map(v => v._value).filter(f => typeof f === "function" &&
      (() => { try { return f(95) === "A" && f(30) === "F"; } catch { return false; } })());
    out.gradeFns = fns.length;
    const fnBad = fns.flatMap(f => Object.entries(EXPECT).filter(([s, g]) => f(+s) !== g).map(([s]) => s + "->" + f(+s)));
    const arrays = vars().map(v => v._value).filter(a => Array.isArray(a) && a.length === 20 && a.every(d => d && typeof d === "object") &&
      Object.keys(a[0]).some(k => a.every(d => /^[ABCDF]$/.test(d[k]))));
    const counts = arrays.map(a => { const k = Object.keys(a[0]).find(k => a.every(d => /^[ABCDF]$/.test(d[k]))); const c = {}; for (const d of a) c[d[k]] = (c[d[k]] || 0) + 1; return "A" + (c.A || 0) + "B" + (c.B || 0) + "C" + (c.C || 0) + "D" + (c.D || 0) + "F" + (c.F || 0); });
    out.gradeBoundaryErrors = fnBad; out.gradeCounts = counts;
    out.gradesOk = (fns.length + arrays.length > 0) && fnBad.length === 0 && counts.every(c => c === "A4B4C5D3F4");
    // 3. the pass count follows the slider: 60 -> 16 passes, 75 -> 10
    const range = vars().map(v => v._value).filter(x => x instanceof Element)
      .flatMap(e => e.matches("input[type=range]") ? [e] : [...e.querySelectorAll("input[type=range]")])[0];
    if (!range) { out.passReacts = false; out.passStage = "no range input"; }
    else {
      const set = async (x) => { range.value = String(x); range.dispatchEvent(new Event("input", { bubbles: true })); await sleep(1000); };
      await set(60);
      const n60 = nums(), t60 = texts();
      await set(75);
      const n75 = nums(), t75 = texts();
      const numMoved = [...n60].filter(([k, x]) => x === 16 && n75.get(k) === 10).map(([k]) => k);
      const textMoved = /\b16\b/.test(t60) && /\b10\b/.test(t75) && !/\b16\b/.test(t75);
      out.passMoved = numMoved; out.passText75 = t75.slice(0, 300);
      out.passReacts = numMoved.length > 0 || textMoved;
    }
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-grades-debug",
  category: "rc5-train",
  question: "The grades notebook (@user/grades) gives wrong answers somewhere, the median looks off and the pass count doesn't change when I move the slider. Find and fix the bugs.",
  setup: { files: { "/src/@user/grades.js": BUGGY }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "medianOk", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "passReacts", equals: true }, weight: 2 },
    // the bug the prompt does not name: the intro says "A 90 and above", the code says > 90
    { name: "collected_equals", args: { key: "gradesOk", equals: true }, weight: 2 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/grades.js", content: FIXED } },
  ],
};
