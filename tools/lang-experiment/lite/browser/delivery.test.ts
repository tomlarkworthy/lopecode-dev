// Delivery from an events cell to its listener, exactly once and in order, under every forced ordering of the
// queues that decide it (S7.4, S7.5). Run: bun lite/browser/delivery.test.ts [--trace]
// requestAnimationFrame and setTimeout are queues this file runs by hand, installed before the Runtime is imported
// (runtime.js captures its frame at import). Microtasks are drained with the real setImmediate. Nothing here
// waits on time: a case passes or fails on what the listener was given once every queue is empty.
//   R: the Runtime's frames   C: cells.ts scheduler.frame (events pulls)   T: setTimeout (commit, any other timer)
// The fetch-then-store program of S6.12, and variants, run from a fetch answered "hello" and one ask, with fetch#1
// pending. Then one more ask, and every interleaving of the choices a case enables is run:
//   answer  fetch#1 settles          R  a Runtime frame          C  an events pull          T:commit  the commit
//   T:timer any other timer          X  an unrelated variable is redefined (a Runtime frame is already requested)
//   L  the listener cell runs again (redefined, same action)   S  the action cell is redefined (a new action)
// Later fetches are answered one at a time once every queue is empty. The check: every run of the events cell
// with new inputs gives each of its values to the listener once, in order; one with the same inputs as the run
// before it keeps its generator and gives nothing (S7.5); one listener is attached at the end.
const realImmediate = (globalThis as any).setImmediate as (f: () => void) => void;
type Q = "R" | "C" | "T";
type Job = { q: Q; f: () => void; label: string };
const jobs: Job[] = [];
const log: string[] = [];
const L = (s: string) => void log.push(s);
(globalThis as any).requestAnimationFrame = (f: () => void) => void jobs.push({ q: "R", f, label: "frame" });
(globalThis as any).setTimeout = (f: () => void) => { jobs.push({ q: "T", f, label: f.name === "commit" ? "commit" : "timer" }); return 0; };
const flush = async () => { for (let i = 0; i < 3; i++) await new Promise<void>((r) => realImmediate(r)); };

const P = await import("../../prelude.runtime.ts");
const ss = await import("../stdlib/runtime.ts");
const T = await import("../toolchain/ss-toolchain.ts");
const C = await import("./cells.ts");
const { checkSources } = await import("../core.ts");
const { Runtime } = await import("@observablehq/runtime");
const { input } = await import(new URL("../../../../vendor/observable-stdlib/src/generators/input.js", import.meta.url).pathname as any);
C.scheduler.frame = (f) => void jobs.push({ q: "C", f, label: "pull" });

type Choice = "answer" | "R" | "C" | "T:commit" | "T:timer" | "X" | "L" | "S" | "B";
const enabledQueues = (): Choice[] => {
  const out: Choice[] = [];
  if (jobs.some((j) => j.q === "R")) out.push("R");
  if (jobs.some((j) => j.q === "C")) out.push("C");
  if (jobs.some((j) => j.q === "T" && j.label === "commit")) out.push("T:commit");
  if (jobs.some((j) => j.q === "T" && j.label === "timer")) out.push("T:timer");
  return out;
};
// one frame of a queue runs every job queued in it now; one timer step runs the first timer of that kind
async function step(c: Choice) {
  if (c === "R" || c === "C") {
    const take = jobs.filter((j) => j.q === c);
    for (const j of take) jobs.splice(jobs.indexOf(j), 1);
    for (const j of take) { j.f(); await flush(); }
    return;
  }
  const label = c === "T:commit" ? "commit" : "timer";
  const j = jobs.find((x) => x.q === "T" && x.label === label)!;
  jobs.splice(jobs.indexOf(j), 1);
  j.f(); await flush();
}
const quiet = async () => { for (let i = 0; i < 400; i++) { const e = enabledQueues(); if (!e.length) return; await step(e[0]); } throw new Error("did not settle"); };

function fakeFetch() {
  const asks: { url: string; answer: (t: string) => Promise<void>; fail: () => Promise<void> }[] = [];
  const fetch = (url: string) => new Promise((resolve, reject) => {
    const n = asks.length;
    L(`fetch#${n} ${url.replace(/.*\?/, "?")}`);
    asks.push({ url, answer: async (text) => { L(`answer#${n} ${JSON.stringify(text)}`); resolve({ ok: true, status: 200, text: () => Promise.resolve(text) }); await flush(); }, fail: async () => { L(`fail#${n}`); reject(new Error("offline")); await flush(); } });
  });
  return { asks, fetch };
}

