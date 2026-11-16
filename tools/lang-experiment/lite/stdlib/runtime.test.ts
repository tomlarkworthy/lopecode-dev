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
// outside: cells in another language, defined first as plain variables (name -> [inputs, definition])
async function load(src: string, opts: { unchecked?: boolean; outside?: Record<string, [string[], (...a: any[]) => unknown]> } = {}) {
  const outsideList = Object.keys(opts.outside ?? {}).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!opts.outside?.[`viewof ${n}`] }));
  const checked = checkSources({ cells: src, tsx: true, outside: outsideList });
  const bad = checked.cells.filter((c) => c.status !== "ok");
  if (bad.length && !opts.unchecked) throw new Error(`not ok: ${bad.map((c) => `${c.name} ${c.status} ${JSON.stringify(c.errors)}`).join("; ")}`);
  const runtime = new Runtime();
  const m = runtime.module();
  m.define("ss", [], () => ss);
  for (const [n, [ins, f]] of Object.entries(opts.outside ?? {})) m.define(n, ins, f);
  const vars = new Map<string, any>();
  const values = new Map<string, unknown>();
  const errs: string[] = [];
  // a cell defined later is checked with the module as it then is, as the editor checks an edit
  const texts = T.splitCells(src, true);
  const define = (text: string) => {
    const name = ss.declaredName(text);
    const at = texts.findIndex((t) => ss.declaredName(t) === name);
    if (at < 0) texts.push(text); else if (texts[at] !== text) texts[at] = text;
    // unchecked: compiled as if the checker had accepted every cell, to show what a rule prevents
    const ctx = T.contextFromCheck(ss.checkCells(texts, true, outsideList).result);
    const now = opts.unchecked ? { ...ctx, accepted: new Set(texts.map((t) => ss.declaredName(t)!)), why: null } : ctx;
    for (const d of T.compileCell(text, true, now, name)) {
      const v = vars.get(d.name) ?? m.variable({ fulfilled: (x: unknown) => values.set(d.name, x), rejected: (e: unknown) => errs.push(`${d.name}: ${(e as Error)?.message ?? e}`) });
      vars.set(d.name, v);
      v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    }
  };
  for (const t of [...texts]) define(t);
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
const seen = (): RefCell<S> => ref<S>({ count: 0, last: 0, gaps: 0, sum: 0 });
const running = (): RefCell<boolean> => ref(true);
const nums = function* (running: boolean) {
  if (!running) return;
  for (let i = 1; i <= 1000; i++) yield i;
};
const weight = () => (v: number) => v;
const record = (seen: Ref<S>, weight: (v: number) => number) =>
  action((v: number) => seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (v === s.last + 1 ? 0 : 1), sum: s.sum + weight(v) })));
