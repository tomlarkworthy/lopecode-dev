// rc5-train eval (20260929-0620-m48): "Add a copy button to each of your replies in this chat".
// The agent has to change the chat UI it runs in (@tomlarkworthy/robocoop-5, the robocoop5 cell's
// renderMsg). setup.collect acts as the user after the turn, through the REAL chat panel with a scripted
// model (the initScript wraps fetch before boot; while __m48.on, every */chat/completions call is answered
// from a queue, so no model call is made by the check). It sends two messages, requires both turns to end,
// then for each reply finds the copy control next to it, clicks it, and requires navigator.clipboard.writeText
// (stubbed) to receive that reply's text and not the other reply's. Then it exports the notebook, boots the
// file in a sandboxed blob: iframe and repeats the two turns there: the change must survive saving.
// Any mechanism passes (renderer edit, a decorator, a MutationObserver) as long as the behaviour holds.
// Negative controls: the unmodified notebook (the agent hands the edit over, run m48-before) scores 0; a
// button that copies the whole transcript fails `liveOk`.

const M = "/src/@tomlarkworthy/robocoop-5.js";

const INIT_SCRIPT = String.raw`(() => {
  const S = globalThis.__m48 = { on: false, queue: [], calls: 0, clip: [] };
  const orig = globalThis.fetch;
  const sse = (model, delta, finish) => "data: " + JSON.stringify({ id: "x", model, choices: [{ index: 0, delta }] }) + "\n\n" +
    "data: " + JSON.stringify({ id: "x", model, choices: [{ index: 0, delta: {}, finish_reason: finish }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } }) + "\n\ndata: [DONE]\n\n";
  globalThis.fetch = async function (input, init) {
    const url = typeof input === "string" ? input : (input && input.url) || String(input);
    if (!S.on || !/\/chat\/completions/.test(url)) return orig.apply(this, arguments);
    let body = {}; try { body = JSON.parse((init && init.body) || "{}"); } catch {}
    S.calls++;
    const step = body.tools && body.tools.length ? (S.queue.shift() || { content: "PROBE-IDLE" }) : { content: "probe title" };
    const delta = { role: "assistant" };
    if (step.content) delta.content = step.content;
    if (step.tool) delta.tool_calls = [{ index: 0, id: "c" + S.calls, type: "function", function: { name: step.tool, arguments: JSON.stringify(step.args) } }];
    return new Response(sse(body.model, delta, step.tool ? "tool_calls" : "stop"), { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  try { if (!localStorage.getItem("OPENROUTER_API_KEY")) localStorage.setItem("OPENROUTER_API_KEY", "sk-probe-not-a-key"); } catch {}
  const clip = { writeText: async t => { S.clip.push(String(t)); } };
  try { Object.defineProperty(navigator, "clipboard", { configurable: true, get: () => clip }); } catch {}
})()`;

