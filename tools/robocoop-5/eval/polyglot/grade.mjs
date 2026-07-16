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

import { cpSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, "harness");
const EXPECT_PATH = join(HARNESS, "node_modules", "expect");
const EXERCISES = join(here, "..", "polyglot-src", "javascript", "exercises", "practice");
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
function __compute(name, seen) {
  if (!__cells.has(name)) throw new Error("cell not defined: " + name);
  if (seen.has(name)) throw new Error("cycle at " + name);
  seen.add(name);
  const { deps, fn } = __cells.get(name);
  const args = deps.map((d) => __compute(d, new Set(seen)));
  return typeof fn === "function" ? fn(...args) : fn;
}
`;

// describe/test/hooks + result reporting, jest-free. expect comes from jest's own matcher package.
const TESTLIB = `
const __expectMod = require(${JSON.stringify(EXPECT_PATH)});
const expect = __expectMod.default || __expectMod.expect || __expectMod;

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
      failures.push({ full, message: (e && e.message) || String(e) });
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
  for (const f of failures) console.error("FAIL: " + f.full + "\\n  " + f.message.split("\\n").slice(0, 12).join("\\n  "));
  console.log("Tests: " + failures.length + " failed, " + skipped + " skipped, " + passed + " passed");
  process.exit(failures.length ? 1 : 0);
}
module.exports = { describe, xdescribe, test, xtest, it, xit, beforeEach, afterEach, beforeAll, afterAll, expect, __run };
`;

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
  const transformed = moduleSrc.replace(/export\s+default\s+/, "const __define = ");
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

export function gradeSolution(problem, candidate, { mode = "esm", timeoutMs = 120000 } = {}) {
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
  writeFileSync(join(dir, "__testlib.cjs"), TESTLIB);
  // "use strict": babel compiles the official specs/solutions as ESM (strict mode); sloppy mode
  // changes semantics (e.g. assigning a getter-only property must throw — robot-name relies on it).
  writeFileSync(
    join(dir, "__spec.cjs"),
    `"use strict";\nconst { describe, xdescribe, test, xtest, it, xit, beforeEach, afterEach, beforeAll, afterAll, expect, __run } = require('./__testlib.cjs');\n` +
      rewritten + `\n__run();\n`,
  );

  const r = spawnSync("node", ["__spec.cjs"], {
    cwd: dir,
    timeout: timeoutMs,
    killSignal: "SIGKILL",
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  const output = ((r.stderr || "") + "\n" + (r.stdout || "")).trim();
  const pass = r.status === 0;
  if (pass) rmSync(dir, { recursive: true, force: true });
  return { pass, output: pass ? "" : (r.signal ? `killed (${r.signal} — runaway or hung test)\n` : "") + output.slice(0, 6000), dir: pass ? null : dir };
}
