// rc5-train eval (20260928-0847-m1): maintenance goal "add unit tests for the functions in my notebook,
// and tell me if any of them fail".
// setup.files seeds @user/signal-utils: eight pure helpers copied from
// @tomlarkworthy/fast-1d-circular-barcode-matching (lopebooks/notebooks/@tomlarkworthy_fast-1d-circular-barcode-matching.html)
// with ONE seeded bug: rgbaToGray loops `i < rgba.length - 4` instead of `i < rgba.length`, so the last
// pixel is never converted and reads 0. rgbaToGray([255,255,255,255]) returns [0], not [255].
// setup.collect scores behaviour, not spelling (any module, test style or case names):
//   testsFound     >= 3 test_* cells in @user/signal-utils or a module created in the turn
//   testsCompute   no test_* cell is pending or undefined, and >= 2 pass
//   bugCaught      a rejected test_* cell depends on (or calls) rgbaToGray
//   falseFailures  no rejected test_* cell that does not involve rgbaToGray (a wrong expectation)
//   unchanged      the eight functions still behave as seeded, bug included (asked to test, not fix)
// The answer must name rgbaToGray as failing.

const FIXTURE = "const _intro = function _intro(md){return(\nmd`# Signal utils\n\nHelpers for reading a 1D scan line out of a camera frame and finding its edges.\n\n- \\`clamp(v, lo, hi)\\` limits \\`v\\` to \\`[lo, hi]\\`.\n- \\`rgbaToGray(rgba)\\` converts RGBA bytes (4 per pixel) to one luma byte per pixel, \\`0.299 R + 0.587 G + 0.114 B\\` truncated to an integer. Throws when the length is not a multiple of 4.\n- \\`sampleLine(gray, w, cx, cy, theta, len)\\` bilinearly samples \\`len\\` points of a \\`w\\`-wide gray image along a line through \\`(cx, cy)\\` at angle \\`theta\\`; points outside the image read 0.\n- \\`gaussianKernel1D(sigma)\\` returns a normalised kernel \\`{ data, half }\\` of length \\`2 * half + 1\\`.\n- \\`edges1D(sig, thr = 6)\\` returns the local extrema of the first difference whose magnitude is at least \\`thr\\`, as \\`{ x, s }\\` (index, sign).\n- \\`binaryToEdges(arr)\\` returns the positions of value changes in a 0/1 array, relative to its centre.\n- \\`solve3(A, b)\\` solves a 3x3 linear system by Cramer's rule; a singular system returns \\`[0, 0, 0]\\`.\n- \\`xFromK(pqrs, k)\\` inverts the Möbius map \\`k = (p x + q) / (r x + s)\\`.`\n)};\nconst _clamp = function _clamp(){return(\nfunction clamp(v, lo, hi) {\n  return v < lo ? lo : v > hi ? hi : v;\n}\n)};\nconst _rgbaToGray = function _rgbaToGray(){return(\nfunction rgbaToGray(rgba) {\n  if (rgba.length % 4 !== 0) throw new Error(\"RGBA length not multiple of 4\");\n  const gray = new Uint8Array(rgba.length / 4);\n  for (let i = 0, j = 0; i < rgba.length - 4; i += 4, j++) {\n    const r = rgba[i],\n      g = rgba[i + 1],\n      b = rgba[i + 2];\n    gray[j] = (0.299 * r + 0.587 * g + 0.114 * b) | 0;\n  }\n  return gray;\n}\n)};\nconst _sampleLine = function _sampleLine(){return(\nfunction sampleLine(gray, w, cx, cy, theta, len) {\n  const h = (gray.length / w) | 0;\n  const dx = Math.cos(theta),\n    dy = Math.sin(theta);\n  const half = (len / 2) | 0;\n  const out = new Float32Array(len);\n  for (let t = -half, j = 0; j < len; t++, j++) {\n    const xf = cx + t * dx,\n      yf = cy + t * dy;\n    const x0 = Math.floor(xf),\n      y0 = Math.floor(yf);\n    if (x0 < 0 || x0 >= w - 1 || y0 < 0 || y0 >= h - 1) {\n      out[j] = 0;\n      continue;\n    }\n    const a = xf - x0,\n      b = yf - y0;\n    const i = y0 * w + x0;\n    const p00 = gray[i],\n      p10 = gray[i + 1],\n      p01 = gray[i + w],\n      p11 = gray[i + w + 1];\n    out[j] =\n      (1 - a) * (1 - b) * p00 +\n      a * (1 - b) * p10 +\n      (1 - a) * b * p01 +\n      a * b * p11;\n  }\n  return out;\n}\n)};\nconst _gaussianKernel1D = function _gaussianKernel1D(){return(\nfunction gaussianKernel1D(sigma) {\n  const s = Math.max(0.3, sigma);\n  const half = Math.max(1, Math.round(s * 3));\n  const size = 2 * half + 1;\n  const data = new Float32Array(size);\n  const a = 1 / (Math.sqrt(2 * Math.PI) * s);\n  const twoSigma2 = 2 * s * s;\n  let sum = 0;\n  for (let i = -half; i <= half; i++) {\n    const v = a * Math.exp(-(i * i) / twoSigma2);\n    data[i + half] = v;\n    sum += v;\n  }\n  for (let i = 0; i < size; i++) data[i] /= sum;\n  return { data, half };\n}\n)};\nconst _edges1D = function _edges1D(){return(\nfunction edges1D(sig, thr = 6) {\n  const n = sig.length;\n  const d = new Float32Array(n);\n  for (let i = 1; i < n; i++) d[i] = sig[i] - sig[i - 1];\n  const idx = [];\n  for (let i = 2; i < n - 2; i++) {\n    const v = d[i];\n    if (Math.abs(v) < thr) continue;\n    if (\n      (v > 0 && d[i] >= d[i - 1] && d[i] >= d[i + 1]) ||\n      (v < 0 && d[i] <= d[i - 1] && d[i] <= d[i + 1])\n    ) {\n      idx.push({ x: i, s: Math.sign(v) });\n    }\n  }\n  return idx;\n}\n)};\nconst _binaryToEdges = function _binaryToEdges(){return(\nfunction binaryToEdges(arr) {\n  const edges = [];\n  const n = arr.length;\n\n  // transitions\n  for (let i = 1; i < n; i++) {\n    if (arr[i] !== arr[i - 1]) edges.push(i);\n  }\n\n  return edges.map((i) => i - arr.length / 2);\n}\n)};\nconst _solve3 = function _solve3(){return(\nfunction solve3(A, b) {\n  const [a, b1, c, d, e, f, g, h, i] = [\n    A[0][0],\n    A[0][1],\n    A[0][2],\n    A[1][0],\n    A[1][1],\n    A[1][2],\n    A[2][0],\n    A[2][1],\n    A[2][2]\n  ];\n  const D = a * (e * i - f * h) - b1 * (d * i - f * g) + c * (d * h - e * g);\n  if (Math.abs(D) < 1e-8) return [0, 0, 0];\n  const dx =\n    (b[0] * (e * i - f * h) -\n      b1 * (b[1] * i - f * b[2]) +\n      c * (b[1] * h - e * b[2])) /\n    D;\n  const dy =\n    (a * (b[1] * i - f * b[2]) -\n      b[0] * (d * i - f * g) +\n      c * (d * b[2] - b[1] * g)) /\n    D;\n  const dz =\n    (a * (e * b[2] - b[1] * h) -\n      b1 * (d * b[2] - b[1] * g) +\n      b[0] * (d * h - e * g)) /\n    D;\n  return [dx, dy, dz];\n}\n)};\nconst _xFromK = function _xFromK(){return(\nfunction xFromK(pqrs, k) {\n  const denom = k * pqrs.r - pqrs.p;\n  if (Math.abs(denom) < 1e-12) return NaN; // parallel / undefined\n  return (pqrs.q - k * pqrs.s) / denom;\n}\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_intro\", null, [\"md\"], _intro);\n  $def(\"_clamp\", \"clamp\", [], _clamp);\n  $def(\"_rgbaToGray\", \"rgbaToGray\", [], _rgbaToGray);\n  $def(\"_sampleLine\", \"sampleLine\", [], _sampleLine);\n  $def(\"_gaussianKernel1D\", \"gaussianKernel1D\", [], _gaussianKernel1D);\n  $def(\"_edges1D\", \"edges1D\", [], _edges1D);\n  $def(\"_binaryToEdges\", \"binaryToEdges\", [], _binaryToEdges);\n  $def(\"_solve3\", \"solve3\", [], _solve3);\n  $def(\"_xFromK\", \"xFromK\", [], _xFromK);\n  return main;\n}\n";

