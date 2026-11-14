// Unit tests for lite/stdlib/runtime.ts and prelude.runtime.ts: subscription bookkeeping, release,
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
const forever = (name: string, onMake: () => void) => ({ source: name, make: () => { onMake(); return (function* () { for (;;) yield 1; })(); } });
const run = async (name: string, f: () => Promise<void> | void) => {
  try { await f(); } catch (e) { ok(name, false, `threw ${(e as Error)?.stack ?? e}`); }
};
const hold = (set: unknown, id: string, invalidation: Promise<unknown> | null = never) =>
  ss.cell(() => set, [], { kind: "cell", name: id, memo: false, id, invalidation });

await run("b1_failed_subscription_leaves_others_running", async () => {
  errors.length = 0;
  let makeA = 0, makeB = 0, stepsB = 0;
  const srcA = { source: "failing", make: () => { makeA++; return (function* () { yield 1; throw new Error("A fails"); })(); } };
  const srcB = forever("steady", () => makeB++);
  function actA() {}
  function actB() { stepsB++; }
  const SB = [ss.on(srcB, actB)];
  const SA = [ss.on(srcA, actA)];
  hold(SB, "b1b");
  hold(SA, "b1a");
  ok("b1_both_start", ss.running() === 2, `running ${ss.running()}`);
  await until(() => errors.length > 0);
  ok("b1_error_names_source_and_action", errors.some((m) => m.includes("failing") && m.includes("actA") && m.includes("A fails")), JSON.stringify(errors));
  ok("b1_failed_one_stops_itself_only", ss.running() === 1, `running ${ss.running()}`);
  ss.release(SA);
  ok("b1_release_of_failed_set_keeps_other", ss.running() === 1, `running ${ss.running()}`);
  const n = stepsB; await until(() => stepsB > n + 2);
  ok("b1_other_still_steps", stepsB > n + 2, `${n} -> ${stepsB}`);
  const SB2 = [ss.on(srcB, actB)];
  hold(SB2, "b1b2");
  ok("b1_same_pair_not_started_twice", makeB === 1 && ss.running() === 1, `makeB ${makeB} running ${ss.running()}`);
  const SA2 = [ss.on(srcA, actA)];
  hold(SA2, "b1a2");
  ok("b1_later_set_restarts_failed_pair", makeA === 2 && ss.running() === 2, `makeA ${makeA} running ${ss.running()}`);
  await until(() => errors.length > 1);
  ss.release(SA2); ss.release(SB2); ss.release(SB);
  ok("b1_cleanup", ss.running() === 0, `running ${ss.running()}`);
});

await run("b3_release_is_one_holder", async () => {
  let made = 0;
  function act() {}
  const S = [ss.on(forever("shared", () => made++), act)];
  hold(S, "b3x");
  hold(S, "b3y");
  ok("b3_one_copy_for_two_holders", ss.running() === 1 && made === 1, `running ${ss.running()} made ${made}`);
  ss.release(S);
  ok("b3_release_once_keeps_running", ss.running() === 1, `running ${ss.running()}`);
  ss.release(S);
  ok("b3_release_twice_stops", ss.running() === 0, `running ${ss.running()}`);
  ss.release(S);
  ok("b3_extra_release_is_harmless", ss.running() === 0);
});

await run("b3_invalidation_with_two_holders", async () => {
  function act() {}
  const S = [ss.on(forever("inv", () => {}), act)];
  const a = deferred(), b = deferred();
  hold(S, "b3i1", a.p);
  hold(S, "b3i2", b.p);
  a.resolve(); await tick(5);
  ok("b3_one_invalidation_keeps_running", ss.running() === 1, `running ${ss.running()}`);
  b.resolve(); await until(() => ss.running() === 0);
  ok("b3_both_invalidated_stops", ss.running() === 0, `running ${ss.running()}`);
});

await run("b3_null_invalidation_holds_count_once", async () => {
  function act() {}
  const S = [ss.on(forever("forwarded", () => {}), act)];
  hold(S, "b3n1", null); hold(S, "b3n1", null); hold(S, "b3n1", null);
  ss.release(S);
  ok("b3_null_holder_released_by_one_release", ss.running() === 0, `running ${ss.running()}`);
});

await run("b1_throwing_action_stops_only_itself", async () => {
  errors.length = 0;
  let steps = 0;
  function boom() { throw new Error("action fails"); }
  function count() { steps++; }
  const src = forever("ticks", () => {});
  const S1 = [ss.on(src, boom)], S2 = [ss.on(src, count)];
  hold(S1, "b1t1"); hold(S2, "b1t2");
  await until(() => errors.length > 0);
  ok("b1_action_error_logged", errors.some((m) => m.includes("ticks") && m.includes("boom") && m.includes("action fails")), JSON.stringify(errors));
  const n = steps; await until(() => steps > n + 2);
  ok("b1_action_failure_keeps_sibling", ss.running() === 1 && steps > n + 2, `running ${ss.running()}`);
  ss.release(S1); ss.release(S2);
  ok("b1_action_cleanup", ss.running() === 0, `running ${ss.running()}`);
});

await run("b3_sweep_drops_set_regardless_of_holders", async () => {
  function act() {}
  const S = [ss.on(forever("swept", () => {}), act)];
  hold(S, "b3s1"); hold(S, "b3s2");
  ss.sweep(new Set()); ss.sweep(new Set());
  ok("b3_sweep_drops_unheld", ss.running() === 0, `running ${ss.running()}`);
});

const val = (h: object) => P.refValues(h).next().value;
const flushed = () => until(() => !P.state.flushScheduled && P.state.queue.length === 0).then(() => tick(2));

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