const onNum = (nums: Events<number>, record: Action<[number]>) => on(nums, record);
const toggle = (running: Ref<boolean>) => action(() => running.update((r) => !r));`;

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
  p.define("const weight = () => (v: number) => v * 1;");
  await frameUntil(() => p.value("seen").count >= 300);
  p.define("const weight = () => (v: number) => 1 * v;");
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
  p.define("const onNum = (nums: Events<number>, record: Action<[number]>) => /* again */ on(nums, record);");
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
  p.define("const inc = (count: Ref<number>) => action(() => count.update((c) => c + 10));");
  await p.settle();
  const c0 = p.value("count"); await press("current");
  report("a1 edit inc (the ref's initial value) after dec was stored", { refRecreated: p.value("current") === p.value("inc"), countChange: p.value("count") - c0 });
  // (a2) dec stored by an action, then dec's cell edited: the ref keeps the old function
  await press("useDec");
  const stored = p.value("current");
  p.define("const dec = (count: Ref<number>) => action(() => count.update((c) => c - 100));");
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
  p.define("const undoInside = (undos: Ref<readonly Action<[]>[]>) => action(() => undos.update((u) => { const t = u[u.length - 1]; if (t) t(); return u.slice(0, -1); }));");
  await p.settle();
  let threw = "";
  try { p.value("undoInside")(); await p.settle(); } catch (e) { threw = String((e as Error).message); }
  report("stack: an action called inside undos.update's callback", { threw, count: p.value("count"), undos: p.value("undos").length, errors: p.errs.slice(-2) });
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});
{
  // (e) a ref holding an action given to a compile island
  const src = AREF.replace(/const view[\s\S]*$/, "") + "\nexport const label = (current: Action<[]>) => 1;\nexport const viaInput = (compile: Compile) => compile({ inputs: [\"current\"], refs: [], outputs: [\"label\"] });\nexport const viaRef = (compile: Compile) => compile({ inputs: [], refs: [\"current\"], outputs: [\"label\"] });\n";
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

// a write is applied when it is made, so an update that throws throws out of the call; returns the message
const thrown = (f: () => void) => { try { f(); return ""; } catch (e) { return String((e as Error).message); } };
await run("c2_flush_is_all_or_nothing", async () => {
  errors.length = 0; uncaught.length = 0;
  const c = P.materialize(P.ref(1), "c") as any, d = P.materialize(P.ref(1), "d") as any;
  const gc = P.refValues(c); gc.next();
  const msg = thrown(() => P.action(() => { c.update((v: number) => v + 1); d.update(() => { throw new Error("in update"); }); })());
  await flushed();
  ok("c2_no_store_changed", val(c) === 1 && val(d) === 1, `c ${val(c)} d ${val(d)}`);
  ok("c2_state_clean", P.state.queue.length === 0 && P.state.overlay.size === 0 && !P.state.flushScheduled);
  ok("c2_error_thrown_at_the_call", msg === "in update" && uncaught.length === 0, `thrown ${JSON.stringify(msg)} uncaught ${uncaught.length}`);
  const pending = gc.next().value as Promise<unknown>;
  ok("c2_no_waiter_woken", pending instanceof Promise);
  P.action(() => { c.update((v: number) => v + 1); c.update((v: number) => v * 10); })();
  const woke = await Promise.race([pending, tick(200).then(() => "timeout")]);
  ok("c2_later_flush_chains_and_wakes", woke === 20 && val(c) === 20, `woke ${woke} c ${val(c)}`);
});

const defFor = (id: string) => (0, eval)(`(function (ss, invalidation) { return ss.cell(() => ({ id: "${id}" }), [], {kind: "cell", name: "e", memo: true, id: "${id}", invalidation: null}); })`);

await run("c3_forget_matches_compiled_definitions", async () => {
  const [v] = T.compileCell("const fz = (n: number) => n + 1;", true);
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
  const c = ss.compiler(() => `const x = () => 1;\nexport const y = (x: number) => x + ${i};\nexport const go = (compile: Compile) => compile({ inputs: ["x"], refs: [], outputs: ["y"] });\n`);
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

// compile in a module where an unrelated cell does not parse: the island of ok cells still runs, and
// one that takes the unparsable cell is refused
await run("c4_compile_with_an_unparsable_cell_elsewhere", async () => {
  const texts = ["const x = () => 1;", "const y = (x: number) => x + 1;", "const bad = (x: number) => x +;", "const z = (bad: number) => bad;", "const go = (compile: Compile) => compile({ inputs: [\"x\"], refs: [], outputs: [\"y\"] });"];
  const c = ss.compiler(() => ss.joinCells(texts));
  const r: any = await c.for("go", {})({ inputs: ["x"], refs: [], outputs: ["y"] } as any)({ x: 41 });
  ok("c4_island_of_ok_cells_runs", r.y === 42, JSON.stringify(r));
  let refused = "";
  try { c.for("go", {})({ inputs: ["bad"], refs: [], outputs: ["z"] } as any); } catch (e) { refused = String((e as Error).message); }
  ok("c4_island_with_the_unparsable_cell_refused", /not ok by the checker/.test(refused), refused);
});

// flush groups: each top-level action call applies or is dropped on its own, in call order
const refOf = (v: unknown, name: string) => P.materialize(P.ref(v), name) as any;
const named = (name: string, f: () => void) => { const a = P.action(f); P.actionNames.set(a, name); return a; };
await run("g1_a_throwing_group_keeps_an_earlier_groups_writes", async () => {
  errors.length = 0;
  const x = refOf(0, "x"), y = refOf(5, "y");
  named("A", () => x.set(1))();
  const msg = thrown(() => named("B", () => y.update(() => { throw new Error("B broke"); }))());
  await flushed();
  ok("g1_x_set_by_A_lands", val(x) === 1, `x ${val(x)}`);
  ok("g1_y_unchanged", val(y) === 5, `y ${val(y)}`);
  ok("g1_B_throws_at_its_call", msg === "B broke" && !errors.some((m) => m.includes("B broke")), `thrown ${JSON.stringify(msg)} errors ${JSON.stringify(errors)}`);
});
await run("g2_groups_either_side_of_a_throw_both_apply", async () => {
  const x = refOf(0, "x");
  const g = P.refValues(x); g.next();
  const commits = P.state.commits;
  named("A", () => x.update((v: number) => v + 1))();
  thrown(() => named("B", () => x.update(() => { throw new Error("B broke"); }))());
  named("C", () => x.update((v: number) => v + 10))();
  await flushed();
  ok("g2_x_is_plus_11", val(x) === 11, `x ${val(x)}`);
  const seen = g.next().value, after = g.next().value;
  ok("g2_one_commit_one_version_bump", P.state.commits === commits + 1 && seen === 11 && after instanceof Promise, `commits +${P.state.commits - commits}, seen ${seen}`);
});
await run("g3_a_group_is_dropped_whole", async () => {
  const z = refOf(0, "z"), p = refOf(0, "p"), q = refOf(0, "q");
  named("A", () => z.set(9))();
  thrown(() => named("B", () => { p.set(3); q.update(() => { throw new Error("second write broke"); }); })());
  await flushed();
  ok("g3_neither_of_Bs_writes_lands", val(p) === 0 && val(q) === 0, `p ${val(p)} q ${val(q)}`);
  ok("g3_As_write_lands", val(z) === 9, `z ${val(z)}`);
});
await run("g4_groups_apply_in_call_order", async () => {
  const x = refOf(1, "x");
  for (const k of [1, 2, 3]) named(`k${k}`, () => x.update((v: number) => v * 2 + k))();
  await flushed();
  ok("g4_value_of_applying_in_call_order", val(x) === ((1 * 2 + 1) * 2 + 2) * 2 + 3, `x ${val(x)}`);
});
await run("g5_nested_calls_belong_to_the_outermost_group", async () => {
  errors.length = 0;
  const x = refOf(0, "x"), y = refOf(0, "y"), w = refOf(0, "w");
  const inner = named("inner", () => x.set(100));
  named("before", () => w.set(1))();
  const msg = thrown(() => named("outer", () => { inner(); y.update(() => { throw new Error("outer broke"); }); })());
  await flushed();
  ok("g5_nested_write_dropped_with_its_outer_call", val(x) === 0 && val(y) === 0 && val(w) === 1, `x ${val(x)} y ${val(y)} w ${val(w)}`);
  ok("g5_outer_call_throws", msg === "outer broke", JSON.stringify(msg));
});
// States what a cell sees when one action writes two refs; it asserts only that the observation was made.
await run("g6_observed_one_action_writing_two_refs", async () => {
  const L = await load(`const a = (): RefCell<number> => ref(0);
