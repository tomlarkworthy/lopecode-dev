// Unit tests for lite/stdlib/runtime.ts and prelude.runtime.ts: events and listeners (exactly once),
// action atomicity, flush atomicity, memo/run-count/island-cache bounds. Run: bun lite/stdlib/runtime.test.ts
(globalThis as any).requestAnimationFrame = (f: () => void) => setTimeout(f, 1);
const ss = await import("./runtime.ts");
const P = await import("../../prelude.runtime.ts");
const T = await import("../toolchain/ss-toolchain.ts");

let pass = 0, fail = 0;
const uncaught: unknown[] = [];
process.on("uncaughtException", (e) => uncaught.push(e));
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? ": " + detail : ""}`); }
};
const tick = (ms = 10) => new Promise((r) => setTimeout(r, ms));
const until = async (f: () => boolean, max = 200) => { for (let i = 0; i < max && !f(); i++) await tick(2); return f(); };
const never = new Promise<never>(() => {});
const deferred = () => { let resolve!: () => void; const p = new Promise<void>((r) => (resolve = r)); return { p, resolve }; };
const errors: string[] = [];
const realError = console.error;
console.error = (...a: unknown[]) => void errors.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(" "));
const run = async (name: string, f: () => Promise<void> | void) => {
  try { await f(); } catch (e) { ok(name, false, `threw ${(e as Error)?.stack ?? e}`); }
};

const flushed = () => until(() => !P.state.flushScheduled && P.state.queue.length === 0).then(() => tick(2));

// Frames are run by hand: the events pump asks scheduler.frame for its next sync step.
const C = await import("../browser/cells.ts");
const frames: (() => void)[] = [];
C.scheduler.frame = (f) => void frames.push(f);
const frame = () => { const fs = frames.splice(0); for (const f of fs) f(); return fs.length; };

// A SoundScript module compiled by the toolchain and run in a real Observable Runtime, as the notebook
// runs it: every variable observed, `ss` the stdlib, invalidation the runtime's own.
const { Runtime } = await import("@observablehq/runtime");
const { checkSources } = await import("../core.ts");
async function load(src: string) {
  const checked = checkSources({ cells: src, tsx: true });
  const bad = checked.cells.filter((c) => c.status !== "ok");
  if (bad.length) throw new Error(`not ok: ${bad.map((c) => `${c.name} ${c.status} ${JSON.stringify(c.errors)}`).join("; ")}`);
  const ctx = T.contextFromCheck(checked);
  const runtime = new Runtime();
  const m = runtime.module();
  m.define("ss", [], () => ss);
  const vars = new Map<string, any>();
  const values = new Map<string, unknown>();
  const errs: string[] = [];
  const define = (text: string) => {
    for (const d of T.compileCell(text, true, ctx)) {
      const v = vars.get(d.name) ?? m.variable({ fulfilled: (x: unknown) => values.set(d.name, x), rejected: (e: unknown) => errs.push(`${d.name}: ${(e as Error)?.message ?? e}`) });
      vars.set(d.name, v);
      v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    }
  };
  for (const t of T.splitCells(src, true)) define(t);
  const settle = async () => { for (let i = 0; i < 5; i++) { await tick(3); await flushed(); } };
  await settle();
  return { m, vars, values, errs, define, settle, runtime, value: (n: string) => values.get(n) as any, evals: (n: string) => ss.evals(vars.get(n)._definition) };
}
// Frames until f() holds or n frames have run; actions flush between frames.
async function frameUntil(f: () => boolean, n = 5000) {
  for (let i = 0; i < n && !f(); i++) { frame(); if (i % 20 === 0) await flushed(); }
  await flushed();
  return f();
}

// record counts each value, and counts a gap whenever a value is not the last one plus one.
const STREAM = `type S = { readonly count: number; readonly last: number; readonly gaps: number; readonly sum: number };
export const seen = (): RefCell<S> => ref<S>({ count: 0, last: 0, gaps: 0, sum: 0 });
export const running = (): RefCell<boolean> => ref(true);
export const nums = function* (running: boolean) {
  if (!running) return;
  for (let i = 1; i <= 1000; i++) yield i;
};
export const weight = () => (v: number) => v;
export const record = (seen: Ref<S>, weight: (v: number) => number) =>
  action((v: number) => seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (v === s.last + 1 ? 0 : 1), sum: s.sum + weight(v) })));
