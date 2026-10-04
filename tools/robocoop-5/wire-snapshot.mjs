// Wire snapshot for robocoop-5: one SHA-256 over everything a fixed scripted session sends to the model.
//
// The notebook is booted in Chromium with the network cut. The script's user messages are typed into the
// chat's own textarea, so the turn goes through robocoop5() -> session controller -> makeSession -> the
// real client. Every POST to /chat/completions is captured (system prompt, tool schemas, every message)
// and answered from the script. Nothing below the HTTP request is stubbed, so a refactor of any cell
// between the textarea and fetch() is covered.
//
//   node tools/robocoop-5/wire-snapshot.mjs <notebook.html> [--dump out.json] [--raw raw.json]
//   node tools/robocoop-5/wire-snapshot.mjs <notebook.html> --check        # compare with wire-baseline.json
//   node tools/robocoop-5/wire-snapshot.mjs <notebook.html> --record       # write wire-baseline.json
//   node tools/robocoop-5/wire-snapshot.mjs <notebook.html> --self-test    # R2: three edits, three new hashes
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { SCRIPT, SCRIPT_SHIPPED } from "./wire-script.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, "wire-baseline.json");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";
const MODEL = "wire/model";
const FIXED_TIME = "2026-01-02T03:04:05.000Z";
const STEP_MS = 400;

export const sha = (s) => createHash("sha256").update(s).digest("hex");

