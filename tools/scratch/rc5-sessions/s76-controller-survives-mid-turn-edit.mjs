// s76 (rc5-train m48): a robocoop-5 write mid-turn must not strand the chat on a new rc5_controller. Probe: "add a copy button to each of your replies" through the REAL chat panel with a
// scripted model (fetch stub, no model call). Turn 1: the model edits the assistant renderer in
// @tomlarkworthy/robocoop-5 (the robocoop5 cell), then completes with a reply. Turn 2: one more reply.
// Reports: whether the edit applied or was refused, whether turn 1 still ended in the panel after its
// own UI was rebuilt mid-turn, whether every assistant reply has a copy button that writes that reply's
// text (navigator.clipboard.writeText is stubbed), and the same after export + reopen (blob: iframe).
// Usage: node s76-controller-survives-mid-turn-edit.mjs <notebook.html> [turn|during|between]   (exit 1 unless every check passes)
//   turn:    the agent's edit_file on robocoop-5 inside turn 1 (refused by the guard on the canonical)
//   during:  the user saves the same edit while turn 1 is running (not guarded; reachable today)
//   between: the user saves it between turns
import { resolve } from "node:path";
import { chromium } from "playwright";

const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

// The edit the agent attempted in 20260929-0620-m48-before (54s): a button under each assistant bubble.
// Button style copied from robocoop5.branchControls (same cell); the clipboard call is
// @tomlarkworthy/exporter-3.copyTextToClipboard's `await navigator.clipboard.writeText(text)`.
const OLD = "        parts.push(bubble('left', C.asst, node));\n";
const NEW = OLD +
"        const copy = document.createElement('button');\n" +
"        copy.textContent = '\\u29C9 copy';\n" +
"        copy.title = 'Copy this reply';\n" +
"        copy.style.cssText = 'align-self:flex-start;background:none;border:0;color:' + C.muted + ';cursor:pointer;font:inherit;font-size:11px;padding:0 4px';\n" +
"        copy.addEventListener('click', async () => {\n" +
"          await navigator.clipboard.writeText(String(m.content));\n" +
"          copy.textContent = '\\u2713 copied';\n" +
"        });\n" +
"        parts.push(copy);\n";

// Page-side, before boot: scripted model + clipboard stub. Exported so eval.mjs can reuse the text.
export const STUB = String.raw`(() => {
  const S = globalThis.__m48 = { queue: [], calls: 0, clip: [] };
  const orig = globalThis.fetch;
  const sse = (model, delta, finish) => "data: " + JSON.stringify({ id: "x", model, choices: [{ index: 0, delta }] }) + "\n\n" +
    "data: " + JSON.stringify({ id: "x", model, choices: [{ index: 0, delta: {}, finish_reason: finish }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }) + "\n\ndata: [DONE]\n\n";
  globalThis.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (!/\/chat\/completions/.test(url)) return orig.apply(this, arguments);
    let body = {}; try { body = JSON.parse((init && init.body) || "{}"); } catch {}
    S.calls++;
    // side calls (titles, summaries) carry no tools; answer them without touching the script
    const step = body.tools && body.tools.length ? (S.queue.shift() || { content: "PROBE-IDLE" }) : { content: "probe title" };
    if (step.delayMs) await new Promise(r => setTimeout(r, step.delayMs));
    const delta = { role: "assistant" };
    if (step.content) delta.content = step.content;
    if (step.tool) delta.tool_calls = [{ index: 0, id: "c" + S.calls, type: "function", function: { name: step.tool, arguments: JSON.stringify(step.args) } }];
    return new Response(sse(body.model, delta, step.tool ? "tool_calls" : "stop"), { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  try { localStorage.setItem("OPENROUTER_API_KEY", "sk-probe-not-a-key"); } catch {}
  const clip = { writeText: async t => { S.clip.push(String(t)); } };
  try { Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => clip }); } catch {}
})()`;

