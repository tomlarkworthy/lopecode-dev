// rc5-train eval (20260929-0620-m59): «Write a property-based test for my sortBy function: generate random
// arrays and compare the result with Array.prototype.sort.»
// setup.files seeds @user/sort-utils: sortBy(arr, key) with its contract in the intro md cell. The corpus has no
// sortBy (grep of lopecode/ and lopebooks/ notebooks), so the function was written for this eval.
// Seeded bug: an integer-key fast path buckets into an object and reads Object.keys(buckets). Non-negative
// integer keys enumerate ascending; negative keys ("-3") are string keys and come after them in insertion order.
// sortBy([3, -1, 2], x => x) is [2, 3, -1]. Length and elements are preserved; positive examples pass.
// setup.collect swaps sortBy's definition and scores behaviour (any test names, generator, assertion style):
//   testsFound      a test_* cell in @user/sort-utils depends (transitively) on sortBy
//   failsOnBug      with the seeded sortBy, a test_* cell rejects
//   deterministic   sortBy is redefined (same buggy body) 3 times; each time the same test_* cells reject with
//                   the same message. An unseeded Math.random test reports a different counterexample per run.
//                   A shared stateful rng cell also fails: it does not rerun, so each run continues its stream.
//   seedVisible     the failure message, or the failing test's source (or a direct input's), names a seed
//   counterexample  the failure message shows an input array of numbers and is under 1000 characters
//   passesOnCorrect with a correct stable sortBy, every test_* cell passes (a lexicographic arr.sort() reference
//                   rejects here: [-1, 10, 9] is not numeric order)
//   catchesMutant   with a sortBy that leaves the last element in place for arrays longer than 6, a test_* cell
//                   rejects. Hand-picked short examples do not; random arrays do.
//   unchanged       the live sortBy still behaves as seeded (asked for a test, not a fix)
// The reply must tell the user sortBy fails.

const BT = "`";
const FIXTURE = `const _intro = function _intro(md){return(
md${BT}# Sort utils

\\${BT}sortBy(arr, key)\\${BT} returns a new array with the elements of \\${BT}arr\\${BT} in ascending order of their key. \\${BT}key\\${BT} is a function of the element or a property name. Keys are all numbers or all strings. Elements with equal keys keep their original order. \\${BT}arr\\${BT} is not modified.${BT}
)};
const _sortBy = function _sortBy(){return(
function sortBy(arr, key) {
  const f = typeof key === "function" ? key : (x) => x[key];
  const keys = arr.map(f);
  if (keys.every(Number.isInteger)) {
    // fast path for integer keys: bucket, then read the buckets back in key order
    const buckets = {};
    arr.forEach((x, i) => (buckets[keys[i]] ??= []).push(x));
    return Object.keys(buckets).flatMap((k) => buckets[k]);
  }
  return arr
    .map((x, i) => [keys[i], i, x])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]))
    .map((e) => e[2]);
}
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };
  $def("_intro", null, ["md"], _intro);
  $def("_sortBy", "sortBy", [], _sortBy);
  return main;
}
`;
export const BUGGY_FAST_PATH = "return Object.keys(buckets).flatMap((k) => buckets[k]);";
if (!FIXTURE.includes(BUGGY_FAST_PATH)) throw new Error("sort-utils eval: fixture lacks the seeded bug");

