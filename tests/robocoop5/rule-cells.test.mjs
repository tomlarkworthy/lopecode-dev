// Every rule_* cell in the robocoop-5 modules (spec R3, R4, R8): its shape, its md neighbour, its two test
// cells run for real, and a mutant with the check disabled, which the fires test must reject.
import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { engine, hold } from "./lib/engine.mjs";

const HOOKS = ["prompt", "context", "beforeStep", "beforeTool", "afterTool", "afterModuleWrite", "turnEnd"];
const src = readFileSync(fileURLToPath(new URL("../../modules/@tomlarkworthy/robocoop-5-engine.js", import.meta.url)), "utf8");
// $def lines in order: [pid, name|null]
const defs = [...src.matchAll(/\$def\("([^"]+)", (null|"[^"]+"), \[([^\]]*)\]/g)].map((m) => ({ name: m[2] === "null" ? null : m[2].slice(1, -1), deps: m[3] }));
const ruleNames = defs.filter((d) => d.name?.startsWith("rule_")).map((d) => d.name);

describe("rule cells: engine", () => {
  let e;
  before(async () => { e = await engine(); });
  it("there are rules to check", () => assert.ok(ruleNames.length >= 11, String(ruleNames.length)));
  for (const name of ruleNames) {
    const [, hook, id] = /^rule_([A-Za-z]+)_(.+)$/.exec(name);
    it(name + ": shape, md neighbour, two tests", async () => {
      const rule = await hold(e.eng, name);
      assert.ok(HOOKS.includes(hook), "hook " + hook);
      assert.equal(rule.hook, hook); assert.equal(rule.id, id);
      assert.equal(typeof rule.order, "number"); assert.equal(typeof rule.check, "function");
      assert.equal(typeof rule.evidence?.what, "string");
      const next = defs[defs.findIndex((d) => d.name === name) + 1];
      assert.ok(next && next.name === null && next.deps === '"md"', "the cell after it is not an md cell");
      for (const t of ["fires", "silent"]) assert.ok(defs.some((d) => d.name === `test_rule_${id}_${t}`), `no test_rule_${id}_${t}`);
    });
    for (const t of ["fires", "silent"])
      it(`test_rule_${id}_${t}`, async () => { await hold(e.eng, `test_rule_${id}_${t}`); });
    it(`mutant: ${name} with its check disabled fails test_rule_${id}_fires`, async () => {
      const rule = await hold(e.eng, name);
      const m = await engine({ overrides: { [name]: { ...rule, check: () => null } } });
      await assert.rejects(hold(m.eng, `test_rule_${id}_fires`));
    });
  }
});