export const b = (): RefCell<number> => ref(0);
export const pair = (a: number, b: number) => a * 100 + b;
export const both = (a: Ref<number>, b: Ref<number>) => action(() => { a.set(1); b.set(2); });`);
  const seen: number[] = [];
  L.m.variable({ fulfilled: (v: number) => seen.push(v) }).define(["pair"], (p: number) => p);
  await L.settle();
  const before = L.evals("pair");
  L.value("both")();
  await L.settle();
  const runs = L.evals("pair") - before;
  console.log(`  g6: one action writes a and b; pair saw ${JSON.stringify(seen)}, ran ${runs} more time(s)`);
  ok("g6_observation_made", seen.length > 0 && seen[seen.length - 1] === 102, JSON.stringify(seen));
});

// The broken state (2026-11-15): every edit is stored; a cell the checker does not accept compiles to a
// definition that raises its messages, and a cell that takes it fails through dataflow. editable() runs a
// module as the editor does: each edit checks the whole module again, and only the variables whose
// compiled definition changed are defined again.
async function editable(texts: string[], o: { reverse?: boolean; order?: boolean } = {}) {
  const runtime = new Runtime();
  const m = runtime.module();
  m.define("ss", [], () => ss);
  const vars = new Map<string, any>(), defs = new Map<string, string>(), values = new Map<string, unknown>(), raised = new Map<string, string>();
  let cells = [...texts];
  const apply = () => {
    const ctx = T.contextFromCheck(ss.checkCells(cells).result);
    const seen = new Set<string>();
    for (const t of o.reverse ? [...cells].reverse() : cells) for (const d of T.compileCell(t, true, ctx, ss.declaredName(t))) {
      seen.add(d.name);
      if (defs.get(d.name) === d.definition) continue;
      defs.set(d.name, d.definition);
      const v = vars.get(d.name) ?? m.variable({ fulfilled: (x: unknown) => { values.set(d.name, x); raised.delete(d.name); }, rejected: (e: unknown) => { values.delete(d.name); raised.set(d.name, String((e as Error)?.message ?? e)); } });
      vars.set(d.name, v);
      v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    }
    for (const [n, v] of vars) if (!seen.has(n)) { v.delete(); vars.delete(n); defs.delete(n); }
  };
  const settle = async () => { for (let i = 0; i < 5; i++) { await tick(3); await flushed(); } };
  // the host's answer to where a listener's cell is: this module, at its cell's place in the source
  if (o.order) ss.setListenerOrder((values) => values.map((x) => {
    for (const [n, v] of vars) if (v._value === x) { const at = cells.findIndex((t) => ss.declaredName(t) === T.handleName(n) || ss.declaredName(t) === n); return at < 0 ? null : ["M", at] as const; }
    return null;
  }));
  apply();
  await settle();
  const edit = async (name: string, text: string) => { cells = cells.map((t) => (ss.declaredName(t) === name ? text : t)); apply(); await settle(); };
  const states = () => Object.fromEntries([...ss.cellStates(ss.checkCells(cells).result)].map(([n, x]: any) => [n, x.state === "blocked" ? `blocked by ${x.blockedBy.join(",")}` : x.state]));
  return { m, vars, values, raised, edit, settle, states, value: (n: string) => values.get(n) as any, evals: (n: string) => ss.evals(vars.get(n)._definition), text: (n: string) => T.decompileVariable(defs.get(n)!) };
}
const FIRST = [
  "const width = () => 640;",
  "const height = () => 400;",
  "const area = (width: number, height: number) => width * height;",
  "const aspect = (width, height) => (width / height).toFixed(2);",
  "const half = (area: number) => area / 2;",
  "const count = (): RefCell<number> => ref(0);",
  "const increment = (count: Ref<number>) => action(() => count.update((n) => n + 1));",
  "const label = (count: number) => `pressed ${count}`;",
  "const tall = (height: number) => height * 2;",
];
await run("b1_breaking_edit_is_stored_and_repaired", async () => {
  const L = await editable(FIRST);
  L.value("increment")();
  await L.settle();
  const runs0 = { height: L.evals("height"), tall: L.evals("tall"), label: L.evals("label"), count: L.evals("count") };
  await L.edit("width", 'const width = () => "800";');
  const st = L.states();
  ok("b1_states", st.width === "ok" && st.area === "rejected" && st.aspect === "rejected" && st.half === "blocked by area" && st.tall === "ok", JSON.stringify(st));
  ok("b1_rejected_raise_the_checker_message", /^area does not check: \[inject-type\]/.test(L.raised.get("area") ?? "") && /^aspect does not check: \[type\]/.test(L.raised.get("aspect") ?? ""), JSON.stringify([...L.raised]));
  ok("b1_blocked_fails_through_dataflow", /area does not check/.test(L.raised.get("half") ?? ""), L.raised.get("half"));
  ok("b1_unrelated_ref_keeps_its_count", L.value("count") === 1 && L.value("label") === "pressed 1", `${L.value("count")} ${L.value("label")}`);
  // the two-cell change: area and aspect accept a string
  await L.edit("area", "const area = (width: string, height: number) => Number(width) * height;");
  await L.edit("aspect", "const aspect = (width: string, height: number) => (Number(width) / height).toFixed(2);");
  const st2 = L.states();
  ok("b1_two_cell_change_repairs", Object.values(st2).every((x) => x === "ok") && L.value("area") === 320000 && L.value("half") === 160000 && L.value("aspect") === "2.00", JSON.stringify(st2));
  L.value("increment")();
  await L.settle();
  const runs1 = { height: L.evals("height"), tall: L.evals("tall"), label: L.evals("label") - 1, count: L.evals("count") };
  ok("b1_outside_the_broken_part_nothing_ran_again", JSON.stringify(runs0) === JSON.stringify(runs1) && L.value("count") === 2, `${JSON.stringify(runs0)} ${JSON.stringify(runs1)} count ${L.value("count")}`);
});
await run("b2_rejected_body_never_runs", async () => {
  (globalThis as any).__ssSneak = 0;
  const L = await editable([...FIRST, "const sneak = (width: number) => { (globalThis as any).__ssSneak++; return width; };"]);
  ok("b2_rejected_at_load", L.states().sneak === "rejected" && /^sneak does not check:/.test(L.raised.get("sneak") ?? "") && (globalThis as any).__ssSneak === 0, `${L.raised.get("sneak")} runs ${(globalThis as any).__ssSneak}`);
  await L.edit("sneak", "const sneak = (width: number, height: number) => { (globalThis as any).__ssSneak++; return width + height; };");
  ok("b2_rejected_after_an_edit", /^sneak does not check:/.test(L.raised.get("sneak") ?? "") && (globalThis as any).__ssSneak === 0, `runs ${(globalThis as any).__ssSneak}`);
  ok("b2_typed_source_kept", L.text("sneak") === "const sneak = (width: number, height: number) => { (globalThis as any).__ssSneak++; return width + height; };", L.text("sneak") ?? "null");
});
await run("b3_unparsable_edit_is_stored_and_repaired", async () => {
  const L = await editable(FIRST);
  const BAD = "const tall = (height: number) => height *;";
  await L.edit("tall", BAD);
  ok("b3_stored_and_raises_the_parse_message", L.states().tall === "rejected" && /^tall does not check: \[parse\]/.test(L.raised.get("tall") ?? "") && L.text("tall") === BAD, `${L.raised.get("tall")} ${L.text("tall")}`);
  ok("b3_others_run", L.value("area") === 256000 && L.value("label") === "pressed 0", `${L.value("area")} ${L.value("label")}`);
  await L.edit("tall", "const tall = (height: number) => height * 3;");
  ok("b3_repaired", L.value("tall") === 1200 && L.states().tall === "ok", String(L.value("tall")));
});
await run("b4_listener_in_the_broken_part_detaches_and_reattaches", async () => {
  const L = await editable([
    "const total = (): RefCell<number> => ref(0);",
    "const by = () => 1;",
    "const nums = function* () { for (let i = 0; i < 1000000; i++) yield i; };",
    "const add = (total: Ref<number>, by: number) => action((v: number) => total.update((t) => t + by));",
    "const onNum = (nums: Events<number>, add: Action<[number]>) => on(nums, add);",
  ]);
  const r0 = ss.running();
  await frameUntil(() => L.value("total") >= 5);
  await L.edit("by", 'const by = () => "1";');
  const r1 = ss.running(), t1 = L.value("total");
  for (let i = 0; i < 20; i++) frame();
  await L.settle();
  const t2 = L.value("total");
  ok("b4_broken_listener_detached", L.states().add === "rejected" && L.states().onNum === "blocked by add" && r1 === r0 - 1 && t2 === t1, `${JSON.stringify(L.states())} running ${r0} -> ${r1}, total ${t1} -> ${t2}`);
  await L.edit("by", "const by = () => 2;");
  const r2 = ss.running();
  await frameUntil(() => L.value("total") >= t2 + 10);
  ok("b4_repaired_listener_reattached_once", r2 === r0 && L.value("total") >= t2 + 10 && (L.value("total") - t2) % 2 === 0, `running ${r2}, total ${t2} -> ${L.value("total")}`);
  L.vars.get("onNum").delete();
  await L.settle();
});

// Reported: what a ref in the broken part keeps. kept takes no input; seeded's initial value reads
// base; own is itself made rejected and then repaired.
await run("b5_state_lost_in_the_broken_part", async () => {
  const L = await editable([
    "const base = () => 5;",
    "const kept = (): RefCell<number> => ref(0);",
    "const seeded = (base: number): RefCell<number> => ref(base);",
    "const own = (): RefCell<number> => ref(0);",
    "const bump = (kept: Ref<number>, seeded: Ref<number>, own: Ref<number>) => action(() => { kept.update((n) => n + 1); seeded.update((n) => n + 1); own.update((n) => n + 1); });",
    "const sq = (base: number) => base * base;",
    "const fromSq = (sq: number): RefCell<number> => ref(sq);",
    "const bumpSq = (fromSq: Ref<number>) => action(() => fromSq.update((n) => n + 1));",
  ]);
  L.value("bumpSq")();
  L.value("bump")(); L.value("bump")();
  await L.settle();
  const before = { kept: L.value("kept"), seeded: L.value("seeded"), own: L.value("own"), fromSq: L.value("fromSq") };
  await L.edit("base", 'const base = () => "5";');
  await L.edit("own", 'const own = (): RefCell<number> => ref("0");');
  const broken = L.states();
  await L.edit("base", "const base = () => 5;");
  await L.edit("own", "const own = (): RefCell<number> => ref(0);");
  const after = { kept: L.value("kept"), seeded: L.value("seeded"), own: L.value("own"), fromSq: L.value("fromSq") };
  console.log(`  b5: before ${JSON.stringify(before)}; broken ${JSON.stringify(broken)}; repaired ${JSON.stringify(after)}`);
  ok("b5_untouched_ref_kept", after.kept === before.kept, JSON.stringify({ before, after }));
  // a ref blocked by its input, with its own text unchanged, keeps its state when the input comes back
  // with the value it had; a rejected ref, whose definition was replaced, starts again
  ok("b5_blocked_ref_kept_when_its_input_returns_the_same_value", after.fromSq === before.fromSq, JSON.stringify({ before, after }));
  ok("b5_rejected_refs_restart", after.own === 0 && after.seeded === 5, JSON.stringify(after));
  // the same ref given a different input value starts again from it
  await L.edit("base", "const base = () => 6;");
  ok("b5_blocked_ref_restarts_on_a_new_input_value", L.value("fromSq") === 36, String(L.value("fromSq")));
});
// Two listeners on one events cell run, for each value, in their cells' source order: on a fresh
// load, after the first is edited and attaches again (now after the second), and when the module's
// variables are defined in reverse.
const ORDER = [
  "const log = (): RefCell<readonly string[]> => ref<readonly string[]>([]);",
  "const beats = function* () { let i = 0; while (true) yield i++; };",
  "const addFirst = (log: Ref<readonly string[]>) => action((v: number) => log.update((l) => [...l, \"first\"]));",
  "const addSecond = (log: Ref<readonly string[]>) => action((v: number) => log.update((l) => [...l, \"second\"]));",
  "const first = (beats: Events<number>, addFirst: Action<[number]>) => on(beats, addFirst);",
  "const second = (beats: Events<number>, addSecond: Action<[number]>) => on(beats, addSecond);",
];
const pairs = (l: readonly string[]) => { const out: string[] = []; for (let i = 0; i + 1 < l.length; i += 2) out.push(`${l[i]},${l[i + 1]}`); return [...new Set(out)]; };
await run("o1_listener_order_is_source_order", async () => {
  const L = await editable(ORDER, { order: true });
  await frameUntil(() => (L.value("log")?.length ?? 0) >= 6);
  const fresh = pairs(L.value("log"));
  ok("o1_fresh_load", fresh.length === 1 && fresh[0] === "first,second", JSON.stringify(L.value("log").slice(0, 8)));
  // first edited: its new listener attaches after second's, and still runs first
  await L.edit("first", "const first = (addFirst: Action<[number]>, beats: Events<number>) => on(beats, addFirst);");
  const n0 = L.value("log").length + (L.value("log").length % 2);
  await frameUntil(() => L.value("log").length >= n0 + 6);
  const edited = pairs(L.value("log").slice(n0));
  ok("o1_after_first_reattaches", edited.length === 1 && edited[0] === "first,second", JSON.stringify(L.value("log").slice(n0, n0 + 8)));
  for (const v of L.vars.values()) { ss.release(v._value); v.delete(); }
  await L.settle();
  const R = await editable(ORDER, { order: true, reverse: true });
  await frameUntil(() => (R.value("log")?.length ?? 0) >= 6);
  const rev = pairs(R.value("log"));
  ok("o1_defined_in_reverse", rev.length === 1 && rev[0] === "first,second", JSON.stringify(R.value("log").slice(0, 8)));
  // without a host to place them, the order is attach order: defined in reverse, second runs first
  ss.setListenerOrder(null);
  for (const v of R.vars.values()) { ss.release(v._value); v.delete(); }
  await R.settle();
  const U = await editable(ORDER, { reverse: true });
  await frameUntil(() => (U.value("log")?.length ?? 0) >= 6);
  const unplacedReverse = pairs(U.value("log"));
  await U.edit("first", "const first = (addFirst: Action<[number]>, beats: Events<number>) => on(beats, addFirst);");
  const m0 = U.value("log").length + (U.value("log").length % 2);
  await frameUntil(() => U.value("log").length >= m0 + 6);
  console.log(`  o1: with no host order (attach order): defined in reverse ${JSON.stringify(unplacedReverse)}; after first is edited ${JSON.stringify(pairs(U.value("log").slice(m0)))}`);
  for (const v of U.vars.values()) { ss.release(v._value); v.delete(); }
  await U.settle();
});
// Reported, not asserted: listeners on two different events cells, one sync and one async generator.
// The checker takes only a sync generator as Events, so this is the runtime's own path (cells.ts).
await run("o2_two_events_cells_interleave", async () => {
  const got: string[] = [];
  const hs = C.events(undefined, "syncs", [], () => (function* () { for (let i = 0; i < 4; i++) yield i; })() as any, null);
  const ha = C.events(undefined, "asyncs", [], () => (async function* () { for (let i = 0; i < 4; i++) yield i; })() as any, null);
  const ls = C.listen(C.on(hs, P.action((v: number) => void got.push(`s${v}`))), "onS", null);
  const la = C.listen(C.on(ha, P.action((v: number) => void got.push(`a${v}`))), "onA", null);
  for (let i = 0; i < 6; i++) { frame(); await tick(1); }
  await until(() => got.length >= 8, 200);
  console.log(`  o2: a sync and an async events cell, frames run by hand with a macrotask between: ${JSON.stringify(got)}`);
  ok("o2_both_delivered", got.length === 8, JSON.stringify(got));
  C.release(ls); C.release(la); C.release(hs); C.release(ha);
});


// The stored state is a function of the ordered list of action calls and their arguments. One fixed log
// of calls (and frames, each delivering one events value to two listeners) is run under several
// schedules: a commit after every call, one commit at the end, commits at seeded random points, and
// cells re-run (settled) after every commit or not at all until the end. Every schedule must store the
// same values. The same log against the `copy` shape the action-capture rule rejects, compiled with the
// check bypassed, shows the property failing.
const LOGGED = `const a = (): RefCell<number> => ref(1);
const b = (): RefCell<number> => ref(0);
const c = (): RefCell<number> => ref(0);
const addA = (a: Ref<number>) => action((n: number) => a.update((x) => (x * 3 + n) % 1009));
const copyAB = (a: Ref<number>, b: Ref<number>) => action(() => b.set((read(a) + read(b) * 7) % 10007));
const risky = (a: Ref<number>, c: Ref<number>) =>
  action((n: number) => {
    c.update((x) => x + n);
    if ((read(a) + n) % 5 === 0) throw new Error("risky");
  });