// Oracle cells: the property-test harness idiom of @tomlarkworthy/svg-lens (mulberry32, forAll, rng made
// inside the test cell from a fixed seed), lopebooks/notebooks/tomlarkworthy_svg-lens.html.
const HARNESS = `const _mulberry32 = function _mulberry32(){return(
(seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
)};
const _forAll = function _forAll(){return(
(runs, seed, rng, gen, prop, label = "property") => {
  for (let i = 0; i < runs; i++) {
    const args = gen(rng);
    let ok, err;
    try { ok = prop(...args); } catch (e) { ok = false; err = e; }
    if (!ok) throw new Error(label + " counterexample (seed " + seed + ", run " + i + "): " + JSON.stringify(args) + (err ? " — " + err.message : ""));
  }
  return runs + " runs, seed " + seed;
}
)};
`;
const TEST_CELLS = (compare) => `const _test_sortBy_matches_sort = function _test_sortBy_matches_sort(forAll,mulberry32,sortBy){
  const seed = 0x5EED0001;
  const rng = mulberry32(seed);
  const int = (r, min, max) => min + Math.floor(r() * (max - min + 1));
  const genArray = (r) => [Array.from({ length: int(r, 0, 12) }, () => int(r, -20, 20))];
  return forAll(200, seed, rng, genArray, (arr) => {
    const got = sortBy(arr, (x) => x);
    const want = ${compare};
    return JSON.stringify(got) === JSON.stringify(want);
  }, "sortBy(arr, x => x) vs Array.prototype.sort");
};
const _test_sortBy_property_key_stable = function _test_sortBy_property_key_stable(forAll,mulberry32,sortBy){
  const seed = 0x5EED0002;
  const rng = mulberry32(seed);
  const int = (r, min, max) => min + Math.floor(r() * (max - min + 1));
  const genRows = (r) => [Array.from({ length: int(r, 0, 12) }, (_, id) => ({ k: int(r, -5, 5), id }))];
  return forAll(200, seed, rng, genRows, (rows) => {
    const got = sortBy(rows, "k");
    const want = [...rows].sort((a, b) => a.k - b.k);
    return JSON.stringify(got) === JSON.stringify(want);
  }, "sortBy(rows, \\"k\\") vs Array.prototype.sort");
};
`;
const TEST_DEFS = `  $def("_mulberry32", "mulberry32", [], _mulberry32);
  $def("_forAll", "forAll", [], _forAll);
  $def("_test_sortBy_matches_sort", "test_sortBy_matches_sort", ["forAll", "mulberry32", "sortBy"], _test_sortBy_matches_sort);
  $def("_test_sortBy_property_key_stable", "test_sortBy_property_key_stable", ["forAll", "mulberry32", "sortBy"], _test_sortBy_property_key_stable);
`;
export const withTests = (cells, defs) => FIXTURE
  .replace("\nexport default function define", "\n" + cells + `
const _test_results = function _test_results(tests){return(
  tests({ filter: (t) => t.name.includes("@user/sort-utils") })
)};
export default function define`)
  .replace("  return main;\n}", defs + `  $def("_test_results", null, ["tests"], _test_results);
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  return main;
}`);
export const NUMERIC = "[...arr].sort((a, b) => a - b)";
export const SOLUTION = withTests(HARNESS + TEST_CELLS(NUMERIC), TEST_DEFS);
export { FIXTURE, HARNESS, TEST_CELLS, TEST_DEFS };
if (!SOLUTION.includes("_test_results")) throw new Error("sort-utils eval: SOLUTION did not apply");

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const mod = globalThis.__ojs_runtime.mains.get("@user/sort-utils");
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module).filter(m => m !== mod));
})()`;

const COLLECT = String.raw`(async () => {
  const KEYS = ["testsFound", "failsOnBug", "deterministic", "seedVisible", "counterexample", "passesOnCorrect", "catchesMutant", "unchanged"];
  const out = Object.fromEntries(KEYS.map(k => [k, "not checked"]));
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const mod = globalThis.__ojs_runtime.mains.get("@user/sort-utils");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const inMod = [...rt._variables].filter(v => v._module === mod && v._name);
  const keepers = [];
  for (const v of inMod) { try { keepers.push(mod.variable(true).define([v._name], x => x)); } catch {} }
  const settle = async (v, ms = 8000) => {
    for (let i = 0; i < 3; i++) {
      const p = v._promise;
      const r = await Promise.race([p.then(value => ({ ok: true, value }), error => ({ ok: false, error })), sleep(ms).then(() => ({ ok: false, error: "timeout" }))]);
      if (p === v._promise) return r;
    }
    return { ok: false, error: "unsettled" };
  };
  const msgOf = r => String(r.error && r.error.message || r.error);
  const sortVar = inMod.find(v => v._name === "sortBy");
  const reaches = (v, target, seen = new Set()) => {
    if (v === target) return true;
    if (seen.has(v)) return false;
    seen.add(v);
    return v._inputs.some(i => i && reaches(i, target, seen));
  };
  const src = v => String(v && v._definition);

  const correct = function sortBy(arr, key) {
    const f = typeof key === "function" ? key : (x) => x[key];
    return arr.map((x, i) => [f(x), i, x]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1])).map((e) => e[2]);
  };
  const mutant = function sortBy(arr, key) {
    if (arr.length <= 6) return correct(arr, key);
    return [...correct(arr.slice(0, -1), key), arr[arr.length - 1]];
  };
  let origInputs = null, origDef = null;
  try {
    await sleep(1000);
    if (!sortVar) { for (const k of KEYS) out[k] = "no sortBy cell in @user/sort-utils"; return out; }
    origInputs = sortVar._inputs.map(i => i._name);
    origDef = sortVar._definition;
    const tests = inMod.filter(v => /^test_/.test(v._name) && reaches(v, sortVar));
    out.testNames = tests.map(v => v._name);
    if (!tests.length) {
      out.testsFound = "no test_* cell in @user/sort-utils depends on sortBy; cells: " + inMod.map(v => v._name).join(", ");
      for (const k of KEYS.slice(1)) out[k] = "no test_* cells";
      return out;
    }
    out.testsFound = "ok";

    // unchanged: the live sortBy behaves as seeded
    const live = await settle(sortVar, 2000);
    if (!live.ok || typeof live.value !== "function") out.unchanged = "sortBy does not compute to a function";
    else {
      const g = JSON.stringify(live.value([3, -1, 2], x => x));
      out.unchanged = g === "[2,3,-1]" ? "ok" : g === "[-1,2,3]" ? "sortBy was fixed (sortBy([3,-1,2]) is now [-1,2,3])" : "sortBy([3,-1,2]) returns " + g;
    }

    const run = async (fn) => {
      if (typeof fn === "function" && fn.name === "sortBy") sortVar.define("sortBy", [], () => fn);
      else sortVar.define("sortBy", origInputs, fn);
      await sleep(300);
      return Promise.all(tests.map(async v => ({ name: v._name, v, ...(await settle(v)) })));
    };
    const failing = rs => rs.filter(r => !r.ok || r.value === undefined);
    const sig = rs => JSON.stringify(failing(rs).map(r => [r.name, r.ok ? "undefined" : msgOf(r)]));

    // three reruns of the seeded bug: a fresh closure each time forces dependents to recompute
    const runs = [];
    for (let i = 0; i < 3; i++) runs.push(await run(function (...a) { return origDef.apply(this, a); }));
    const f0 = failing(runs[0]);
    out.failed = f0.map(r => r.name + ": " + (r.ok ? "undefined" : msgOf(r).slice(0, 200)));
    out.failsOnBug = f0.some(r => !r.ok) ? "ok" : "no test_* cell rejects with the seeded sortBy";
    const sigs = runs.map(sig);
    out.deterministic = !f0.length ? "no failing test to repeat"
      : sigs.every(s => s === sigs[0]) ? "ok"
      : "reruns differ: " + sigs.map(s => s.slice(0, 160)).join(" | ");
    const rej = f0.filter(r => !r.ok);
    const seedRe = /seed/i;
    out.seedVisible = !rej.length ? "no failing test"
      : rej.some(r => seedRe.test(msgOf(r)) || seedRe.test(src(r.v)) || r.v._inputs.some(i => seedRe.test(i._name) || seedRe.test(src(i)))) ? "ok"
      : "no seed in the failure message or the failing test's source";
    out.counterexample = !rej.length ? "no failing test"
      : rej.some(r => { const m = msgOf(r); return m.length < 1000 && /\[[^\]]*-?\d/.test(m); }) ? "ok"
      : "the failure message shows no input array (or is over 1000 chars): " + msgOf(rej[0]).slice(0, 200);

    const good = await run(correct);
    const gbad = failing(good);
    out.passesOnCorrect = gbad.length ? "with a correct sortBy these test_* cells do not pass: " + gbad.map(r => r.name + (r.ok ? "=undefined" : ": " + msgOf(r).slice(0, 160))).join("; ") : "ok";

    const mu = await run(mutant);
    out.catchesMutant = failing(mu).some(r => !r.ok) ? "ok" : "no test_* cell rejects a sortBy that leaves the last element unsorted for length > 6";
    return out;
  } finally {
    if (sortVar && origDef) { try { sortVar.define("sortBy", origInputs, origDef); } catch {} }
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-sortby-property-test",
  category: "rc5-train",
  question: "Write a property-based test for my sortBy function: generate random arrays and compare the result with Array.prototype.sort.",
  setup: { files: { "/src/@user/sort-utils.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "testsFound", equals: "ok" }, weight: 1 },
    // the seeded negative-key bug shows as a rejected test (a length-only check does not)
    { name: "collected_equals", args: { key: "failsOnBug", equals: "ok" }, weight: 3 },
    // same verdict and same counterexample on every rerun (an unseeded Math.random test does not)
    { name: "collected_equals", args: { key: "deterministic", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "seedVisible", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "counterexample", equals: "ok" }, weight: 1 },
    // the reference is right: a lexicographic arr.sort() rejects a correct sortBy
    { name: "collected_equals", args: { key: "passesOnCorrect", equals: "ok" }, weight: 3 },
    // random inputs, not a few hand-picked ones
    { name: "collected_equals", args: { key: "catchesMutant", equals: "ok" }, weight: 1 },
    // asked for a test, not a fix
    { name: "collected_equals", args: { key: "unchanged", equals: "ok" }, weight: 1 },
    { name: "answer_matches", args: { pattern: "sortBy[\\s\\S]{0,400}(fail|bug|wrong|incorrect|negative|counterexample)|(fail|bug|wrong|incorrect|counterexample)[\\s\\S]{0,400}sortBy", flags: "i" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/sort-utils.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/sort-utils.js", content: SOLUTION } },
    { assistant: "I added two seeded property tests to @user/sort-utils (mulberry32 + forAll, 200 random arrays each, compared with [...arr].sort((a, b) => a - b)). Both fail: sortBy puts negative integer keys after the non-negative ones, and the failure message gives the seed and the input array. The integer fast path reads Object.keys(buckets), which lists negative keys after array-index keys. I have not changed sortBy; say if you want me to fix it." },
  ],
};
