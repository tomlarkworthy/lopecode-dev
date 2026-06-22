// Headless probe for the realtime self-edit + discoverability issues:
//  Q1 Cmd+K: is commandPaletteKeybinding computed without error?
//  Q2 discoverability: does cell-map `modules` (the palette source) include modules, and grow on create?
//  Q3 tools-on-existing: does editing an existing module's projected file apply to the live runtime?
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const notebookPath = join(here, "..", "..", "lopebooks", "notebooks", "@tomlarkworthy_robocoop-4.html");
const layout = "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))";

const browser = await chromium.launch({
  headless: true,
  args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows"],
});
const page = await (await browser.newContext()).newPage();
page.on("console", (m) => { const t = m.type(); if (t === "error" || t === "warning") console.log(`  [console.${t}] ${m.text().slice(0, 300)}`); });
page.on("pageerror", (e) => console.log(`  [pageerror] ${e.message.slice(0, 300)}`));
await page.addInitScript(() => { try { localStorage.setItem("OPENROUTER_API_KEY", "sk-probe"); localStorage.setItem("robocoop4_model", "anthropic/claude-sonnet-4"); } catch {} });

await page.goto(`file://${notebookPath}#view=${layout}`, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });
console.log("booted. waiting 4s for watch-loop initial projection...");
await page.waitForTimeout(4000);

