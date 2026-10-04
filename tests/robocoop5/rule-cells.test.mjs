// Every rule_* cell in the robocoop-5 modules (spec R3, R4, R8): its shape, its md neighbour, its two test
// cells run for real, and a mutant with the check disabled, which the fires test must reject.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { engine, hold } from "./lib/engine.mjs";

import { importNotebookModule } from "../../tools/notebook-import.ts";

const HOOKS = ["prompt", "context", "beforeStep", "beforeTool", "afterTool", "afterModuleWrite", "turnEnd"];
const path = (n) => fileURLToPath(new URL(`../../modules/@tomlarkworthy/robocoop-5${n}.js`, import.meta.url));
const noop = () => {};
// How each module that holds rules is loaded headless. `load(overrides)` returns something hold() accepts.
const MODULES = {
  engine: { file: "-engine", min: 22, load: async (overrides) => (await engine({ overrides })).eng },
  sessions: { file: "-sessions", min: 1, load: (overrides) => importNotebookModule(path("-sessions"), { overrides: { runtime: { mains: new Map(), _variables: new Set() }, registerRule: noop, unregisterRule: noop, ...overrides } }) },
  // the afterModuleWrite rules apply modules to a live runtime: their cells run in tools/robocoop-5/rule-tests-browser.mjs
  srctools: { file: "-srctools", min: 6, browser: /^rule_afterModuleWrite_/, load: (overrides) => importNotebookModule(path("-srctools"), { overrides: { registerRule: noop, unregisterRule: noop, ...overrides } }) },
  "spec-lock": { file: "-spec-lock", min: 4, browser: /^rule_afterModuleWrite_/, load: (overrides) => importNotebookModule(path("-spec-lock"), { overrides: { registerRule: noop, unregisterRule: noop, registerMonitor: noop,
    cellHelpers: {}, rc5_store: { scratch: new Map() }, ...overrides } }) },
};

for (const [label, M] of Object.entries(MODULES)) {
  const src = readFileSync(path(M.file), "utf8");
  // $def lines in order
  const defs = [...src.matchAll(/\$def\("([^"]+)", (null|"[^"]+"), \[([^\]]*)\]/g)].map((m) => ({ name: m[2] === "null" ? null : m[2].slice(1, -1), deps: m[3] }));
  const ruleNames = defs.filter((d) => d.name?.startsWith("rule_")).map((d) => d.name);
  describe("rule cells: " + label, () => {
    let e;
    before(async () => { e = await M.load({}); });
    it("there are rules to check", () => assert.ok(ruleNames.length >= M.min, String(ruleNames.length)));
    for (const name of ruleNames) {
      const [, hook, id] = /^rule_([A-Za-z]+)_(.+)$/.exec(name);
      const inBrowser = M.browser?.test(name);
      const tests = ["fires", "silent"].filter((t) => t === "fires" || defs.some((d) => d.name === `test_rule_${id}_silent`) || hook !== "prompt");
      it(name + ": shape, md neighbour, two tests", async () => {
        assert.ok(HOOKS.includes(hook), "hook " + hook);
        if (!inBrowser) {
          const rule = await hold(e, name);
          assert.equal(rule.hook, hook); assert.equal(rule.id, id);
          assert.equal(typeof rule.order, "number"); assert.equal(typeof rule.check, "function");
          assert.equal(typeof rule.evidence?.what, "string");
        }
        const next = defs[defs.findIndex((d) => d.name === name) + 1];
        assert.ok(next && next.name === null && next.deps === '"md"', "the cell after it is not an md cell");
        // a rule marked `always` (a prompt section that is always there) has no silent case
        for (const t of tests) assert.ok(defs.some((d) => d.name === `test_rule_${id}_${t}`), `no test_rule_${id}_${t}`);
        if (!inBrowser) assert.equal(tests.length, (await hold(e, name)).always ? 1 : 2, "`always` and a silent test disagree");
      });
      if (inBrowser) continue;
      for (const t of tests)
        it(`test_rule_${id}_${t}`, async () => { await hold(e, `test_rule_${id}_${t}`); });
      it(`mutant: ${name} with its check disabled fails test_rule_${id}_fires`, async () => {
        const rule = await hold(e, name);
        const m = await M.load({ [name]: { ...rule, check: () => null } });
        await assert.rejects(hold(m, `test_rule_${id}_fires`));
      });
    }
  });
}