// Page-side check, runs on the live page and again inside the reopened file. `edit` = {old, new} or null.
export const CHECK = async function (edit, inFrame) {
  const S = globalThis.__m48;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const deep = (root = document) => { const out = []; const walk = n => { for (const e of n.querySelectorAll("*")) { out.push(e); if (e.shadowRoot) walk(e.shadowRoot); } }; walk(root); return out; };
  const chat = () => document.querySelector("[data-rc5-group]");
  const t0 = Date.now();
  while (!chat() && Date.now() - t0 < 20000) await sleep(300);
  if (!chat() && inFrame) {
    // a blob: frame has no URL hash, so lopepage does not lay out the chat: compute the chat cell and mount it
    let host; const t2 = Date.now();
    while (!(host = [...(globalThis.__ojs_runtime?._variables || [])].find(v => v._name === "robocoop_5")) && Date.now() - t2 < 10000) await sleep(300);
    if (host) { const el = await host._module.value("robocoop_5"); if (el instanceof Element) document.body.append(el); }
  }
  if (!chat()) return { stage: "no chat panel" };
  const ta = () => deep(chat()).find(e => e.tagName === "TEXTAREA" && /^Message/.test(e.placeholder || ""));
  const sendBtn = () => deep(chat()).find(e => e.tagName === "BUTTON" && /^(Send|Steer)$/.test(e.textContent.trim()));
  const idle = () => { const a = chat()?.active; return a && !a.busy && sendBtn()?.textContent.trim() === "Send"; };
  const turn = async (text, steps, ms = 25000) => {
    S.queue.push(...steps);
    const t = Date.now();
    while (!(ta() && sendBtn()) && Date.now() - t < 10000) await sleep(200);
    ta().value = text;
    ta().dispatchEvent(new Event("input", { bubbles: true }));
    sendBtn().click();
    await sleep(600);
    while (!idle() && Date.now() - t < ms) await sleep(300);
    await sleep(800);
    return idle();
  };
  const out = { inFrame };
  // the user applies the handed-over edit (the guard's refusal asks them to); same apply path, no guard
  const userEdit = async () => {
    const tv = [...globalThis.__ojs_runtime._variables].find(v => v._name === "toolsView");
    const tools = await tv._module.value("toolsView");
    const byId = new Map((Array.isArray(tools) ? tools : tools.value).map(t => [t.id, t]));
    const ctx = { sessionState: {} };
    await byId.get("read_file").execute({ file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md", limit: 5 }, ctx);
    return String((await byId.get("edit_file").execute({ file_path: "/src/@tomlarkworthy/robocoop-5.js", old_string: edit.old, new_string: edit.new }, ctx))?.output ?? "").slice(0, 160);
  };
  const REPLY1 = "PROBE-ONE Added a **copy** button under each reply.";
  const REPLY2 = "PROBE-TWO The quick brown fox.";
  const inTurn = edit && edit.when === "turn";
  // during: the user saves the edit while a turn is running (the model's next step is held 4 s)
  const during = edit && edit.when === "during";
  const steps1 = inTurn ? [{ tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md", limit: 5 } }, { tool: "edit_file", args: { file_path: "/src/@tomlarkworthy/robocoop-5.js", old_string: edit.old, new_string: edit.new } }] : [];
  const look = { tool: "read_file", args: { file_path: "/src/@tomlarkworthy/robocoop-5.js", limit: 5 } };
  if (!inTurn) steps1.push(during ? { ...look, delayMs: 4000 } : look);
  if (during) setTimeout(async () => { out.editResult = await userEdit(); }, 1500);
  steps1.push({ content: REPLY1, tool: "task_complete", args: { summary: REPLY1 } });
  out.turn1Ended = await turn("Add a copy button to each of your replies in this chat that copies the reply's text to the clipboard.", steps1);
  const msgs = chat()?.active?.session?.messages || [];
  if (!during) out.editResult = String(msgs.filter(m => m.role === "tool")[inTurn ? 1 : 0]?.content ?? "").slice(0, 160);
  if (edit && edit.when === "between") { out.editResult = await userEdit(); await sleep(2500); }
  out.turn2Ended = await turn("thanks", [look, { content: REPLY2, tool: "task_complete", args: { summary: REPLY2 } }]);
  out.panelAlive = !!(chat() && chat().isConnected && ta() && sendBtn());
  // each reply marker -> the copy control next to it -> what a click writes
  const copyLike = b => /copy|⧉|\u{1F4CB}/iu.test((b.textContent || "") + " " + (b.title || "") + " " + (b.getAttribute("aria-label") || ""));
  out.replies = {};
  for (const [k, marker] of [["one", "PROBE-ONE"], ["two", "PROBE-TWO"]]) {
    const els = deep(chat()).filter(e => e.textContent.includes(marker));
    const leaf = els.find(e => ![...e.children].some(c => c.textContent.includes(marker))) || els.at(-1);
    let btn = null;
    for (let e = leaf, i = 0; e && i < 6 && !btn; e = e.parentElement || e.getRootNode()?.host, i++) {
      const own = deep(e).filter(b => b.tagName === "BUTTON" && copyLike(b));
      if (own.length && !deep(e).some(x => x.textContent.includes(marker === "PROBE-ONE" ? "PROBE-TWO" : "PROBE-ONE") && !x.contains(leaf))) btn = own[0];
    }
    if (!leaf) { out.replies[k] = "reply not shown"; continue; }
    if (!btn) { out.replies[k] = "no copy button"; continue; }
    const n = S.clip.length;
    btn.click();
    await sleep(400);
    const got = S.clip.slice(n).join("\n");
    out.replies[k] = got.includes(marker) ? "ok" : "clipboard got " + JSON.stringify(got.slice(0, 80));
  }
  out.calls = S.calls; out.nmsgs = (chat()?.active?.session?.messages || []).length;
  out.text = deep(chat()).filter(e => !e.children.length).map(e => e.textContent.trim()).filter(Boolean).join(" | ").slice(-600);
  out.ok = out.turn1Ended && out.turn2Ended && out.panelAlive && out.replies.one === "ok" && out.replies.two === "ok";
  return out;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.addInitScript({ content: STUB });
  await page.goto(`file://${NB}#view=${LAYOUT}`);
  await page.waitForFunction(() => globalThis.__ojs_runtime?.mains?.size > 0, null, { timeout: 30000 });
  const when = process.argv[3] || "during";  // turn: the agent edits mid-turn; between: the user applies it between turns
  const live = await page.evaluate(`(${CHECK.toString()})(${JSON.stringify({ old: OLD, new: NEW, when })}, false)`);
  // save + reopen: export the live page and replay a no-edit conversation in a sandboxed blob: frame
  const saved = await page.evaluate(async ({ stub, check }) => {
    const rt = globalThis.__ojs_runtime;
    const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")?._value;
    if (!exp) return { stage: "no exportToHTML" };
    const r = await exp({ mains: rt.mains });
    let html = typeof r === "string" ? r : r.source;
    html = html.replace(/<head[^>]*>/i, h => h + "<script>" + stub + "<\/script>");
    const reporter = `<script>(async () => { let res; try { res = await (${check})(null, true); } catch (e) { res = { stage: "threw " + e.message }; } parent.postMessage({ __m48: res }, "*"); })()<\/script>`;
    html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
    const got = new Promise(res => { addEventListener("message", e => { if (e.data && e.data.__m48) res(e.data.__m48); }); setTimeout(() => res({ stage: "timeout" }), 90000); });
    frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    document.body.appendChild(frame);
    return await got;
  }, { stub: STUB, check: CHECK.toString() });
  const res = { live, saved, pageErrors: errs.slice(0, 5) };
  console.log(JSON.stringify(res, null, 1));
  await browser.close();
  process.exit(live.ok && saved.ok ? 0 : 1);
}
