// Aider-polyglot JS grader: run the exercise's official spec against a candidate solution.
//
// Protocol-faithful to aider's npm-test.sh: `xtest(` is unskipped to `test(` before running (xit is
// left skipped, exactly like the official sed). Jest itself cannot run in this sandbox (it hangs
// silently trying to start watchman / its worker pool), so specs run under a plain-Node harness:
// jest's own `expect` package provides the matchers, a small __testlib.cjs provides
// describe/test/hooks, and the ESM imports are rewritten to requires.
//
// Modes:
//   esm    — candidate is a complete ESM solution file (baseline arm, `grep`'s CLI script); it is
//            transformed to CJS (export statements → module.exports).
//   module — candidate is a compiled Observable module (robocoop-5 /src format); a CJS solution is
//            synthesized whose exports are the module's computed CELL VALUES (sync define() emulation).
//
// The failure output is the RETRY CHANNEL: it is what both arms' attempt 2 sees, so it is held to
// aider's fidelity. Official aider forwards jest's own output — which carries a code frame of the
// verbatim spec lines around each failing assertion — untruncated. __testlib reproduces the frame
// (@babel/code-frame, the package jest itself uses) and nothing here cuts per-failure lines; the
// only cap is a 60000-char guard against a pathological blowup (official has none).

import { cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, "harness");
const EXPECT_PATH = join(HARNESS, "node_modules", "expect");
const CODE_FRAME_PATH = join(HARNESS, "node_modules", "@babel", "code-frame");
const EXERCISES = join(here, "..", "polyglot-src", "javascript", "exercises", "practice");
// Aider runs the test command under a 180s timeout; ours is per graded suite.
const SUITE_TIMEOUT_MS = 180000;
// Safety valve only — official aider does not truncate the retry channel at all.
const MAX_OUTPUT = 60000;
let seq = 0;

const SYNC_EMULATOR = `
const __cells = new Map();
const __main = {
  variable: function () {
    const self = { define: function (...a) {
      let name = null, deps = [], fn;
      if (typeof a[0] === "string") { name = a[0]; if (Array.isArray(a[1])) { deps = a[1]; fn = a[2]; } else fn = a[1]; }
      else if (Array.isArray(a[0])) { deps = a[0]; fn = a[1]; }
      else fn = a[0];
      if (name) __cells.set(name, { deps, fn });
      return self;
    } };
    return self;
  },
};
__define({ module: () => __main }, () => undefined);
// Cells are computed ONCE per synthesis run (dataflow semantics). Without this cache a cell shared by
// two exports was re-instantiated per export (state split: a shared registry counted 1,1 instead of
// 1,2) and a diamond inside one export lost identity (P === Q false) — both failing CORRECT
// solutions. Cycles are still caught by the per-path \`seen\` set. Evidence: results/gradefix-regrade.json.
const __memo = new Map();
function __compute(name, seen) {
  if (!__cells.has(name)) throw new Error("cell not defined: " + name);
  if (__memo.has(name)) return __memo.get(name);
  if (seen.has(name)) throw new Error("cycle at " + name);
  seen.add(name);
  const { deps, fn } = __cells.get(name);
  const args = deps.map((d) => __compute(d, new Set(seen)));
  const __v = typeof fn === "function" ? fn(...args) : fn;
  __memo.set(name, __v);
  return __v;
}
`;

