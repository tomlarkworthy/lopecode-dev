// Probe: what can the agent actually reach for SELF-understanding?
//  (a) which modules are projected into its bash fs (/notebook)
//  (b) can it inspect its own cells' values
//  (c) is window.lopecode.contentSync available + what content ids exist (bootconf, stdlib, FileAttachments)
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
await page.waitForTimeout(5000); // let watch loop project modules
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function allVars() { const o = []; const s = new Set(); for (const m of reg.mains.values()) { const rt = m?._runtime; if (!rt || s.has(rt)) continue; s.add(rt); for (const v of rt._variables) o.push(v); } return o; }
  const find = (n) => allVars().find((v) => v._name === n);
  const force = async (n) => { const v = find(n); if (v?._module?.value) { try { v._module.value(n).catch(() => {}); } catch {} await sleep(250); if (v._promise?.then) { try { await Promise.race([v._promise.catch(() => {}), sleep(2500)]); } catch {} } } return v?._value; };
  const r = {};

  // (a) agent fs contents
  const ws = await force("rc4_workspace");
  try {
    const paths = ws?.fs?.getAllPaths ? ws.fs.getAllPaths() : null;
    r.fsPaths = paths ? paths.filter((p) => p.startsWith("/notebook")).sort() : "(no getAllPaths)";
  } catch (e) { r.fsErr = String(e?.message ?? e); }

  // (b) value tools present?
  const viewEl = find("viewof rc4_tools")?._value;
  const tools = (viewEl && Array.isArray(viewEl.value)) ? viewEl.value : [];
  r.toolIds = tools.map((t) => t.id);

  // (c) microkernel content API reachable from page?
  r.haveLopecode = typeof globalThis.lopecode?.contentSync === "function";
  if (r.haveLopecode) {
    const probe = (id) => { try { const x = globalThis.lopecode.contentSync(id); return { status: x.status, mime: x.mime, bytes: x.bytes?.length }; } catch (e) { return String(e?.message ?? e); } };
    r.bootconf = probe("bootconf.json");
    r.bashAttach = probe("@tomlarkworthy/robocoop-4-bash/just-bash.browser.js.gz");
    // enumerate all text/plain block ids in the DOM
    const ids = Array.from(document.querySelectorAll('script[type="text/plain"]')).map((s) => s.id);
    r.totalBlocks = ids.length;
    r.sampleIds = ids.slice(0, 12);
    r.bootconfText = (() => { try { return new TextDecoder().decode(globalThis.lopecode.contentSync("bootconf.json").bytes).slice(0, 300); } catch (e) { return String(e); } })();
  }
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
