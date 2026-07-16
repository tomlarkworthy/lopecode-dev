// MultiPL-E humaneval-js grader. The candidate arrives as robocoop-5 /src module source (a compiled
// Observable module: cell definition functions + `export default function define(...)`) or as plain
// JS from the baseline arm. Grading attempts, first pass wins, each in its own node subprocess:
//   1. emulate the define() with a mini synchronous runtime, candidate = the target CELL VALUE
//   2. each textual `function <name>(...)` occurrence, brace-extracted, as a bare declaration
// pass = official MultiPL-E tests exit 0.

import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

// The declared function name — from the prompt's TAIL (the real declaration), never the doc
// comment (HumanEval_1's comment contains "this function is a string" → bogus name "is").
export function fnNameOf(prompt) {
  const matches = [...prompt.matchAll(/^function\s+([A-Za-z0-9_$]+)\s*\(/gm)];
  return matches.length ? matches[matches.length - 1][1] : null;
}

export function extractBalanced(src, from) {
  const open = src.indexOf("{", from);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return src.slice(from, i + 1); }
  }
  return null;
}

function emulatorProgram(moduleSrc, fnName, tests) {
  const transformed = moduleSrc.replace(/export\s+default\s+/, "globalThis.__define = ");
  return `${transformed}
const __cells = new Map();
const __main = {
  variable: function () {
    const self = {
      define: function (...a) {
        let name = null, deps = [], fn;
        if (typeof a[0] === "string") { name = a[0]; if (Array.isArray(a[1])) { deps = a[1]; fn = a[2]; } else fn = a[1]; }
        else if (Array.isArray(a[0])) { deps = a[0]; fn = a[1]; }
        else fn = a[0];
        if (name) __cells.set(name, { deps, fn });
        return self;
      },
    };
    return self;
  },
};
globalThis.__define({ module: () => __main }, () => undefined);
async function __compute(name, seen) {
  if (!__cells.has(name)) throw new Error("cell not defined: " + name);
  if (seen.has(name)) throw new Error("cycle at " + name);
  seen.add(name);
  const { deps, fn } = __cells.get(name);
  const args = [];
  for (const d of deps) args.push(await __compute(d, new Set(seen)));
  return typeof fn === "function" ? await fn(...args) : fn;
}
(async () => {
  const value = await __compute(${JSON.stringify(fnName)}, new Set());
  if (typeof value !== "function") throw new Error("cell value is not a function: " + typeof value);
  globalThis[${JSON.stringify(fnName)}] = value;
  ${tests}
})().catch((e) => { console.error(e && e.stack || String(e)); process.exit(1); });
`;
}

function runProgram(program, timeoutMs) {
  const dir = mkdtempSync(join(tmpdir(), "he-js-"));
  const file = join(dir, "prog.cjs");
  writeFileSync(file, program);
  const r = spawnSync("node", [file], { timeout: timeoutMs, encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  if (r.status === 0) return { pass: true, error: null };
  return {
    pass: false,
    error: r.signal ? `killed (${r.signal}, timeout?)` : (r.stderr || "").split("\n").slice(0, 6).join("\n"),
  };
}

export function gradeCandidate(candidateSrc, tests, { fnName, timeoutMs = 15000 } = {}) {
  const programs = [];
  if (fnName && /export\s+default/.test(candidateSrc)) {
    programs.push(emulatorProgram(candidateSrc, fnName, tests));
  }
  if (fnName) {
    let at = -1;
    while ((at = candidateSrc.indexOf(`function ${fnName}`, at + 1)) >= 0) {
      const ext = extractBalanced(candidateSrc, at);
      if (ext) programs.push(ext + "\n\n" + tests + "\n");
    }
  }
  if (!programs.length) programs.push(candidateSrc + "\n\n" + tests + "\n");

  let last = { pass: false, error: "no candidate" };
  for (const program of programs) {
    last = runProgram(program, timeoutMs);
    if (last.pass) return last;
  }
  return last;
}