// describe/test/hooks + result reporting, jest-free. expect comes from jest's own matcher package,
// code frames from @babel/code-frame (also jest's). specSourceFile is the file the frames quote,
// relative to the run dir; headerLines is how many lines __spec.cjs prepends to it.
const TESTLIB = ({ specSourceFile, headerLines }) => `
const __expectMod = require(${JSON.stringify(EXPECT_PATH)});
const expect = __expectMod.default || __expectMod.expect || __expectMod;

const __fs = require("node:fs");
const __pathmod = require("node:path");
let __codeFrameColumns = null;
try { __codeFrameColumns = require(${JSON.stringify(CODE_FRAME_PATH)}).codeFrameColumns; } catch (e) {}
const __SPEC_SOURCE = ${JSON.stringify(specSourceFile)};
const __HEADER_LINES = ${headerLines};
let __specSrc;
function __specSource() {
  if (__specSrc === undefined) {
    try { __specSrc = __fs.readFileSync(__pathmod.join(__dirname, __SPEC_SOURCE), "utf8"); }
    catch (e) { __specSrc = null; }
  }
  return __specSrc;
}
// jest reports a failing assertion with a code frame of the SPEC source. The spec executes as
// __spec.cjs — same lines, __HEADER_LINES prepended — so the first __spec.cjs frame in the stack
// (the assertion's own call site; the frames above it are inside expect) maps back 1:1.
function __frame(err) {
  const stack = String((err && err.stack) || "");
  const at = stack.indexOf("\\n    at ");
  const m = /__spec\\.cjs:(\\d+):(\\d+)/.exec(at >= 0 ? stack.slice(at) : stack);
  const src = __specSource();
  if (!m || !src || !__codeFrameColumns) return "";
  const line = Number(m[1]) - __HEADER_LINES;
  if (!(line >= 1)) return "";
  try {
    return __codeFrameColumns(src, { start: { line, column: Number(m[2]) } },
      { highlightCode: false, linesAbove: 3, linesBelow: 3 });
  } catch (e) { return ""; }
}

function scope(name, skipped) {
  return { name, skipped, children: [], tests: [], beforeEach: [], afterEach: [], beforeAll: [], afterAll: [] };
}
const root = scope("", false);
let cur = root;

function describe(name, fn) { const s = scope(name, false); cur.children.push(s); const p = cur; cur = s; fn(); cur = p; }
describe.skip = function (name, fn) { const s = scope(name, true); cur.children.push(s); const p = cur; cur = s; fn(); cur = p; };
const xdescribe = describe.skip;
function test(name, fn) { cur.tests.push({ name, fn, skipped: false }); }
function xtest(name, fn) { cur.tests.push({ name, fn, skipped: true }); }
test.skip = xtest; const it = test; const xit = xtest; it.skip = xtest;
function beforeEach(fn) { cur.beforeEach.push(fn); }
function afterEach(fn) { cur.afterEach.push(fn); }
function beforeAll(fn) { cur.beforeAll.push(fn); }
function afterAll(fn) { cur.afterAll.push(fn); }

const TIMEOUT = 10000;
function withTimeout(p, label) {
  let t;
  return Promise.race([
    Promise.resolve(p),
    new Promise((_, rej) => { t = setTimeout(() => rej(new Error("test timeout (" + TIMEOUT + "ms): " + label)), TIMEOUT); }),
  ]).finally(() => clearTimeout(t));
}

const failures = [];
let passed = 0, skipped = 0;
async function runScope(s, chain, inheritedSkip) {
  const path = [...chain, s.name].filter(Boolean);
  for (const fn of s.beforeAll) await fn();
  const scopes = [...collectScopes(s)];
  for (const t of s.tests) {
    const full = [...path, t.name].join(" > ");
    if (t.skipped || inheritedSkip || s.skipped) { skipped++; continue; }
    try {
      for (const sc of scopes) for (const fn of sc.beforeEach) await fn();
      await withTimeout(t.fn(), full);
      for (const sc of scopes.slice().reverse()) for (const fn of sc.afterEach) await fn();
      passed++;
    } catch (e) {
      failures.push({ full, message: (e && e.message) || String(e), frame: __frame(e) });
    }
  }
  for (const c of s.children) await runScope(c, path, inheritedSkip || s.skipped);
  for (const fn of s.afterAll) await fn();
}
function collectScopes(s) { const out = []; let x = s; while (x) { out.unshift(x); x = x.__parent; } return out; }
(function link(s, parent) { s.__parent = parent; for (const c of s.children) link(c, s); })(root, null);

async function __run() {
  // link parents AFTER all describes registered (module body ran before __run is called)
  (function link(s, parent) { s.__parent = parent; for (const c of s.children) link(c, s); })(root, null);
  await runScope(root, [], false);
  // Whole message, every line (official forwards jest's output in full), then the code frame.
  for (const f of failures) {
    console.error("FAIL: " + f.full + "\\n  " + f.message.split("\\n").join("\\n  ") + (f.frame ? "\\n" + f.frame : ""));
  }
  console.log("Tests: " + failures.length + " failed, " + skipped + " skipped, " + passed + " passed");
  process.exit(failures.length ? 1 : 0);
}
module.exports = { describe, xdescribe, test, xtest, it, xit, beforeEach, afterEach, beforeAll, afterAll, expect, __run };
`;

