// Unit tests for lite/stdlib/runtime.ts and prelude.runtime.ts: events and listeners (exactly once),
// action atomicity, flush atomicity, run-count and island-cache bounds. Run: bun lite/stdlib/runtime.test.ts
// the Runtime's frames; g6 runs them by hand
let raf = (f: () => void) => void setTimeout(f, 1);
(globalThis as any).requestAnimationFrame = (f: () => void) => raf(f);
const ss = await import("./runtime.ts");
const P = await import("../../prelude.runtime.ts");
const T = await import("../toolchain/ss-toolchain.ts");
// a handle is an Observable view: what a state cell's value variable reads is Observable's own Generators.input of it
const { input } = await import(new URL("../../../../vendor/observable-stdlib/src/generators/input.js", import.meta.url).pathname as any);

let pass = 0, fail = 0;
const uncaught: unknown[] = [];
process.on("uncaughtException", (e) => uncaught.push(e));
// a promise an action neither awaited nor returned, rejected after its call committed, reaches the host
const unhandled: unknown[] = [];
process.on("unhandledRejection", (e) => void unhandled.push(e));
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

const flushed = () => until(() => P.idle()).then(() => tick(2));

// Frames are run by hand: the events pump asks scheduler.frame for its next sync step.
const C = await import("../browser/cells.ts");
const frames: (() => void)[] = [];
C.scheduler.frame = (f) => void frames.push(f);
const frame = () => { const fs = frames.splice(0); for (const f of fs) f(); return fs.length; };

// A SoundScript module compiled by the toolchain and run in a real Observable Runtime, as the notebook
// runs it: every variable observed, the runtime cells as ss_<name> inputs, invalidation the runtime's own.
const { Runtime } = await import("@observablehq/runtime");
const { checkSources } = await import("../core.ts");
// the runtime cells compiled cells take, each as its own input (ss_state, ...), as a module importing them has them
const defineRuntime = (m: any) => { for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n], [], () => (ss as any)[n]); };
// outside: cells in another language, defined first as plain variables (name -> [inputs, definition])
async function load(src: string, opts: { unchecked?: boolean; outside?: Record<string, [string[], (...a: any[]) => unknown]> } = {}) {
  const outsideList = Object.keys(opts.outside ?? {}).filter((n) => !n.startsWith("viewof ")).map((n) => ({ name: n, view: !!opts.outside?.[`viewof ${n}`] }));
  const checked = checkSources({ cells: src, tsx: true, outside: outsideList });
  const bad = checked.cells.filter((c) => c.status !== "ok");
  if (bad.length && !opts.unchecked) throw new Error(`not ok: ${bad.map((c) => `${c.name} ${c.status} ${JSON.stringify(c.errors)}`).join("; ")}`);
  const runtime = new Runtime();
  const m = runtime.module();
  defineRuntime(m);
  m.define("Generators", [], () => ({ input }));
  for (const [n, [ins, f]] of Object.entries(opts.outside ?? {})) m.define(n, ins, f);
  const vars = new Map<string, any>();
  const values = new Map<string, unknown>();
  // computations the Runtime started, per variable: its observer's pending, called once for each
  const runs = new Map<string, number>();
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
      const v = vars.get(d.name) ?? m.variable({ pending: () => runs.set(d.name, (runs.get(d.name) ?? 0) + 1), fulfilled: (x: unknown) => values.set(d.name, x), rejected: (e: unknown) => errs.push(`${d.name}: ${(e as Error)?.message ?? e}`) });
      vars.set(d.name, v);
      v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    }
  };
  for (const t of [...texts]) define(t);
  const settle = async () => { for (let i = 0; i < 5; i++) { await tick(3); await flushed(); } };
  await settle();
  return { m, vars, values, errs, define, settle, runtime, value: (n: string) => values.get(n) as any, evals: (n: string) => runs.get(n.startsWith("viewof ") || !vars.has(`viewof ${n}`) ? n : `viewof ${n}`) ?? 0 };
}
// Frames until f() holds or n frames have run; actions flush between frames.
async function frameUntil(f: () => boolean, n = 5000) {
  for (let i = 0; i < n && !f(); i++) { frame(); if (i % 20 === 0) await flushed(); }
  await flushed();
  return f();
}

// record counts each value, and counts a gap whenever a value is not the last one plus one.
const STREAM = `type S = { readonly count: number; readonly last: number; readonly gaps: number; readonly sum: number };
const seen = (): StateCell<S> => state<S>({ count: 0, last: 0, gaps: 0, sum: 0 });
const running = (): StateCell<boolean> => state(true);
const nums = function* (running: boolean) {
  if (!running) return;
  for (let i = 1; i <= 1000; i++) yield i;
};
const weight = () => (v: number) => v;
const record = (seen: State<S>, weight: (v: number) => number) =>
  action((v: number) => seen.update((s) => ({ count: s.count + 1, last: v, gaps: s.gaps + (v === s.last + 1 ? 0 : 1), sum: s.sum + weight(v) })));
const onNum = (nums: Events<number>, record: Action<[number]>) => on(nums, record);
const toggle = (running: State<boolean>) => action(() => running.update((r) => !r));`;