// Page-side: `n` scripted turns in the chat panel, then a copy check per reply.
const CHECK = String.raw`async function (n, inFrame) {
  const S = globalThis.__m48;
  S.on = true;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const deep = (root = document) => { const out = []; const walk = r => { for (const e of r.querySelectorAll("*")) { out.push(e); if (e.shadowRoot) walk(e.shadowRoot); } }; walk(root); return out; };
  const chat = () => document.querySelector("[data-rc5-group]");
  const t0 = Date.now();
  while (!chat() && Date.now() - t0 < (inFrame ? 3000 : 10000)) await sleep(200);
  if (!chat() && inFrame) {
    // a blob: frame has no URL hash, so lopepage does not lay out the chat: compute the chat cell and mount it
    let host; const t2 = Date.now();
    while (!(host = [...(globalThis.__ojs_runtime?._variables || [])].find(v => v._name === "robocoop_5")) && Date.now() - t2 < 8000) await sleep(200);
    if (host) { const el = await host._module.value("robocoop_5"); if (el instanceof Element) document.body.append(el); }
  }
  if (!chat()) return { stage: "no chat panel" };
  const ta = () => deep(chat()).find(e => e.tagName === "TEXTAREA" && /^Message/.test(e.placeholder || ""));
  const sendBtn = () => deep(chat()).find(e => e.tagName === "BUTTON" && /^(Send|Steer)$/.test(e.textContent.trim()));
  const idle = () => { const a = chat()?.active; return !!a && !a.busy && sendBtn()?.textContent.trim() === "Send"; };
  const look = { tool: "read_file", args: { file_path: "/src/@tomlarkworthy/robocoop-5.js", limit: 3 } };
  const markers = ["PROBE-ONE", "PROBE-TWO"].slice(0, n);
  const out = { turns: [] };
  for (const [i, mk] of markers.entries()) {
    const reply = mk + (i ? " The quick brown fox." : " Here is **one** answer.");
    S.queue.push(look, { content: reply, tool: "task_complete", args: { summary: reply } });
    const t = Date.now();
    while (!(ta() && sendBtn() && idle()) && Date.now() - t < 5000) await sleep(150);
    if (!ta() || !sendBtn()) { out.turns.push("no input"); break; }
    ta().value = "question " + (i + 1);
    sendBtn().click();
    await sleep(400);
    while (!idle() && Date.now() - t < 9000) await sleep(150);
    await sleep(300);
    out.turns.push(idle() ? "ended" : "still busy");
  }
  const copyLike = b => /copy|⧉|\u{1F4CB}/iu.test((b.textContent || "") + " " + (b.title || "") + " " + (b.getAttribute("aria-label") || ""));
  out.replies = {};
  for (const mk of markers) {
    const other = markers.find(x => x !== mk);
    const els = deep(chat()).filter(e => e.textContent.includes(mk) && !/^(SCRIPT|STYLE|PRE|DETAILS|SUMMARY)$/.test(e.tagName));
    const leaf = els.find(e => ![...e.children].some(c => c.textContent.includes(mk)));
    if (!leaf) { out.replies[mk] = "reply not shown"; continue; }
    // walk up from the reply until a copy control appears, never into a container that also holds the other reply
    let btn = null;
    for (let e = leaf, i = 0; e && i < 6 && !btn; e = e.parentElement || e.getRootNode()?.host, i++) {
      if (other && e.textContent.includes(other)) break;
      btn = deep(e).find(b => b.tagName === "BUTTON" && copyLike(b)) || null;
    }
    if (!btn) { out.replies[mk] = "no copy button"; continue; }
    const k = S.clip.length;
    btn.click();
    await sleep(300);
    const got = S.clip.slice(k).join("\n");
    out.replies[mk] = got.includes(mk) && !(other && got.includes(other)) ? "ok" : "clipboard got " + JSON.stringify(got.slice(0, 100));
  }
  out.ok = out.turns.length === n && out.turns.every(t => t === "ended") && markers.every(mk => out.replies[mk] === "ok");
  return out;
}`;

const COLLECT = String.raw`(async () => {
  const check = ${CHECK};
  const live = await check(2, false);
  const rt = globalThis.__ojs_runtime;
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")?._value;
  let saved = { stage: "no exportToHTML" };
  if (exp) {
    const r = await exp({ mains: rt.mains });
    let html = typeof r === "string" ? r : r.source;
    html = html.replace(/<head[^>]*>/i, h => h + "<script>" + ${JSON.stringify(INIT_SCRIPT)} + "<\/script>");
    const reporter = "<script>(async () => { let res; try { res = await (" + check.toString() + ")(2, true); } catch (e) { res = { stage: 'threw ' + e.message }; } parent.postMessage({ __m48: res }, '*'); })()<\/script>";
    html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
    const frame = document.createElement("iframe");
    frame.sandbox = "allow-scripts";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
    saved = await new Promise(res => {
      addEventListener("message", e => { if (e.data && e.data.__m48) res(e.data.__m48); });
      setTimeout(() => res({ stage: "timeout" }), 20000);
      frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      document.body.appendChild(frame);
    });
    frame.remove();
  }
  return { liveOk: !!live.ok, savedOk: !!saved.ok, live, saved };
})()`;

// The renderer change. Button style from robocoop5.branchControls (same cell); the clipboard call is
// @tomlarkworthy/exporter-3.copyTextToClipboard's `await navigator.clipboard.writeText(text)`
// (lopebooks/notebooks/@tomlarkworthy_robocoop-5.html embeds exporter-3).
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

export default {
  id: "rc5t-reply-copy-button",
  category: "rc5-train",
  question: "Add a copy button to each of your replies in this chat that copies the reply's text to the clipboard.",
  setup: { initScript: INIT_SCRIPT, collect: COLLECT },
  criteria: [
    // live: after two further turns in the panel, each reply's copy control copies that reply
    { name: "collected_equals", args: { key: "liveOk", equals: true }, weight: 3 },
    // the change survives save + reopen
    { name: "collected_equals", args: { key: "savedOk", equals: true }, weight: 2 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "edit_file", args: { file_path: M, old_string: OLD, new_string: NEW } },
  ],
};