const TESTS = [
  ["test_clamp_limits", ["clamp"], `if (clamp(5, 0, 3) !== 3 || clamp(-1, 0, 3) !== 0 || clamp(2, 0, 3) !== 2) throw new Error("clamp");
  return "ok";`],
  ["test_rgbaToGray_single_white_pixel", ["rgbaToGray"], `const got = Array.from(rgbaToGray([255, 255, 255, 255]));
  if (got.length !== 1 || got[0] !== 255) throw new Error("expected [255], got " + JSON.stringify(got));
  return got;`],
  ["test_rgbaToGray_rejects_bad_length", ["rgbaToGray"], `try { rgbaToGray([1, 2, 3]); } catch (e) { return "threw"; }
  throw new Error("expected a throw for length 3");`],
  ["test_binaryToEdges_centre", ["binaryToEdges"], `const got = binaryToEdges([0, 0, 1, 1]);
  if (JSON.stringify(got) !== "[0]") throw new Error("expected [0], got " + JSON.stringify(got));
  return got;`],
  ["test_solve3_identity", ["solve3"], `const got = solve3([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 2, 3]);
  if (JSON.stringify(got) !== "[1,2,3]") throw new Error("expected [1,2,3], got " + JSON.stringify(got));
  return got;`],
  ["test_solve3_singular", ["solve3"], `const got = solve3([[1, 2, 3], [2, 4, 6], [0, 0, 1]], [1, 1, 1]);
  if (JSON.stringify(got) !== "[0,0,0]") throw new Error("expected [0,0,0], got " + JSON.stringify(got));
  return got;`],
  ["test_xFromK_identity", ["xFromK"], `const got = xFromK({ p: 1, q: 0, r: 0, s: 1 }, 2);
  if (got !== 2) throw new Error("expected 2, got " + got);
  return got;`],
  ["test_gaussianKernel1D_normalised", ["gaussianKernel1D"], `const { data, half } = gaussianKernel1D(1);
  const sum = data.reduce((a, b) => a + b, 0);
  if (data.length !== 2 * half + 1 || Math.abs(sum - 1) > 1e-5) throw new Error("sum " + sum);
  return sum;`],
  ["test_edges1D_step", ["edges1D"], `const got = edges1D([0, 0, 0, 0, 10, 10, 10, 10]);
  if (JSON.stringify(got) !== '[{"x":4,"s":1}]') throw new Error(JSON.stringify(got));
  return got;`],
];

