// bun fixtures.ts — asserts the outcome of every fixture under fixtures/.
// reject-*: check fails with exactly the rule ids in expect.json. accept-*: check passes, every test
// passes under both definition orders, and results are identical across orders.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkPort } from "./check.ts";
import { runPort, loadPort, compareOrders, type RunResult } from "./run.ts";
import { RULES } from "./rules.ts";
import { specRejects } from "./lite/soundscript/spec-cases.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIX = join(HERE, "fixtures");
const only = process.argv[2];

type Expect = {
  check: { ok?: boolean; rules?: string[] };
  run?: { cells?: Record<string, { status?: string; error?: string }> };
};

let pass = 0;
const failures: string[] = [];
const ok = (name: string, cond: boolean, why: string) => {
  if (!cond) failures.push(`${name}: ${why}`);
  return cond;
};

async function bothOrders(dir: string) {
  return [await runPort(dir, "forward", 3000), await runPort(dir, "reverse", 3000)] as const;
}

const dirs = readdirSync(FIX).filter((d) => existsSync(join(FIX, d, "cells.ts")) && (!only || d === only)).sort();

// Registry: no reject case, no rule. A rule's reject case is a fixtures/reject-<id> directory or a case in the
// specification module's spec_rejects (checked there by its tests, with the in-notebook checker).
const specRuleIds = new Set(specRejects().map((c) => c.rule));
if (!only)
  for (const r of RULES) ok(`registry`, dirs.includes(`reject-${r.id}`) || specRuleIds.has(r.id), `rule ${r.id} has no fixtures/reject-${r.id} and no case in spec_rejects`);