// The only field replaced. Two runs of one file send byte-identical requests, because the page's clock is
// fixed (durations read 0, the environment block's time repeats) and Math.random is seeded (generated
// pids and session ids repeat). The page URL differs when the same notebook sits at another path, which
// is how a baseline copy is compared with the working copy.
export const NORMALISERS = [
  ["page URL", /file:\/\/\/[^\s"'`)\\]*?\.html/g, "<PAGE>"],
];

export function normalise(text) {
  let out = text;
  for (const [, re, to] of NORMALISERS) out = out.replace(re, to);
  return out;
}

// One model reply as the SSE stream createOpenRouterClient reads.
function sse(reply, n) {
  const delta = {};
  if (reply.text != null) delta.content = reply.text;
  const calls = reply.calls ?? (reply.tool ? [{ tool: reply.tool, args: reply.args ?? {}, rawArgs: reply.rawArgs }] : []);
  if (calls.length) delta.tool_calls = calls.map((c, i) => ({
    index: i, id: "wire-" + n + (calls.length > 1 ? "-" + i : ""), type: "function",
    function: { name: c.tool, arguments: c.rawArgs ?? JSON.stringify(c.args ?? {}) },
  }));
  const finish = calls.length ? "tool_calls" : "stop";
  return [
    "data: " + JSON.stringify({ choices: [{ delta, finish_reason: null }] }),
    "data: " + JSON.stringify({ choices: [{ delta: {}, finish_reason: finish }], usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0 }, provider: "wire" }),
    "data: [DONE]", "",
  ].join("\n\n");
}

export async function snapshot({ notebook, script = SCRIPT, headless = true, timeout = 120000 } = {}) {
  const notebookPath = resolve(notebook);
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ timezoneId: "UTC", locale: "en-US", viewport: { width: 1280, height: 800 } });
  const requests = [];      // raw request bodies, in order
  const blocked = new Set();
  const problems = [];
  const queue = [];         // replies for the turn in progress

  await context.route(/^https?:\/\//, async (route) => {
    const req = route.request();
    const url = req.url();
    if (/\/chat\/completions$/.test(url) && req.method() === "POST") {
      requests.push(req.postData() ?? "");
      // A model takes seconds to answer; the stub would answer in one. Cells the last tool call set off are
      // still recomputing then, and what the next step is told about them would depend on the race.
      await settle();
      let reply = queue.shift();
      if (!reply) { problems.push("script exhausted at request " + requests.length); reply = { tool: "task_complete", args: { summary: "wire-snapshot: script exhausted" } }; }
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: sse(reply, requests.length) });
    }
    if (/\/models(\?|$)/.test(url)) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [{
        id: MODEL, name: "Wire model", context_length: 200000, pricing: { prompt: "0", completion: "0" },
        architecture: { input_modalities: ["text"], output_modalities: ["text"] }, supported_parameters: ["tools", "reasoning"],
      }] }) });
    }
    blocked.add(url.replace(/\?.*$/, ""));
    return route.abort();
  });

  const page = await context.newPage();
  // Settled = the runtime has nothing dirty or computing on two looks STEP_MS apart, after one STEP_MS wait.
  const quiet = () => page.evaluate(() => { const rt = globalThis.__ojs_runtime; return !rt || (rt._dirty.size === 0 && !rt._computing); }).catch(() => true);
  const settle = async () => {
    await page.waitForTimeout(STEP_MS);
    for (let i = 0, calm = 0; i < 40 && calm < 2; i++) { calm = (await quiet()) ? calm + 1 : 0; await page.waitForTimeout(STEP_MS / 2); }
  };
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.clock.setFixedTime(new Date(FIXED_TIME));
  await page.addInitScript(([model]) => {
    try {
      localStorage.setItem("OPENROUTER_API_KEY", "sk-wire-snapshot");
      localStorage.setItem("robocoop4_model", model);
      localStorage.setItem("robocoop5_temperature", "0");
    } catch {}
    // Seeded Math.random: generated ids (session ids, pids) repeat from run to run.
    let s = 0x5eed1234;
    Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }, [MODEL]);

  try {
    await page.goto("file://" + notebookPath + "#view=" + LAYOUT, { waitUntil: "load", timeout });
    const ta = page.locator('textarea[placeholder^="Message robocoop-5"]').first();
    await ta.waitFor({ state: "visible", timeout });
    // The tools and the model must be in place before the first send, or the first request differs by timing.
    await page.waitForFunction((model) => {
      const rt = globalThis.__ojs_runtime;
      const val = (n) => { for (const v of rt._variables) if (v._name === n && v._value !== undefined) return v._value; };
      const tv = val("toolsView");
      const tools = tv && Array.isArray(tv.value) ? tv.value : [];
      return tools.some((t) => t.id === "read_file") && tools.some((t) => t.id === "get_context") && val("model") === model;
    }, MODEL, { timeout });
    // Modules that load lazily after boot reach the agent as a watch update; wait until the count is still.
    for (let last = -1, still = 0; still < 4; ) {
      const n = await page.evaluate(() => new Set([...globalThis.__ojs_runtime._variables].map((v) => v._module)).size);
      still = n === last ? still + 1 : 0; last = n;
      await page.waitForTimeout(500);
    }
    await settle();

    for (const [i, turn] of script.entries()) {
      queue.length = 0;
      queue.push(...turn.replies);
      const before = requests.length;
      // A module the agent creates opens as a tab over the chat; bring the chat's tab back.
      if (!(await ta.isVisible())) await page.locator("button", { hasText: /^robocoop-5×$/ }).first().click({ position: { x: 6, y: 6 } }).catch(() => {});
      try { await ta.fill(turn.user, { timeout: 15000 }); }
      catch (e) {
        // A turn the script cannot type is a failed snapshot: say what the page shows.
        const state = await page.evaluate(() => ({
          textareas: [...document.querySelectorAll("textarea")].map((t) => ({ ph: t.placeholder.slice(0, 20), visible: !!t.offsetParent, disabled: t.disabled, connected: t.isConnected })),
          buttons: [...document.querySelectorAll("button")].filter((b) => b.offsetParent).map((b) => b.textContent.trim()).filter(Boolean).slice(0, 30),
        })).catch((x) => String(x));
        if (process.env.WIRE_SHOT) await page.screenshot({ path: process.env.WIRE_SHOT }).catch(() => {});
        throw new Error("turn " + i + ": could not type into the chat after " + requests.length + " requests: " + JSON.stringify(state));
      }
      await ta.press("Enter");
      // The turn is over when the composer is back to Send. The chat can be in a hidden tab (a module the
      // agent wrote opens over it), so the button is read by its text, not by whether it is visible.
      const steering = () => [...document.querySelectorAll("button")].some((b) => b.textContent === "Steer");
      await page.waitForFunction(steering, null, { timeout: 10000 }).catch(() => {});
      await page.waitForFunction("!(" + steering.toString() + ")()", null, { timeout });
      if (queue.length) problems.push("turn " + i + ": " + queue.length + " scripted replies not requested");
      if (requests.length === before) problems.push("turn " + i + ": no request sent");
      await page.waitForTimeout(500);
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const bodies = requests.map((r) => JSON.parse(normalise(r)));
  const text = JSON.stringify(bodies);
  return { hash: sha(text), requests: bodies.length, bytes: text.length, bodies, raw: requests, blocked: [...blocked].sort(), problems, pageErrors };
}

const summary = (r) => ({ hash: r.hash, requests: r.requests, bytes: r.bytes, problems: r.problems, blocked: r.blocked.length, pageErrors: r.pageErrors.length });

// R2: the hash must move when a system-prompt character, a tool description or a rule's text changes.
async function selfTest(notebook) {
  const src = readFileSync(resolve(notebook), "utf8");
  const edits = [
    ["system prompt", "You are a coding agent that builds and edits", "You are a coding agent that builds and edits."],
    ["tool description", "Find files by glob pattern", "Find files by glob pattern."],
    ["rule text", "You ended your turn without calling a tool", "You ended your turn without calling a tool."],
  ];
  const dir = mkdtempSync(join(tmpdir(), "wire-snapshot-"));
  const rows = [];
  try {
    const base = await snapshot({ notebook });
    rows.push(["unmodified", base.hash]);
    for (const [name, from, to] of edits) {
      const n = src.split(from).length - 1;
      if (n < 1) { rows.push([name, "NOT FOUND: " + JSON.stringify(from)]); continue; }
      const file = join(dir, name.replace(/\W+/g, "-") + ".html");
      writeFileSync(file, src.split(from).join(to));
      rows.push([name + " (" + n + " occurrence" + (n > 1 ? "s" : "") + ")", (await snapshot({ notebook: file })).hash]);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
  for (const [n, h] of rows) console.log(h.padEnd(64), n);
  const hashes = rows.map((r) => r[1]);
  const ok = hashes.every((h) => /^[0-9a-f]{64}$/.test(h)) && new Set(hashes).size === hashes.length;
  console.log(ok ? "SELF-TEST PASS: " + hashes.length + " distinct hashes" : "SELF-TEST FAIL");
  return ok;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const opt = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
  const notebook = args.find((a) => a.endsWith(".html"));
  if (!notebook) { console.error("usage: wire-snapshot.mjs <notebook.html> [--dump f] [--raw f] [--check|--record|--self-test]"); process.exit(2); }
  if (flag("--self-test")) process.exit((await selfTest(notebook)) ? 0 : 1);
  if (flag("--check") || flag("--record")) {
    const out = {};
    // the speclock arm is the same notebook with the spec-lock plugin added, as ratchet-code.html is built
    const { build, pluginSource, RATCHET } = await import("./build-ratchet-code.mjs");
    const withPlugin = join(dirname(fileURLToPath(import.meta.url)), "../scratch/verify/wire-ratchet.html");
    mkdirSync(dirname(withPlugin), { recursive: true });
    writeFileSync(withPlugin, build(readFileSync(notebook, "utf8"), pluginSource(readFileSync(RATCHET, "utf8"))));
    for (const [name, nb, script] of [["shipped", notebook, SCRIPT_SHIPPED], ["speclock", withPlugin, SCRIPT]]) out[name] = summary(await snapshot({ notebook: nb, script }));
    if (flag("--record")) { writeFileSync(BASELINE, JSON.stringify({ notebook, script: sha(JSON.stringify(SCRIPT)), ...out }, null, 2) + "\n"); console.log("recorded", BASELINE); }
    const base = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")) : {};
    let ok = true;
    for (const name of ["shipped", "speclock"]) {
      const same = base[name]?.hash === out[name].hash && !out[name].problems.length;
      ok &&= same;
      console.log(("wire hash, " + name).padEnd(22), (base[name]?.hash ?? "none").slice(0, 16), out[name].hash.slice(0, 16), same ? "same" : "DIFFERENT", out[name].problems.join("; "));
    }
    process.exit(ok ? 0 : 1);
  }
  // a notebook that holds the spec-lock plugin gets the script with the refused completion
  const r = await snapshot({ notebook, script: readFileSync(notebook, "utf8").includes('<script id="@tomlarkworthy/robocoop-5-spec-lock"') ? SCRIPT : SCRIPT_SHIPPED, headless: !flag("--headed") });
  if (opt("--dump")) writeFileSync(opt("--dump"), JSON.stringify({ normalisers: NORMALISERS.map(([n, re, to]) => [n, String(re), to]), bodies: r.bodies }, null, 2));
  if (opt("--raw")) writeFileSync(opt("--raw"), JSON.stringify(r.raw.map((x) => JSON.parse(x)), null, 2));
  console.log(JSON.stringify({ ...summary(r), blockedUrls: r.blocked, pageErrorText: r.pageErrors.slice(0, 5) }, null, 2));
  process.exit(r.problems.length ? 1 : 0);
}
