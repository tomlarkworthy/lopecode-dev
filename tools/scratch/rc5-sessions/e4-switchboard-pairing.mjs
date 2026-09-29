// E4 (plan/switchboard.md §7): Claude Code pairing as a switchboard destination, in the robocoop-5 notebook,
// with a fake WebSocket standing in for the channel server (no Claude, no model calls).
//   pair      the fake server answers "paired"; pairing registers its listener and selects itself
//   menu      ≡ → Annotate shows "Ask Claude"
//   send      an Ask annotation writes switchboardThread({…, to: "claude-code"}); a typed question goes out as a
//             channel message tagged [thread:<id>] carrying the quote
//   reply     a reply tagged [thread:<id>] lands in that thread with the tag stripped; so does one carrying
//             `thread` (the proposed server change)
//   fold      the plain thread folds to a 💬 N badge and resolves the record
//   prose     ➕ then prose: prompt_<id> = switchboardThread({…, to: "claude-code"}) and the prose is sent once
//   unpair    on close the listener goes, the kind falls back to "Ask robocoop", the thread says it cannot send
import { resolve } from "node:path";
import { mkdirSync } from "node:fs";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const SHOTS = resolve("tools/screenshots");
mkdirSync(SHOTS, { recursive: true });
const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S55(@tomlarkworthy/robocoop-5),S45(@tomlarkworthy/switchboard))" });
await page.setViewportSize({ width: 1400, height: 900 });
const checks = {};
const fail = async (why) => { console.log(JSON.stringify({ pass: false, why, checks }, null, 1)); await close(); process.exit(1); };

const setup = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 30000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) return false; await sleep(100); } return true; };
  ["cc_switchboardListener", "cc_ws", "switchboard_annotateKind", "switchboard_proseHandler", "switchboardThread", "switchboardDestination",
   "createModule", "a2Layer", "a2Store", "claimCellSource"].forEach(n => H.force(n));
  if (!await until(() => H.byName("cc_switchboardListener") && H.byName("cc_ws")?.connect && H.byName("a2Store") && typeof H.byName("switchboardThread") === "function"))
    return { ok: false, why: "pairing listener/switchboard/annotate not booted" };
  window.__wsSent = [];
  window.WebSocket = class {
    constructor(url) { this.url = url; window.__fakeWs = this; setTimeout(() => this.onopen?.(), 10); }
    send(m) {
      const o = JSON.parse(m);
      window.__wsSent.push(o);
      if (o.type === "pair") setTimeout(() => this.onmessage?.({ data: JSON.stringify({ type: "paired" }) }), 10);
    }
    close() {}
  };
  H.byName("cc_ws").connect("LOPE-9999-TEST");
  const dest = () => [...window.__ojs_runtime._variables].find(v => v._name === "viewof switchboardDestination")?._value;
  const took = await until(() => dest()?.value === "claude-code", 10000);
  const rt = window.__ojs_runtime;
  const mod = H.byName("createModule")("@probe/demo", rt);
  mod.variable(true).define("intro", ["md"], md => md`## Sales notebook

The rows below come from last quarter's export. Monthly totals look lower in August than the raw invoices suggest.`);
  mod.variable(true).define("rows", [], () => [{ month: "Jul", total: 120 }, { month: "Aug", total: 80 }]);
  location.hash = "#view=R100(S55(@probe/demo),S45(@tomlarkworthy/switchboard))";
  const shown = await until(() => document.querySelector('.lp2-pane[data-module="@probe/demo"] .observablehq[cell="intro"]'));
  return { ok: shown && took, why: !took ? "pairing did not select itself" : shown ? "" : "demo pane did not open", took };
});
checks.pairSelectsItself = !!setup.took;
if (!setup.ok) await fail(setup.why);
await page.waitForTimeout(2500);