// SGR/CSI escapes only — the retry channel is read by a model, not a terminal.
export function stripAnsi(s) {
  return String(s).replace(/\x1b\[[0-9;]*m/g, "");
}

export function rewriteImports(src) {
  return src
    .replace(/^import\s+([A-Za-z0-9_$]+)\s*,\s*\{([^}]*)\}\s+from\s+['"]([^'"]+)['"];?/gm,
      (m, def, names, mod) => `const { default: ${def}, ${names.replace(/\s+as\s+/g, ": ")} } = require('${mod}');`)
    .replace(/^import\s+\{([^}]*)\}\s+from\s+['"]([^'"]+)['"];?/gm,
      (m, names, mod) => `const { ${names.replace(/\s+as\s+/g, ": ")} } = require('${mod}');`)
    .replace(/^import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"];?/gm,
      (m, ns, mod) => `const ${ns} = require('${mod}');`)
    .replace(/^import\s+([A-Za-z0-9_$]+)\s+from\s+['"]([^'"]+)['"];?/gm,
      (m, def, mod) => `const ${def} = ((x) => (x && x.default !== undefined) ? x.default : x)(require('${mod}'));`)
    .replace(/^import\s+['"]([^'"]+)['"];?/gm, (m, mod) => `require('${mod}');`);
}

// ESM solution text → CJS (export statements become module.exports assignments).
export function esmToCJS(src) {
  const names = [];
  let out = rewriteImports(src);
  out = out.replace(/^export\s+default\s+(class|function|async function)\s+([A-Za-z0-9_$]+)/m,
    (m, kw, n) => { names.push(["default", n]); return `${kw} ${n}`; });
  out = out.replace(/^export\s+default\s+/m, "module.exports.default = ");
  out = out.replace(/^export\s+(const|let|var|class|function|async function)\s+([A-Za-z0-9_$]+)/gm,
    (m, kw, n) => { names.push([n, n]); return `${kw} ${n}`; });
  out = out.replace(/^export\s*\{([^}]*)\}\s*;?\s*$/gm, (m, inner) => {
    for (const part of inner.split(",")) {
      const [a, b] = part.split(/\s+as\s+/).map((s) => s.trim());
      if (a) names.push([b || a, a]);
    }
    return "";
  });
  out += "\n" + names.map(([exp, local]) => `module.exports[${JSON.stringify(exp)}] = ${local};`).join("\n") + "\n";
  return out;
}

export function synthesizeCJS(moduleSrc, problem) {
  // Stray ESM export statements (contract-violating but live-runtime-legal — the notebook evaluates
  // /src files as real ES modules) must not flip Node into ESM interpretation of the synthesized
  // program: strip the `export` keyword, keeping the binding. Cell values remain the exports.
  const transformed = moduleSrc
    .replace(/export\s+default\s+/, "const __define = ")
    .replace(/^export\s+(const|let|var|function|class|async\s+function)\s+/gm, "$1 ");
  const names = problem.exports || [];
  const lines = [];
  for (const n of names) {
    lines.push(`try { module.exports[${JSON.stringify(n)}] = __compute(${JSON.stringify(n)}, new Set()); } catch (e) { console.error("export " + ${JSON.stringify(n)} + ":", e.message); }`);
  }
  if (problem.defaultExport) {
    lines.push(`try { module.exports.default = __compute(${JSON.stringify(problem.defaultExport)}, new Set()); } catch (e) { console.error("default export:", e.message); }`);
  }
  if (!names.length && !problem.defaultExport) {
    lines.push(`for (const [n] of __cells) { try { module.exports[n] = __compute(n, new Set()); } catch {} }`);
  }
  return transformed + "\n" + SYNC_EMULATOR + "\n" + lines.join("\n") + "\n";
}

