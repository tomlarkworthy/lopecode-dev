/**
 * Stress test for local-change-history: redefine existing observed variables,
 * then reload the page N times to check replay consistency.
 *
 * Usage: node tools/history-persist-test.js [--headed] [--count N] [--reloads R]
 */
import { chromium } from "playwright";
import path from "path";
import { rmSync, mkdirSync } from "fs";

const args = process.argv.slice(2);
const headed = args.includes("--headed");
const countIdx = args.indexOf("--count");
const COUNT = countIdx !== -1 ? parseInt(args[countIdx + 1], 10) : 10;
const reloadsIdx = args.indexOf("--reloads");
const RELOADS = reloadsIdx !== -1 ? parseInt(args[reloadsIdx + 1], 10) : 10;

const USER_DATA = "/tmp/lopecode-history-test-profile";
const CWD = "/Users/tom.larkworthy/dev/lopecode-dev";
const NB_PATH = path.resolve(
  CWD,
  "lopecode/notebooks/@tomlarkworthy_local-change-history.html"
);
const HASH =
  "view=R100(S50(@tomlarkworthy/local-change-history),S25(@tomlarkworthy/module-selection),S25(@tomlarkworthy/tests))";
const URL = `file://${NB_PATH}#${HASH}`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForRuntime(page, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const ready = await page.evaluate(() => !!window.__ojs_runtime);
    if (ready) return;
    await sleep(500);
  }
  throw new Error("Runtime not ready");
}

// Skip infrastructure, import proxies, identity-shaped cells
const INFRA_NAMES = new Set([
  "change_listener", "historyUtils", "commit_watermarks",
  "commitRuntimeHistorySince", "commit_changes", "commit_history",
  "tag", "read", "initial_state", "module_load_time",
  "onCodeChange", "codeChangeListeners", "check_for_code_change",
  "runtime_variables", "variables",
  "replay_git", "replayGitEntries", "replayGitCommits",
  "relevant_git_commits", "git_history", "git_commits",
  "replay_pid_map", "history", "modules", "historyModule",
  "config", "notebook_name", "title", "conf",
  "lopepageModule", "page", "layout", "layout_state",
  "fs", "git", "ensure_repo", "ensure_branch", "ensure_dir",
  "known_repos", "known_dirs", "listRepos", "listBranches",
  "listFiles", "listCommits", "setFileAndCommit", "setFilesAndCommit",
  "runtime", "identity", "persistentId",
  "getVariableByPersistentId", "persistentIdToVariableRef",
  "realize", "moduleMap", "thisModule",
]);

