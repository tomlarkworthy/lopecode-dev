#!/usr/bin/env node
// Build problems.json from the aider polyglot-benchmark JS subset: slug, instructions (base + append),
// stub (the skeleton solution file), spec (jest test source), exports (names parsed from the stub),
// proof (reference solution, harness sanity checks only).

import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "polyglot-src", "javascript", "exercises", "practice");

const problems = [];
for (const slug of readdirSync(root).sort()) {
  const dir = join(root, slug);
  const cfg = JSON.parse(readFileSync(join(dir, ".meta", "config.json"), "utf8"));
  const solutionFile = cfg.files.solution[0];
  const testFile = cfg.files.test[0];
  const read = (p) => (existsSync(join(dir, p)) ? readFileSync(join(dir, p), "utf8") : null);
  let instructions = read(".docs/instructions.md") ?? "";
  const append = read(".docs/instructions.append.md");
  if (append) instructions += "\n" + append;
  const intro = read(".docs/introduction.md");
  if (intro) instructions = intro + "\n" + instructions;
  const stub = read(solutionFile);
  const spec = read(testFile);
  const proof = read(join(".meta", cfg.files.example?.[0] ?? "proof.ci.js").replace(".meta/.meta", ".meta"));
  const exports_ = [...stub.matchAll(/^export\s+(?:const|class|function|let)\s+([A-Za-z0-9_$]+)/gm)].map((m) => m[1]);
  const defMatch = /^export\s+default\s+(?:class\s+)?([A-Za-z0-9_$]+)/m.exec(stub);
  const defaultExport = defMatch ? defMatch[1] : null;
  problems.push({ slug, solutionFile, testFile, instructions, stub, spec, proof, exports: exports_, defaultExport });
}
writeFileSync(join(here, "problems.json"), JSON.stringify(problems, null, 1));
console.log("wrote", problems.length, "problems");
for (const p of problems) if (!p.exports.length) console.log("  WARN no exports parsed:", p.slug);