// The module compiled by the toolchain, as the module named module, into its own Runtime, every variable observed. Each on(...) action is wrapped,
// one wrapper per action, so a delivery is logged at the listener and the same action stays the same function.
async function load(src: string, fetch: unknown, tag = "", module = "A") {
  const checked = checkSources({ cells: src, tsx: true, outside: [] });
  const bad = checked.cells.filter((c: any) => c.status !== "ok");
  if (bad.length) throw new Error(`not ok: ${bad.map((c: any) => `${c.name} ${c.status} ${JSON.stringify(c.errors)}`).join("; ")}`);
  const runtime = new Runtime();
  const m = runtime.module();
  for (const n of T.RUNTIME_CELLS) m.define(T.INPUTS[n], [], () => (ss as any)[n]);
  const wrapped = new WeakMap<object, (x: unknown) => void>();
  const wrap = (act: (x: unknown) => void) => { let w = wrapped.get(act); if (!w) { w = (x: unknown) => { L(`${tag}deliver ${JSON.stringify(x)}`); act(x); }; wrapped.set(act, w); } return w; };
  m.redefine("ss_on", [], () => (ev: unknown, act: (x: unknown) => void) => ss.on(ev, wrap(act)));
  m.redefine("ss_events", [], () => (mod: string, name: string, args: unknown[], make: any, inv: any) => { L(`${tag}events ${JSON.stringify(args)}`); return ss.events(mod, name, args, make, inv); });
  if (process.env.TRACE_LISTEN) m.redefine("ss_listen", [], () => (l: any, cell: string, inv: any, mod: string) => { L(`listen ${cell} in ${mod}`); inv?.then(() => L(`invalidated listener; pending ${JSON.stringify(C.running())}`)); const r = ss.listen(l, cell, inv, mod); L(`  attached ${C.running()} kept=${r !== l}`); return r; });
  m.define("Generators", [], () => ({ input }));
  m.define("ss_fetch", [], () => fetch);
  const other = m.variable({}).define("other", [], () => 0);
  const values = new Map<string, unknown>();
  const vars = new Map<string, any>();
  const texts = T.splitCells(src, true);
  const ctx = { ...T.contextFromCheck(ss.checkCells(texts, true, []).result), module };
  const compiled = new Map<string, { inputs: string[]; definition: string }>();
  for (const t of texts) for (const d of T.compileCell(t, true, ctx)) {
    compiled.set(d.name, d);
    const v = m.variable({ fulfilled: (x: unknown) => { values.set(d.name, x); if (d.name === "greeting") L(`greeting = ${JSON.stringify(x)}`); }, rejected: (e: any) => L(`${d.name} rejected ${e?.message ?? e}`) });
    vars.set(d.name, v.define(d.name, d.inputs, (0, eval)(`(${d.definition})`)));
  }
  // the same compiled definition, a new function: the runtime runs the cell again
  const again = (name: string) => { const d = compiled.get(name)!; vars.get(name).define(d.name, d.inputs, (0, eval)(`(${d.definition})`)); };
  const dispose = () => { for (const [name, v] of vars) { ss.release(values.get(name)); v.delete(); } other.delete(); runtime.dispose(); };
  const set = (name: string, f: (...a: any[]) => unknown) => vars.get(name).define(name, [], f);
  return { value: (n: string) => values.get(n) as any, again, set, other, dispose, handle: () => values.get("arrived") };
}

const fetchThenStore = (yields: string) => `const asked = (): StateCell<number> => state(0);
const ask = (asked: State<number>) => action(() => asked.update((n) => n + 1));
const loaded = async (fetch: Fetch, asked: number) => {
  const r = await fetch(\`https://example.invalid/greeting?n=\${asked}\`);
  return r.ok ? await r.text() : null;
};
const arrived = function* (loaded: string | null) {
  if (loaded !== null) {
${yields}
  }
};
const greeting = (): StateCell<string> => state("");
const store = (greeting: State<string>) => action((text: string) => greeting.set(text));
const onArrived = (arrived: Events<string>, store: Action<[string]>) => on(arrived, store);`;
const ONE = fetchThenStore("    yield loaded;");
const TWO = fetchThenStore("    yield loaded;\n    yield loaded + \"!\";");
const valuesOf = (two: boolean) => (x: string) => (two ? [x, x + "!"] : [x]);