// grep (CLI exercise): extract the agent's `script` cell STRING by running the module in node.
export function computeCellString(moduleSrc, cellName) {
  const program =
    moduleSrc.replace(/export\s+default\s+/, "const __define = ") +
    "\n" + SYNC_EMULATOR +
    `\nprocess.stdout.write(String(__compute(${JSON.stringify(cellName)}, new Set())));\n`;
  const dir = join(HARNESS, "runs", `cellstr-${process.pid}-${seq++}`);
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "prog.cjs");
  writeFileSync(f, program);
  const r = spawnSync("node", [f], { timeout: 15000, killSignal: "SIGKILL", encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  if (r.status !== 0) return null;
  return r.stdout;
}

export function gradeSolution(problem, candidate, { mode = "esm", timeoutMs = SUITE_TIMEOUT_MS } = {}) {
  const dir = join(HARNESS, "runs", `${problem.slug}-${process.pid}-${seq++}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dirname(dir), { recursive: true });
  cpSync(join(EXERCISES, problem.slug), dir, {
    recursive: true,
    filter: (src) => !src.includes("/.meta") && !src.includes("node_modules"),
  });

  // Solution file. mode esm → CJS transform; mode module → cell-value synthesis. grep's spec spawns
  // `node grep.js` on the raw file, so its candidate is written verbatim (must be plain CJS).
  const solPath = join(dir, problem.solutionFile);
  const content = problem.slug === "grep" ? candidate
    : '"use strict";\n' + (mode === "module" ? synthesizeCJS(candidate, problem) : esmToCJS(candidate));
  writeFileSync(solPath, content);

  // Spec: official unskip (xtest→test, xit stays), imports→requires, testlib globals + runner.
  const specSrc = readFileSync(join(dir, problem.testFile), "utf8");
  const rewritten = rewriteImports(specSrc.replace(/\bxtest\(/g, "test("));
  // "use strict": babel compiles the official specs/solutions as ESM (strict mode); sloppy mode
  // changes semantics (e.g. assigning a getter-only property must throw — robot-name relies on it).
  const header =
    `"use strict";\nconst { describe, xdescribe, test, xtest, it, xit, beforeEach, afterEach, beforeAll, afterAll, expect, __run } = require('./__testlib.cjs');\n`;
  // Code frames quote the UNTOUCHED spec: rewriteImports and the xtest unskip are line-preserving,
  // so __spec.cjs line N is spec line N - headerLines. Should that ever stop holding, frame the
  // rewritten file instead — still the executed source, just with requires.
  const linePreserving = rewritten.split("\n").length === specSrc.split("\n").length;
  writeFileSync(join(dir, "__testlib.cjs"), TESTLIB({
    specSourceFile: linePreserving ? problem.testFile : "__spec.cjs",
    headerLines: linePreserving ? header.split("\n").length - 1 : 0,
  }));
  writeFileSync(join(dir, "__spec.cjs"), header + rewritten + `\n__run();\n`);

  const r = spawnSync("node", ["__spec.cjs"], {
    cwd: dir,
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  // jest's `expect` colours its diffs with SGR escapes. The retry channel is plain text to the model,
  // where escapes are pure token cost and no signal, so strip them; frames/diffs themselves survive.
  const output = stripAnsi((r.stderr || "") + "\n" + (r.stdout || "")).trim();
  const pass = r.status === 0;
  if (pass) rmSync(dir, { recursive: true, force: true });
  return { pass, output: pass ? "" : (r.signal ? `killed (${r.signal} — runaway or hung test)\n` : "") + output.slice(0, MAX_OUTPUT), dir: pass ? null : dir };
}
