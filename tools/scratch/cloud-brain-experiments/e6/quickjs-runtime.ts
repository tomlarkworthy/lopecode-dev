// E6 (offline half): does @observablehq/runtime 6 run inside QuickJS (wasm)?
import { getQuickJS } from "quickjs-emscripten";
const t0 = performance.now();
const QuickJS = await getQuickJS();
const t1 = performance.now();
const vm = QuickJS.newContext();
const run = (code: string, label: string) => {
  const r = vm.evalCode(code, label);
  if (r.error) { const e = vm.dump(r.error); if (r.error.alive) r.error.dispose(); throw new Error(label + ": " + JSON.stringify(e)); }
  const v = vm.dump(r.value); if (r.value.alive) r.value.dispose(); return v;
};
const drain = () => { let n = 0; for (;;) { const r = vm.runtime.executePendingJobs(); if (r.error) { const e = vm.dump(r.error); if (r.error.alive) r.error.dispose(); throw new Error("job: " + JSON.stringify(e)); } if (r.value === 0) break; n += r.value; } return n; };

// QuickJS has promises but no timers; the runtime falls back to setTimeout(f, 0).
run(`globalThis.setTimeout = (f) => { Promise.resolve().then(f); return 0; };`, "shim");
const src = await Bun.file(import.meta.dir + "/runtime.iife.js").text();
const t2 = performance.now();
run(src, "runtime.js");
const t3 = performance.now();
run(`
  globalThis.log = [];
  const define = (runtime, observer) => {
    const main = runtime.module();
    main.variable(observer("a")).define("a", [], () => { log.push("a computed"); return 21; });
    main.variable(observer("b")).define("b", ["a"], (a) => { log.push("b computed"); return a * 2; });
    main.variable(observer("never")).define("never", [], () => { log.push("never computed"); return document.body; });
    main.variable(observer("fetch")).define("fetch", ["b"], (b) => (req) => "hello " + b + " from " + req);
    return main;
  };
  globalThis.rt = new Runtime();
  globalThis.main = define(rt, () => undefined);
  globalThis.result = "pending";
  main.value("fetch").then((f) => { globalThis.result = f("request-1"); }, (e) => { globalThis.result = "ERR " + e; });
`, "module");
const jobs1 = drain();
const t4 = performance.now();
console.log("first value:", run("result", "r"), "| jobs", jobs1, "| log", run("JSON.stringify(log)", "l"));

// Reactivity: redefine a, ask again.
run(`
  log.length = 0;
  main.redefine("a", [], () => { log.push("a recomputed"); return 50; });
  globalThis.result2 = "pending";
  main.value("fetch").then((f) => { globalThis.result2 = f("request-2"); }, (e) => { globalThis.result2 = "ERR " + e; });
`, "redefine");
drain();
console.log("after redefine:", run("result2", "r2"), "| log", run("JSON.stringify(log)", "l"));

// Define a brand-new cell from a string at run time: the thing a Worker cannot do natively.
run(`
  const body = "(b) => b + 1000";
  main.variable().define("c", ["b"], (0, eval)(body));
  globalThis.result3 = "pending";
  main.value("c").then((v) => { globalThis.result3 = v; }, (e) => { globalThis.result3 = "ERR " + e; });
`, "new-cell");
drain();
console.log("new cell from string:", run("result3", "r3"));

// Speed: same loop natively and interpreted.
const loop = `(() => { let s = 0; for (let i = 0; i < 3e6; i++) s = (s + i * i) % 1000003; return s; })()`;
const n0 = performance.now(); const nat = (0, eval)(loop); const n1 = performance.now();
const q0 = performance.now(); const qjs = run(loop, "loop"); const q1 = performance.now();
console.log(JSON.stringify({
  quickjsLoadMs: +(t1 - t0).toFixed(1), runtimeEvalMs: +(t3 - t2).toFixed(1), firstValueMs: +(t4 - t3).toFixed(1),
  loop: { same: nat === qjs, nativeMs: +(n1 - n0).toFixed(1), quickjsMs: +(q1 - q0).toFixed(1), slowdown: +((q1 - q0) / (n1 - n0)).toFixed(0) },
}));
vm.dispose();
