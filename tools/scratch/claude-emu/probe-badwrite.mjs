// What happens when an uncompilable module is written? Does anything surface?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(2500);
console.log(JSON.stringify(await p.evaluate(async () => {
  const fs = document.querySelector("#cb-cli-frame").contentWindow.__REG.fs;
  fs.mkdirSync("/src/@bad", { recursive: true });
  const out = {};
  // 1. syntax error: unbalanced brace
  const broken = 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("x")).define("x",[],()=>1);return main;';
  try { fs.writeFileSync("/src/@bad/syntax.js", broken); out.syntaxWriteThrew = false; } catch (e) { out.syntaxWriteThrew = String(e.message).slice(0, 80); }
  // 2. compiles, but the cell throws when observed
  const runtimeErr = 'export default function define(runtime, observer){const main=runtime.module();main.variable(observer("x")).define("x",[],()=>{throw new Error("BOOM")});return main;}';
  try { fs.writeFileSync("/src/@bad/runtime.js", runtimeErr); out.runtimeWriteThrew = false; } catch (e) { out.runtimeWriteThrew = String(e.message).slice(0, 80); }
  await new Promise((r) => setTimeout(r, 2000));
  out.readBackSyntax = (fs.readFileSync("/src/@bad/syntax.js", "utf8") || "").length;
  return out;
}, null)));
console.log("host/runtime state:", JSON.stringify(await p.evaluate(() => {
  const ids = []; try { for (const i of window.__CB_DEPS.currentModules.values()) if (i && i.name) ids.push(i.name); } catch {}
  return { badModulesLive: ids.filter((i) => i.startsWith("@bad/")), errorNodes: document.querySelectorAll(".observablehq--error").length };
})));
await b.close(); process.exit(0);
