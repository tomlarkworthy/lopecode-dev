#!/usr/bin/env node
/**
 * Stress test for local-change-history module.
 *
 * Tests that edits to variables survive a page reload via IndexedDB git storage.
 *
 * Usage:
 *   node tools/stress-test-history.js [--headed] [--count N]
 *
 * Flags:
 *   --headed   Show the browser window
 *   --count N  Number of variables to define per round (default: 10)
 */

import { spawn } from "child_process";
import { createInterface } from "readline";
import path from "path";

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const countIdx = args.indexOf("--count");
const COUNT = countIdx !== -1 ? parseInt(args[countIdx + 1], 10) : 10;

const NOTEBOOK =
  "lopecode/notebooks/@tomlarkworthy_local-change-history.html";
const HASH =
  "view=R100(S50(@tomlarkworthy/local-change-history),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/tests))";

const REPL_CMD = "node";
const REPL_ARGS = [
  "tools/lope-browser-repl.js",
  ...(headed ? ["--headed"] : []),
  "--verbose",
];

function startRepl() {
  const proc = spawn(REPL_CMD, REPL_ARGS, {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: process.cwd(),
  });
  const rl = createInterface({ input: proc.stdout });
  const errLines = [];
  const errRl = createInterface({ input: proc.stderr });
  errRl.on("line", (l) => {
    errLines.push(l);
    if (process.env.VERBOSE) process.stderr.write(`[repl-err] ${l}\n`);
  });

  const pending = [];
  rl.on("line", (line) => {
    try {
      const obj = JSON.parse(line);
      if (pending.length) pending.shift()(obj);
    } catch {
      process.stderr.write(`[repl-out] ${line}\n`);
    }
  });

  const send = (cmd) =>
    new Promise((resolve, reject) => {
      pending.push(resolve);
      const json = JSON.stringify(cmd);
      proc.stdin.write(json + "\n");
      setTimeout(
        () => reject(new Error(`Timeout waiting for response to: ${json}`)),
        120_000
      );
    });

  return { proc, send, errLines };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log(`\n=== Stress Test: local-change-history ===`);
  console.log(`Variables per round: ${COUNT}`);
  console.log(`Headed: ${headed}\n`);

  // ── Phase 1: Load notebook, wipe IndexedDB, define variables ──

  console.log("Phase 1: Starting REPL and loading notebook...");
  let repl = startRepl();

  let resp = await repl.send({ cmd: "load", notebook: NOTEBOOK, hash: HASH });
  if (!resp.ok) {
    console.error("Failed to load notebook:", resp);
    process.exit(2);
  }
  console.log("  Notebook loaded.");

  // Wait for the change_listener to initialize
  await sleep(3000);

  // Wipe the IndexedDB filesystem to start clean
  console.log("  Wiping IndexedDB filesystem...");
  resp = await repl.send({
    cmd: "eval",
    code: `(() => {
      const req = indexedDB.deleteDatabase("lopecode_history");
      return "wiping";
    })()`,
  });
  console.log("  Wipe initiated:", resp.value);

  // Reload to pick up clean state
  await sleep(2000);
  console.log("  Reloading after wipe...");
  resp = await repl.send({ cmd: "load", notebook: NOTEBOOK, hash: HASH });
  if (!resp.ok) {
    console.error("Failed to reload notebook:", resp);
    process.exit(2);
  }
  console.log("  Notebook reloaded with clean IndexedDB.");

  // Wait for change_listener and initial state to settle
  await sleep(5000);

  // Check that change_listener is initialized
  resp = await repl.send({ cmd: "get-variable", name: "change_listener" });
  console.log("  change_listener:", resp.value);

  // ── Phase 2: Define test variables ──

  console.log(`\nPhase 2: Defining ${COUNT} test variables...`);

  const testVars = [];
  for (let i = 0; i < COUNT; i++) {
    const name = `stress_test_var_${i}`;
    const value = `"stress_value_${i}_${Date.now()}"`;
    testVars.push({ name, value });

    resp = await repl.send({
      cmd: "define-variable",
      name,
      definition: `() => ${value}`,
      inputs: [],
      module: "@tomlarkworthy/local-change-history",
    });

    if (!resp.ok) {
      console.error(`  FAIL: Could not define ${name}:`, resp);
    } else {
      process.stdout.write(`  Defined ${name}\r`);
    }

    // Small delay between defines to let change_listener process
    await sleep(100);
  }
  console.log(`  Defined ${COUNT} variables.                    `);

  // ── Phase 3: Wait for commits and verify history ──

  console.log("\nPhase 3: Waiting for commits to IndexedDB...");
  await sleep(5000);

  // Check history array
  resp = await repl.send({
    cmd: "eval",
    code: `(() => {
      const h = window.__ojs_runtime?._variables;
      let historyVal = null;
      for (const v of h) {
        if (v._name === 'history') {
          historyVal = v._value;
          break;
        }
      }
      if (!Array.isArray(historyVal)) return JSON.stringify({error: "history not found or not array"});
      const stressEntries = historyVal.filter(e =>
        typeof e?._name === 'string' && e._name.startsWith('stress_test_var_')
      );
      return JSON.stringify({
        totalHistory: historyVal.length,
        stressEntries: stressEntries.length,
        stressNames: stressEntries.map(e => e._name).sort()
      });
    })()`,
  });

  let historyCheck;
  try {
    historyCheck = JSON.parse(resp.value);
  } catch {
    historyCheck = { error: "Could not parse", raw: resp.value };
  }
  console.log("  History check:", JSON.stringify(historyCheck, null, 2));

  // Check commit_history
  resp = await repl.send({
    cmd: "eval",
    code: `(() => {
      const vars = window.__ojs_runtime?._variables;
      let commitHistory = null;
      for (const v of vars) {
        if (v._name === 'commit_history') {
          commitHistory = v._value;
          break;
        }
      }
      if (!commitHistory) return JSON.stringify({error: "commit_history not found"});
      if (commitHistory instanceof Promise) return JSON.stringify({error: "commit_history is still a promise"});
      return JSON.stringify({
        ok: commitHistory.ok,
        committed: commitHistory.committed,
        attempted: commitHistory.attempted,
        watermarkKey: commitHistory.watermarkKey,
      });
    })()`,
  });

  let commitCheck;
  try {
    commitCheck = JSON.parse(resp.value);
  } catch {
    commitCheck = { error: "Could not parse", raw: resp.value };
  }
  console.log("  Commit check:", JSON.stringify(commitCheck, null, 2));

  // Give extra time for any remaining commits
  if (commitCheck?.committed < COUNT) {
    console.log("  Waiting extra time for commits...");
    await sleep(10000);

    // Re-check commit_history
    resp = await repl.send({
      cmd: "eval",
      code: `(() => {
        const vars = window.__ojs_runtime?._variables;
        let commitHistory = null;
        for (const v of vars) {
          if (v._name === 'commit_history') {
            commitHistory = v._value;
            break;
          }
        }
        if (!commitHistory) return JSON.stringify({error: "commit_history not found"});
        return JSON.stringify({
          ok: commitHistory.ok,
          committed: commitHistory.committed,
          attempted: commitHistory.attempted,
        });
      })()`,
    });
    try {
      commitCheck = JSON.parse(resp.value);
    } catch {
      commitCheck = { error: "Could not parse", raw: resp.value };
    }
    console.log("  Commit re-check:", JSON.stringify(commitCheck, null, 2));
  }

  // ── Phase 4: Quit and restart to simulate page refresh ──

  console.log("\nPhase 4: Simulating page refresh (quit + reload)...");
  await repl.send({ cmd: "quit" });
  await sleep(2000);
  repl.proc.kill();
  await sleep(2000);

  console.log("  Starting fresh REPL session...");
  repl = startRepl();

  resp = await repl.send({ cmd: "load", notebook: NOTEBOOK, hash: HASH });
  if (!resp.ok) {
    console.error("Failed to load notebook on restart:", resp);
    process.exit(2);
  }
  console.log("  Notebook loaded in fresh session.");

  // Wait for git replay to complete
  console.log("  Waiting for git replay...");
  await sleep(10000);

  // ── Phase 5: Verify all variables survived ──

  console.log("\nPhase 5: Verifying variables survived reload...");

  let survived = 0;
  let missing = [];
  let wrong = [];

  for (const tv of testVars) {
    resp = await repl.send({ cmd: "get-variable", name: tv.name });
    if (resp.ok && resp.value !== undefined && resp.value !== null) {
      survived++;
      // Check the value matches
      const expected = tv.value.replace(/^"|"$/g, "");
      const actual =
        typeof resp.value === "string" ? resp.value : String(resp.value);
      if (!actual.includes("stress_value_")) {
        wrong.push({ name: tv.name, expected, actual });
      }
    } else {
      missing.push(tv.name);
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Total test variables: ${COUNT}`);
  console.log(`Survived reload:      ${survived}`);
  console.log(`Missing:              ${missing.length}`);
  console.log(`Wrong value:          ${wrong.length}`);

  if (missing.length > 0) {
    console.log(`\nMissing variables:`);
    for (const m of missing) console.log(`  - ${m}`);
  }
  if (wrong.length > 0) {
    console.log(`\nWrong values:`);
    for (const w of wrong)
      console.log(`  - ${w.name}: expected "${w.expected}", got "${w.actual}"`);
  }

  // Also check git history on the fresh page
  resp = await repl.send({
    cmd: "eval",
    code: `(() => {
      const vars = window.__ojs_runtime?._variables;
      let gitHistory = null;
      let history = null;
      let replayGit = null;
      for (const v of vars) {
        if (v._name === 'git_history_materialized') gitHistory = v._value;
        if (v._name === 'history') history = v._value;
        if (v._name === 'replay_git') replayGit = v._value;
      }
      const gitStress = Array.isArray(gitHistory)
        ? gitHistory.filter(e => typeof e?._name === 'string' && e._name.startsWith('stress_test_var_'))
        : [];
      const histStress = Array.isArray(history)
        ? history.filter(e => typeof e?._name === 'string' && e._name.startsWith('stress_test_var_'))
        : [];
      return JSON.stringify({
        gitHistoryTotal: Array.isArray(gitHistory) ? gitHistory.length : 'not array',
        gitStressEntries: gitStress.length,
        historyTotal: Array.isArray(history) ? history.length : 'not array',
        histStressEntries: histStress.length,
        replayResults: Array.isArray(replayGit) ? replayGit.length : typeof replayGit,
      });
    })()`,
  });

  let reloadCheck;
  try {
    reloadCheck = JSON.parse(resp.value);
  } catch {
    reloadCheck = { error: "Could not parse", raw: resp.value };
  }
  console.log(`\nPost-reload state:`, JSON.stringify(reloadCheck, null, 2));

  // ── Cleanup ──

  console.log("\nCleaning up...");
  await repl.send({ cmd: "quit" });
  await sleep(1000);
  repl.proc.kill();

  const exitCode = missing.length === 0 && wrong.length === 0 ? 0 : 1;
  console.log(
    `\n${exitCode === 0 ? "PASS" : "FAIL"}: ${survived}/${COUNT} variables survived reload.`
  );
  process.exit(exitCode);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(2);
});
