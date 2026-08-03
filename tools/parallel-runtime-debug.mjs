import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
const p = await b.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERR " + e.message));
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.type() + ": " + m.text().slice(0, 200)); });
await p.goto("file://" + process.cwd() + "/notebooks/@tomlarkworthy_parallel-runtime.html");
await p.waitForFunction(() => !!window.__ojs_runtime && !!window.__ojs_parallel, null, { timeout: 60000 });
await p.waitForTimeout(15000);
const state = await p.evaluate(() => {
  const st = window.__ojs_parallel;
  const vars = [];
  for (const v of window.__ojs_runtime._variables) {
    if (!v._name || v._type !== 1) continue;
    const status = v._value !== undefined ? "ok" : "pending/err";
    vars.push({ name: v._name, status });
  }
  const interesting = vars.filter((v) => /band|cfg|checksum|figure|renderBand|parallelFlag|liveness/.test(v.name));
  return {
    stats: { enabled: st.enabled, offloaded: st.offloaded, completed: st.completed, fallbacks: st.fallbacks, poolSize: st.poolSize },
    fallbackLog: st.fallbackLog,
    interesting,
    totalVars: vars.length,
    okVars: vars.filter((v) => v.status === "ok").length
  };
});
console.log(JSON.stringify(state, null, 1));
console.log("errors:", errs.slice(0, 20).join("\n"));
await b.close();