for (const d of dirs) {
  const dir = join(FIX, d);
  const before = failures.length;
  const ex: Expect = existsSync(join(dir, "expect.json"))
    ? JSON.parse(readFileSync(join(dir, "expect.json"), "utf8"))
    : { check: { ok: true } };
  const c = checkPort(dir);
  const got = [...new Set(c.errors.map((e) => e.rule))].sort();
  let note = "";
  if (d.startsWith("reject-")) {
    const want = [...(ex.check.rules ?? [])].sort();
    ok(d, !c.ok && JSON.stringify(got) === JSON.stringify(want), `check rules ${JSON.stringify(got)}, expected exactly ${JSON.stringify(want)}`);
    note = `rejected [${got.join(", ")}]`;
  } else {
    ok(d, c.ok, `check failed: ${c.errors.map((e) => `${e.file}:${e.line} [${e.rule}] ${e.message}`).join("; ")}`);
    note = "accepted";
  }

  let runs: readonly [RunResult, RunResult] | null = null;
  if (d.startsWith("accept-") || ex.run || d === "reject-pusher") runs = await bothOrders(dir);
  if (runs && d.startsWith("accept-")) {
    for (const r of runs) {
      ok(d, r.settled, `${r.order}: did not settle`);
      for (const cell of r.cells) {
        if (cell.test) ok(d, cell.test === "pass", `${r.order}: ${cell.name} ${cell.test} ${cell.error ?? ""}`);
        else if (cell.file === "cells.ts") ok(d, cell.status === "fulfilled", `${r.order}: ${cell.name} ${cell.status} ${cell.error ?? ""}`);
      }
    }
    const diffs = compareOrders(runs[0], runs[1]);
    ok(d, diffs.length === 0, `differs across orders: ${diffs.join("; ")}`);
    note += `; tests fwd ${runs[0].tests.pass}/${runs[0].tests.pass + runs[0].tests.fail} rev ${runs[1].tests.pass}/${runs[1].tests.pass + runs[1].tests.fail}; orders identical ${diffs.length === 0}`;
  }
  if (runs && ex.run?.cells) {
    for (const [name, want] of Object.entries(ex.run.cells)) {
      for (const r of runs) {
        const cell = r.cells.find((x) => x.name === name);
        ok(d, !!cell, `${r.order}: no cell ${name}`);
        if (!cell) continue;
        if (want.status) ok(d, cell.status === want.status, `${r.order}: ${name} status ${cell.status}, expected ${want.status}`);
        if (want.error) ok(d, (cell.error ?? "").includes(want.error), `${r.order}: ${name} error "${cell.error}", expected to contain "${want.error}"`);
      }
    }
    note += `; run: ${Object.keys(ex.run.cells).join(", ")} as expected at run time`;
  }
  if (d === "reject-pusher" && runs) {
    const diffs = compareOrders(runs[0], runs[1]);
    note += `; (info) run: test_empty fwd ${runs[0].cells.find((x) => x.name === "test_empty")?.test} rev ${runs[1].cells.find((x) => x.name === "test_empty")?.test}, ${diffs.length} difference(s) across orders: ${diffs.join("; ")}`;
  }
  if (d === "accept-pusher-state" && runs) {
    const t = runs.map((r) => r.cells.find((x) => x.name === "test_empty")?.test);
    ok(d, t[0] === "pass" && t[1] === "pass", `test_empty fwd ${t[0]} rev ${t[1]}`);
  }

  if (d === "accept-state") {
    // The world calls the action: label recomputes, the action cell does not.
    for (const order of ["forward", "reverse"] as const) {
      const h = await loadPort(dir, { order });
      await h.settle(3000);
      const label0 = h.evals("label"), inc0 = h.evals("increment"), count0 = h.evals("count");
      ok(d, h.value("label") === "count: 0", `${order}: initial label ${h.value("label")}`);
      let threw = "";
      try { (h.value("count$ref") as { set(v: number): void }).set(5); } catch (e) { threw = String((e as Error).message); }
      ok(d, threw.includes("outside an action"), `${order}: State.set outside an action did not throw`);
      (h.value("increment") as () => void)();
      ok(d, h.value("label") === "count: 0", `${order}: write committed synchronously inside the action call`);
      await h.settle(3000);
      ok(d, h.value("label") === "count: 1", `${order}: label after action ${h.value("label")}`);
      ok(d, h.evals("label") === label0 + 1, `${order}: label evaluated ${h.evals("label") - label0} more times, expected 1`);
      ok(d, h.evals("increment") === inc0, `${order}: increment re-evaluated ${h.evals("increment") - inc0} times, expected 0`);
      ok(d, h.evals("count") === count0, `${order}: state cell count re-evaluated`);
      (h.value("increment") as () => void)();
      (h.value("increment") as () => void)();
      await h.settle(3000);
      ok(d, h.value("label") === "count: 3", `${order}: label after 3 increments ${h.value("label")}`);
      h.dispose();
    }
    note += "; action from outside: label recomputes, increment does not (both orders)";
  }

  if (d === "accept-state-deps") {
    // A state cell with a dependency: writes stick until the dependency changes, which re-creates it.
    for (const order of ["forward", "reverse"] as const) {
      const h = await loadPort(dir, { order });
      await h.settle(3000);
      ok(d, h.value("label") === "n=10", `${order}: initial label ${h.value("label")}`);
      const vars0 = h.evals("vars");
      (h.value("setN") as (n: number) => void)(5);
      await h.settle(3000);
      ok(d, h.value("label") === "n=5", `${order}: label after setN(5) ${h.value("label")}`);
      ok(d, h.evals("vars") === vars0, `${order}: vars re-created by its own write`);
      (h.value("bumpSeed") as () => void)();
      await h.settle(3000);
      ok(d, h.value("label") === "n=20", `${order}: label after bumpSeed ${h.value("label")}`);
      ok(d, h.evals("vars") === vars0 + 1, `${order}: vars evaluated ${h.evals("vars") - vars0} more times after its dependency changed, expected 1`);
      h.dispose();
    }
    note += "; set sticks, dependency change re-creates the state cell (both orders)";
  }

  if (failures.length === before) pass++;
  console.log(`${failures.length === before ? "PASS" : "FAIL"} ${d}: ${note}`);
  for (const f of failures.slice(before)) console.log(`     ${f}`);
}

const regFails = failures.filter((f) => f.startsWith("registry"));
for (const f of regFails) console.log(`FAIL ${f}`);
console.log(`\n${pass}/${dirs.length} fixtures pass; ${RULES.length} lint/injection rules registered, ${RULES.length - regFails.length} with a reject case (${RULES.filter((r) => specRuleIds.has(r.id)).length} of them in the specification module); ${failures.length} failure(s)`);
process.exit(failures.length ? 1 : 0);
