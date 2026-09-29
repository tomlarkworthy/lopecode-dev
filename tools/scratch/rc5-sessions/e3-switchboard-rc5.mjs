// E3 (plan/switchboard.md §7): both switchboard entrances end to end in the robocoop-5 notebook, routed to the
// robocoop-5 listener (the default destination), with a fake
// agent in place of makeSession (no model calls). Takes the screenshots named below into tools/screenshots/.
//   A. ≡ → Annotate shows an "Ask robocoop" entry; arming it and dragging over prose writes a record with
//      kind "ask", a note cell switchboardThread({id, to: "robocoop-5"…}) and a switchboardThread import in the annotated module; the thread
//      opens expanded, a turn saves @rc5-threads/<id> (named so in currentModules); fold → a 💬 N badge
//      at the anchor; resolve → the record's state is "resolved"; deleting the annotation flags the
//      session orphaned in the full chat.
//   B. ➕ then prose + Shift-Enter: the new cell becomes prompt_<id> = switchboardThread(…) holding the chat,
//      the prose is sent once, the fake agent's cell y appears, half-typed code is left alone.
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
  ["rc5Thread", "rc5_switchboardListener", "switchboard_annotateKind", "switchboard_proseHandler", "switchboardThread", "createModule", "currentModules", "a2Layer", "a2Store", "claimCellSource", "rc5_threadOrphans"].forEach(n => H.force(n));
  if (!await until(() => typeof H.byName("rc5Thread") === "function" && H.byName("a2Store") && typeof H.byName("switchboardThread") === "function" && H.byName("rc5_agents")?.makeSession)) return { ok: false, why: "switchboard/annotate/rc5 not booted" };
  // fake agent: a turn replies, and a prose request also defines y in the module it came from
  const agents = H.byName("rc5_agents");
  window.__sent = [];
  const fake = () => {
    const messages = [];
    return { messages, async send(input, cb) {
      const text = typeof input === "string" ? input : input?.text;
      window.__sent.push(text);
      messages.push({ role: "user", content: text });
      cb?.onStep?.(0);
      await sleep(300);
      let reply = "(fake agent) noted: " + text;
      if (/bar chart/.test(text)) {
        const m = window.__ojs_runtime.mains.get("@probe/demo");
        m.variable(true).define("y", [], () => 1);
        reply = "(fake agent) defined `y = 1` after the prompt cell.";
      }
      messages.push({ role: "assistant", content: reply });
      cb?.onText?.();
      cb?.onFinish?.();
    } };
  };
  Object.defineProperty(agents, "makeSession", { get: () => fake, set: () => {}, configurable: true });
  const rt = window.__ojs_runtime;
  const mod = H.byName("createModule")("@probe/demo", rt);
  mod.variable(true).define("intro", ["md"], md => md`## Sales notebook

The rows below come from last quarter's export. Monthly totals look lower in August than the raw invoices suggest.`);
  mod.variable(true).define("rows", [], () => [{ month: "Jul", total: 120 }, { month: "Aug", total: 80 }]);
  location.hash = "#view=R100(S55(@probe/demo),S45(@tomlarkworthy/robocoop-5))";
  const shown = await until(() => document.querySelector('.lp2-pane[data-module="@probe/demo"] .observablehq[cell="intro"]'));
  return { ok: shown, why: shown ? "" : "demo pane did not open" };
});
if (!setup.ok) await fail(setup.why);
await page.waitForTimeout(2500);

