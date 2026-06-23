// What can the agent's bash shell actually do? List commands; test node/base64/gunzip/od.
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
  const sh = await force("rc4_agentShell");
  const r = {};
  if (!sh) return { err: "no rc4_agentShell" };
  const run = async (c) => { const res = await sh.run(c); return ((res.stdout || "") + (res.stderr ? " ERR:" + res.stderr : "") + (res.exitCode ? " [exit " + res.exitCode + "]" : "")).slice(0, 220); };
  r.help = await run("help");
  r.node = await run("node -e 'console.log(1+1)'");
  r.nodeVer = await run("node --version");
  r.base64 = await run("echo hi | base64");
  r.gunzip = await run("gunzip --help");
  r.zcat = await run("zcat --help");
  r.od = await run("printf 'AB' | od -An -tx1");
  r.xxd = await run("printf 'AB' | xxd");
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
