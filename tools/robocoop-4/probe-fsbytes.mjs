// Prove the redesign: write a gzip content block into the workspace fs as raw bytes,
// then decompress it from the agent shell with zcat/gunzip (pure userspace, no tool).
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
  const ws = await force("rc4_workspace");
  const sh = await force("rc4_agentShell");
  const r = {};
  if (!ws || !sh) return { err: "no workspace/shell", ws: !!ws, sh: !!sh };
  const fs = ws.fs;
  // decode the bash attachment block to raw gzip bytes
  const el = document.getElementById("@tomlarkworthy/robocoop-4-bash/just-bash.browser.js.gz");
  const bin = atob((el.textContent || "").replace(/\s+/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  r.gzBytes = bytes.length;
  const path = "/content/@tomlarkworthy/robocoop-4-bash/just-bash.browser.js.gz";
  // 1. can we writeFile raw bytes into a NESTED path?
  try { await fs.writeFile(path, bytes); r.wroteOk = true; }
  catch (e) { r.writeErr = String(e?.message ?? e); }
  // also write a small text file for control
  try { await fs.writeFile("/content/bootconf.json", new TextEncoder().encode('{"hi":1}')); } catch (e) {}
  // 2. does the shell see it + read it back as bytes?
  const run = async (c) => { const res = await sh.run(c); return ((res.stdout || "") + (res.stderr ? " ERR:" + res.stderr : "") + (res.exitCode ? " [exit " + res.exitCode + "]" : "")).slice(0, 200); };
  r.ls = await run("ls -la /content/@tomlarkworthy/robocoop-4-bash/");
  r.fileBytes = await run("wc -c < " + path);
  // 3. THE TEST: decompress in pure userspace shell
  r.zcatHead = await run("zcat " + path + " | head -c 80");
  r.gunzipSize = await run("gunzip -c " + path + " | wc -c");
  r.grepSymbol = await run("gunzip -c " + path + " | grep -o InMemoryFs | head -1");
  // read back via fs API as buffer to confirm round-trip
  try { const buf = await fs.readFileBuffer(path); r.readBackBytes = buf.length; } catch (e) { r.readBackErr = String(e?.message ?? e); }
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