export const onNum = (nums: Events<number>, record: Action<[number]>) => on(nums, record);
export const toggle = (running: Ref<boolean>) => action(() => running.update((r) => !r));`;

await run("e1_every_value_once", async () => {
  const p = await load(STREAM);
  ok("e1_one_listener", ss.running() === 1, `running ${ss.running()}`);
  await frameUntil(() => p.value("seen").count >= 1000);
  for (let i = 0; i < 20; i++) frame();
  await flushed();
  const s = p.value("seen");
  ok("e1_1000_yields_give_exactly_1000_actions_in_order", s.count === 1000 && s.gaps === 0 && s.sum === 500500, JSON.stringify(s));
  ok("e1_no_runtime_errors", p.errs.length === 0, p.errs.join("; "));
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});

await run("e1_async_generator_every_value_once", async () => {
  let n = 0, made = 0;
  const h = C.events(undefined, "fast", [], () => { made++; return (async function* () { for (let i = 1; i <= 1000; i++) { await null; yield i; } })() as any; }, null);
  const got: number[] = [];
  const act = P.action((v: number) => void got.push(v));
  const l = C.listen(C.on(h, act), "onFast", null);
  frame();
  await until(() => got.length >= 1000, 500);
  n = got.length;
  ok("e1_async_1000_values_exactly_once_in_order", n === 1000 && got.every((v, i) => v === i + 1) && made === 1, `${n} values, made ${made}`);
  C.release(l); C.release(h);
});

await run("e2_editing_a_dependency_of_the_action_mid_stream", async () => {
  const p = await load(STREAM);
  const onNum0 = p.evals("onNum");
  await frameUntil(() => p.value("seen").count >= 100);
  p.define("export const weight = () => (v: number) => v * 1;");
  await frameUntil(() => p.value("seen").count >= 300);
  p.define("export const weight = () => (v: number) => 1 * v;");
  await frameUntil(() => p.value("seen").count >= 1000);
  for (let i = 0; i < 20; i++) frame();
  await flushed();
  const s = p.value("seen");
  ok("e2_action_edited_twice_no_value_lost_or_doubled", s.count === 1000 && s.gaps === 0 && s.sum === 500500, JSON.stringify(s));
  ok("e2_listener_ran_once_per_new_action", p.evals("onNum") - onNum0 === 2, `onNum ran ${p.evals("onNum") - onNum0} more times`);
  ok("e2_one_listener", ss.running() === 1, `running ${ss.running()}`);
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});

await run("e3_listener_rerun_leaves_one", async () => {
  const p = await load(STREAM);
  await frameUntil(() => p.value("seen").count >= 50);
  p.define("export const onNum = (nums: Events<number>, record: Action<[number]>) => /* again */ on(nums, record);");
  await frameUntil(() => p.value("seen").count >= 60);
  ok("e3_rerun_one_live_listener", ss.running() === 1, `running ${ss.running()}`);
  await frameUntil(() => p.value("seen").count >= 1000);
  for (let i = 0; i < 20; i++) frame();
  await flushed();
  const s = p.value("seen");
  ok("e3_rerun_no_value_lost_or_doubled", s.count === 1000 && s.gaps === 0, JSON.stringify(s));
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});

await run("e4_events_restart_without_listener_rerun", async () => {
  const p = await load(STREAM);
  await frameUntil(() => p.value("seen").count >= 40);
  const onNum0 = p.evals("onNum"), nums0 = p.evals("nums"), h0 = p.value("nums");
  p.value("toggle")();
  await p.settle();
  const c1 = p.value("seen").count;
  for (let i = 0; i < 30; i++) frame();
  await flushed();
  const stopped = p.value("seen").count === c1;
  p.value("toggle")();
  await p.settle();
  await frameUntil(() => p.value("seen").count >= c1 + 30);
  const s = p.value("seen");
  ok("e4_stopped_while_running_is_false", stopped, `count ${c1} -> ${p.value("seen").count}`);
  ok("e4_restarted_from_1", s.count >= c1 + 30 && s.gaps === 1, JSON.stringify(s));
  ok("e4_events_ran_twice_listener_not_at_all", p.evals("nums") - nums0 === 2 && p.evals("onNum") === onNum0 && p.value("nums") === h0, `nums +${p.evals("nums") - nums0}, onNum +${p.evals("onNum") - onNum0}, same handle ${p.value("nums") === h0}`);
  ok("e4_one_listener", ss.running() === 1, `running ${ss.running()}`);
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});

await run("e5_throwing_action_keeps_the_stream", async () => {
  errors.length = 0;
  const p = await load(STREAM.replace("sum: s.sum + weight(v) })));", "sum: s.sum + weight(v) }));\n    if (v % 10 === 0) throw new Error(`no ${v}`);\n  });").replace("action((v: number) => seen.update(", "action((v: number) => {\n    seen.update("));
  await frameUntil(() => p.value("seen").last >= 999);
  for (let i = 0; i < 20; i++) frame();
  await flushed();
  const s = p.value("seen");
  // each value v % 10 === 0 throws inside its action after its write, so that action writes nothing, and the next value still runs
  ok("e5_900_of_1000_committed", s.count === 900 && s.last === 999, JSON.stringify(s));
  ok("e5_error_names_events_and_action", errors.length === 100 && errors.every((m) => m.includes("listener onNum") && m.includes("action record") && m.includes("events nums")), `${errors.length} errors, first ${errors[0]}`);
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});

await run("e6_deleting_the_listener_or_the_module_stops_delivery", async () => {
  const p = await load(STREAM);
  await frameUntil(() => p.value("seen").count >= 20);
  const v = p.vars.get("onNum");
  ss.release(v._value); v.delete();
  await p.settle();
  const c = p.value("seen").count;
  for (let i = 0; i < 40; i++) frame();
  await flushed();
  ok("e6_deleted_listener_delivers_nothing", ss.running() === 0 && p.value("seen").count === c, `running ${ss.running()}, count ${c} -> ${p.value("seen").count}`);
  const q = await load(STREAM);
  await frameUntil(() => q.value("seen").count >= 20);
  for (const x of q.vars.values()) { ss.release(x._value); x.delete(); }
  q.runtime.dispose();
  const pending = frames.length;
  frame();
  ok("e6_disposed_module_stops_its_generator", ss.running() === 0 && frame() === 0, `running ${ss.running()}, frames asked ${pending}`);
  for (const x of p.vars.values()) { ss.release(x._value); x.delete(); }
  p.runtime.dispose();
});

await run("e7_sweep_ends_what_no_variable_holds", async () => {
  const h = C.events(undefined, "swept", [], () => (function* () { for (;;) yield 1; })() as any, null);
  C.listen(C.on(h, P.action(() => {})), "onSwept", null);
  ok("e7_attached", ss.running() === 1);
  ss.sweep(new Set()); ss.sweep(new Set());
  ok("e7_sweep_detaches_unheld", ss.running() === 0, `running ${ss.running()}`);
});

// Actions held in refs (Tom, 2026-11-15: wanted). These report what happens; they assert only that
// each case ran, and print what it observed.
const AREF = await Bun.file(new URL("../../fixtures/lite-game/accept-action-in-ref/cells.tsx", import.meta.url).pathname).text();
const ASTACK = await Bun.file(new URL("../../fixtures/lite-game/accept-action-stack/cells.tsx", import.meta.url).pathname).text();
const report = (name: string, what: unknown) => console.log(`  report ${name}: ${typeof what === "string" ? what : JSON.stringify(what)}`);
await run("r_action_in_ref", async () => {
  const p = await load(AREF);
  const press = async (n: string) => { p.value(n)(); await p.settle(); };
  await press("current");
  const afterApply = p.value("count");
  await press("useDec"); await press("current");
  ok("r_ref_runs_the_action_it_holds", afterApply === 1 && p.value("count") === 0, `count ${afterApply} then ${p.value("count")}`);
  // (a1) the ref's initial value comes from inc, a dependency: editing inc re-creates the ref
  await press("useDec");
  p.define("export const inc = (count: Ref<number>) => action(() => count.update((c) => c + 10));");
  await p.settle();
  const c0 = p.value("count"); await press("current");
  report("a1 edit inc (the ref's initial value) after dec was stored", { refRecreated: p.value("current") === p.value("inc"), countChange: p.value("count") - c0 });
  // (a2) dec stored by an action, then dec's cell edited: the ref keeps the old function
  await press("useDec");
  const stored = p.value("current");
  p.define("export const dec = (count: Ref<number>) => action(() => count.update((c) => c - 100));");
  await p.settle();
  const c1 = p.value("count"); await press("current");
  report("a2 edit dec after it was stored by useDec", { refHoldsOld: p.value("current") === stored, refHoldsNew: p.value("current") === p.value("dec"), countChange: p.value("count") - c1 });
  // (b) the stored action's cell deleted
  const dv = p.vars.get("dec"); dv.delete(); p.vars.delete("dec");
  await p.settle();
  const c2 = p.value("count");
  let threw = "";
  try { p.value("current")(); await p.settle(); } catch (e) { threw = String((e as Error).message); }
  report("b delete dec's cell while the ref holds it", { stillCallable: !threw, threw, countChange: p.value("count") - c2, useDecError: p.errs.filter((e) => e.startsWith("useDec")).slice(-1)[0] ?? null });
  // (c) equals on two refs holding the same action, and on two different actions
  report("c equals", { sameAction: P.equals(p.value("current"), p.value("current")), twoActions: P.equals(p.value("inc"), p.value("useInc")), twoCopiesOfOneText: P.equals(P.action(() => {}), P.action(() => {})) });
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});
await run("r_action_stack", async () => {
  const p = await load(ASTACK);
  const press = async (n: string) => { p.value(n)(); await p.settle(); };
  await press("addOne"); await press("addOne"); await press("addOne");
  const up = { count: p.value("count"), undos: p.value("undos").length };
  await press("undo"); await press("undo");
  const down = { count: p.value("count"), undos: p.value("undos").length };
  ok("r_undo_stack_pops_and_runs_the_top", up.count === 3 && up.undos === 3 && down.count === 1 && down.undos === 1, JSON.stringify({ up, down }));
  // calling the stored action inside the update callback, as the checker also accepts
  p.define("export const undoInside = (undos: Ref<readonly Action<[]>[]>) => action(() => undos.update((u) => { const t = u[u.length - 1]; if (t) t(); return u.slice(0, -1); }));");
  await p.settle();
  let threw = "";
  try { p.value("undoInside")(); await p.settle(); } catch (e) { threw = String((e as Error).message); }
  report("stack: an action called inside undos.update's callback", { threw, count: p.value("count"), undos: p.value("undos").length, errors: p.errs.slice(-2) });
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});
{
  // (e) a ref holding an action given to a compile island
  const src = AREF.replace(/export const view[\s\S]*$/, "") + "\nexport const label = (current: Action<[]>) => 1;\nexport const viaInput = (compile: Compile) => compile({ inputs: [\"current\"], refs: [], outputs: [\"label\"] });\nexport const viaRef = (compile: Compile) => compile({ inputs: [], refs: [\"current\"], outputs: [\"label\"] });\n";
  const r = checkSources({ cells: src, tsx: true });
  report("e compile with a ref holding an action", r.cells.filter((c) => c.name.startsWith("via")).map((c) => `${c.name} ${c.status} ${c.errors.map((e) => `[${e.rule}] ${e.msg}`).join("; ")}`));
}

const val = (h: object) => P.refValues(h).next().value;

await run("c1_throwing_action_commits_nothing", async () => {
  const a = P.materialize(P.ref(100), "a") as any, b = P.materialize(P.ref(0), "b") as any, x = P.materialize(P.ref(0), "x") as any;
  P.action(() => x.set(7))();
  const transfer = P.action(() => { a.update((v: number) => v - 10); throw new Error("midway"); });
  let threw = false;
  try { transfer(); } catch (e) { threw = (e as Error).message === "midway"; }
  ok("c1_rethrows", threw);
  await flushed();
  ok("c1_writes_before_throw_discarded", val(a) === 100 && val(b) === 0, `a ${val(a)} b ${val(b)}`);
  ok("c1_earlier_action_in_same_tick_kept", val(x) === 7, `x ${val(x)}`);
});

await run("c1_nested_action_caught", async () => {
  const a = P.materialize(P.ref(0), "a") as any, b = P.materialize(P.ref(0), "b") as any, c = P.materialize(P.ref(0), "c") as any;
  const inner = P.action(() => { b.set(2); throw new Error("inner"); });
  P.action(() => { a.set(1); try { inner(); } catch {} c.set(3); })();
  await flushed();
  ok("c1_nested_writes_discarded_outer_kept", val(a) === 1 && val(b) === 0 && val(c) === 3, `a ${val(a)} b ${val(b)} c ${val(c)}`);
  const d = P.materialize(P.ref(0), "d") as any;
  const ok2 = P.action(() => d.set(5));
  try { P.action(() => { ok2(); throw new Error("outer"); })(); } catch {}
  await flushed();
  ok("c1_outer_throw_discards_nested_success", val(d) === 0, `d ${val(d)}`);
});

await run("c2_flush_is_all_or_nothing", async () => {
  errors.length = 0; uncaught.length = 0;
  const c = P.materialize(P.ref(1), "c") as any, d = P.materialize(P.ref(1), "d") as any;
  const gc = P.refValues(c); gc.next();
  P.action(() => { c.update((v: number) => v + 1); d.update(() => { throw new Error("in update"); }); })();
  await flushed();
  ok("c2_no_store_changed", val(c) === 1 && val(d) === 1, `c ${val(c)} d ${val(d)}`);
  ok("c2_state_clean", P.state.queue.length === 0 && !P.state.flushScheduled);
  ok("c2_error_reported", errors.some((m) => m.includes("in update")) && uncaught.length === 0, `errors ${JSON.stringify(errors)} uncaught ${uncaught.length}`);
  const pending = gc.next().value as Promise<unknown>;
  ok("c2_no_waiter_woken", pending instanceof Promise);
  P.action(() => { c.update((v: number) => v + 1); c.update((v: number) => v * 10); })();
  const woke = await Promise.race([pending, tick(200).then(() => "timeout")]);
  ok("c2_later_flush_chains_and_wakes", woke === 20 && val(c) === 20, `woke ${woke} c ${val(c)}`);
});

const defFor = (id: string) => (0, eval)(`(function (ss, invalidation) { return ss.cell(() => ({ id: "${id}" }), [], {kind: "cell", name: "e", memo: true, id: "${id}", invalidation: null}); })`);

await run("c3_forget_matches_compiled_definitions", async () => {
  const [v] = T.compileCell("export const fz = (n: number) => n + 1;", true);
  const fn = (0, eval)(`(${v.definition})`);
  fn(ss, 1);
  ok("c3_evals_counts_compiled_definition", ss.evals(fn) === 1, `evals ${ss.evals(fn)}`);
  ss.forget(fn);
  ok("c3_forget_drops_run_count", ss.evals(fn) === 0, `evals ${ss.evals(fn)}`);
});

await run("c3_200_edits_keep_memo_size", async () => {
  const sizes: number[] = [];
  let prev: any = null;
  for (let i = 0; i < 200; i++) {
    const def = defFor(`e${i}`);
    def(ss, null);
    if (prev) ss.forget(prev);
    prev = def;
    sizes.push(ss.memoSize());
  }
  ok("c3_memo_size_constant", sizes.every((s) => s === sizes[1]), `sizes ${sizes.slice(0, 3)}..${sizes.slice(-3)}`);
  ok("c3_memo_dropped_after_forget", (ss.forget(prev), ss.memoSize() === sizes[0] - 1), `size ${ss.memoSize()}`);
});

await run("c3_island_cache_bounded", async () => {
  let i = 0;
  const c = ss.compiler(() => `export const x = () => 1;\nexport const y = (x: number) => x + ${i};\nexport const go = (compile: Compile) => compile({ inputs: ["x"], refs: [], outputs: ["y"] });\n`);
  const jobs: any[] = [];
  const pool = { size: 1, run: async (job: any) => { jobs.push(job); return job; } };
  const spec = { inputs: ["x"], refs: [], outputs: ["y"], options: { runtime: pool } } as any;
  for (i = 0; i < 200; i++) await c.for("go", {})(spec)({ x: 1 });
  ok("c3_island_cache_size_bounded", c.islands() <= 64, `size ${c.islands()}`);
  const jsOf = new Map<string, string>();
  for (const j of jobs) { if (jsOf.has(j.key) && jsOf.get(j.key) !== j.js) { jsOf.set(j.key, "CONFLICT"); break; } jsOf.set(j.key, j.js); }
  ok("c3_keys_never_reused_for_other_text", ![...jsOf.values()].includes("CONFLICT") && jsOf.size === 200, `distinct ${jsOf.size}`);
  i = 0;
  const again: any = await c.for("go", {})(spec)({ x: 1 });
  ok("c3_evicted_island_gets_fresh_key", again.js === "const y = (x) => x + 0;" && !jsOf.has(again.key), `key ${again.key}`);
  const here: any = await c.for("go", {})({ inputs: ["x"], refs: [], outputs: ["y"] } as any)({ x: 41 });
  ok("c3_evicted_island_runs_correctly", here.y === 41, JSON.stringify(here));
  for (i = 199; i >= 190; i--) await c.for("go", {})(spec)({ x: 1 });
  const keyOf = (n: number) => jobs.filter((j) => j.js === `const y = (x) => x + ${n};`).map((j) => j.key);
  ok("c3_recent_island_keeps_key", new Set(keyOf(199)).size === 1, JSON.stringify(keyOf(199)));
});

console.error = realError;
if (uncaught.length) ok("no_uncaught_exceptions", false, String(uncaught[0]));
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
