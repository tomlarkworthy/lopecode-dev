#!/usr/bin/env node
// Live eval CLI for robocoop-5 — thin config over the shared runner (tools/robocoop-eval/run-cli.mjs).
// criteria/score are imported from the robocoop-4 harness: same yardstick for both agents.
//   node tools/robocoop-5/eval/run.mjs [--only <id>] [--ids <a,b>] [--category <cat>] [--model <m>]
//       [--timeout <ms>] [--headed] [--json <path>] [--fail-under <0..1>] [--notebook <path>]

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runEvalCli } from "../../robocoop-eval/run-cli.mjs";
import { createDriver } from "./driver.mjs";
import { EVALS } from "./evals.mjs";

const here = dirname(fileURLToPath(import.meta.url)); // .../tools/robocoop-5/eval
const repoRoot = join(here, "..", "..", "..");

process.exit(await runEvalCli({
  argv: process.argv.slice(2),
  evals: EVALS,
  createDriver,
  defaultNotebook: join(repoRoot, "lopebooks", "notebooks", "@tomlarkworthy_robocoop-5.html"),
  resultsDir: join(here, "results"),
  envCandidates: [join(here, "..", ".env"), join(repoRoot, "tools", "robocoop-4", ".env"), join(repoRoot, ".env")],
}));