const both = (addA: Action<[number]>, copyAB: Action<[]>, c: Ref<number>) =>
  action((n: number) => {
    addA(n);
    copyAB();
    c.set((read(c) * 31 + n) % 10007);
  });
const ticks = function* () {
  for (let i = 1; i <= 100000; i++) yield i;
};
const tickC = (a: Ref<number>, c: Ref<number>) => action((t: number) => c.set((read(c) + read(a) * t) % 10007));
const onTickA = (ticks: Events<number>, addA: Action<[number]>) => on(ticks, addA);
const onTickC = (ticks: Events<number>, tickC: Action<[number]>) => on(ticks, tickC);
const total = (a: number, b: number, c: number) => a + b + c;`;
const STALE = LOGGED.replace("const copyAB = (a: Ref<number>, b: Ref<number>) => action(() => b.set((read(a) + read(b) * 7) % 10007));",
  "const copyAB = (a: number, b: Ref<number>) => action(() => b.set((a + read(b) * 7) % 10007));");
const seeded = (seed: number) => () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
type Call = readonly ["addA" | "risky" | "both", number] | readonly ["copyAB"] | readonly ["frame"];
const CALLS: Call[] = (() => {
  const r = seeded(7), out: Call[] = [];
  for (let i = 0; i < 300; i++) {
    const k = Math.floor(r() * 5), n = Math.floor(r() * 50);
    out.push(k === 0 ? ["addA", n] : k === 1 ? ["copyAB"] : k === 2 ? ["risky", n] : k === 3 ? ["both", n] : ["frame"]);
  }
  return out;
})();
type Schedule = { name: string; commitAfter: (i: number) => boolean; settle: boolean };
const SCHEDULES: Schedule[] = [
  { name: "commit after every call, cells re-run", commitAfter: () => true, settle: true },
  { name: "commit after every call, cells not re-run", commitAfter: () => true, settle: false },
  { name: "one commit at the end", commitAfter: () => false, settle: false },
  ...[1, 2, 3].map((seed) => { const r = seeded(seed); const at = CALLS.map(() => r() < 0.15); return { name: `commits at random points (seed ${seed}), cells re-run`, commitAfter: (i: number) => at[i], settle: true }; }),
];
async function runLog(src: string, sch: Schedule, unchecked = false) {
  frames.length = 0;
  const p = await load(src, { unchecked });
  await frameUntil(() => frames.length === 1, 50); // the events cell has its first value waiting
  let threw = 0;
  const call = (c: Call) => {
    if (c[0] === "frame") { frame(); return; }
    const act = p.value(c[0]);
    try { c[0] === "copyAB" ? act() : act(c[1]); } catch { threw++; }
  };
  for (let i = 0; i < CALLS.length; i++) {
    call(CALLS[i]);
    if (!sch.commitAfter(i)) continue;
    await new Promise((r) => setTimeout(r, 0)); // the commit is a macrotask
    if (sch.settle) await p.settle();
  }
  await p.settle();
  const out = { a: p.value("a"), b: p.value("b"), c: p.value("c"), total: p.value("total"), threw, errs: p.errs.length };
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
  frames.length = 0;
  return out;
}
await run("p1_stored_state_is_a_function_of_the_call_log", async () => {
  errors.length = 0;
  const got: { name: string; r: Awaited<ReturnType<typeof runLog>> }[] = [];
  for (const sch of SCHEDULES) got.push({ name: sch.name, r: await runLog(LOGGED, sch) });
  const key = (r: any) => JSON.stringify([r.a, r.b, r.c, r.total, r.threw]);
  for (const g of got) console.log(`  p1: ${g.name}: ${key(g.r)}`);
  const frames_ = CALLS.filter((c) => c[0] === "frame").length;
  ok("p1_every_schedule_stores_the_same_values", got.every((g) => key(g.r) === key(got[0].r)), got.map((g) => key(g.r)).join(" "));
  ok("p1_the_log_exercises_throws_and_frames", got[0].r.threw > 0 && frames_ > 0, `threw ${got[0].r.threw}, frames ${frames_}`);
  ok("p1_no_runtime_errors", got.every((g) => g.r.errs === 0), JSON.stringify(got.map((g) => g.r.errs)));
});
await run("p2_the_rejected_copy_shape_breaks_it", async () => {
  const rejected = checkSources({ cells: STALE, tsx: true }).cells.find((c) => c.name === "copyAB")!;
  ok("p2_checker_rejects_copyAB", rejected.errors.some((e) => e.rule === "action-capture"), JSON.stringify(rejected.errors));
  const got: string[] = [];
  const same = await runLog(LOGGED, SCHEDULES[0], true);
  console.log(`  p2: the accepted program compiled the same way: ${JSON.stringify([same.a, same.b, same.c, same.total, same.threw])}, errors ${same.errs}`);
  const ref0 = await runLog(LOGGED, SCHEDULES[0]);
  ok("p2_the_bypass_alone_changes_nothing", same.errs === 0 && JSON.stringify(same) === JSON.stringify(ref0), `${JSON.stringify(same)} vs ${JSON.stringify(ref0)}`);
  for (const sch of [SCHEDULES[0], SCHEDULES[2]]) {
    const r = await runLog(STALE, sch, true);
    got.push(JSON.stringify([r.a, r.b, r.c, r.total, r.threw]));
    console.log(`  p2: check bypassed, ${sch.name}: ${got[got.length - 1]}`);
  }
  ok("p2_schedules_disagree_when_the_check_is_bypassed", got[0] !== got[1], got.join(" "));
});
// The checked boundary (boundary.ts): a cell in another language read by a SoundScript cell.
class FakeRange extends EventTarget {
  #v = 5;
  get value() { return this.#v; }
  set value(x: any) { this.#v = Math.min(10, Math.max(0, Math.round(Number(x)))); }
}
await run("boundary", async () => {
  let src0: any = [{ price: 1, name: "a" }, { price: 2, name: "b" }];
  const B = await load(`type Row = { price: number; name: string };