// the correct solution: the fixture unchanged, test_* cells appended, the tests view imported
const testCells = TESTS.map(([n, deps, body]) => `const _${n} = function _${n}(${deps.join(", ")}){
  ${body}
};`).join("\n");
const testDefs = TESTS.map(([n, deps]) => `  $def("_${n}", "${n}", ${JSON.stringify(deps)}, _${n});`).join("\n");
export const SOLUTION = FIXTURE
  .replace("\nexport default function define", "\n" + testCells + `
const _test_results = function _test_results(tests){return(
  tests({ filter: (t) => t.name.includes("@user/signal-utils") })
)};
export default function define`)
  .replace("  return main;\n}", testDefs + `
  $def("_test_results", null, ["tests"], _test_results);
  main.define("module @tomlarkworthy/tests", async () => runtime.module((await import("/@tomlarkworthy/tests.js?v=4")).default));
  main.define("tests", ["module @tomlarkworthy/tests", "@variable"], (_, v) => v.import("tests", _));
  return main;
}`);
if (SOLUTION === FIXTURE || !SOLUTION.includes("_test_results")) throw new Error("signal-utils eval: SOLUTION did not apply");
export const FIXED_FN = "i < rgba.length; i += 4";
export const BUGGY_FN = "i < rgba.length - 4; i += 4";
export { FIXTURE };

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const sig = globalThis.__ojs_runtime.mains.get("@user/signal-utils");
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module).filter(m => m !== sig));
})()`;

const COLLECT = String.raw`(async () => {
  const out = { testsFound: "not checked", testsCompute: "not checked", bugCaught: "not checked", falseFailures: "not checked", unchanged: "not checked" };
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const before = globalThis.__rc5tBefore || new Set();
  const sig = globalThis.__ojs_runtime.mains.get("@user/signal-utils");
  const userVars = [...rt._variables].filter(v => (!before.has(v._module) || v._module === sig) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const settle = async (v, ms = 5000) => {
    for (let i = 0; i < 3; i++) {
      const p = v._promise;
      const r = await Promise.race([p.then(value => ({ ok: true, value }), error => ({ ok: false, error })), sleep(ms).then(() => ({ ok: false, error: "timeout" }))]);
      if (p === v._promise) return r;
    }
    return { ok: false, error: "unsettled" };
  };
  try {
    await sleep(1000);
    // unchanged: the seeded functions still behave as seeded (the rgbaToGray bug included)
    const fnVar = name => userVars.find(v => v._name === name && v._module === sig) || userVars.find(v => v._name === name);
    const fns = {};
    const missing = [];
    for (const n of ["clamp", "rgbaToGray", "sampleLine", "gaussianKernel1D", "edges1D", "binaryToEdges", "solve3", "xFromK"]) {
      const v = fnVar(n);
      const r = v ? await settle(v, 2000) : null;
      if (r && r.ok && typeof r.value === "function") fns[n] = r.value; else missing.push(n);
    }
    const changed = [...missing.map(n => n + " missing")];
    const J = x => JSON.stringify(Array.from(x));
    const probe = (n, f) => { if (!fns[n]) return; try { const why = f(fns[n]); if (why) changed.push(n + ": " + why); } catch (e) { changed.push(n + " threw " + e.message); } };
    probe("rgbaToGray", f => { const g = J(f([10, 20, 30, 255, 255, 255, 255, 255])); return g === "[18,0]" ? null : (g === "[18,255]" ? "was fixed (last pixel now converted)" : "returns " + g); });
    probe("clamp", f => f(5, 0, 3) === 3 && f(-1, 0, 3) === 0 && f(2, 0, 3) === 2 ? null : "wrong");
    probe("binaryToEdges", f => J(f([0, 0, 1, 1])) === "[0]" ? null : "wrong");
    probe("solve3", f => J(f([[1, 0, 0], [0, 1, 0], [0, 0, 1]], [1, 2, 3])) === "[1,2,3]" ? null : "wrong");
    probe("xFromK", f => f({ p: 1, q: 0, r: 0, s: 1 }, 2) === 2 ? null : "wrong");
    probe("gaussianKernel1D", f => { const k = f(1); return k.half === 3 && Math.abs(k.data.reduce((a, b) => a + b, 0) - 1) < 1e-5 ? null : "wrong"; });
    probe("edges1D", f => JSON.stringify(f([0, 0, 0, 0, 10, 10, 10, 10])) === '[{"x":4,"s":1}]' ? null : "wrong");
    probe("sampleLine", f => J(f(new Uint8Array([0, 100, 0, 100, 0, 100, 0, 100, 0]), 3, 0.5, 0.5, 0, 1)) === "[50]" ? null : "wrong");
    out.unchanged = changed.length ? changed.join("; ") : "ok";

    const testVars = userVars.filter(v => /^test_/.test(v._name));
    out.testNames = testVars.map(v => v._name);
    if (testVars.length < 3) {
      out.testsFound = "found " + testVars.length + " test_* cell(s); user cells: " + userVars.map(v => v._name).join(", ");
      out.testsCompute = out.bugCaught = out.falseFailures = "no test_* cells";
      return out;
    }
    out.testsFound = "ok";
    const states = await Promise.all(testVars.map(async v => ({ v, name: v._name, ...(await settle(v)) })));
    const passed = states.filter(s => s.ok && s.value !== undefined);
    const pending = states.filter(s => (s.ok && s.value === undefined) || (!s.ok && (s.error === "timeout" || s.error === "unsettled")));
    const failed = states.filter(s => !s.ok && s.error !== "timeout" && s.error !== "unsettled");
    out.passed = passed.length; out.failed = failed.map(s => s.name + ": " + String(s.error && s.error.message || s.error).slice(0, 120));
    out.testsCompute = pending.length ? "pending or undefined: " + pending.map(s => s.name).join(", ") : passed.length < 2 ? "only " + passed.length + " passing" : "ok";
    const touches = s => s.v._inputs.some(i => i && i._name === "rgbaToGray") || /rgbaToGray/.test(String(s.v._definition));
    out.bugCaught = failed.some(touches) ? "ok" : "no failing test_* cell involves rgbaToGray (failed: " + (failed.map(s => s.name).join(", ") || "none") + ")";
    const wrong = failed.filter(s => !touches(s));
    out.falseFailures = wrong.length ? wrong.map(s => s.name).join(", ") : "none";
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-signal-utils-tests",
  category: "rc5-train",
  question: "Add unit tests for the functions in my notebook, and tell me if any of them fail.",
  setup: { files: { "/src/@user/signal-utils.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "testsFound", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "testsCompute", equals: "ok" }, weight: 1 },
    // the seeded bug is caught by a test the runner can see
    { name: "collected_equals", args: { key: "bugCaught", equals: "ok" }, weight: 3 },
    { name: "collected_equals", args: { key: "falseFailures", equals: "none" }, weight: 1 },
    // asked to test, not to fix
    { name: "collected_equals", args: { key: "unchanged", equals: "ok" }, weight: 2 },
    // the reply names the failing function
    { name: "answer_matches", args: { pattern: "rgbaToGray[\\s\\S]{0,400}(fail|bug|wrong|incorrect|last pixel|off.by.one|\\[0\\])|(fail|bug|wrong|incorrect)[\\s\\S]{0,400}rgbaToGray", flags: "i" }, weight: 2 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/signal-utils.js" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-unit-tests-in-a-notebook.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/signal-utils.js", content: SOLUTION } },
    { assistant: "I added nine test_* cells to @user/signal-utils. Eight pass. test_rgbaToGray_single_white_pixel fails: rgbaToGray([255,255,255,255]) returns [0] instead of [255]. Its loop stops at rgba.length - 4, so the last pixel is never converted. I have not changed the function." },
  ],
};