// ---- A: the annotation menu ------------------------------------------------
await page.click(".lp2-burger");
await page.waitForTimeout(300);
const annItem = page.locator(".lp2-menu-item", { hasText: "Annotate" }).first();
await annItem.click();
await page.waitForTimeout(300);
const ask = page.locator(".lp2-menu-item", { hasText: "Ask robocoop" }).first();
checks.menuHasKind = await ask.isVisible().catch(() => false);
await page.screenshot({ path: `${SHOTS}/switchboard-1-annotate-menu.png` });
if (!checks.menuHasKind) await fail("no Ask robocoop in the menu");
await ask.click();
await page.waitForTimeout(300);
// drag over "lower in August"
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
  const store = H.byName("a2Store");
  const rec = store.all().filter(x => x.kind === "ask").pop();
  if (!rec) return null;
  const mod = rt.mains.get("@probe/demo");
  const own = n => [...rt._variables].find(v => v._module === mod && v._name === n && v._type === 1);
  return { id: rec.id, surface: rec.anchor.surface, quote: rec.anchor.quote?.exact ?? null, home: rec.home,
    note: String(own(rec.cell)?._definition ?? ""), hasImport: !!own("switchboardThread") && !!own("module @tomlarkworthy/switchboard"), box: rec.box };
});
checks.recordKind = !!a;
if (!a) await fail("no ask record");
checks.noteIsThread = a.note.includes("switchboardThread") && a.note.includes(a.id) && a.note.includes('to: "robocoop-5"');
checks.importAdded = a.hasImport;
const boxSel = `[data-ann-id="${a.id}"]`;
const opened = await page.waitForFunction((sel) => {
  const box = document.querySelector(sel);
  const chat = box?.querySelector("[data-rc5-session]");
  return chat && chat.dataset.rc5Folded === "false" && chat.querySelector("textarea");
}, boxSel, { timeout: 15000 }).then(() => true, () => false);
checks.threadOpensExpanded = opened;
if (!opened) await fail("thread did not open in the box");
await page.locator(`${boxSel} textarea`).fill("Why is August lower than the invoices?");
await page.locator(`${boxSel} textarea`).press("Enter");
checks.savedAsMain = await page.waitForFunction((id) => window.__ojs_runtime.mains.has("@rc5-threads/" + id), a.id, { timeout: 15000 }).then(() => true, () => false);
await page.waitForTimeout(800);
checks.namedInCurrentModules = await page.evaluate((id) => {
  const H = window.__nbHelpers, m = window.__ojs_runtime.mains.get("@rc5-threads/" + id);
  return [...(H.byName("currentModules") || new Map()).values()].some(i => i && i.module === m && i.name === "@rc5-threads/" + id);
}, a.id);
await page.screenshot({ path: `${SHOTS}/switchboard-2-expanded-thread.png` });
// fold
await page.locator(`${boxSel} button[title="Fold to a badge"]`).click();
await page.waitForTimeout(800);
const folded = await page.evaluate((sel) => {
  const box = document.querySelector(sel);
  return { folded: box.dataset.a2Folded, badge: box.querySelector("[data-rc5-badge]")?.textContent, w: box.getBoundingClientRect().width };
}, boxSel);
checks.foldsToBadge = folded.folded === "true" && /2$/.test(folded.badge || "") && folded.w < 120;
await page.screenshot({ path: `${SHOTS}/switchboard-3-folded-badge.png` });
// resolve: expand, click resolve
await page.locator(`${boxSel} [data-rc5-badge]`).click();
await page.waitForTimeout(400);
await page.locator(`${boxSel} button`, { hasText: "resolve" }).click();
await page.waitForTimeout(800);
checks.resolvedInRecord = await page.evaluate((id) => window.__nbHelpers.byName("a2Store").get(id)?.state === "resolved", a.id);
checks.sentOnceA = await page.evaluate(() => window.__sent.length === 1);

// ---- B: ➕ then prose ------------------------------------------------------
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
  const pid = nv.pid;
  const cm = await until(() => editors.get(nv)?.querySelector(".cm-editor"));
  if (!cm) return { why: "new cell's editor did not open" };
  const EditorView = H.byName("EditorView");
  const view = EditorView.findFromDOM(cm);
  const typeAndApply = (src) => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: src } });
    view.contentDOM.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, shiftKey: true, bubbles: true, cancelable: true }));
  };
  typeAndApply("make a bar chart of rows by month");
  const named = await until(() => /^prompt_p/.test(nv._name || "") && nv._name);
  const y = await until(() => [...rt._variables].find(v => v._module === mod && v._name === "y"), 15000);
  await sleep(800);
  const chat = document.querySelector('.lp2-pane[data-module="@probe/demo"] [data-rc5-session^="p"]');
  return { pid, samePid: nv.pid === pid, named, def: String(nv._definition).slice(0, 200), yDefined: !!y, chatInCell: !!chat,
    sent: [...window.__sent], hasImport: !![...rt._variables].find(v => v._module === mod && v._name === "switchboardThread") };
});
checks.proseBecomesPrompt = !!b.named;
checks.promptKeepsPid = !!b.samePid;
checks.proseSentOnce = Array.isArray(b.sent) && b.sent.filter(t => t === "make a bar chart of rows by month").length === 1;
checks.agentCellAppears = !!b.yDefined;
checks.chatInCell = !!b.chatInCell;
await page.evaluate(() => document.querySelector('.lp2-pane[data-module="@probe/demo"] [data-rc5-session^="p"]')?.scrollIntoView({ block: "center" }));
await page.waitForTimeout(500);
await page.screenshot({ path: `${SHOTS}/switchboard-4-prose-cell-thread.png` });

// ---- orphan: delete the annotation, the full chat's picker flags its session ----
checks.orphanFlagged = await page.evaluate(async (id) => {
  const H = window.__nbHelpers;
  H.byName("a2Store").remove(id);
  const ctl = H.byName("rc5_controller");
  for (let i = 0; i < 40; i++) { const e = ctl.entries.find(x => (x.id ?? x.log?.meta.id) === id); if (e?.orphaned) return true; await new Promise(r => setTimeout(r, 100)); }
  return false;
}, a.id);
const out = { id: a.id, quote: a.quote, surface: a.surface, box: a.box, badge: folded.badge, prompt: b.named, def: b.def, why: b.why, checks,
  consoleErrors: consoleErrors.filter(e => !/module dependancy map/.test(e)).slice(0, 5) };
out.pass = Object.values(checks).every(Boolean);
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