const total = (rows: Row[]) => rows.reduce((a, r) => a + r.price, 0);
const firstName = (rows: Row[]) => rows.map((r) => r.name).join(",");`, { outside: { rows: [["src"], (s: any) => s], src: [[], () => src0] } });
  ok("boundary_value_crosses", B.value("total") === 3, String(B.value("total")));
  const runs = B.evals("total");
  // the other language mutates its array in place and delivers it again: a fresh copy, so the reader sees the change
  src0[0].price = 10;
  B.m.redefine("src", [], () => src0);
  await B.settle();
  ok("boundary_copy_per_delivery", B.value("total") === 12 && B.evals("total") === runs + 1, `${B.value("total")} evals ${B.evals("total") - runs}`);
  // equal data delivered again: the same copy, so the reader's memo holds
  B.m.redefine("src", [], () => [{ price: 10, name: "a" }, { price: 2, name: "b" }]);
  await B.settle();
  ok("boundary_equal_copy_is_memoised", B.evals("total") === runs + 1, `evals ${B.evals("total") - runs}`);
  B.m.redefine("src", [], () => [{ price: 1, name: "a" }, { price: "12", name: "b" }]);
  await B.settle();
  ok("boundary_mismatch_errors_the_cell", B.errs.some((e) => e.startsWith("total: rows[1].price: expected number, found string \"12\"")), B.errs.join(" | "));
  ok("boundary_mismatch_leaves_other_cells", B.value("firstName") === "a,b", String(B.value("firstName")));
  B.m.redefine("src", [], () => [{ price: 1, name: "a" }]);
  await B.settle();
  ok("boundary_recovers", B.value("total") === 1, String(B.value("total")));
});
await run("boundary_frozen", async () => {
  const B = await load(`const probe = (o: { xs: number[] }) => o;`, { outside: { o: [[], () => ({ xs: [1], extra: () => 1 })] } });
  const pv = B.value("probe");
  ok("boundary_copy_is_deep_frozen_and_drops_undeclared", Object.isFrozen(pv) && Object.isFrozen(pv.xs) && !("extra" in pv), JSON.stringify(pv) + B.errs.join());
  const F = await load(`const n = (f: unknown) => 1;`, { outside: { f: [[], () => () => 1] } });
  ok("boundary_function_rejected_at_run_time", F.errs.some((e) => /^n: f: expected data, found a function/.test(e)), F.errs.join(" | "));
});
await run("boundary_view", async () => {
  const el = new FakeRange();
  const B = await load(`const shown = (level: number) => level;
