// Aider-polyglot JS grader: run the exercise's official jest spec against a candidate solution.
// Modes:
//   esm    — candidate is a complete solution file (baseline arm, and `grep`'s CLI script); written as-is.
//   module — candidate is a compiled Observable module (robocoop-5 /src format); a CJS solution file is
//            synthesized whose exports are the module's computed CELL VALUES (sync emulation of define()).
// The whole exercise dir is copied (spec, babel.config.js, package.json, data/ ...) so CLI exercises and
// fixtures work; the solution file is then overwritten with the candidate.

import { cpSync, writeFileSync, rmSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, "harness");
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
  return transformed + "\n" + SYNC_EMULATOR + "\n" + lines.join("\n") +
    "\nObject.defineProperty(module.exports, '__esModule', { value: true });\n";
}

// grep (CLI exercise): the agent supplies a cell `script` whose STRING value is the whole grep.js.
// Extract that string by running the synthesized module in a node subprocess.
export function computeCellString(moduleSrc, cellName) {
  const program =
    moduleSrc.replace(/export\s+default\s+/, "const __define = ") +
    "\n" + SYNC_EMULATOR +
    `\nprocess.stdout.write(String(__compute(${JSON.stringify(cellName)}, new Set())));\n`;
  const dir = join(HARNESS, "runs", `cellstr-${process.pid}-${seq++}`);
  mkdirSync(dir, { recursive: true });
  const f = join(dir, "prog.cjs");
  writeFileSync(f, program);
  const r = spawnSync("node", [f], { timeout: 15000, encoding: "utf8" });
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
  const solPath = join(dir, problem.solutionFile);
  const content = mode === "module" ? synthesizeCJS(candidate, problem) : candidate;
  writeFileSync(solPath, content);

  const jest = join(HARNESS, "node_modules", ".bin", "jest");
  const r = spawnSync(jest, ["--ci", "--colors=false", "--testTimeout=10000", "./" + problem.testFile], {
    cwd: dir,
    timeout: timeoutMs,
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  const output = ((r.stderr || "") + "\n" + (r.stdout || "")).trim();
  const pass = r.status === 0;
  if (pass) rmSync(dir, { recursive: true, force: true });
  return { pass, output: pass ? "" : output.slice(0, 6000), dir: pass ? null : dir };
}
