// Deep QA of the pairing surface: the change stream (arming, fidelity, coalescing,
// self-suppression, the toggle) and the MCP tools. Deterministic — no model turns.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail !== undefined ? "  " + JSON.stringify(detail) : "")); };

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
const pageErrors = [];
p.on("pageerror", (e) => pageErrors.push(String(e.message).slice(0, 120)));
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 });
const dump = () => p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
const evs = () => p.evaluate(() => window.__nbEvents().map((e) => ({ kind: e.kind, what: e.what, src: (e.source || "").slice(0, 30) })));
const pushes = () => p.evaluate(() => (window.__MCPLOG || []).filter((e) => e.ev === "notify").map((e) => e.content));

await sleep(9000);
check("A1 channels registered without a keystroke", /Listening for channel messages/.test(await dump()));
check("A2 boot is silent: no events recorded from starting up", (await evs()).length === 0, await evs());
check("A3 boot is silent: no channel pushes", (await pushes()).filter((c) => /notebook_change|cell |module /.test(c)).length === 0, await pushes());

// --- fidelity: a module the user adds is reported once, by name
// A module with no cells is not a module as far as module-map is concerned, so these
// define one — that is also what a user adding a module actually does.
const addModule = (name) => p.evaluate((n) => {
  const D = window.__CB_DEPS;
  const m = D.createModule(n, D.runtime);
  m.variable({ fulfilled() {}, rejected() {} }).define("cell_of_" + n.replace(/\W/g, "_"), [], () => n);
}, name);
await addModule("@qa/one");
await sleep(7000);
let e = await evs();
check("A4 a user-added module is reported exactly once", e.filter((x) => x.what === "@qa/one").length === 1, e);
check("A5 that push names the module", (await pushes()).some((c) => c.includes("@qa/one")), (await pushes()).slice(-2));

// --- coalescing: a burst must not become a burst of turns
const before = (await pushes()).length;
for (let i = 0; i < 12; i++) await addModule("@qa/burst-" + i);
await sleep(8000);
const after = await pushes();
check("A6 a 12-module burst coalesces into one push", after.length - before === 1, { added: after.length - before, last: after[after.length - 1] });
check("A7 the coalesced push truncates the list", /\(\+\d+ more\)/.test(after[after.length - 1] || ""), after[after.length - 1]);
check("A8 every burst event is still individually retrievable", (await evs()).filter((x) => /@qa\/burst-/.test(x.what)).length === 12);

// --- the agent's own write is not echoed back at it as a user edit
const beforeSelf = (await pushes()).length;
const wrote = await p.evaluate(() => {
  const src = "export default function define(runtime, observer) {\n  const main = runtime.module();\n  main.variable(observer('qa_self')).define('qa_self', [], () => 41 + 1);\n  return main;\n}\n";
  try { window.__RC5FS.writeSync("/src/@qa/selfwrite.js", src); return "ok"; } catch (err) { return "ERR " + err.message; }
});
await sleep(8000);
const afterSelf = await pushes();
check("A9 the agent's own write applies", wrote === "ok", wrote);
check("A10 own write pushes module_applied, not a user-edit line",
  afterSelf.slice(beforeSelf).every((c) => /applied to the live runtime/.test(c)), afterSelf.slice(beforeSelf));

// --- the toggle
await p.uncheck("#cb-notify");
const beforeOff = (await pushes()).length;
await addModule("@qa/muted");
await sleep(7000);
check("A11 toggle off silences pushes", (await pushes()).length === beforeOff, (await pushes()).slice(beforeOff));
check("A12 toggle off still records for pull", (await evs()).some((x) => x.what === "@qa/muted"));
await p.check("#cb-notify");

// --- tools
const tools = await p.evaluate(() => window.__NBTOOLS.list());
check("B1 five tools advertised with schemas", tools.length === 5 && tools.every((t) => t.inputSchema && t.description), tools.map((t) => t.name));
const ev10 = await p.evaluate(() => window.__NBTOOLS.call("notebook_events", { limit: 3 }));
check("B2 notebook_events honours limit and stamps age", ev10.length === 3 && ev10.every((x) => typeof x.ago_ms === "number"));
const mods = await p.evaluate(() => window.__NBTOOLS.call("list_modules"));
check("B3 list_modules sees the notebook", Array.isArray(mods) && mods.length > 30, mods.length);
const rd = await p.evaluate(() => window.__NBTOOLS.call("read_module", { name: "@qa/selfwrite" }));
check("B4 read_module returns what was written", typeof rd === "string" && rd.includes("qa_self"), String(rd).slice(0, 40));
const ej = await p.evaluate(() => window.__NBTOOLS.call("eval_js", { code: "1 + 1" }));
check("B5 eval_js evaluates", ej === 2, ej);
const bad = await p.evaluate(async () => { try { await window.__NBTOOLS.call("nope", {}); return "no error"; } catch (err) { return err.message; } });
check("B6 unknown tool errors clearly", /no such tool/.test(bad), bad);

// --- runtime churn must never be pushed as a user edit
const churn = (await pushes()).filter((c) => /cell del: _/.test(c));
check("A13 unnamed deletes are never pushed", churn.length === 0, churn.slice(0, 2));
check("A14 a real cell edit is pushed with its name", await (async () => {
  await p.evaluate(() => {
    const D = window.__CB_DEPS;
    const m = D.createModule("@qa/edited", D.runtime);
    window.__QA_V = m.variable({ fulfilled() {}, rejected() {} }).define("motto", [], () => "v1");
  });
  await sleep(6000);
  await p.evaluate(() => window.__QA_V.define("motto", [], () => "v2"));
  await sleep(7000);
  return (await pushes()).some((c) => /cell upd: motto/.test(c));
})(), (await pushes()).slice(-2));

// --- health after all that
const h = await p.evaluate(() => window.__termHealth());
check("C1 terminal never wedged", h.wedges === 0 && h.renderedChars > 0, { wedges: h.wedges, chars: h.renderedChars, instances: h.instances });
check("C2 no page errors", pageErrors.length === 0, pageErrors.slice(0, 3));

console.log("\n==== " + results.filter((r) => r.ok).length + "/" + results.length + " passed ====");
for (const r of results.filter((x) => !x.ok)) console.log("  FAILED: " + r.name + "  " + JSON.stringify(r.detail));
await b.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