await run("e1_async_generator_every_value_once", async () => {
  let n = 0, made = 0;
  const h = C.events(null, "fast", [], () => { made++; return (async function* () { for (let i = 1; i <= 1000; i++) { await null; yield i; } })() as any; }, null);
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
  // the listener runs again with each run of nums (its input), and stays one listener (e4_one_listener)
  ok("e4_events_ran_twice_kept_its_handle", p.evals("nums") - nums0 === 2 && p.value("nums") === h0, `nums +${p.evals("nums") - nums0}, onNum +${p.evals("onNum") - onNum0}, same handle ${p.value("nums") === h0}`);
  ok("e4_one_listener", ss.running() === 1, `running ${ss.running()}`);
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
  const h = C.events(null, "swept", [], () => (function* () { for (;;) yield 1; })() as any, null);
  C.listen(C.on(h, P.action(() => {})), "onSwept", null);
  ok("e7_attached", ss.running() === 1);
  ss.sweep(new Set()); ss.sweep(new Set());
  ok("e7_sweep_detaches_unheld", ss.running() === 0, `running ${ss.running()}`);
});

// Actions held in state cells (Tom, 2026-11-15: wanted). These report what happens; they assert only that
// each case ran, and print what it observed.
const AREF = await Bun.file(new URL("../../fixtures/lite-game/accept-action-in-state/cells.tsx", import.meta.url).pathname).text();
const ASTACK = await Bun.file(new URL("../../fixtures/lite-game/accept-action-stack/cells.tsx", import.meta.url).pathname).text();
const report = (name: string, what: unknown) => console.log(`  report ${name}: ${typeof what === "string" ? what : JSON.stringify(what)}`);
await run("r_action_in_state", async () => {
  const p = await load(AREF);
  const press = async (n: string) => { p.value(n)(); await p.settle(); };
  await press("current");
  const afterApply = p.value("count");
  await press("useDec"); await press("current");
  ok("r_state_runs_the_action_it_holds", afterApply === 1 && p.value("count") === 0, `count ${afterApply} then ${p.value("count")}`);
  // (a1) the state cell's initial value comes from inc, a dependency: editing inc re-creates the state cell
  await press("useDec");
  p.define("const inc = (count: State<number>) => action(() => count.update((c) => c + 10));");
  await p.settle();
  const c0 = p.value("count"); await press("current");
  report("a1 edit inc (the state cell's initial value) after dec was stored", { refRecreated: p.value("current") === p.value("inc"), countChange: p.value("count") - c0 });
  // (a2) dec stored by an action, then dec's cell edited: the state cell keeps the old function
  await press("useDec");
  const stored = p.value("current");
  p.define("const dec = (count: State<number>) => action(() => count.update((c) => c - 100));");
  await p.settle();
  const c1 = p.value("count"); await press("current");
  report("a2 edit dec after it was stored by useDec", { refHoldsOld: p.value("current") === stored, refHoldsNew: p.value("current") === p.value("dec"), countChange: p.value("count") - c1 });
  // (b) the stored action's cell deleted
  const dv = p.vars.get("dec"); dv.delete(); p.vars.delete("dec");
  await p.settle();
  const c2 = p.value("count");
  let threw = "";
  try { p.value("current")(); await p.settle(); } catch (e) { threw = String((e as Error).message); }
  report("b delete dec's cell while the state cell holds it", { stillCallable: !threw, threw, countChange: p.value("count") - c2, useDecError: p.errs.filter((e) => e.startsWith("useDec")).slice(-1)[0] ?? null });
  // (c) equals on two state cells holding the same action, and on two different actions
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
  p.define("const undoInside = (undos: State<readonly Action<[]>[]>) => action(() => undos.update((u) => { const t = u[u.length - 1]; if (t) t(); return u.slice(0, -1); }));");
  await p.settle();
  let threw = "";
  try { p.value("undoInside")(); await p.settle(); } catch (e) { threw = String((e as Error).message); }
  report("stack: an action called inside undos.update's callback", { threw, count: p.value("count"), undos: p.value("undos").length, errors: p.errs.slice(-2) });
  for (const v of p.vars.values()) { ss.release(v._value); v.delete(); }
  p.runtime.dispose();
});
{
  // (e) a state cell holding an action given to a compile island
  const src = AREF.replace(/const view[\s\S]*$/, "") + "\nexport const label = (current: Action<[]>) => 1;\nexport const viaInput = (compile: Compile) => compile({ inputs: [\"current\"], refs: [], outputs: [\"label\"] });\nexport const viaRef = (compile: Compile) => compile({ inputs: [], refs: [\"current\"], outputs: [\"label\"] });\n";
  const r = checkSources({ cells: src, tsx: true });
  report("e compile with a state cell holding an action", r.cells.filter((c) => c.name.startsWith("via")).map((c) => `${c.name} ${c.status} ${c.errors.map((e) => `[${e.rule}] ${e.msg}`).join("; ")}`));
}

