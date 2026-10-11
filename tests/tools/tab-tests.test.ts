// tools/cloud-brain/tab-tests.ts and channel-wakes.ts: a writer's browser run with no pairing, and the count of
// what paired tabs sent a session. Issue writers-qa-tabs-wake-the-orchestrator.
//
//   bun test ./tests/tools/tab-tests.test.ts          # from the repo root, with the ./
// No browser is launched: the in-page functions are run here against a real @observablehq/runtime.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Runtime } from "../../tools/node_modules/@observablehq/runtime";
import { parseArgs, address, ready, runTests, emitCell, report } from "../../tools/cloud-brain/tab-tests.ts";
import { wakesOf } from "../../tools/cloud-brain/channel-wakes.ts";

const M = "@t/w";

// A page with one main of four test cells and a service, and a second module with a test of the same name.
function page() {
  const rt: any = new Runtime({});
  const mod = rt.module(), other = rt.module();
  mod.variable().define("test_ok", [], () => "fine");
  mod.variable().define("test_undefined", [], () => undefined);
  mod.variable().define("test_bad", [], () => { throw new Error("expected 1\n  got 2"); });
  mod.variable().define("test_hangs", [], () => new Promise(() => {}));
  mod.variable().define("helper", [], () => 1);
  mod.variable().define("w_service", [], () => ({ emit: async () => ({ hash: "abc", parts: [{ path: "w.js", text: "é" }] }) }));
  other.variable().define("test_ok", [], () => { throw new Error("the other module's"); });
  rt.mains = new Map([[M, mod], ["@t/other", other]]);
  (globalThis as any).window = { __ojs_runtime: rt };
  return { rt, mod };
}

test("the address has the module in one pane, no pairing pane and no token", () => {
  const a = address("/tmp/nb.html", "@tomlarkworthy/brain-static", 7);
  expect(a).toBe("file:///tmp/nb.html#view=C100(S100(@tomlarkworthy/brain-static))&r=7");
  expect(a).not.toContain("cc=");
  expect(a).not.toContain("claude-code-pairing");
  expect(address("nb.html", M)).not.toBe(address("nb.html", M, 1));
});

test("the page is ready when the module is a main with a test_ cell, and not before", () => {
  (globalThis as any).window = {};
  expect(ready(M)).toBe(false);
  const { rt } = page();
  expect(ready(M)).toBe(true);
  expect(ready("@t/none")).toBe(false);
  rt.mains.set("@t/empty", rt.module());
  expect(ready("@t/empty")).toBe(false);
});

test("each test_ cell of the module is read: a throw and a hang are named, the other module's cell is not run for it", async () => {
  const { rt, mod } = page();
  const before = [...rt._variables].filter((v: any) => v._module === mod).length;
  const [names, bad] = await runTests({ module: M, ms: 300 });
  expect(names.sort()).toEqual(["test_bad", "test_hangs", "test_ok", "test_undefined"]);
  expect(bad.sort()).toEqual(["test_bad expected 1\n  got 2", "test_hangs TIMEOUT"]);
  // nothing was defined in the module under test: an emit there would carry it into the deployed source
  expect([...rt._variables].filter((v: any) => v._module === mod).length).toBe(before);
});

// Issue tab-tests-lists-one-fail-several-times. A cell is computed again each time one of its inputs has a new
// value, and the observer hears each of those.
test("a test_ cell that is computed again has one verdict, its first: one line when it throws each time, none when it throws later", async () => {
  const rt: any = new Runtime({});
  const mod = rt.module();
  mod.variable().define("tick", [], function* () { for (let i = 0; i < 5; i++) yield i; });
  mod.variable().define("test_missing", ["tick", "nowhere"], (t: number, n: any) => n);
  mod.variable().define("test_flip", ["tick"], (t: number) => { if (t > 0) throw new Error("later " + t); return "first"; });
  mod.variable().define("test_ok", [], () => 1);
  // the run is still open while the others are computed again
  mod.variable().define("test_slow", [], () => new Promise((r) => setTimeout(() => r(1), 400)));
  rt.mains = new Map([[M, mod]]);
  (globalThis as any).window = { __ojs_runtime: rt };
  const [names, bad] = await runTests({ module: M, ms: 2000 });
  expect(names.sort()).toEqual(["test_flip", "test_missing", "test_ok", "test_slow"]);
  expect(bad).toEqual(["test_missing nowhere is not defined"]);
  expect(report(names, bad, [], [])).toMatchObject({ tests: 4, passed: 3, failed: ["test_missing nowhere is not defined"], exit: 1 });
});

test("an emit is the service cell's record as text; a cell that is not there throws", async () => {
  page();
  expect(await emitCell({ module: M, cell: "w_service" })).toBe('{"hash":"abc","parts":[{"path":"w.js","text":"é"}]}');
  await expect(emitCell({ module: M, cell: "nope_service" })).rejects.toThrow(/nope_service/);
});

test("the exit: 1 for a failed test, 2 for an emit not written with the tests passed, 0 otherwise", () => {
  const e = [{ cell: "w_service", file: "/x.json", hash: "abc", bytes: 9 }];
  expect(report(["test_a", "test_b"], [], e, [])).toEqual({ tests: 2, passed: 2, failed: [], emitted: e, notEmitted: [], exit: 0 });
  expect(report(["test_a", "test_b"], ["test_b TIMEOUT"], [], ["w_service x"]).exit).toBe(1);
  expect(report(["test_a", "test_b"], ["test_b TIMEOUT"], [], []).passed).toBe(1);
  expect(report(["test_a"], [], [], ["w_service x"]).exit).toBe(2);
  expect(report([], [], [], []).exit).toBe(0);
});

