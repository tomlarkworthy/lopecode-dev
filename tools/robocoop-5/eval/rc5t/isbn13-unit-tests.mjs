// rc5-train eval (20260928-0225-w16): unit tests that the notebook's test runner cannot see.
// In run 20260928-0225-w16-before the agent, asked for "unit tests in the notebook that show which cases
// pass", wrote a `tests` array, a `testResults` cell and an HTML "17 / 17 tests passed" table. No test_*
// cell, so @tomlarkworthy/tests (loaded in the page) found nothing, and a failing case would compute
// "with no runtime error". The house form is one test_* cell per case that throws on failure.
//
// setup.collect is behavioural, so any validator name, module id or assertion style passes:
//   validator  some function cell of a module created in the turn classifies known ISBN-13s correctly
//   tests      that module has >= 3 test_* cells and every one currently fulfils with a defined value
//   mutants    replacing the validator with (a) always true, (b) always false, (c) digits-and-length only
//              (no checksum) makes at least one test_* cell reject, for each mutant
// The validator is restored afterwards.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const out = { validator: "not checked", tests: "not checked", mutants: "not checked" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  if (!userVars.length) { out.validator = out.tests = out.mutants = "no module was created"; return out; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const settle = async (v, ms = 4000) => {
    // wait for the variable's current promise; report {ok, value|error}
    for (let i = 0; i < 3; i++) {
      const p = v._promise;
      const r = await Promise.race([p.then(value => ({ ok: true, value }), error => ({ ok: false, error })), sleep(ms).then(() => ({ ok: false, error: "timeout" }))]);
      if (p === v._promise) return r;
    }
    return { ok: false, error: "unsettled" };
  };
  const norm = r => (r && typeof r === "object" && "valid" in r) ? r.valid : r;
  const VALID = ["9780306406157", "978-0-306-40615-7", "9783161484100", "9791234567896", "9780470059029"];
  const INVALID = ["9780306406158", "978030640615", "97803064061570", "978030640615X", "abcdefghijklm", ""];
  try {
    await sleep(800);
    let validator = null, bad = [];
    for (const v of userVars) {
      const r = await settle(v, 2000);
      if (!r.ok || typeof r.value !== "function") continue;
      const f = r.value;
      const call = s => { try { return norm(f(s)); } catch { return false; } };
      if (call("9780306406157") !== true || call("9780306406158") === true) continue;
      bad = [...VALID.filter(s => call(s) !== true), ...INVALID.filter(s => !!call(s))];
      validator = v;
      if (!bad.length) break;
    }
    if (!validator) { out.validator = "no function cell accepts 9780306406157 and rejects 9780306406158"; }
    else out.validator = bad.length ? "misclassifies " + JSON.stringify(bad) : "ok";

    const mod = validator ? validator._module : userVars[0]._module;
    const testVars = userVars.filter(v => v._module === mod && /^test_/.test(v._name));
    if (testVars.length < 3) {
      out.tests = "found " + testVars.length + " test_* cell(s) in the module (need >= 3); cells: " + userVars.filter(v => v._module === mod).map(v => v._name).join(", ");
      out.mutants = "no test_* cells to run";
      return out;
    }
    const states = async () => Promise.all(testVars.map(async v => ({ name: v._name, ...(await settle(v)) })));
    const base = await states();
    const failing = base.filter(s => !s.ok || s.value === undefined);
    out.tests = failing.length ? "test_* cells not passing on the agent's own validator: " + failing.map(s => s.name + (s.ok ? "=undefined" : ": " + String(s.error).slice(0, 80))).join("; ") : "ok";
    if (!validator) { out.mutants = "no validator to mutate"; return out; }

    const origDef = validator._definition;
    const origInputs = validator._inputs.map(i => i._name);
    const name = validator._name;
    const MUTANTS = {
      "always true": () => () => true,
      "always false": () => () => false,
      "no checksum": () => s => typeof s === "string" && /^\d{13}$/.test(s.replace(/[-\s]/g, "")),
    };
    const missed = [];
    try {
      for (const [label, def] of Object.entries(MUTANTS)) {
        validator.define(name, [], def);
        await sleep(300);
        const st = await states();
        if (!st.some(s => !s.ok)) missed.push(label);
      }
    } finally {
      validator.define(name, origInputs, origDef);
      await sleep(300);
    }
    out.mutants = missed.length ? "no test_* cell fails when the validator is replaced by: " + missed.join(", ") : "ok";
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

const SOLUTION = `const _intro = function intro(md){return( md\`# ISBN-13 validator\` )};
const _isValidISBN13 = function isValidISBN13(){return(
  (s) => {
    if (typeof s !== "string") return false;
    const d = s.replace(/[-\\s]/g, "");
    if (!/^\\d{13}$/.test(d)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += Number(d[i]) * (i % 2 ? 3 : 1);
    return (10 - (sum % 10)) % 10 === Number(d[12]);
  }
)};
const _test_valid_plain = function _test_valid_plain(expect, isValidISBN13){
  expect(isValidISBN13("9780306406157")).toBe(true);
  return "valid";
};
const _test_valid_hyphenated = function _test_valid_hyphenated(isValidISBN13){
  const got = isValidISBN13("978-0-306-40615-7");
  if (got !== true) throw Error("expected true, got " + got);
  return got;
};
const _test_bad_check_digit = function _test_bad_check_digit(expect, isValidISBN13){
  expect(isValidISBN13("9780306406158")).toBe(false);
  return "rejected";
};
const _test_wrong_length = function _test_wrong_length(expect, isValidISBN13){
  expect(isValidISBN13("978030640615")).toBe(false);
  return "rejected";
};
const _test_letters = function _test_letters(expect, isValidISBN13){
  expect(isValidISBN13("978030640615X")).toBe(false);
  return "rejected";
};
const _test_results = function _test_results(tests){return(
  tests({ filter: (t) => t.name.includes("@user/isbn13") })
)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_isValidISBN13", "isValidISBN13", [], _isValidISBN13);
  $def("_test_valid_plain", "test_valid_plain", ["expect", "isValidISBN13"], _test_valid_plain);
  $def("_test_valid_hyphenated", "test_valid_hyphenated", ["isValidISBN13"], _test_valid_hyphenated);
  $def("_test_bad_check_digit", "test_bad_check_digit", ["expect", "isValidISBN13"], _test_bad_check_digit);
  $def("_test_wrong_length", "test_wrong_length", ["expect", "isValidISBN13"], _test_wrong_length);
  $def("_test_letters", "test_letters", ["expect", "isValidISBN13"], _test_letters);
  $def("_test_results", null, ["tests"], _test_results);
  main.define("module @tomlarkworthy/jest-expect-standalone", async () => runtime.module((await import("/@tomlarkworthy/jest-expect-standalone.js?v=4")).default));
  main.define("expect", ["module @tomlarkworthy/jest-expect-standalone", "@variable"], (_, v) => v.import("expect", _));
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  return main;
}
`;

export default {
  id: "rc5t-isbn13-unit-tests",
  category: "rc5-train",
  question: "Write a function that checks whether a string is a valid ISBN-13, with unit tests in the notebook that show which cases pass.",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "validator", equals: "ok" }, weight: 1 },
    // the defect: tests the runner can see (test_* cells, passing)
    { name: "collected_equals", args: { key: "tests", equals: "ok" }, weight: 2 },
    // tests that can fail: each mutant of the validator is caught
    { name: "collected_equals", args: { key: "mutants", equals: "ok" }, weight: 2 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-unit-tests-in-a-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/isbn13.js", content: SOLUTION } },
  ],
};
