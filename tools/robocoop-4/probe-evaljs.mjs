// Prove module-scoped JS eval: define a temp variable in @tomlarkworthy/robocoop-4-bash whose
// inputs include the module's FileAttachment builtin, run DecompressionStream on the bundle, read value.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 160)}`));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY", "sk-probe"); localStorage.setItem("robocoop4_model", "x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(5000);
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function allVars() { const o = []; const s = new Set(); for (const m of reg.mains.values()) { const rt = m?._runtime; if (!rt || s.has(rt)) continue; s.add(rt); for (const v of rt._variables) o.push(v); } return o; }
  const find = (n) => allVars().find((v) => v._name === n);
  const force = async (n) => { const v = find(n); if (v?._module?.value) { try { v._module.value(n).catch(() => {}); } catch {} await sleep(250); if (v._promise?.then) { try { await Promise.race([v._promise.catch(() => {}), sleep(2500)]); } catch {} } } return v?._value; };
  await force("rc4_workspace");
  const currentModules = await force("currentModules");
  // resolve module by name via module-map (imported modules carry no _name)
  const moduleByName = (id) => {
    if (currentModules) for (const [, info] of currentModules) if (info && info.name === id) return info.module;
    if (reg.mains && reg.mains.has(id)) return reg.mains.get(id);
    return null;
  };
  const AsyncFunction = (async () => {}).constructor;

  // The eval-in-module primitive under test.
  async function evalInModule(mod, code, extraNames = []) {
    // candidate names: module's named vars + standard builtins, filtered to those referenced in code
    const names = new Set(extraNames);
    for (const v of allVars()) if (v._module === mod && v._name && /^[A-Za-z_$][\w$]*$/.test(v._name)) names.add(v._name);
    ["FileAttachment", "md", "html", "Inputs", "Plot", "d3", "Generators"].forEach((n) => names.add(n));
    const inputs = [...names].filter((n) => new RegExp("\\b" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b").test(code));
    const trimmed = code.trim();
    const isExpr = !/[;\n]/.test(trimmed) && !/^\s*(return|const|let|var|throw|if|for|while|await|async|function|\{)/.test(trimmed);
    const body = isExpr ? "return (" + trimmed + ");" : code;
    const fn = new AsyncFunction(...inputs, body);
    return await new Promise((resolve, reject) => {
      let done = false; let v;
      const finish = (fn2) => { if (done) return; done = true; try { v && v.delete(); } catch (e) {} fn2(); };
      v = mod.variable({
        fulfilled: (val) => finish(() => resolve({ inputs, value: val })),
        rejected: (err) => finish(() => resolve({ inputs, error: (err && err.message) || String(err) })),
        pending: () => {},
      });
      try { v.define(null, inputs, fn); } catch (e) { finish(() => resolve({ inputs, error: "define failed: " + ((e && e.message) || e) })); return; }
      setTimeout(() => finish(() => resolve({ inputs, error: "timed out 8s" })), 8000);
    });
  }

  const r = {};
  const mod = moduleByName("@tomlarkworthy/robocoop-4-bash");
  r.haveModule = !!mod;
  if (!mod) return r;
  // 1. simple expression scoped to module
  r.simple = await evalInModule(mod, "1 + 2 * 3");
  // 2. THE TEST: decompress the bundle via FileAttachment + DecompressionStream
  r.decode = await evalInModule(mod,
    "const buf = await new Response((await FileAttachment('just-bash.browser.js.gz').stream()).pipeThrough(new DecompressionStream('gzip'))).text();\n" +
    "return { chars: buf.length, hasInMemoryFs: buf.includes('InMemoryFs'), head: buf.slice(0, 40) };");
  // 3. error path
  r.err = await evalInModule(mod, "return notDefinedThing + 1;");
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