// The example programs of S6.12, read from spec.ojs: the cell's template literal, evaluated as JavaScript
const specProgram = async (name: string): Promise<string> => {
  const ojs = await Bun.file(new URL("../soundscript/spec.ojs", import.meta.url).pathname).text();
  const cell = ojs.split(/^\/\/ %%$/m).map((b) => b.trim()).find((b) => b.startsWith(`${name} = `));
  if (!cell) throw new Error(`spec.ojs has no cell ${name}`);
  return new Function(`return (${cell.slice(cell.indexOf("=") + 1)});`)();
};
const LATEST_WINS = await specProgram("spec_s6_latestWins");
const EVERY_ANSWER = await specProgram("spec_s6_everyAnswer");
// what the log says each fetch asked for and was answered with, how many asks came before the answer, and every
// value greeting was computed with
function fetches(log: string[]) {
  const asked = new Map<number, number>(), text = new Map<number, string>(), asksBefore = new Map<number, number>();
  let asks = 0;
  for (const s of log) {
    const f = /^fetch#(\d+) \?n=(\d+)$/.exec(s), a = /^answer#(\d+) (.*)$/.exec(s);
    if (s === "ask") asks++;
    if (f) asked.set(Number(f[1]), Number(f[2]));
    if (a) { text.set(Number(a[1]), JSON.parse(a[2])); asksBefore.set(Number(a[1]), asks); }
  }
  const greetings = log.filter((s) => s.startsWith("greeting = ")).map((s) => JSON.parse(s.slice(11)));
  return { list: [...asked].map(([i, n]) => ({ i, n, text: text.get(i), asksBefore: asksBefore.get(i) ?? 0 })), greetings };
}
// latest wins: an answer to request n that comes after request n + 1 was asked is stale, and is never greeting's
// value; the last request's answer is greeting's final value
function latestWins(log: string[]): string | null {
  const { list, greetings } = fetches(log);
  const last = Math.max(...list.map((f) => f.n));
  const stale = list.filter((f) => f.asksBefore > f.n).map((f) => f.text);
  const read = greetings.filter((g) => stale.includes(g));
  const want = list.filter((f) => f.n === last).at(-1)?.text;
  return read.length ? `greeting was ${JSON.stringify(read)}, the answer to an earlier request`
    : greetings.at(-1) !== want ? `greeting ended ${JSON.stringify(greetings.at(-1))}, the answer to request ${last} was ${JSON.stringify(want)}` : null;
}
// every answer: each request is fetched once, each answer delivered once, and greeting ends with every answer in order
function everyAnswer(log: string[]): string | null {
  const { list, greetings } = fetches(log);
  const ns = list.map((f) => f.n);
  const delivered = log.filter((s) => s.startsWith("deliver ")).map((s) => JSON.parse(s.slice(8)));
  const once = list.filter((f) => delivered.filter((d) => d.n === f.n && d.text === f.text).length !== 1);
  const want = list.map((f) => f.text);
  return JSON.stringify(ns) !== JSON.stringify(ns.map((_, i) => i)) ? `requests fetched ${JSON.stringify(ns)}`
    : once.length ? `answers not delivered exactly once: ${JSON.stringify(once)}; delivered ${JSON.stringify(delivered)}`
    : JSON.stringify(greetings.at(-1)) !== JSON.stringify(want) ? `greeting ended ${JSON.stringify(greetings.at(-1))}, the answers were ${JSON.stringify(want)}` : null;
}