async function findCandidates(page) {
  return page.evaluate((infraNames) => {
    const r = window.__ojs_runtime;
    let moduleMap = null;
    for (const v of r._variables) {
      if (v._name === "modules" && v._value instanceof Map) {
        moduleMap = v._value;
        break;
      }
    }
    const realModules = new Set();
    if (moduleMap) {
      for (const [mod, meta] of moduleMap) {
        if (meta?.name && meta.name.startsWith("@")) realModules.add(mod);
      }
    }

    const results = [];
    const seen = new Set(); // deduplicate by name
    for (const v of r._variables) {
      if (!v._reachable || !v._name) continue;
      if (typeof v._definition !== "function") continue;
      if (!realModules.has(v._module)) continue;
      if (v._name.startsWith("viewof ") || v._name.startsWith("mutable ")) continue;
      if (v._name.startsWith("initial ") || v._name.startsWith("dynamic ")) continue;
      if (infraNames.includes(v._name)) continue;
      if (seen.has(v._name)) continue;

      const defStr = v._definition.toString();
      if (defStr.length > 2000 || defStr.length < 10) continue;

      // Skip import proxies
      if (defStr.match(/^\(.*\) => [a-z]\.import\(/)) continue;
      // Skip identity-shaped
      if (defStr === "function identity(x) {\n  return x;\n}") continue;

      let moduleName = "?";
      if (moduleMap) {
        const meta = moduleMap.get(v._module);
        if (meta?.name) moduleName = meta.name;
      }

      seen.add(v._name);
      results.push({
        name: v._name,
        moduleName,
        inputCount: v._inputs.length,
      });
    }
    return results;
  }, [...INFRA_NAMES]);
}

async function checkVariables(page, edits) {
  const results = [];
  for (const edit of edits) {
    const result = await page.evaluate(
      ({ name, expected }) => {
        const r = window.__ojs_runtime;
        for (const v of r._variables) {
          if (v._name === name && v._reachable) {
            return {
              found: true,
              match: String(v._value) === expected,
              value: v._value === undefined ? "undefined" : String(v._value).slice(0, 80),
              reachable: v._reachable,
              version: v._version,
            };
          }
        }
        return { found: false };
      },
      { name: edit.name, expected: edit.newVal }
    );
    results.push({ ...edit, ...result });
  }
  return results;
}

async function run() {
  rmSync(USER_DATA, { recursive: true, force: true });
  mkdirSync(USER_DATA, { recursive: true });

  const context = await chromium.launchPersistentContext(USER_DATA, {
    headless: !headed,
  });

  try {
    let page = await context.newPage();

    // ── Phase 1: Wipe and define ──
    console.log("=== Phase 1: Wipe IndexedDB, define variables ===");
    await page.goto(URL);
    await waitForRuntime(page);
    await page.evaluate(() => indexedDB.deleteDatabase("lopecode_history"));
    await sleep(2000);
    await page.goto(URL);
    await waitForRuntime(page);
    await sleep(10000);

    const candidates = await findCandidates(page);
    const targets = candidates
      .sort((a, b) => a.inputCount - b.inputCount)
      .slice(0, COUNT);

    console.log(`  Redefining ${targets.length} cells...`);
    const marker = Date.now();
    const edits = [];

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const newVal = `STRESS_${marker}_${i}`;
      const newDef = `() => "${newVal}"`;

      await page.evaluate(
        ({ name, definition }) => {
          const r = window.__ojs_runtime;
          for (const v of r._variables) {
            if (v._name === name && v._reachable) {
              const fn = new Function(`return (${definition})`)();
              v.define(name, [], fn);
              if (r._computeNow) r._computeNow();
              return;
            }
          }
        },
        { name: t.name, definition: newDef }
      );
      edits.push({ name: t.name, newVal });
      await sleep(1500);
    }
    console.log(`  Defined ${edits.length} variables. Waiting 20s for commits...`);
    await sleep(20000);

    // Verify before reload
    const preResults = await checkVariables(page, edits);
    const preOk = preResults.filter((r) => r.match).length;
    console.log(`  Pre-reload check: ${preOk}/${edits.length} correct\n`);

    // ── Phase 2: Reload N times ──
    console.log(`=== Phase 2: Reload ${RELOADS} times ===`);
    const summary = [];

    for (let reload = 1; reload <= RELOADS; reload++) {
      await page.goto(URL);
      await waitForRuntime(page);
      await sleep(15000); // wait for git replay

      const results = await checkVariables(page, edits);
      const ok = results.filter((r) => r.match).length;
      const notFound = results.filter((r) => !r.found).length;
      const wrong = results.filter((r) => r.found && !r.match);

      const status = ok === edits.length ? "PASS" : "FAIL";
      console.log(
        `  Reload ${reload}/${RELOADS}: ${status} — ${ok}/${edits.length} correct` +
          (notFound > 0 ? `, ${notFound} not found` : "") +
          (wrong.length > 0
            ? `, wrong: ${wrong.map((w) => `${w.name}="${w.value}"`).join(", ")}`
            : "")
      );

      summary.push({ reload, ok, total: edits.length, notFound, wrong: wrong.length });
    }

    // ── Summary ──
    console.log(`\n=== Summary ===`);
    console.log(`Variables defined: ${edits.length}`);
    console.log(`Reloads: ${RELOADS}`);
    const passes = summary.filter((s) => s.ok === s.total).length;
    const fails = summary.filter((s) => s.ok !== s.total).length;
    console.log(`Passes: ${passes}/${RELOADS}`);
    console.log(`Fails: ${fails}/${RELOADS}`);

    if (fails > 0) {
      console.log(`\nFailing reloads:`);
      for (const s of summary) {
        if (s.ok !== s.total) {
          console.log(`  Reload ${s.reload}: ${s.ok}/${s.total} (${s.notFound} missing, ${s.wrong} wrong)`);
        }
      }
    }

    await context.close();
    rmSync(USER_DATA, { recursive: true, force: true });
    process.exit(fails > 0 ? 1 : 0);
  } catch (e) {
    await context.close().catch(() => {});
    rmSync(USER_DATA, { recursive: true, force: true });
    throw e;
  }
}

run().catch((e) => {
  console.error("Fatal:", e);
  process.exit(2);
});
