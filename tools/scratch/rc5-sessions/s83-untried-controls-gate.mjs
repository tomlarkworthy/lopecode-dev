// Probe (rc5-train 20260929-0620-m69): a turn that writes a module with viewof controls and calls task_complete
// without any try_control since that write is pushed back once, naming try_control. No model: sessions are built
// from the engine's own makeSession with a scripted client (pattern: s72-tools-change-notice.mjs).
// Cases: controls + no try_control -> REJECTED then ok (once per turn); controls + try_control -> ok;
// no controls -> ok; next turn with no write -> ok (state cleared per turn); try_control then edit_file -> REJECTED.
//   node tools/scratch/rc5-sessions/s83-untried-controls-gate.mjs <notebook.html>   (run from the repo root)
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve(process.cwd(), "tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
let out;
try {
  out = await page.evaluate(async () => {
    const H = window.__nbHelpers;
    ["toolsView", "hostSetup", "makeSession", "wiki_index"].forEach(n => H.force(n));
    const t0 = Date.now();
    while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10 && typeof H.byName("makeSession") === "function")) await new Promise(r => setTimeout(r, 300));
    const msV = H.allVars().find(v => v._name === "makeSession" && v._definition?.name === "_makeSession");
    const src = id => `const _k = function knob(Inputs){return(Inputs.range([0, 10], {label: "Knob", value: 2}))};
const _v = (G, v) => G.input(v);
const _d = function doubled(knob){return(knob * 2)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_k", "viewof knob", ["Inputs"], _k);
  $def("_v", "knob", ["Generators", "viewof knob"], _v);
  $def("_d", "doubled", ["knob"], _d);
  return main;
}`;
    const plain = `const _a = function a(){return(3)};
const _b = function b(a){return(a * 2)};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => { main.variable(observer(name)).define(name, deps, fn).pid = pid; };
  $def("_a", "a", [], _a);
  $def("_b", "b", ["a"], _b);
  return main;
}`;
    const doc = "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md";
    let k = 0;
    const call = (name, args) => ({ tool_calls: [{ id: "c" + (++k), type: "function", function: { name, arguments: JSON.stringify(args) } }] });
    const txt = { content: "thinking about it" };
    const done = () => call("task_complete", { summary: "done" });
    const runCase = async turns => {
      const inputs = msV._inputs.map(i => i._value);
      let script = [];
      const client = { chat: async () => ({ message: { role: "assistant", content: null, ...(script.shift() ?? done()) } }) };
      inputs[0] = client;
      const session = msV._definition(...inputs)();
      const res = [];
      for (const t of turns) {
        script = t.slice();
        const r = await session.send("probe");
        const msgs = r?.messages ?? session.messages ?? [];
        // the results of every task_complete call this turn, in order
        const ids = new Set(msgs.filter(m => m.role === "assistant").flatMap(m => (m.tool_calls || []).filter(c => c.function.name === "task_complete").map(c => c.id)));
        const tcRes = msgs.filter(m => m.role === "tool" && ids.has(m.tool_call_id)).map(m => String(m.content).slice(0, 200));
        res.push(tcRes);
      }
      // results accumulate across turns in msgs; keep only each turn's new ones
      return res.map((r, i) => i ? r.slice(res[i - 1].length) : r);
    };
    const rd = call("read_file", { file_path: doc, limit: 3 });
    const W = id => call("write_file", { file_path: "/src/@probe/" + id + ".js", content: src(id) });
    const cases = {
      controlsUntried: await runCase([[rd, W("ctlA"), done(), done()]]),
      controlsTried: await runCase([[rd, W("ctlB"), call("try_control", { module: "@probe/ctlB" }), done()]]),
      noControls: await runCase([[call("write_file", { file_path: "/src/@probe/plainC.js", content: plain }), done()]]),
      // turn 1 ends without task_complete (bare text, stall nudges), so the list is still full when turn 2 starts
      nextTurnClear: await runCase([[rd, W("ctlD"), txt, txt, txt, txt], [call("read_file", { file_path: "/content/bootconf.json", limit: 2 }), done()]]),
      editAfterTry: await runCase([[rd, W("ctlE"), call("try_control", { module: "@probe/ctlE" }),
        call("edit_file", { file_path: "/src/@probe/ctlE.js", old_string: "knob * 2", new_string: "knob * 3" }), done(), done()]]),
      // m58's batched refusal comes first, then this gate once, then the turn ends
      batched: await runCase([[rd, { tool_calls: [...W("ctlF").tool_calls, ...done().tool_calls] }, done(), done()]]),
      // unwrittenGate takes the turn's one veto; this gate stays silent and the next task_complete ends the turn
      withUnwritten: await runCase([[rd, W("ctlG"), call("write_file", { file_path: "/src/@probe/brokenG.js", content: "export default function define( {" }), done(), done()]]),
    };
    return cases;
  });
} finally {
  await close();
}
console.log(JSON.stringify(out, null, 1));
const rej = s => /^REJECTED/.test(s || "") && /try_control/.test(s);
const c = out;
const checks = {
  firesOnUntriedControls: rej(c.controlsUntried[0][0]) && c.controlsUntried[0][1] === "ok",
  silentAfterTryControl: c.controlsTried[0].length === 1 && c.controlsTried[0][0] === "ok",
  silentWithoutControls: c.noControls[0].length === 1 && c.noControls[0][0] === "ok",
  clearedNextTurn: c.nextTurnClear[0].length === 0 && c.nextTurnClear[1].length === 1 && c.nextTurnClear[1][0] === "ok",
  batchedThenGateOnce: c.batched[0].length === 3 && /^NOT ended/.test(c.batched[0][0]) && rej(c.batched[0][1]) && c.batched[0][2] === "ok",
  oneVetoWithUnwritten: c.withUnwritten[0].length === 2 && /^REJECTED/.test(c.withUnwritten[0][0]) && !/try_control/.test(c.withUnwritten[0][0]) && c.withUnwritten[0][1] === "ok",
  rearmedByLaterWrite: rej(c.editAfterTry[0][0]) && c.editAfterTry[0][1] === "ok",
};
console.log(JSON.stringify(checks));
const pass = Object.values(checks).every(Boolean);
console.log(pass ? "PASS" : "FAIL");
process.exit(pass ? 0 : 1);
