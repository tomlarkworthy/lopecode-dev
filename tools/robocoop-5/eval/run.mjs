#!/usr/bin/env node
// Live eval CLI for robocoop-5 — thin config over the shared runner (tools/robocoop-eval/run-cli.mjs).
// criteria/score are imported from the robocoop-4 harness: same yardstick for both agents.
//   node tools/robocoop-5/eval/run.mjs [--only <id>] [--ids <a,b>] [--category <cat>] [--model <m>]
//       [--timeout <ms>] [--headed] [--json <path>] [--fail-under <0..1>] [--notebook <path>] [--oracle]
// --oracle runs each eval's own scripted reference solution instead of a model: no key, no tokens, and
// anything under 1.00 means the EVAL is broken (see eval-README "Reference-solution gate").
// --evals-file <path.mjs> appends that file's default-exported eval (or array) — an rc5-train worker's
// draft, run before it is merged into evals-rc5-train.mjs.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { runEvalCli } from "../../robocoop-eval/run-cli.mjs";
import { createDriver } from "./driver.mjs";
import { EVALS } from "./evals.mjs";

const here = dirname(fileURLToPath(import.meta.url)); // .../tools/robocoop-5/eval
const repoRoot = join(here, "..", "..", "..");

const argv = process.argv.slice(2);
const ef = argv.indexOf("--evals-file");
let extra = [];
if (ef >= 0) {
  const mod = await import(pathToFileURL(resolve(argv[ef + 1])).href);
  extra = [mod.default ?? mod.EVALS].flat();
  argv.splice(ef, 2);
}

process.exit(await runEvalCli({
  argv,
  evals: [...EVALS, ...extra],
  createDriver,
  defaultNotebook: join(repoRoot, "lopebooks", "notebooks", "@tomlarkworthy_robocoop-5.html"),
  resultsDir: join(here, "results"),
  envCandidates: [join(here, "..", ".env"), join(repoRoot, "tools", "robocoop-4", ".env"), join(repoRoot, ".env")],
  extraFlags: [{ flag: "--oracle", key: "oracle" }],
}));