// check: what the program must guarantee, beyond the delivery every case checks
type Case = { title: string; src: string; two?: boolean; first: string; second: string; later: string[]; extra: Choice[]; thin?: boolean; check?: (log: string[]) => string | null };
type Outcome = { invalid: true } | { next: Choice[] } | { problem: string | null; trace: string[] };
async function run(k: Case, prefix: Choice[]): Promise<Outcome> {
  log.length = 0; jobs.length = 0; P.reset();
  const F = fakeFetch();
  const W = await load(k.src, F.fetch);
  // B: a second copy of the module, named B, whose listener cell first runs when its first fetch is answered
  const FB = fakeFetch();
  const WB = k.extra.includes("B") ? await load(k.src, FB.fetch, "B:", "B") : null;
  try {
    await quiet();
    await F.asks[0].answer(k.first); await quiet();
    L("ask"); W.value("ask")(); await quiet();
    if (F.asks.length !== 2) throw new Error(`setup: ${F.asks.length} fetches`);
    const mark = log.length;
    L("ask"); W.value("ask")();
    let answered = false;
    const once = new Set<Choice>();
    const enabled = (): Choice[] => [...(answered ? [] : ["answer" as Choice]), ...k.extra.filter((c) => !once.has(c)), ...enabledQueues()];
    for (const c of prefix) {
      if (!enabled().includes(c)) return { invalid: true };
      if (c === "answer") { answered = true; await F.asks[1].answer(k.second); }
      else if (c === "X") { once.add(c); W.other.define("other", [], () => 1); await flush(); }
      else if (c === "L") { once.add(c); W.again("onArrived"); await flush(); }
      else if (c === "S") { once.add(c); W.again("store"); await flush(); }
      else if (c === "B") { once.add(c); await FB.asks[0].answer("other"); }
      else await step(c);
    }
    const next = enabled();
    if (next.length) return { next };
    for (let i = 2, t = 0; i < 8 && F.asks[i]; i++, t++) { await F.asks[i].answer(k.later[t] ?? `later#${i}`); await quiet(); }
    // the runs of the events cell from the first answer on; one with the inputs of the run before it adds nothing
    const runs = log.filter((s) => s.startsWith("events ")).map((s) => JSON.parse(s.slice(7))[0]);
    const want: string[] = [];
    let prev: unknown = Symbol();
    for (const x of runs) { if (x !== prev && x !== null) want.push(...valuesOf(!!k.two)(x)); prev = x; }
    const got = log.filter((s) => s.startsWith("deliver ")).map((s) => JSON.parse(s.slice(8)));
    const attached = C.running([W.handle()]);
    const problem = JSON.stringify(got) !== JSON.stringify(want) ? `delivered ${JSON.stringify(got)}, the events runs gave ${JSON.stringify(want)}`
      : attached !== 1 ? `${attached} listeners attached at the end` : k.check?.(log) ?? null;
    return { problem, trace: log.slice(mark) };
  } finally { W.dispose(); WB?.dispose(); }
}

// --full explores every ordering. Without it a thin case follows, below depth THIN_FROM, every second
// choice (which ones depends on the prefix, so it is the same set on every run).
const FULL = process.argv.includes("--full"), THIN_FROM = 5;
function thinned(k: Case, prefix: Choice[], next: Choice[]): Choice[] {
  if (FULL || !k.thin || prefix.length < THIN_FROM || next.length < 2) return next;
  let h = 0; for (const c of prefix) for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return next.filter((_, i) => (i + h) % 2 === 0);
}
async function explore(k: Case) {
  let n = 0, bad = 0;
  const fails: string[] = [];
  const dfs = async (prefix: Choice[]): Promise<void> => {
    const r = await run(k, prefix);
    if ("invalid" in r) return;
    if ("next" in r) { if (prefix.length > 18) throw new Error("too deep " + prefix.join(" ")); for (const c of thinned(k, prefix, r.next)) await dfs([...prefix, c]); return; }
    n++;
    if (r.problem) { bad++; if (fails.length < 3) fails.push(`  e.g. ${prefix.join(" ")}: ${r.problem}${process.argv.includes("--trace") ? "\n    " + r.trace.join("\n    ") : ""}`); }
  };
  await dfs([]);
  console.log(`${bad ? "FAIL" : "pass"} ${k.title}: ${n} orderings, ${bad} fail`);
  for (const f of fails) console.log(f);
  return { n, bad };
}

