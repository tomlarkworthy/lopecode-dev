// S37: one hidden Inputs.input state cell with a °C box (Inputs.bind) and a °F box (converting bind).
// Typing in either box must update the state cell `celsius` and the other box; typed text must survive.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const { default: ev } = await import("../../robocoop-5/eval/rc5t/temperature-two-way.mjs");
const src = ev.oracle.find(o => o.tool === "write_file").args.content;
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(pathToFileURL(nb).href);
await page.waitForFunction(() => document.querySelector("[data-rc5-group]")?.active?.session?.askBus, null, { timeout: 120000 });
const out = await page.evaluate(async (src) => {
  const rt = window.__ojs_runtime;
  let tv; for (let i = 0; i < 100 && !(tv = [...rt._variables].find(v => v._name === "toolsView" && v._value?.value?.length)); i++) await new Promise(r => setTimeout(r, 200));
  const tools = new Map(tv._value.value.map(t => [t.id, t]));
  await tools.get("write_file").execute({ file_path: "/src/@probe/temp.js", content: src }, {});
  const mod = rt.mains.get("@probe/temp");
  const v = n => [...rt._variables].find(x => x._module === mod && x._name === n);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const val = async n => { const x = v(n); x._reachable || mod.variable(true).define([n], y => y); await sleep(300); return x._value; };
  const c = (await val("cBox")).querySelector("input"), f = (await val("fBox")).querySelector("input");
  const type = async (el, t) => { el.value = t; el.dispatchEvent(new Event("input", { bubbles: true })); await sleep(400); };
  const rows = [];
  for (const [el, name, t] of [[f, "F", "212"], [c, "C", "-40"], [f, "F", "98.6"]]) {
    await type(el, t);
    rows.push({ typed: name + "=" + t, celsius: await val("celsius"), c: c.value, f: f.value, typedKept: el.value === t });
  }
  return rows;
}, src);
console.log(JSON.stringify(out, null, 1));
await browser.close();