test("the arguments: a notebook, one module by its whole name, --emit CELL=FILE any number of times", () => {
  expect(parseArgs(["nb.html", M])).toEqual({ notebook: "nb.html", module: M, emit: [], timeout: 90, boot: 120 });
  expect(parseArgs(["nb.html", M, "--emit", "a_service=/x/a=b.json", "--emit=b_service=b.json", "--timeout", "5", "--boot=7"])).toEqual({
    notebook: "nb.html", module: M, emit: [{ cell: "a_service", file: "/x/a=b.json" }, { cell: "b_service", file: "b.json" }], timeout: 5, boot: 7,
  });
  for (const bad of [[], ["nb.html"], ["nb.html", M, "@t/x"], ["nb.html", "brain-static"], ["nb.html", M, "--emit", "a_service"], ["nb.html", M, "--emit", "=x.json"], ["nb.html", M, "--emit", "a_service="], ["nb.html", M, "--emit"], ["nb.html", M, "--timeout", "0"], ["nb.html", M, "--timeout", "1.5"], ["nb.html", M, "--cc", "LOPE"]])
    expect(() => parseArgs(bad)).toThrow();
});

test("with a wrong argument the tool exits 64 and launches nothing; with no such file, 70", async () => {
  const tool = resolve(import.meta.dir, "../../tools/cloud-brain/tab-tests.ts");
  const run = async (...a: string[]) => { const p = Bun.spawn(["bun", tool, ...a], { stdout: "pipe", stderr: "pipe" }); return [await p.exited, await new Response(p.stdout).text(), await new Response(p.stderr).text()]; };
  const [code, out, err] = await run("nb.html");
  expect([code, out]).toEqual([64, ""]);
  expect(err).toContain("tab-tests.ts NOTEBOOK MODULE");
  const [code2, out2, err2] = await run("/nonexistent/nb.html", M);
  expect([code2, out2]).toEqual([70, ""]);
  expect(err2).toContain("no file /nonexistent/nb.html");
});

// channel-wakes.ts
const u = (cw: number, cr: number, o: number) => ({ input_tokens: 1, cache_creation_input_tokens: cw, cache_read_input_tokens: cr, output_tokens: o });
const asst = (id: string, usage: any) => JSON.stringify({ type: "assistant", message: { id, usage, content: [] } });
const human = (text: string) => JSON.stringify({ type: "user", message: { content: text }, origin: { kind: "human" } });
const result = () => JSON.stringify({ type: "user", message: { content: [{ type: "tool_result", tool_use_id: "t", content: "x" }] } });
const channel = (type: string, nb: string, at: string) => JSON.stringify({ type: "user", isMeta: true, timestamp: at, origin: { kind: "channel", server: "lopecode" }, message: { content: `<channel source="lopecode" type="${type}" notebook="file://${nb}#view=C100(S70(@t/w))&amp;cc=LOPE-1-AAAA&amp;r=1" name="hash">\nx\n</channel>` } });

test("channel rows are counted by type and notebook, and the requests they started are summed apart from the rest", () => {
  const t = [
    human("go"), asst("m1", u(10, 1000, 5)), result(), asst("m2", u(10, 1000, 5)),
    channel("connected", "/w/a/nb.html", "T1"), asst("m3", u(20, 2000, 7)), asst("m3", u(20, 2000, 9)),
    channel("variable_update", "/w/a/nb.html", "T2"), channel("cell_change", "/w/b/nb.html", "T3"), asst("m4", u(30, 3000, 11)), result(), asst("m5", u(1, 3100, 2)),
    human("next"), asst("m6", u(10, 5000, 5)),
    channel("disconnected", "/w/b/nb.html", "T4"),
  ].join("\n");
  expect(wakesOf(t, "/w/b/")).toEqual({
    rows: 4, byType: { connected: 1, variable_update: 1, cell_change: 1, disconnected: 1 }, notebooks: 2, matched: 2, first: "T1", last: "T4",
    answers: { requests: 3, input: 3, cacheWrite: 51, cacheRead: 8100, output: 22 },
  });
  expect(wakesOf(t).matched).toBe(null);
  expect(wakesOf(t, "/w/c/").matched).toBe(0);
  expect(wakesOf("")).toEqual({ rows: 0, byType: {}, notebooks: 0, matched: null, first: null, last: null, answers: { requests: 0, input: 0, cacheWrite: 0, cacheRead: 0, output: 0 } });
});

// The brief: a writer's browser run is the tool's, and no step of it pairs a tab with the session.
test("the writer's brief runs the module's tests and the emit with tab-tests.ts, and opens no paired tab for them", () => {
  const brief = readFileSync(resolve(import.meta.dir, "../../.claude/skills/brain-maintenance/agents/implementer.md"), "utf8");
  const step = (n: number) => brief.slice(brief.indexOf(`\n${n}. **`), brief.indexOf(`\n${n + 1}. **`));
  for (const n of [8, 9]) {
    expect(step(n)).toContain("tools/cloud-brain/tab-tests.ts");
    expect(step(n)).not.toMatch(/eval_code|47814|claude-code-pairing|cc=<pairing token>/);
  }
  expect(step(8)).toContain("Do not open a paired tab for this");
  expect(step(9)).toContain("--emit");
});