const bump = (level: Ref<number>) => action(() => level.set(read(level) + 3));
const big = (level: Ref<number>) => action(() => level.set(99));`, { outside: { "viewof level": [[], () => el], level: [["viewof level"], async function* (v: any) { yield v.value; for (;;) yield await new Promise((r) => v.addEventListener("input", () => r(v.value), { once: true })); }] } });
  ok("boundary_view_value_crosses", B.value("shown") === 5, String(B.value("shown")));
  let inputs = 0;
  el.addEventListener("input", () => inputs++);
  B.value("bump")();
  await B.settle();
  ok("boundary_view_write_sets_the_control", el.value === 8 && inputs === 1 && B.value("shown") === 8, `${el.value} ${inputs} ${B.value("shown")}`);
  B.value("big")();
  await B.settle();
  ok("boundary_view_write_is_clamped_by_the_control", el.value === 10, String(el.value));
  const h = B.m._scope.get("viewof level")._value;
  const handle = ss.viewRef(h, { k: "num" } as any, "level");
  const readNow = () => { let v: unknown; ss.action(() => { v = ss.read(handle); })(); return v; };
  ok("boundary_view_read_is_what_the_control_holds", readNow() === 10, String(readNow()));
  el.value = 2;
  el.dispatchEvent(new Event("input"));
  await B.settle();
  ok("boundary_view_user_change_is_an_action", readNow() === 2 && B.value("shown") === 2, `${readNow()} ${B.value("shown")}`);
});
await run("boundary_view_object", async () => {
  const el = Object.assign(new EventTarget(), { value: [1, 2] as unknown });
  const B = await load(`const len = (picked: number[]) => picked.length;
const clear = (picked: Ref<number[]>) => action(() => picked.set([]));`, { outside: { "viewof picked": [[], () => el], picked: [["viewof picked"], async function* (v: any) { yield v.value; for (;;) yield await new Promise((r) => v.addEventListener("input", () => r(v.value), { once: true })); }] } });
  let inputs = 0;
  el.addEventListener("input", () => inputs++);
  el.value = [1, 2, 3];
  el.dispatchEvent(new Event("input"));
  await B.settle();
  ok("boundary_view_object_user_change_dispatches_no_echo", inputs === 1 && B.value("len") === 3, `${inputs} input events, len ${B.value("len")}`);
  B.value("clear")();
  await B.settle();
  ok("boundary_view_object_write_dispatches_once", inputs === 2 && Array.isArray(el.value) && (el.value as unknown[]).length === 0 && B.value("len") === 0, `${inputs} ${JSON.stringify(el.value)} ${B.value("len")}`);
});
console.error = realError;
if (uncaught.length) ok("no_uncaught_exceptions", false, String(uncaught[0]));
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
