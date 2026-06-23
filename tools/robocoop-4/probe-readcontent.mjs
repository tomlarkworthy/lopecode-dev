// Verify read_content registers and reads/enumerates/decodes microkernel content blocks.
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
  const viewEl = find("viewof rc4_tools")?._value;
  const tools = (viewEl && Array.isArray(viewEl.value)) ? viewEl.value : [];
  const r = { toolIds: tools.map((t) => t.id) };
  const rc = tools.find((t) => t.id === "read_content");
  if (!rc) return r;
  r.list = (await rc.execute({}, {})).output.slice(0, 700);
  r.bootconf = (await rc.execute({ id: "bootconf.json" }, {})).output;
  const bashRes = await rc.execute({ id: "@tomlarkworthy/robocoop-4-bash/just-bash.browser.js.gz" }, {});
  r.bashHead = bashRes.output.slice(0, 260);
  r.bashMeta = bashRes.metadata;
  r.bootloaderHead = (await rc.execute({ id: "@tomlarkworthy/bootloader" }, {})).output.slice(0, 200);
  r.missing = (await rc.execute({ id: "nope/does-not-exist" }, {})).output.slice(0, 120);
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
