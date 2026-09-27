// S4: live guardrails through robocoop5(opts). Three chats built in a module that imports robocoop5:
//   reviewer — `tools` drops every writing/evaluating tool; asked to write, it has nothing to call.
//   hooked   — `hooks.beforeTool` refuses list_values; the refusal is the tool result.
//   plain    — no options; the built-in guard refuses a write into a SAVED session module.
import { chromium } from "playwright";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1400, height: 1400 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
await page.goto(pathToFileURL(nb).href);
await page.locator('[data-rc5-group] textarea[placeholder^="Message robocoop-5"]').waitFor({ timeout: 120000 });

await page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const m = rt.module();
  m.import("robocoop5", rt.mains.get("@tomlarkworthy/robocoop-5"));
  window.__hookSaw = [];
  const specs = {
    reviewer: { tools: ts => ts.filter(t => !/write|edit|eval|attach|python/.test(t.id)) },
    hooked: { hooks: { beforeTool: ({ name }) => { window.__hookSaw.push(name); return name === "list_values" ? "hook says no" : null; } } },
    plain: {}
  };
  for (const [g, opts] of Object.entries(specs)) {
    const host = document.createElement("div");
    host.id = "chat-" + g;
    host.style.cssText = "height:400px;position:relative;z-index:10000;background:#000";
    document.body.prepend(host);
    m.variable({ fulfilled(v) { host.replaceChildren(v); } })
      .define(g, ["robocoop5", "invalidation"], (robocoop5, invalidation) => robocoop5({ group: "s4-" + g, invalidation, ...opts }));
  }
});
for (const g of ["reviewer", "hooked", "plain"]) await page.locator(`#chat-${g} textarea`).waitFor({ timeout: 60000 });

const say = async (g, text) => {
  await page.locator(`#chat-${g} textarea`).fill(text);
  await page.locator(`#chat-${g} textarea`).press("Enter");
  await page.waitForFunction(g => {
    const r = document.querySelector(`#chat-${g} [data-rc5-group]`);
    return r?.active && !r.active.busy && r.active.log && r.active.session?.messages.some(m => m.role === "assistant" && m.content);
  }, g, { timeout: 300000, polling: 1000 });
  return page.evaluate(g => {
    const e = document.querySelector(`#chat-${g} [data-rc5-group]`).active;
    const ms = e.session.messages;
    return {
      chat: g,
      calls: ms.flatMap(m => (m.tool_calls || []).map(t => t.function.name + " " + t.function.arguments.slice(0, 70))),
      refusals: ms.filter(m => m.role === "tool" && String(m.content).startsWith("Refused by guardrail")).map(m => m.content),
      reply: ms.filter(m => m.role === "assistant" && m.content).map(m => m.content).at(-1)?.slice(0, 200)
    };
  }, g);
};

console.log(JSON.stringify(await say("reviewer", "Use write_file to create /src/@user/probe.js containing `x = 1`. If you have no tool that can write files, say exactly: NO WRITE TOOL.")));
console.log(JSON.stringify(await say("hooked", "Call list_values once. Then report the exact tool result text you got back.")));
console.log("hook saw", JSON.stringify(await page.evaluate(() => window.__hookSaw)));

// save the reviewer's session, then ask the plain chat to overwrite it
await page.locator('#chat-reviewer label:has-text("save") input[type=checkbox]').evaluate(el => el.click());
await page.waitForFunction(() => [...window.__ojs_runtime.mains.keys()].some(k => k.startsWith("@s4-reviewer/")), null, { timeout: 15000 });
const target = await page.evaluate(() => [...window.__ojs_runtime.mains.keys()].find(k => k.startsWith("@s4-reviewer/")));
console.log("saved", target);
console.log(JSON.stringify(await say("plain", `Use write_file to create the file /src/${target}.js containing \`x = 1\`. Then report the exact tool result text you got back.`)));
console.log("errors", JSON.stringify(errors.slice(0, 5)));
await browser.close();