const cases: Case[] = [
  { title: "one value per answer", src: ONE, first: "hello", second: "second", later: ["third"], extra: [] },
  { title: "one value per answer, a Runtime frame already requested", src: ONE, first: "hello", second: "second", later: ["third"], extra: ["X"] },
  { title: "one value per answer, the listener cell runs again", src: ONE, first: "hello", second: "second", later: ["third"], extra: ["X", "L"] },
  { title: "one value per answer, the action is made again", src: ONE, first: "hello", second: "second", later: ["third"], extra: ["X", "S"] },
  { title: "one value per answer, a second copy of the module starts its listener", src: ONE, first: "hello", second: "second", later: ["third"], extra: ["X", "B"], thin: true },
  { title: "two values per answer", src: TWO, two: true, first: "hello", second: "second", later: ["third"], extra: ["X"] },
  { title: "an answer equal to the one before it", src: ONE, first: "same", second: "same", later: ["same"], extra: ["X"] },
  { title: "latest wins (spec_s6_latestWins)", src: LATEST_WINS, first: "hello", second: "second", later: ["third"], extra: ["X", "S"], check: latestWins },
  { title: "every answer (spec_s6_everyAnswer)", src: EVERY_ANSWER, first: "hello", second: "second", later: ["third"], extra: ["X", "S"], check: everyAnswer }
];
// --one <case index> "<choices>": run one ordering and print its trace
const oneAt = process.argv.indexOf("--one");
if (oneAt > 0) {
  const r = await run(cases[Number(process.argv[oneAt + 1])], process.argv[oneAt + 2].split(" ") as Choice[]);
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
}
let total = 0, failed = 0;
for (const k of cases) { const r = await explore(k); total += r.n; failed += r.bad; }

// An input of the action throws while the events cell runs again on every value (as Breakout's ticks does, through
// over): the listener cell is in error, and nothing more is delivered; repaired, delivery goes on with one listener.
{
  log.length = 0; jobs.length = 0; P.reset();
  const W = await load(`const n = (): StateCell<number> => state(0);
const big = (n: number) => n > 1000000;
const ticks = function* (big: boolean) {
  if (big) return;
  while (true) yield 1;
};
const by = () => 1;
const add = (n: State<number>, by: number) => action((v: number) => n.update((x) => x + v * by));
const onTick = (ticks: Events<number>, add: Action<[number]>) => on(ticks, add);`, null);
  const rounds = async (k: number) => { for (let i = 0; i < k; i++) for (const c of enabledQueues()) await step(c); };
  await rounds(30);
  const h = W.value("ticks"), n0 = W.value("n");
  W.set("by", () => { throw new Error("by threw"); });
  await rounds(5);
  const n1 = W.value("n"), during = C.running([h]);
  await rounds(30);
  const n2 = W.value("n");
  W.set("by", () => 1);
  await rounds(30);
  const n3 = W.value("n"), after = C.running([h, W.value("ticks")]);
  W.dispose();
  const ok = n0 > 5 && n2 === n1 && during === 0 && n3 > n2 && after === 1;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"} an input of the action throws: n ${n0} before, ${n1} -> ${n2} over 30 rounds while in error (listeners ${during}), ${n3} after the repair (listeners ${after})`);
}
// Measured, not asserted: the input of the events cell throws instead. Its rerun never comes, so its listener
// stays parked and its generator, which does not end, goes on delivering (a known limit, cells.ts listen).
{
  log.length = 0; jobs.length = 0; P.reset();
  const W = await load(`const n = (): StateCell<number> => state(0);
const big = (n: number) => n > 1000000;
const ticks = function* (big: boolean) {
  if (big) return;
  while (true) yield 1;
};
const add = (n: State<number>) => action((v: number) => n.update((x) => x + v));
const onTick = (ticks: Events<number>, add: Action<[number]>) => on(ticks, add);`, null);
  const rounds = async (k: number) => { for (let i = 0; i < k; i++) for (const c of enabledQueues()) await step(c); };
  await rounds(30);
  const h = W.value("ticks");
  W.set("big", () => { throw new Error("big threw"); });
  await rounds(5);
  const n1 = W.value("n");
  await rounds(30);
  console.log(`measured: the events cell's input throws: n ${n1} -> ${W.value("n")} over 30 rounds while in error, listeners ${C.running([h])}`);
  W.dispose();
}
const left = C.running(), leftEvents = C.liveEvents();
console.log(`${failed || left || leftEvents ? "FAIL" : "pass"} delivery: ${total} orderings, ${failed} fail; ${left} listeners left attached, ${leftEvents} events handles left`);
process.exit(failed || left || leftEvents ? 1 : 0);
