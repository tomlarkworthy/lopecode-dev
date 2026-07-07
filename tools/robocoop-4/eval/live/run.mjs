#!/usr/bin/env node
// Live eval CLI for robocoop-4 — thin config over the shared runner (tools/robocoop-eval/run-cli.mjs).
// See ./CONTRACT.md for the snapshot shape and criterion catalog.
//   node tools/robocoop-4/eval/live/run.mjs [--only <id>] [--ids <a,b>] [--category <cat>] [--model <m>]
//       [--timeout <ms>] [--headed] [--json <path>] [--fail-under <0..1>] [--notebook <path>]
//       [--legacy-no-tool-gate]

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { runEvalCli } from "../../../robocoop-eval/run-cli.mjs";
import { createDriver } from "./driver.mjs";
import { EVALS } from "./evals.mjs";

const here = dirname(fileURLToPath(import.meta.url)); // .../tools/robocoop-4/eval/live
const repoRoot = join(here, "..", "..", "..", "..");

process.exit(await runEvalCli({
  argv: process.argv.slice(2),
  evals: EVALS,
  createDriver,
  defaultNotebook: join(repoRoot, "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html"),
  resultsDir: join(here, "results"),
  envCandidates: [join(here, "..", "..", ".env"), join(repoRoot, ".env")],
  extraFlags: [{ flag: "--legacy-no-tool-gate", key: "legacyNoToolGate" }],
}));