const openAnnotateMenu = async () => {
  await page.click(".lp2-burger");
  await page.waitForTimeout(300);
  await page.locator(".lp2-menu-item", { hasText: "Annotate" }).first().click();
  await page.waitForTimeout(300);
};
await openAnnotateMenu();
const ask = page.locator(".lp2-menu-item", { hasText: "Ask Claude" }).first();
checks.menuSaysAskClaude = await ask.isVisible().catch(() => false);
await page.screenshot({ path: `${SHOTS}/switchboard-5-annotate-menu-ask-claude.png` });
if (!checks.menuSaysAskClaude) await fail("no Ask Claude in the menu");
await ask.click();
await page.waitForTimeout(300);
const span = await page.evaluate(() => {
  const cell = document.querySelector('.lp2-pane[data-module="@probe/demo"] .observablehq[cell="intro"]');
  const w = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) {
    const i = w.currentNode.nodeValue.indexOf("lower in August");
    if (i < 0) continue;
    const r = document.createRange();
    r.setStart(w.currentNode, i); r.setEnd(w.currentNode, i + "lower in August".length);
    const rs = r.getClientRects(); const a = rs[0], b = rs[rs.length - 1];
    return { x0: a.left + 1, y0: a.top + a.height / 2, x1: b.right - 1, y1: b.top + b.height / 2 };
  }
  return null;
});
if (!span) await fail("phrase not found");
await page.mouse.move(span.x0, span.y0);
await page.mouse.down();
await page.mouse.move(span.x1, span.y1, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(1500);
const a = await page.evaluate(async () => {
  const H = window.__nbHelpers, rt = window.__ojs_runtime;
  const rec = H.byName("a2Store").all().filter(x => x.kind === "ask").pop();
  if (!rec) return null;
  const mod = rt.mains.get("@probe/demo");
  const own = n => [...rt._variables].find(v => v._module === mod && v._name === n && v._type === 1);
  return { id: rec.id, note: String(own(rec.cell)?._definition ?? "") };
});
if (!a) await fail("no ask record");
checks.noteGoesToClaude = a.note.includes("switchboardThread") && a.note.includes('to: "claude-code"');
const boxSel = `[data-ann-id="${a.id}"]`;
checks.plainThreadOpens = await page.waitForFunction((sel) => {
  const v = document.querySelector(sel)?.querySelector("[data-switchboard-view]");
  return v && v.dataset.switchboardFolded === "false" && v.querySelector("textarea");
}, boxSel, { timeout: 15000 }).then(() => true, () => false);
if (!checks.plainThreadOpens) await fail("plain thread did not open in the box");
await page.locator(`${boxSel} textarea`).fill("Why is August lower than the invoices?");
await page.locator(`${boxSel} textarea`).press("Enter");
await page.waitForTimeout(500);
const out1 = await page.evaluate((id) => window.__wsSent.filter(m => m.type === "message"), a.id);
checks.sentTagged = out1.length === 1 && out1[0].content.startsWith("[thread:" + a.id + "] Why is August") &&
  out1[0].thread === a.id && out1[0].content.includes("lower in August");
// replies: tag form (released server), then thread form (proposed server change)
await page.evaluate((id) => {
  window.__fakeWs.onmessage({ data: JSON.stringify({ type: "reply", markdown: "[thread:" + id + "] August excludes **refunds** issued in September." }) });
  window.__fakeWs.onmessage({ data: JSON.stringify({ type: "reply", markdown: "unrelated chat reply" }) });
  window.__fakeWs.onmessage({ data: JSON.stringify({ type: "reply", markdown: "And the export ran on the 28th.", thread: id }) });
}, a.id);
await page.waitForTimeout(600);
const bubbles = await page.evaluate((sel) => [...document.querySelector(sel).querySelectorAll("[data-role]")].map(b => [b.dataset.role, b.textContent.trim()]), boxSel);
checks.replyByTag = bubbles.some(([r, t]) => r === "assistant" && t.startsWith("August excludes refunds"));
checks.replyByThreadField = bubbles.some(([r, t]) => r === "assistant" && t.startsWith("And the export ran"));
checks.otherRepliesStayOut = !bubbles.some(([, t]) => /unrelated/.test(t)) && bubbles.length === 3;
await page.screenshot({ path: `${SHOTS}/switchboard-6-claude-thread.png` });
const foldBtn = page.locator(`${boxSel} button[title="Fold to a badge"]`);
if (!await foldBtn.isVisible().catch(() => false)) {
  const dump = await page.evaluate((sel) => { const b = document.querySelector(sel); return b ? [...b.querySelectorAll("button")].map(x => [x.title, x.textContent, x.offsetParent !== null]) : "no box"; }, boxSel);
  checks.foldButtonShown = false;
  console.log(JSON.stringify({ bubbles, dump }));
  await fail("no fold button");
}
await foldBtn.click();
await page.waitForTimeout(800);
const folded = await page.evaluate((sel) => {
  const box = document.querySelector(sel);
  return { folded: box.dataset.a2Folded, badge: box.querySelector("[data-switchboard-badge]")?.textContent, w: box.getBoundingClientRect().width };
}, boxSel);
checks.foldsToBadge = folded.folded === "true" && /3$/.test(folded.badge || "") && folded.w < 120;
await page.locator(`${boxSel} [data-switchboard-badge]`).click();
await page.waitForTimeout(400);
await page.locator(`${boxSel} button`, { hasText: "resolve" }).click();
await page.waitForTimeout(800);
checks.resolvedInRecord = await page.evaluate((id) => window.__nbHelpers.byName("a2Store").get(id)?.state === "resolved", a.id);

// prose
const b = await page.evaluate(async () => {
  const H = window.__nbHelpers, rt = window.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 20000) => { const t0 = Date.now(); let v; while (!(v = f())) { if (Date.now() - t0 > ms) return null; await sleep(100); } return v; };
  const mod = rt.mains.get("@probe/demo");
  const rows = [...rt._variables].find(v => v._module === mod && v._name === "rows");
  const editors = H.byName("editors");
  const host = await until(() => editors?.get(rows)?.querySelector(".add-cell-btn") && editors.get(rows));
  if (!host) return { why: "no editor beside rows" };
  const before = new Set(rt._variables);
  host.querySelector(".add-cell-btn").click();
  const nv = await until(() => [...rt._variables].find(v => v._module === mod && !before.has(v) && v._type === 1));
  if (!nv) return { why: "➕ made no cell" };
  const cm = await until(() => editors.get(nv)?.querySelector(".cm-editor"));
  if (!cm) return { why: "new cell's editor did not open" };
  const view = H.byName("EditorView").findFromDOM(cm);
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: "make a bar chart of rows by month" } });
  view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true }));
  const named = await until(() => /^prompt_p/.test(nv._name || "") && nv._name);
  await sleep(800);
  const id = named && named.slice("prompt_".length);
  return { named, def: String(nv._definition).slice(0, 160), sent: window.__wsSent.filter(m => m.type === "message" && m.thread === id).length,
    view: !!document.querySelector('.lp2-pane[data-module="@probe/demo"] [data-switchboard-thread="' + id + '"] [data-switchboard-view]') };
});
checks.proseBecomesClaudePrompt = !!b.named && /to: "claude-code"/.test(b.def || "");
checks.proseSentOnce = b.sent === 1;
checks.proseThreadInCell = !!b.view;
await page.evaluate((n) => document.querySelector('.lp2-pane[data-module="@probe/demo"] [data-switchboard-thread="' + (n || "").slice(7) + '"]')?.scrollIntoView({ block: "center" }), b.named);
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOTS}/switchboard-7-claude-prose-cell.png` });

// unpair
const u = await page.evaluate(async (id) => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  window.__fakeWs.onclose?.();
  await sleep(800);
  const kinds = window.__nbHelpers.byName("a2Kinds") ?? [];
  const notice = document.querySelector('[data-ann-id="' + id + '"] [data-switchboard-notice]');
  return { labels: [...kinds].map(k => k.label), notice: notice?.textContent ?? null, shown: notice?.style.display };
}, a.id);
checks.unpairFallsBack = u.labels.includes("Ask robocoop") && !u.labels.includes("Ask Claude");
checks.threadCannotSend = /not connected/.test(u.notice || "");
const out = { id: a.id, badge: folded.badge, bubbles, prompt: b.named, why: b.why, labelsAfterUnpair: u.labels, checks,
  consoleErrors: consoleErrors.filter(e => !/module dependancy map/.test(e)).slice(0, 5) };
out.pass = Object.values(checks).every(Boolean);
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