const report = await page.evaluate(async () => {
  const reg = globalThis.__ojs_runtime;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function allVars() {
    const out = []; const seen = new Set();
    for (const m of reg.mains.values()) { const rt = m?._runtime; if (!rt || seen.has(rt)) continue; seen.add(rt); for (const v of rt._variables) out.push({ v, mod: v._module }); }
    return out;
  }
  const find = (name) => allVars().find((x) => x.v._name === name);
  const forceVal = async (name) => {
    const x = find(name); if (!x) return { missing: true };
    try { if (typeof x.mod.value === "function") x.mod.value(name).catch(() => {}); } catch {}
    await sleep(300);
    if (x.v._promise?.then) { try { await Promise.race([x.v._promise.catch(() => {}), sleep(3000)]); } catch {} }
    return { error: x.v._error ? String(x.v._error?.message ?? x.v._error) : null, hasValue: x.v._value !== undefined, valueType: typeof x.v._value };
  };

  const r = {};

  // Q1a: NATURAL reachability — is the keybinding observed (registered) without us forcing it?
  const natural = (name) => { const x = find(name); return x ? { hasValue: x.v._value !== undefined, err: x.v._error ? String(x.v._error?.message ?? x.v._error) : null } : { missing: true }; };
  r.natural = { background_jobs: natural("background_jobs"), commandPaletteKeybinding: natural("commandPaletteKeybinding"), cc_chat: natural("cc_chat"), page: natural("page") };

  // Q1b: force-compute keybinding (+ its plugin deps)
  r.cmdk = {};
  for (const n of ["commandPaletteKeybinding", "moduleFinderPlugin", "cellSearchPlugin", "commandPaletteOverlay"]) r.cmdk[n] = await forceVal(n);

  // Q2: cell-map `modules` Map contents (the palette's source). force it, read names.
  await forceVal("modules");
  const modulesVal = find("modules")?.v._value;
  r.modulesType = modulesVal && typeof modulesVal.forEach === "function" ? "Map" : typeof modulesVal;
  r.moduleNamesBefore = [];
  if (modulesVal?.forEach) modulesVal.forEach((info) => { if (info?.name) r.moduleNamesBefore.push(info.name); });

  // also currentModules (module-map / module-selection)
  await forceVal("currentModules");
  const cm = find("currentModules")?.v._value;
  r.currentModuleNames = [];
  if (cm?.forEach) cm.forEach((info) => { if (info?.name) r.currentModuleNames.push(info.name); });

  // Q3 prep: read the projected exporter-3 file from the agent workspace fs.
  const ws = find("rc4_workspace")?.v._value;
  r.wsOk = !!(ws && ws.fs);
  const EXP = "/notebook/@tomlarkworthy/exporter-3.js";
  let before = null;
  try { before = await ws.fs.readFile(EXP, "utf8"); } catch (e) { r.expReadErr = String(e?.message ?? e); }
  r.expProjected = before != null;
  r.expHasExportDefault = before ? /export\s+default/.test(before) : null;
  r.expTitleLine = before ? (before.split("\n").find((l) => l.includes("Exporter 3")) || null) : null;

  // Q2b: CREATE a fresh module by writing a file; wait; does it appear in cell-map modules + currentModules?
  const NEWID = "@user/probe-xyz";
  const NEWFILE = "/notebook/@user/probe-xyz.js";
  const moduleFile =
    'const _probeCell = function probeCell(){return( 123 )};\n' +
    'export default function define(runtime, observer){\n' +
    '  const main = runtime.module();\n' +
    '  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;\n' +
    '  $def("_probeCell", "probeCell", [], _probeCell);\n' +
    '  return main;\n}\n';
  try { if (ws.fs.mkdir) { try { await ws.fs.mkdir("/notebook/@user", { recursive: true }); } catch {} } await ws.fs.writeFile(NEWFILE, moduleFile); } catch (e) { r.createWriteErr = String(e?.message ?? e); }

  // Q3: EDIT exporter-3 title in the projected file; expect watch loop to apply to live runtime.
  if (before) {
    const edited = before.replace("# Exporter 3", "# PROBE-EDITED");
    try { await ws.fs.writeFile(EXP, edited); } catch (e) { r.editWriteErr = String(e?.message ?? e); }
    r.editWrote = edited !== before;
  }

  // wait for several watch-loop poll cycles (~600ms each)
  await sleep(4000);

  // re-read discoverability after create
  await forceVal("modules"); const mv = find("modules")?.v._value;
  r.moduleNamesAfter = []; if (mv?.forEach) mv.forEach((info) => { if (info?.name) r.moduleNamesAfter.push(info.name); });
  await forceVal("currentModules"); const cm2 = find("currentModules")?.v._value;
  r.currentAfter = []; if (cm2?.forEach) cm2.forEach((info) => { if (info?.name) r.currentAfter.push(info.name); });
  r.newInModules = r.moduleNamesAfter.includes(NEWID);
  r.newInCurrent = r.currentAfter.includes(NEWID);
  r.newInMains = reg.mains.has(NEWID);

  // Q3 result: did the live exporter-3 title cell pick up the edit? find exporter-3 module + its md title var.
  let exp3mod = null;
  const cmInfo = cm2; if (cmInfo?.forEach) cmInfo.forEach((info) => { if (info?.name === "@tomlarkworthy/exporter-3") exp3mod = info.module; });
  r.exp3Found = !!exp3mod;
  if (exp3mod) {
    // find the title variable: a var whose current definition/value mentions Exporter 3 or PROBE-EDITED
    const vars = (exp3mod._runtime?._variables ? [...exp3mod._runtime._variables] : []).filter((v) => v._module === exp3mod);
    let titleVar = vars.find((v) => { try { return String(v._definition).includes("Exporter 3") || String(v._definition).includes("PROBE-EDITED"); } catch { return false; } });
    if (titleVar) {
      try { exp3mod.value(titleVar._name); } catch {}
      await sleep(500);
      r.exp3TitleDef = (() => { try { return String(titleVar._definition).split("\n").find((l) => l.includes("Exporter 3") || l.includes("PROBE-EDITED")) || null; } catch { return null; } })();
      try { const el = titleVar._value; r.exp3RenderedHTML = (el && el.outerHTML ? el.outerHTML : String(el)).slice(0, 200); } catch {}
    } else r.exp3TitleVarMissing = true;
  }
  // re-read the projected file: was the agent's edit clobbered back by re-projection?
  try { r.expFileAfter = (await ws.fs.readFile(EXP, "utf8")).split("\n").find((l) => l.includes("Exporter 3") || l.includes("PROBE-EDITED")) || null; } catch {}

  return r;
});
console.log("\n=== Q1 Cmd+K (keybinding + plugins) ===");
console.log(JSON.stringify(report.cmdk, null, 2));
console.log("\n=== Q2 discoverability ===");
console.log("modules (cell-map) type:", report.modulesType, "count:", report.moduleNamesBefore.length);
console.log("  sample:", report.moduleNamesBefore.slice(0, 8).join(", "));
console.log("currentModules count:", report.currentModuleNames.length, "sample:", report.currentModuleNames.slice(0, 8).join(", "));
console.log("\n=== Q1a NATURAL reachability (no force) ===");
console.log(JSON.stringify(report.natural, null, 2));
console.log("\n=== Q3 prep (exporter-3 projected file) ===");
console.log("wsOk:", report.wsOk, "projected:", report.expProjected, "hasExportDefault:", report.expHasExportDefault);
console.log("titleLine:", report.expTitleLine, report.expReadErr ? "readErr=" + report.expReadErr : "");
console.log("\n=== Q2b CREATE module (write file -> live?) ===");
console.log("newInModules(cell-map):", report.newInModules, " newInCurrent(module-map):", report.newInCurrent, " newInMains:", report.newInMains);
console.log("createWriteErr:", report.createWriteErr || "none");
console.log("\n=== Q3 EDIT existing module (exporter-3 title) ===");
console.log("editWrote:", report.editWrote, "editWriteErr:", report.editWriteErr || "none");
console.log("exp3Found:", report.exp3Found, "titleVarMissing:", report.exp3TitleVarMissing || false);
console.log("live title definition:", report.exp3TitleDef);
console.log("live rendered HTML:", report.exp3RenderedHTML);
console.log("projected file title line AFTER (clobbered?):", report.expFileAfter);

await browser.close();