const val = (h: any) => h.value;
const told = (h: EventTarget) => { const n = { count: 0 }; h.addEventListener("input", () => n.count++); return n; };



// a write is applied when it is made, so an update that throws throws out of the call; returns the message.
// What a SoundScript module sees of action atomicity, flush groups (S6.10), events and listeners (section 7),
// the broken state (section 8) and the boundary (section 11) is tested in the specification notebook.
const thrown = (f: () => void) => { try { f(); return ""; } catch (e) { return String((e as Error).message); } };
await run("c2_flush_is_all_or_nothing", async () => {
  errors.length = 0; uncaught.length = 0;
  const c = P.materialize(P.state(1), "c") as any, d = P.materialize(P.state(1), "d") as any;
  const gc = input(c), tc = told(c); await gc.next().value;
  const msg = thrown(() => P.action(() => { c.update((v: number) => v + 1); d.update(() => { throw new Error("in update"); }); })());
  await flushed();
  ok("c2_no_store_changed", val(c) === 1 && val(d) === 1, `c ${val(c)} d ${val(d)}`);
  ok("c2_state_clean", P.idle() && P.rt.ready.size === 0);
  ok("c2_error_thrown_at_the_call", msg === "in update" && uncaught.length === 0, `thrown ${JSON.stringify(msg)} uncaught ${uncaught.length}`);
  const pending = gc.next().value as Promise<unknown>;
  ok("c2_no_input_told", tc.count === 0, `told ${tc.count}`);
  P.action(() => { c.update((v: number) => v + 1); c.update((v: number) => v * 10); })();
  const woke = await Promise.race([pending, tick(200).then(() => "timeout")]);
  ok("c2_later_flush_chains_and_wakes", woke === 20 && val(c) === 20, `woke ${woke} c ${val(c)}`);
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


// flush groups: each top-level action call applies or is dropped on its own, in call order
const refOf = (v: unknown, name: string) => P.materialize(P.state(v), name) as any;
const named = (name: string, f: () => void) => { const a = P.action(f); P.actionNames.set(a, name); return a; };
await run("g2_groups_either_side_of_a_throw_both_apply", async () => {
  const x = refOf(0, "x");
  const tx = told(x);
  const commits = P.rt.commits;
  named("A", () => x.update((v: number) => v + 1))();
  thrown(() => named("B", () => x.update(() => { throw new Error("B broke"); }))());
  named("C", () => x.update((v: number) => v + 10))();
  await flushed();
  ok("g2_x_is_plus_11", val(x) === 11, `x ${val(x)}`);
  ok("g2_one_commit_one_input", P.rt.commits === commits + 1 && tx.count === 1, `commits +${P.rt.commits - commits}, told ${tx.count}`);
});
// One action writes two state cells: what a reader of both sees, with the Runtime's frames run by hand.
// onlyB writes b alone, then both writes a and b. In one task (both after some microtasks) the two calls
// commit together, in one setTimeout(0); a commit per call would tear here. The reader
// never sees one new and one old value. In two tasks with no frame between, the reader sees b from the
// first call beside a from the second: b's generator delivered -1 and is pulled again only on the next frame.
await run("g6_a_reader_of_two_state_cells_one_action_wrote", async () => {
  const L = await load(`const a = (): StateCell<number> => state(0);
export const b = (): StateCell<number> => state(0);
export const pair = (a: number, b: number) => [a, b];
export const both = (a: State<number>, b: State<number>) => action((k: number) => { a.set(k); b.set(k); });
export const onlyB = (b: State<number>) => action((k: number) => b.set(k));`);
  const seen: [number, number][] = [];
  L.m.variable({ fulfilled: (v: [number, number]) => seen.push(v) }).define(["pair"], (p: [number, number]) => p);
  await L.settle();
  const queued: (() => void)[] = [];
  raf = (f) => void queued.push(f);
  const commits = (n: number) => until(() => P.rt.commits >= n);
  const frames = async () => { for (let i = 0; i < 100; i++) { await tick(0); const fs = queued.splice(0); if (!fs.length) return; fs.forEach((f) => f()); } };
  const torn = (from: number) => seen.slice(from).filter(([x, y]) => x !== y && !(y === -1 && x === seen[from - 1][0]));
  try {
    const both = L.value("both"), onlyB = L.value("onlyB");
    const at1 = seen.length, c1 = P.rt.commits;
    // b's waiter has delivered -1 to its generator before both runs, in the same task
    onlyB(-1);
    for (let i = 0; i < 5; i++) await null;
    both(1);
    await commits(c1 + 1); await frames();
    const sameTask = torn(at1);
    const at2 = seen.length, c2 = P.rt.commits;
    onlyB(-1);
    await commits(c2 + 1);
    both(2);
    await commits(c2 + 2); await frames();
    const twoTasks = torn(at2);
    console.log(`  g6: one task saw ${JSON.stringify(seen.slice(at1, at2))}; two tasks, no frame between, saw ${JSON.stringify(seen.slice(at2))}`);
    ok("g6_one_task_never_one_new_and_one_old", sameTask.length === 0 && JSON.stringify(seen[at2 - 1]) === "[1,1]", JSON.stringify(seen.slice(at1, at2)));
    ok("g6_two_tasks_before_one_frame_show_b_from_the_first_call", JSON.stringify(twoTasks) === "[[2,-1]]" && JSON.stringify(seen[seen.length - 1]) === "[2,2]", JSON.stringify(seen.slice(at2)));
  } finally { raf = (f) => void setTimeout(f, 1); await frames(); L.runtime.dispose(); }
});

// The broken state (2026-11-15): every edit is stored; a cell the checker does not accept compiles to a
// definition that raises its messages, and a cell that takes it fails through dataflow. editable() runs a
// module as the editor does: each edit checks the whole module again, and only the variables whose
// compiled definition changed are defined again.
async function editable(texts: string[], o: { reverse?: boolean; order?: boolean } = {}) {
  const runtime = new Runtime();
  const m = runtime.module();
  defineRuntime(m);
  m.define("Generators", [], () => ({ input }));
  const vars = new Map<string, any>(), defs = new Map<string, string>(), values = new Map<string, unknown>(), raised = new Map<string, string>();
  // computations the Runtime started, per variable: its observer's pending, called once for each
  const runs = new Map<string, number>();
  let cells = [...texts];
  const apply = () => {
    const ctx = T.contextFromCheck(ss.checkCells(cells).result);
    const seen = new Set<string>();
    for (const t of o.reverse ? [...cells].reverse() : cells) for (const d of T.compileCell(t, true, ctx, ss.declaredName(t))) {
      seen.add(d.name);
      if (defs.get(d.name) === d.definition) continue;
      defs.set(d.name, d.definition);
      const v = vars.get(d.name) ?? m.variable({ pending: () => runs.set(d.name, (runs.get(d.name) ?? 0) + 1), fulfilled: (x: unknown) => { values.set(d.name, x); raised.delete(d.name); }, rejected: (e: unknown) => { values.delete(d.name); raised.set(d.name, String((e as Error)?.message ?? e)); } });
      vars.set(d.name, v);
      v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    }
    for (const [n, v] of vars) if (!seen.has(n)) { v.delete(); vars.delete(n); defs.delete(n); }
  };
  const settle = async () => { for (let i = 0; i < 5; i++) { await tick(3); await flushed(); } };
  // the host's answer to where a listener's cell is: this module, at its cell's place in the source
  if (o.order) ss.setListenerOrder((values) => values.map((x) => {
    for (const [n, v] of vars) if (v._value === x) { const at = cells.findIndex((t) => ss.declaredName(t) === n); return at < 0 ? null : ["M", at] as const; }
    return null;
  }));
  apply();
  await settle();
  const edit = async (name: string, text: string) => { cells = cells.map((t) => (ss.declaredName(t) === name ? text : t)); apply(); await settle(); };
  const states = () => Object.fromEntries([...ss.cellStates(ss.checkCells(cells).result)].map(([n, x]: any) => [n, x.state === "blocked" ? `blocked by ${x.blockedBy.join(",")}` : x.state]));
  return { m, vars, values, raised, edit, settle, states, value: (n: string) => values.get(n) as any, evals: (n: string) => runs.get(n.startsWith("viewof ") || !vars.has(`viewof ${n}`) ? n : `viewof ${n}`) ?? 0, text: (n: string) => T.decompileVariable(defs.get(n)!) };
}

// Two listeners on one events cell run, for each value, in their cells' source order: on a fresh
// load, after the first is edited and attaches again (now after the second), and when the module's
// variables are defined in reverse.
const ORDER = [
  "const log = (): StateCell<readonly string[]> => state<readonly string[]>([]);",
  "const beats = function* () { let i = 0; while (true) yield i++; };",
  "const addFirst = (log: State<readonly string[]>) => action((v: number) => log.update((l) => [...l, \"first\"]));",
  "const addSecond = (log: State<readonly string[]>) => action((v: number) => log.update((l) => [...l, \"second\"]));",
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
  const hs = C.events(null, "syncs", [], () => (function* () { for (let i = 0; i < 4; i++) yield i; })() as any, null);
  const ha = C.events(null, "asyncs", [], () => (async function* () { for (let i = 0; i < 4; i++) yield i; })() as any, null);
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
const LOGGED = `const a = (): StateCell<number> => state(1);
const b = (): StateCell<number> => state(0);
const c = (): StateCell<number> => state(0);
const addA = (a: State<number>) => action((n: number) => a.update((x) => (x * 3 + n) % 1009));
const copyAB = (a: State<number>, b: State<number>) => action(() => b.set((read(a) + read(b) * 7) % 10007));
const risky = (a: State<number>, c: State<number>) =>
  action((n: number) => {
    c.update((x) => x + n);
    if ((read(a) + n) % 5 === 0) throw new Error("risky");
  });
const both = (addA: Action<[number]>, copyAB: Action<[]>, c: State<number>) =>
  action((n: number) => {
    addA(n);
    copyAB();
    c.set((read(c) * 31 + n) % 10007);
  });
const ticks = function* () {
  for (let i = 1; i <= 100000; i++) yield i;
};
const tickC = (a: State<number>, c: State<number>) => action((t: number) => c.set((read(c) + read(a) * t) % 10007));
const onTickA = (ticks: Events<number>, addA: Action<[number]>) => on(ticks, addA);
const onTickC = (ticks: Events<number>, tickC: Action<[number]>) => on(ticks, tickC);
const total = (a: number, b: number, c: number) => a + b + c;`;
const STALE = LOGGED.replace("const copyAB = (a: State<number>, b: State<number>) => action(() => b.set((read(a) + read(b) * 7) % 10007));",
  "const copyAB = (a: number, b: State<number>) => action(() => b.set((a + read(b) * 7) % 10007));");
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

// A state cell is two variables, viewof <name> (the handle) and <name> (the value); a State<T> parameter is an
// input on the handle, so a cell holding it is blocked while the state cell is in error.
const statesOf = (src: string, outside: { name: string; view?: boolean }[] = []) => Object.fromEntries([...ss.cellStates(ss.checkCells(T.splitCells(src, true), true, outside).result)].map(([n, x]: any) => [n, x.state]));
await run("w1_a_cell_holding_the_state_of_a_cell_in_error_is_blocked", async () => {
  const SRC = `const base = () => 1;
const n = (base: number): StateCell<number> => state(base);
const other = (): StateCell<number> => state(0);
const both = (n: State<number>, other: State<number>) => action(() => { other.update((v) => v + 1); n.update((v) => v + 1); });`;
  const p = await load(SRC);
  ok("w1_two_variables_per_state_cell", JSON.stringify(p.vars.get("both")._inputs.map((i: any) => i._name)) === JSON.stringify(["ss_action", "viewof n", "viewof other"]) && p.m._scope.has("viewof n"), JSON.stringify([...p.m._scope.keys()]));
  const error = async () => { try { await p.m.value("both"); return ""; } catch (e) { return (e as Error).message; } };
  const held = p.value("both");
  const base = p.vars.get("base");
  base.define("base", [], () => { throw new Error("broken base"); });
  await p.settle();
  const inError = await error();
  ok("w1_input_threw", inError === "broken base", inError);
  // an action taken before the break still holds the old handle: its write to n goes to a store no variable has
  const stale = (() => { try { held(); return ""; } catch (e) { return (e as Error).message; } })();
  await p.settle();
  base.define("base", [], () => 1);
  await p.settle();
  ok("w1_a_held_action_writes_while_n_is_in_error_and_the_repaired_n_starts_again", stale === "" && p.value("other") === 1 && p.value("n") === 1, `${stale}; other ${p.value("other")}, n ${p.value("n")}`);
  p.value("both")();
  await p.settle();
  ok("w1_the_repaired_holder_writes_the_new_state", p.value("other") === 2 && p.value("n") === 2, `other ${p.value("other")}, n ${p.value("n")}`);
  p.define(`const n = (base: number): StateCell<number> => state("x");`);
  await p.settle();
  const rejected = await error();
  ok("w1_state_cell_does_not_check", /^n does not check: \[/.test(rejected), rejected);
  const holder = statesOf(SRC.replace("state(base);", 'state("x");'));
  ok("w1_the_holder_is_blocked_by_it", holder.n === "rejected" && holder.both === "blocked", JSON.stringify(holder));
  for (const k of ["n", "viewof n"]) { p.vars.get(k).delete(); p.vars.delete(k); }
  await p.settle();
  const missing = await error();
  ok("w1_state_cell_deleted", /viewof n is not defined/.test(missing), missing);
  p.runtime.dispose();
});
await run("w2_a_remade_state_cell_keeps_its_handles", async () => {
  const p = await load(`const seed = (): StateCell<number> => state(1);
const vars = (seed: number): StateCell<{ readonly n: number }> => state({ n: seed * 10 });
const setN = (vars: State<{ readonly n: number }>) => action((n: number) => vars.set({ n }));
const bumpSeed = (seed: State<number>) => action(() => seed.update((s) => s + 1));
const h1 = (vars: State<{ readonly n: number }>) => [vars];
const h2 = (vars: State<{ readonly n: number }>) => [vars];`);
  const setN = p.value("setN"), setN0 = p.evals("setN");
  p.value("bumpSeed")();
  await p.settle();
  ok("w2_remade_from_the_input", p.value("vars").n === 20, JSON.stringify(p.value("vars")));
  setN(5);
  await p.settle();
  // setN, read before vars was made again, holds the handle, which writes the new store
  ok("w2_the_old_handle_writes_the_new_store", p.value("vars").n === 5, `${JSON.stringify(p.value("vars"))}, setN ran ${p.evals("setN") - setN0} more times`);
  ok("w2_one_handle_per_state_cell", p.value("h1")[0] === p.value("h2")[0] && ss.equals(p.value("h1"), p.value("h2")), "");
  p.runtime.dispose();
});
await run("w3_a_state_cell_nothing_observes_is_written", async () => {
  const runtime = new Runtime();
  const m = runtime.module();
  defineRuntime(m);
  m.define("Generators", [], () => ({ input }));
  const src = `const hidden = (): StateCell<number> => state(3);
const add = (hidden: State<number>) => action(() => hidden.update((v) => v + 1));`;
  const ctx = T.contextFromCheck(ss.checkCells(T.splitCells(src, true)).result);
  let add: any = null;
  for (const t of T.splitCells(src, true)) for (const d of T.compileCell(t, true, ctx)) {
    const v = d.name === "add" ? m.variable({ fulfilled: (x: unknown) => (add = x) }) : m.variable();
    v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
  }
  await until(() => !!add);
  let threw = "";
  for (let i = 0; i < 50; i++) { try { add(); threw = ""; break; } catch (e) { threw = (e as Error).message; await tick(2); } }
  await flushed();
  ok("w3_written_once_it_ran", threw === "" && (await m.value("hidden")) === 4, `${threw}; hidden ${await m.value("hidden")}`);
  runtime.dispose();
});
await run("w4_a_state_cell_imported_from_another_module", async () => {
  const runtime = new Runtime();
  const compileInto = (m: any, src: string, outside: { name: string; view?: boolean }[] = []) => {
    const ctx = T.contextFromCheck(ss.checkCells(T.splitCells(src, true), true, outside).result);
    const values = new Map<string, unknown>();
    for (const t of T.splitCells(src, true)) for (const d of T.compileCell(t, true, ctx)) {
      if (!ctx.accepted!.has(T.cellOfVariable(d.name))) throw new Error(`${d.name} not accepted: ${ctx.why?.get(d.name)}`);
      m.variable({ fulfilled: (x: unknown) => values.set(d.name, x) }).define(d.name, d.inputs, (0, eval)(`(${d.definition})`));
    }
    return values;
  };
  const A = `const count = (): StateCell<number> => state(0);`;
  const B = `const bumpB = (count: State<number>) => action(() => count.update((c) => c + 10));
const seenB = (count: number) => count;`;
  const instances = [0, 1].map(() => {
    const a = runtime.module(), b = runtime.module();
    for (const x of [a, b]) { defineRuntime(x); x.define("Generators", [], () => ({ input })); }
    const va = compileInto(a, A);
    b.import("count", a);
    b.import("viewof count", a);
    const vb = compileInto(b, B, [{ name: "count", view: true }]);
    return { a, b, va, vb };
  });
  await until(() => instances.every((i) => typeof i.vb.get("bumpB") === "function"));
  (instances[1].vb.get("bumpB") as () => void)();
  await flushed();
  await until(() => instances[1].vb.get("seenB") === 10 && instances[1].va.get("count") === 10);
  const got = instances.map((i) => [i.va.get("count"), i.vb.get("seenB")]);
  ok("w4_the_write_reaches_the_source_of_its_own_instance", JSON.stringify(got) === "[[0,0],[10,10]]", JSON.stringify(got));
  const plain = statesOf(B, [{ name: "count" }]);
  ok("w4_an_import_with_no_viewof_is_boundary_state", plain.bumpB === "rejected", JSON.stringify(plain));
  runtime.dispose();
});
// Synchronous actions (S6.12, S6.13): a write, a read or a nested action call is legal only while an action's
// function is on the stack. A call runs to completion when it is called. Each promise here is resolved by the test.
await run("s1_a_call_runs_to_completion_when_it_is_called", async () => {
  const n = refOf(0, "n");
  const order: string[] = [];
  const inner = named("inner1", () => { n.update((v: number) => v + 1); order.push("inner"); });
  const outer = named("outer1", () => { order.push("outer"); inner(); order.push(`read ${P.read(n)}`); });
  const commits = P.rt.commits;
  outer();
  order.push("after");
  ok("s1_ran_before_its_caller_went_on", JSON.stringify(order) === '["outer","inner","read 1","after"]' && P.rt.call === null && P.rt.actionDepth === 0, JSON.stringify(order));
  ok("s1_committed_later", P.rt.commits === commits && val(n) === 0);
  await flushed();
  ok("s1_one_commit", P.rt.commits === commits + 1 && val(n) === 1, `n ${val(n)}`);
});
await run("s2_an_unchecked_async_function_keeps_writes_before_its_first_await_only", async () => {
  const n = refOf(0, "n"), m = refOf(0, "m");
  const d = deferred();
  // the checker rejects this ([action-async]); JavaScript can still give action an async function.
  // Its promise is kept here so the test awaits the rejection itself: bun test takes unhandled
  // rejections for its own report and never emits process "unhandledRejection".
  let p!: Promise<void>;
  const body = async () => { n.set(1); await d.p; m.set(2); };
  const load = named("load2", () => { p = body(); });
  load();
  ok("s2_the_call_has_ended", P.rt.call === null && P.rt.actionDepth === 0);
  d.resolve();
  const err = await p.then(() => null, (e: unknown) => e);
  await flushed();
  ok("s2_the_write_after_the_await_threw", val(n) === 1 && val(m) === 0 && /outside an action/.test(String((err as Error)?.message)), `n ${val(n)} m ${val(m)} ${String(err)}`);
});
await run("s3_a_function_kept_from_a_call_cannot_write_read_or_call_inside_it_later", async () => {
  const n = refOf(0, "n");
  const kept: (() => unknown)[] = [];
  const bump = named("bump3", () => n.update((v: number) => v + 1));
  named("keep3", () => { kept.push(() => n.set(9), () => P.read(n)); })();
  await flushed();
  const [write, read] = kept;
  ok("s3_write_throws", /outside an action/.test(thrown(() => write())), thrown(() => write()));
  ok("s3_read_throws", /outside an action/.test(thrown(() => read())));
  // from a promise callback, or a timer
  const later = await Promise.resolve().then(() => thrown(() => n.set(7)));
  const timed = await new Promise<string>((r) => setTimeout(() => r(thrown(() => n.set(8))), 0));
  ok("s3_callbacks_throw", /outside an action/.test(later) && /outside an action/.test(timed), `${later} | ${timed}`);
  // an Action called later is a top-level call of its own
  const commits = P.rt.commits;
  await Promise.resolve().then(() => bump());
  await flushed();
  ok("s3_an_action_called_later_is_its_own_call", val(n) === 1 && P.rt.commits === commits + 1, `n ${val(n)}`);
});
await run("s4_a_write_or_an_action_call_during_a_cell_evaluation_throws", async () => {
  const x = refOf(0, "x");
  const a = named("a4", () => x.set(1));
  P.rt.evalDepth++;
  const msg = thrown(() => x.set(1));
  const call = thrown(() => a());
  P.rt.evalDepth--;
  await flushed();
  ok("s4_write_throws", /outside an action/.test(msg), msg);
  ok("s4_action_call_throws", /during a cell evaluation/.test(call), call);
  ok("s4_nothing_kept", val(x) === 0);
});
await run("s5_a_listener_gets_every_value_once_in_order", async () => {
  const h = C.events(null, "beats", [], () => (function* () { for (let i = 1; i <= 5; i++) yield i; })() as any, null);
  const got: number[] = [];
  const act = named("add5", ((v: number) => { got.push(v); }) as unknown as () => void);
  const l = C.listen(C.on(h, act), "onBeat", null);
  for (let i = 0; i < 10; i++) frame();
  await flushed();
  ok("s5_each_value_once_in_order", JSON.stringify(got) === "[1,2,3,4,5]", JSON.stringify(got));
  C.release(l); C.release(h);
});
await run("s6_a_nested_action_returns_its_value_inside_the_call", async () => {
  const x = refOf(0, "x");
  const twice = P.action((k: unknown) => { x.update((v: number) => v + (k as number)); return (k as number) * 2; });
  let got: unknown;
  const outer = named("outer6", () => { got = twice(3); x.update((v: number) => v * 10); });
  const top = twice(1);
  outer();
  await flushed();
  ok("s6_nested_returns_top_level_does_not", got === 6 && top === undefined && val(x) === 40, `${got} ${top} x ${val(x)}`);
});

// null is a value of state (S6.18): held, written, read, given to update, returned by a nested action, held by a view
await run("n1_a_state_cell_holding_null", async () => {
  const L = await load(`const sel = (): StateCell<string | null> => state<string | null>(null);
const shown = (sel: string | null) => (sel === null ? "none" : sel);
const pick = (sel: State<string | null>) => action((s: string | null) => sel.set(s));
const flip = (sel: State<string | null>) => action(() => sel.update((s) => (s === null ? "x" : null)));`);
  const at0 = [L.value("sel"), L.value("shown"), L.value("viewof sel").value];
  L.value("pick")("a"); await L.settle();
  const at1 = [L.value("sel"), L.value("shown")];
  L.value("flip")(); await L.settle();
  const at2 = [L.value("sel"), L.value("shown"), L.value("viewof sel").value];
  ok("n1_null_is_held_written_and_read_back", JSON.stringify([at0, at1, at2]) === '[[null,"none",null],["a","a"],[null,"none",null]]' && L.errs.length === 0, JSON.stringify([at0, at1, at2, L.errs]));
  L.runtime.dispose();
});
await run("n2_null_inside_a_call", async () => {
  const n = refOf(null, "n");
  const inner = P.action(() => null);
  const seen: unknown[] = [];
  named("n2", () => { seen.push(P.read(n)); n.update((x: unknown) => (seen.push(x), x)); seen.push(inner()); n.set(null); seen.push(P.read(n)); })();
  await flushed();
  ok("n2_read_update_and_a_nested_return_give_null", JSON.stringify(seen) === "[null,null,null,null]" && seen.every((x) => x === null) && val(n) === null, JSON.stringify(seen.map((x) => (x === undefined ? "undefined" : x))));
});
await run("n3_a_view_holding_null", async () => {
  const el = Object.assign(new EventTarget(), { value: null as unknown });
  const L = await load(`const label = (pick: string | null) => (pick === null ? "none" : pick);
const choose = (pick: State<string | null>) => action((s: string | null) => pick.set(s));
const flip = (pick: State<string | null>) => action(() => pick.update((p) => (p === null ? "y" : null)));`, { outside: { "viewof pick": [[], () => el], pick: [["viewof pick"], (v: unknown) => input(v)] } });
  const at0 = L.value("label");
  L.value("choose")("a"); await L.settle();
  const at1 = [el.value, L.value("label")];
  L.value("flip")(); await L.settle();
  const at2 = [el.value, L.value("label")];
  const h = P.viewHandle(el as any, "pick", (v) => v) as any;
  let read: unknown = "unset";
  P.action(() => { read = P.read(h); })();
  ok("n3_null_is_held_by_the_element_written_and_read_back", JSON.stringify([at0, at1, at2, read, h.value]) === '["none",["a","a"],[null,"none"],null,null]' && read === null && h.value === null && el.value === null && L.errs.length === 0, JSON.stringify([at0, at1, at2, String(read), String(h.value), L.errs]));
  L.runtime.dispose();
});

// the checker module's rule tables (soundscript/checker-tests.ojs), run here on lite's checkSources
await run("k1_checker_rule_tables", async () => {
  const { readFileSync } = await import("node:fs");
  const ojs = readFileSync(new URL("../soundscript/checker-tests.ojs", import.meta.url), "utf8");
  for (const name of [
    "test_checker_action_capture_by_binding",
    "test_checker_iterator_rules",
    "test_checker_spread_copies_own_properties",
    "test_checker_structured_clone",
    "test_checker_mut_across_await",
    "test_checker_promise_flattens",
    "test_checker_in_keeps_members",
    "test_checker_throw_only_body_is_never",
    "test_checker_optional_chain_narrows",
    "test_checker_one_report_per_read",
    "test_checker_generic_function_types",
    "test_checker_regexp_match_is_indexed",
    "test_checker_handle_pass",
  ]) {
    const cell = ojs.split(/^\/\/ %%$/m).map((x) => x.trim()).find((x) => x.startsWith(`${name} = {`));
    let msg = "";
    try { msg = new Function("soundscript", cell!.slice(cell!.indexOf("{")))({ checkSources }); } catch (e) { msg = `threw ${(e as Error).message}`; }
    ok(`k1_${name}`, !!cell && !msg.startsWith("threw"), msg);
  }
});

console.error = realError;
if (uncaught.length) ok("no_uncaught_exceptions", false, String(uncaught[0]));
console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
