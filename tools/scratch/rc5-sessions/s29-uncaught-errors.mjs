// probe (20260928-0405-w22): an error that starts AFTER a write's first compute must reach the agent.
// Observed: 20260928-0205-w14 (snake) — `(async () => { for await (const s of state) … })()` inside two cells
// threw "state is not async iterable" as unhandled rejections ~8x/s (22 console errors) while write_file said
// "✓ all cells compute"; 20260928-0235-w17 (world map) — htl.svg`<path d=${path(f)}/>` put "/" into the path
// data, 2839 console errors "<path> attribute d: Expected path command", no tool result mentioned them.
// Drives write_file with the chat session's own watch bus, then drains that bus the way the engine does before
// the next model call ("Watch updates"). No model calls.   node probe.mjs <notebook.html>   (run from repo root)
// PASS: each late failure is named in the write result or the next drain, attributed to its own module, and an
//       error thrown by page code outside any agent module is not blamed on one.
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const ROOT = process.cwd();
const NB = resolve(process.argv[2] || join(ROOT, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const { bootNotebook } = await import(pathToFileURL(join(ROOT, "tools/robocoop-5/lib/notebook-boot.mjs")).href);

const mod = (cells, defs) => `${cells}
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
${defs}
  return main;
}
`;
const CASES = [
  { id: "gen", cls: "runtime", key: /gen boom/, src: mod(
`const _ticks = function* ticks(Promises){ yield 1; yield Promises.delay(300, 2); throw new Error("gen boom"); };`,
`  $def("_ticks", "ticks", ["Promises"], _ticks);`) },
  { id: "dep", cls: "runtime", key: /dep boom/, src: mod(
`const _n = function* n(Promises){ for (let i = 0; i < 3; i++) yield Promises.delay(i ? 200 : 0, i); };
const _ratio = function ratio(n){ if (n >= 2) throw new Error("dep boom at n=" + n); return 1 / (n + 1); };`,
`  $def("_n", "n", ["Promises"], _n);
  $def("_ratio", "ratio", ["n"], _ratio);`) },
  { id: "timer", cls: "window error", key: /timer boom/, src: mod(
`const _loop = function loop(invalidation){
  let k = 0;
  const id = setInterval(() => { if (++k > 2) throw new Error("timer boom " + k); }, 100);
  invalidation.then(() => clearInterval(id));
  return "running";
};`,
`  $def("_loop", "loop", ["invalidation"], _loop);`) },
  { id: "floating", cls: "unhandledrejection", key: /not async iterable/, src: mod(
`const _state = function state(Generators, invalidation){
  return Generators.observe(notify => { let i = 0; notify({ score: i }); const t = setInterval(() => notify({ score: ++i }), 120); return () => clearInterval(t); });
};
const _board = function board(state, html){
  const el = html\`<div>Score: \${state.score}</div>\`;
  (async () => { for await (const s of state) el.textContent = "Score: " + s.score; })();
  return el;
};`,
`  $def("_state", "state", ["Generators","invalidation"], _state);
  $def("_board", "board", ["state","html"], _board);`) },
  { id: "svgpath", cls: "console only", key: /\bd\b|path data|attribute/, src: mod(
`const _shape = function shape(){ return "M0,0L40,0L40,40Z"; };
const _map = function map(htl, shape){ return htl.svg\`<svg width=60 height=60><path d=\${shape}/></svg>\`; };`,
`  $def("_shape", "shape", [], _shape);
  $def("_map", "map", ["htl","shape"], _map);`) },
];

const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))", timeout: 120000 });
const out = await page.evaluate(async (CASES) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const t0 = Date.now();
  const sessionOf = () => document.querySelector('[data-rc5-group="robocoop5-session"]')?.active?.session;
  while (Date.now() - t0 < 60000 && !(H.byName("toolsView")?.value?.length >= 10 && sessionOf()?.watchBus)) await new Promise(r => setTimeout(r, 300));
  const bus = sessionOf().watchBus;
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const ctx = { sessionState: {}, watchBus: bus };
  const run = async (id, args) => String((await byId.get(id).execute(args, ctx))?.output ?? "");
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  bus.drain();
  const res = {};
  for (const c of CASES) {
    await sleep(300);
    bus.drain();
    const t = performance.now();
    const write = await run("write_file", { file_path: `/src/@probe/${c.id}.js`, content: c.src });
    const writeMs = Math.round(performance.now() - t);
    await sleep(2000);  // the model call that follows a write takes seconds; late errors land in it
    const drain1 = bus.drain();
    res[c.id] = { write, writeMs, drain1 };
  }
  // the fix: the same module rewritten without the floating loop must stop reporting
  const fixed = CASES.find(c => c.id === "floating").src.replace(/\n  \(async \(\) => \{ for await[^\n]*/, "");
  bus.drain();
  const fw = await run("write_file", { file_path: "/src/@probe/floating.js", content: fixed });
  await sleep(1500);
  res.fixed = { write: fw, drain1: bus.drain() };
  // noise: page code outside any agent module throws; must not be attributed to an @probe module
  setTimeout(() => { throw new Error("page noise outside agent code"); }, 0);
  Promise.reject(new Error("page noise rejection"));
  await sleep(800);
  res.noise = { drain1: bus.drain() };
  return res;
}, CASES);

let fail = 0;
for (const c of CASES) {
  const r = out[c.id];
  const w = r.write.replace(/^[\s\S]*?(?= · )/, "");  // status part of the write result
  const inWrite = c.key.test(w) && !/✓ all/.test(w);
  const dr = r.drain1.join(" | ");
  const inDrain = c.key.test(dr) && new RegExp(`@probe/${c.id}\\b`).test(dr);
  const ok = inWrite || inDrain;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${c.id.padEnd(8)} (${c.cls}) write ${r.writeMs}ms`);
  console.log(`   write: ${w.slice(0, 260)}`);
  console.log(`   next drain: ${dr ? dr.slice(0, 400) : "(nothing)"}`);
}
{
  const w = out.fixed.write.replace(/^[\s\S]*?(?= · )/, ""), dr = out.fixed.drain1.join(" | ");
  const ok = /✓ all/.test(w) && !/@probe\/floating \(uncaught\)/.test(dr);
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} fixed    rewrite without the floating loop stops the reports`);
  console.log(`   write: ${w.slice(0, 160)}`);
  console.log(`   next drain: ${dr ? dr.slice(0, 300) : "(nothing)"}`);
}
const noise = out.noise.drain1.join(" | ");
const blamed = /page noise/.test(noise) && /@probe\//.test(noise.match(/[^|]*page noise[^|]*/)?.[0] || "");
if (blamed) fail++;
console.log(`${blamed ? "FAIL" : "PASS"} noise    page-code error not blamed on an agent module: ${noise ? noise.slice(0, 300) : "(nothing)"}`);
console.log(fail ? `FAIL (${fail})` : "PASS");
await close();
process.exit(fail ? 1 : 0);
