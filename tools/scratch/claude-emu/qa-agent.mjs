// QA with a real agent in the loop: the change stream and the compile refusal are only
// worth anything if the model in the terminal acts on them.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (n, ok, d) => { results.push({ n, ok: !!ok }); console.log((ok ? "PASS" : "FAIL") + "  " + n + (d !== undefined ? "  " + JSON.stringify(d).slice(0, 300) : "")); };

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 });
await sleep(9000);
const dump = () => p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
const calls = () => p.evaluate(() => (window.__MCPLOG || []).filter((e) => e.ev === "call").map((e) => e.name));
await p.click("#cb-term");

async function ask(text, waitMs) {
  const before = (await dump()).length;
  await p.keyboard.type(text, { delay: 12 });
  await sleep(500);
  await p.keyboard.press("Enter");
  const t0 = Date.now();
  let quiet = 0, last = "";
  while (Date.now() - t0 < waitMs) {
    await sleep(1500);
    const now = await dump();
    if (now === last) { quiet++; if (quiet >= 3 && now.length > before) break; } else quiet = 0;
    last = now;
  }
  return last;
}

// --- T1: a user edit lands, and the agent can say what it was
await p.evaluate(() => {
  const D = window.__CB_DEPS;
  const m = D.createModule("@qa/greeting", D.runtime);
  m.variable({ fulfilled() {}, rejected() {} }).define("greeting", [], () => "hello from the user");
});
await sleep(8000);
const afterEdit = await dump();
check("T1a the session is told the notebook changed", /notebook: module added: @qa\/greeting/.test(afterEdit),
  afterEdit.split("\n").filter((l) => l.includes("←")).slice(-1));
const before1 = (await calls()).length;
const r1 = await ask("What changed in the notebook just now? Use the notebook_events tool and answer in one line.", 120000);
const c1 = await calls();
// Which tool it reaches for is the model's business; that it investigates through the
// notebook server rather than guessing is the contract.
check("T1b the agent investigates via the notebook server", c1.slice(before1).length > 0, c1.slice(before1));
check("T1c the agent names the change", /@qa\/greeting/.test(r1.slice(-1500)), r1.split("\n").filter((l) => l.trim()).slice(-6));

// --- T2: a module that does not compile must fail in the same turn
await p.keyboard.press("Escape"); await sleep(500);
const r2 = await ask("Write the file /src/@qa/broken.js with exactly this content and nothing else: export default function define(runtime, observer) { return ( }", 120000);
check("T2 the compile refusal reaches the agent", /FAILED TO COMPILE/.test(r2), r2.split("\n").filter((l) => /FAILED|Error|compile/i.test(l)).slice(-3));

// --- T3: notebook content is readable with the native tools
await p.keyboard.press("Escape"); await sleep(500);
const r3 = await ask("Read the file /src/@qa/greeting.js and tell me in one line whether the word greeting appears in it.", 120000);
check("T3 native Read reaches the module tree", /greeting/i.test(r3.slice(-1200)) && !/no such file|not found|ENOENT/i.test(r3.slice(-1200)),
  r3.split("\n").filter((l) => l.trim()).slice(-5));

const h = await p.evaluate(() => window.__termHealth());
check("T4 terminal healthy after three turns", h.wedges === 0 && h.blankPaints === 0, { wedges: h.wedges, blank: h.blankPaints });
console.log("\n==== " + results.filter((r) => r.ok).length + "/" + results.length + " passed ====");
await p.screenshot({ path: "qa-agent.png" });
await b.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
