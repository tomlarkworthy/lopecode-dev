// Page-side (setup.collect) for rc5t-summarise-with-chat-model. Acts as the user on the module the agent built.
// The initScript's fetch wrapper fakes every */chat/completions request while __rc5tSum.on is set and records it.
// Verdicts (each "ok" or a reason):
//   leak     — the saved file (exportToHTML) does not contain the key the chat uses ($KEY from localStorage)
//   once     — no request while typing; one click = exactly one request; typing after a click sends none
//   settings — the request carries the chat's key (Authorization) and the model currently picked in settings,
//              read at click time (the collect switches the model picker first)
//   shown    — the fake summary text appears in the module's DOM
//   error    — a failed request (401) shows an error message instead of hanging or staying silent
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const S = globalThis.__rc5tSum;
  const out = { leak: "not run", once: "not run", settings: "not run", shown: "not run", error: "not run" };
  if (!S) { out.leak = out.once = out.settings = out.shown = out.error = "initScript fetch wrapper missing"; return out; }
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const allVars = () => [...rt._variables];
  const userVars = () => allVars().filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const KEY = (() => { try { return localStorage.getItem("OPENROUTER_API_KEY") || ""; } catch { return ""; } })();

  // leak: the file a save writes. Run before keepers are added (the exporter would write them out).
  try {
    const exp = allVars().find(v => v._name === "exportToHTML" && typeof v._value === "function")?._value;
    if (!exp) out.leak = "no exportToHTML in the page";
    else if (!KEY) out.leak = "no key in localStorage to test with";
    else {
      const r = await exp({ mains: globalThis.__ojs_runtime.mains });
      const html = typeof r === "string" ? r : r.source;
      const n = html.split(KEY).length - 1;
      out.leak = n ? `the saved file contains the API key ${n} time(s)` : "ok";
    }
  } catch (e) { out.leak = "export threw: " + (e?.message || e); }

  if (!userVars().length) { for (const k of ["once", "settings", "shown", "error"]) out[k] = "no module was created"; return out; }
  const keepers = [];
  for (const v of userVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1000);
    const els = () => userVars().map(v => v._value).filter(x => x instanceof Element);
    const q = sel => els().flatMap(x => [...(x.matches(sel) ? [x] : []), ...x.querySelectorAll(sel)]);
    // what the user sees: rendered elements, plain string/number values (the inspector shows them), and a
    // cell's error (the inspector shows it in red; the runtime keeps it only as the rejected _promise)
    const errOf = v => Promise.race([Promise.resolve(v._promise).then(() => null, e => e), sleep(30).then(() => null)]);
    const text = async () => (await Promise.all(userVars().map(async v => {
      const e = await errOf(v);
      if (e) return "Error: " + (e?.message ?? e);
      const x = v._value;
      if (x instanceof Element) return x.textContent;
      return typeof x === "string" || typeof x === "number" ? String(x) : "";
    }))).join(" | ");
    const box = q("textarea")[0] || q("input[type=text], input:not([type])")[0];
    if (!box) { for (const k of ["once", "settings", "shown", "error"]) out[k] = "no text box in the new module"; return out; }
    const button = () => q("button").find(b => /summar/i.test(b.textContent)) || q("button")[0];
    if (!button()) { for (const k of ["once", "settings", "shown", "error"]) out[k] = "no button in the new module"; return out; }
    const type = async s => {
      box.value = s;
      box.dispatchEvent(new Event("input", { bubbles: true }));
      box.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(600);
    };

    // switch the chat's model picker to another option, so a hard-coded or boot-time model shows
    let wantModel = null;
    try {
      const mv = allVars().find(v => v._name === "viewof model" && v._value instanceof Element)?._value;
      // Inputs.select's <option> values are indices; the ids are the labels (minus the "⚠ no vision" suffix)
      const sel = mv?.querySelector("select");
      const ids = sel ? [...sel.options].map(o => o.textContent.trim().split(/\s{2,}/)[0]) : [];
      const other = ids.find(id => id && id !== mv.value);
      if (other) {
        mv.value = other;
        mv.dispatchEvent(new Event("input", { bubbles: true }));
        if (mv.value === other) wantModel = other;
      }
    } catch {}
    await sleep(1500);

    S.on = true; S.calls.length = 0; S.fail = false; S.reply = "FAKE-SUMMARY-7731 three short points"; S.delayMs = 1200;
    const SAMPLE = "The quarterly report shows revenue up 12 percent, driven by the new widget line. Costs rose 4 percent.";
    await type(SAMPLE);
    const typedCalls = S.calls.length;
    button().click();
    // loading: something visible changes while the request is in flight (recorded, not scored)
    await sleep(400);
    out.loadingSeen = !!(button()?.disabled || /summari[sz]ing|loading|working|thinking|…|\.\.\./i.test(await text()));
    for (let i = 0; i < 40 && !/FAKE-SUMMARY-7731/.test(await text()); i++) await sleep(250);
    await sleep(1000);
    const clickCalls = S.calls.length - typedCalls;
    const shownText = await text();
    out.cells = await Promise.all(userVars().filter(v => /summar|result|output/i.test(v._name)).map(async v => {
      const e = await errOf(v); const x = v._value;
      return v._name + " = " + (e ? "Error: " + (e?.message ?? e) : x instanceof Element ? "<" + x.tagName + "> " + x.textContent : typeof x === "object" && x ? JSON.stringify(x) : String(x)).slice(0, 160);
    }));
    out.shown = /FAKE-SUMMARY-7731/.test(shownText) ? "ok" : "fake summary not shown; text: " + shownText.slice(0, 150) + " … " + shownText.slice(-350);
    await type(SAMPLE + " Headcount is flat.");
    const afterTypeCalls = S.calls.length - typedCalls - clickCalls;
    out.calls = S.calls.map(c => ({ model: c.model, auth: c.auth === "Bearer " + KEY ? "$KEY" : c.auth ? "other" : "none", hasText: c.hasText }));
    out.once = typedCalls === 0 && clickCalls === 1 && afterTypeCalls === 0 ? "ok"
      : `requests: ${typedCalls} while typing, ${clickCalls} for one click, ${afterTypeCalls} typing after the click`;
    const c = S.calls[typedCalls];
    out.settings = !c ? "no request was sent"
      : c.auth !== "Bearer " + KEY ? "request does not carry the chat's key"
      : wantModel && c.model !== wantModel ? `request model ${JSON.stringify(c.model)}, settings picker says ${JSON.stringify(wantModel)}`
      : !c.hasText ? "request does not contain the pasted text"
      : "ok";

    // error: a 401 must be reported to the user
    S.fail = true; S.reply = null;
    const before = await text();
    button().click();
    await sleep(3500);
    const after = await text();
    out.error = /error|fail|invalid|401|unauthori[sz]ed|could not|couldn't|problem|went wrong/i.test(after) && after !== before ? "ok"
      : "no error shown after a failed request; text: " + after.slice(0, 200);
    return out;
  } finally {
    S.on = false;
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()
