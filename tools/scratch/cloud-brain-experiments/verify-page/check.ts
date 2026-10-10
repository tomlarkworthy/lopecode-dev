import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.argv[3] }), p = await b.newPage();
const errs: string[] = []; p.on("pageerror", (e) => errs.push(String(e).slice(0, 200))); p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
await p.goto("file://" + process.argv[2]);
try { await p.waitForFunction("window.__verify", null, { timeout: 60000 }); console.log(JSON.stringify(await p.evaluate("window.__verify"))); } catch (e) { console.log("no result", errs.slice(0, 6), await p.evaluate("[!!window.__ojs_runtime, window.__ojs_runtime && window.__ojs_runtime._variables.size, window.__ojs_runtime && window.__ojs_runtime.mains && [...window.__ojs_runtime.mains.keys()]]")); }
await b.close();
