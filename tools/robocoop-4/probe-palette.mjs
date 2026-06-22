// Verify Cmd+K discoverability: create a module live, then confirm the command palette's plugins
// (via `viewof commands`) return it as a result for a query — the actual user path.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling"] });
const page = await (await browser.newContext()).newPage();
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 200)}`));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY", "sk-probe"); localStorage.setItem("robocoop4_model", "x"); } catch {} });
await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
await page.waitForTimeout(3500);
const out = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime; const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function allVars() { const o = []; const s = new Set(); for (const m of reg.mains.values()) { const rt = m?._runtime; if (!rt || s.has(rt)) continue; s.add(rt); for (const v of rt._variables) o.push(v); } return o; }
  const find = (n) => allVars().find((v) => v._name === n);
  const force = async (n) => { const v = find(n); if (v?._module?.value) { try { v._module.value(n).catch(() => {}); } catch {} await sleep(250); if (v._promise?.then) { try { await Promise.race([v._promise.catch(() => {}), sleep(2500)]); } catch {} } } return v?._value; };
  const r = {};
  // register the keybinding path so moduleFinderPlugin is registered into `viewof commands`
  await force("commandPaletteKeybinding");
  await force("moduleFinderPlugin");
  r.kbErr = find("commandPaletteKeybinding")?._error ? String(find("commandPaletteKeybinding")._error) : null;
  r.mfpErr = find("moduleFinderPlugin")?._error ? String(find("moduleFinderPlugin")._error) : null;

  // create a fresh module by writing a module file to the agent workspace fs
  const ws = await force("rc4_workspace");
  const NEWID = "@user/fizzbuzzer";
  const file =
    'const _fb = function fizzword(){return( "Fizz" )};\n' +
    'export default function define(runtime, observer){\n' +
    '  const main = runtime.module();\n' +
    '  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n' +
    '  $def("_fb", "fizzword", [], _fb);\n  return main;\n}\n';
  try { if (ws.fs.mkdir) { try { await ws.fs.mkdir("/notebook/@user", { recursive: true }); } catch {} } await ws.fs.writeFile("/notebook/@user/fizzbuzzer.js", file); } catch (e) { r.writeErr = String(e?.message ?? e); }
  await sleep(4000); // let the watch loop apply + currentModules update + moduleFinderPlugin recompute

  // run the palette plugins with a query that should match the new module.
  // `viewof commands`.value IS the registered-plugins array (addCommand pushes onto it).
  await force("viewof commands");
  const viewEl = find("viewof commands")?._value;
  const commands = viewEl && Array.isArray(viewEl.value) ? viewEl.value : (find("commands")?._value);
  r.commandsType = Array.isArray(commands) ? ("array(" + commands.length + ")") : typeof commands;
  const query = "fizzbuzzer";
  const results = [];
  if (Array.isArray(commands)) {
    for (const plugin of commands) { try { const out = plugin(query); if (Array.isArray(out)) results.push(...out); } catch (e) {} }
  }
  r.matchLabels = results.map((c) => c.label).filter(Boolean);
  r.foundNew = r.matchLabels.some((l) => l.includes("fizzbuzzer"));
  // also confirm currentModules has it
  const cm = await force("currentModules"); const names = []; if (cm?.forEach) cm.forEach((i) => { if (i?.name) names.push(i.name); });
  r.inCurrentModules = names.includes(NEWID);
  return r;
});
console.log(JSON.stringify(out, null, 2));
await browser.close();
