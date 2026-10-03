// Live check: the real robocoop-5 notebook, pointed at claude-runner.ts through its `endpoint` setting,
// runs one turn that needs the notebook's own tools.
//
//   bun tools/robocoop-5/claude-runner.ts --token spike &
//   node tools/robocoop-5/claude-runner-live.mjs [--base http://127.0.0.1:8765/v1] [--token spike] [--model claude-haiku-4-5]
//
// --paired LOPE-<port>-XXXX: against a channel server started with LOPECODE_LLM_RUNNER=1. Nothing is put in
// the endpoint setting; the notebook is opened with cc=<token> and must find the runner itself.
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";

const arg = (n, d) => { const i = process.argv.indexOf("--" + n); return i >= 0 ? process.argv[i + 1] : d; };
const paired = arg("paired", null);
const base = paired ? "http://127.0.0.1:" + paired.split("-")[1] + "/v1" : arg("base", "http://127.0.0.1:8765/v1");
const token = paired || arg("token", "spike");
const model = arg("model", "claude-haiku-4-5");
const notebook = arg("notebook", fileURLToPath(new URL("../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html", import.meta.url)));
const prompt = arg("prompt", "Use your tools to list the files under /src, then tell me how many entries there are and finish.");

const health = async () => { const h = await (await fetch(base.replace(/\/v1$/, "") + "/health")).json(); return h.llm?.requests != null ? h.llm : h.stats; };
const before = await health();
// --chromium <executable>: use another installed build when this package's own browser is missing.
const executablePath = arg("chromium", undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.addInitScript(([b, t, m, p]) => {
  try {
    if (p) localStorage.setItem("robocoop5_model@claude-code", m);
    else {
      localStorage.setItem("robocoop5_endpoint", b);
      localStorage.setItem("OPENROUTER_API_KEY", t);
      localStorage.setItem("robocoop5_model@" + b, m);
    }
  } catch {}
}, [base, token, model, paired]);
const hash = paired ? "#view=R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))&cc=" + paired : "";
await page.goto("file://" + notebook + hash, { waitUntil: "load", timeout: 30000 });
await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, { timeout: 30000 });

const out = await page.evaluate(async ({ prompt }) => {
  const engine = [...globalThis.__ojs_runtime.mains.entries()].find(([k]) => k === "@tomlarkworthy/robocoop-5-engine")[1];
  const [session, endpointBase, demoMode, models, modelView] = await Promise.all(
    ["session", "endpointBase", "demoMode", "openrouter_models", "modelView"].map((n) => engine.value(n)));
  // The chat renders in a shadow root, so build the panel from its cell instead of querying the document.
  const ui = [...globalThis.__ojs_runtime.mains.entries()].find(([k]) => k === "@tomlarkworthy/robocoop-5")[1];
  const settings = (await ui.value("rc5_settingsPanel"))();
  const calls = [];
  const r = await session.send(prompt, { onToolCall: (id, name) => calls.push(name) });
  return {
    endpointBase, demoMode, models, picked: modelView.value,
    endpointInSettings: [...settings.querySelectorAll("label")].map((l) => l.textContent.trim()).filter(Boolean).join(" | "),
    finishReason: r.finishReason, steps: r.steps, calls,
    answer: [...r.messages].reverse().find((m) => m.role === "assistant" && m.content)?.content,
    usage: r.usage,
  };
}, { prompt });
const after = await health();
await browser.close();

let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
check(paired ? "endpoint found from the pairing token" : "endpoint read from the setting", out.endpointBase === base, String(out.endpointBase));
check("not demo mode", out.demoMode === false);
check("picker lists the runner's models", Array.isArray(out.models) && out.models.includes(model), JSON.stringify(out.models));
check("picker holds the endpoint's own choice", out.picked === model, String(out.picked));
check("endpoint field is in the settings panel", /^endpoint \| /.test(out.endpointInSettings), out.endpointInSettings);
check("the notebook's own tools ran", out.calls.length > 0, out.calls.join(","));
check("turn completed", out.finishReason === "completed", `${out.finishReason} in ${out.steps} steps`);
check("one SDK conversation, no rebuild", after.started - before.started === 1 && after.rebuilt === before.rebuilt, JSON.stringify(after));
check("no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
console.log("answer:", JSON.stringify(out.answer)?.slice(0, 400));
console.log("usage:", JSON.stringify(out.usage));
process.exit(failed ? 1 : 0);
