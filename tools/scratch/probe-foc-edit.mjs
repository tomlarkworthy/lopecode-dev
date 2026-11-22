// foc-chat message editing, signed out: currentSession and focEditMessage are
// redefined in the foc-chat module, so nothing is written to atproto.
import { chromium } from "playwright";
const [url] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.PW_CHROME });
const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await p.goto(url + "#view=S100(@tomlarkworthy/foc-chat)", { waitUntil: "load" });
await p.waitForFunction(() => {
  if (!window.__ojs_runtime) return false;
  for (const v of window.__ojs_runtime._variables) if (v._name === "focChatView" && v._value !== undefined) return document.querySelectorAll(".foc-chat .fc-msg").length > 3;
  return false;
}, null, { timeout: 120000, polling: 300 });

const rt = await p.evaluate(() => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const toDoc = get("focPostToDoc"), toPost = get("focDocToPost"), schema = get("editableSchema"), archive = get("archive");
  const OK = new Set(["bold", "italic", "code", "link"]);
  let tried = 0, same = 0; const bad = [];
  for (const r of archive.messages) {
    const fs = r.value.facets || [];
    if (fs.some((f) => (f.features || []).some((x) => !OK.has(String(x.$type).split("#")[1])))) continue;
    if (/\n{3,}|^\s|\s$/.test(r.value.text || "")) continue;
    tried++;
    const back = toPost(toDoc(r, schema));
    const norm = (a) => JSON.stringify((a || []).map((f) => [f.index.byteStart, f.index.byteEnd, f.features.map((x) => x.$type + (x.uri || "")).join()]).sort());
    if (back.text === r.value.text && norm(back.facets) === norm(fs)) same++;
    else if (bad.length < 3) bad.push({ rkey: r.rkey, a: r.value.text.slice(0, 120), b: back.text.slice(0, 120), fa: norm(fs).slice(0, 200), fb: norm(back.facets).slice(0, 200) });
  }
  return { tried, same, bad };
});
console.log("roundtrip", JSON.stringify(rt));

// Pick a visible message, pretend we own it.
const target = await p.evaluate(() => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v; };
  const rows = [...document.querySelectorAll(".foc-chat .fc-main .fc-msg")];
  const rkey = rows[rows.length - 1].dataset.rkey;
  const byRkey = get("byRkey")._value;
  const rec = byRkey.get(rkey);
  const did = rec.did || "did:plc:fakeowner";
  rec.did = did;
  const mod = get("focComposer")._module;
  window.__editCalls = [];
  mod.redefine("currentSession", [], () => ({ did, handle: "probe.test" }));
  mod.redefine("focEditMessage", [], () => async ({ record, doc }) => {
    window.__editCalls.push({ rkey: record.rkey, text: doc.textContent });
    const next = { ...record.value, text: doc.textContent, facets: [], edited: true };
    (window.__focOutbox = window.__focOutbox || []).push({ rkey: record.rkey, cid: "bafyprobe" + Date.now(), did: record.did, value: next, authorName: record.authorName });
    if (window.__focWake) window.__focWake();
    return { rkey: record.rkey };
  });
  return { rkey, text: rec.value.text.slice(0, 80) };
});
console.log("target", JSON.stringify(target));
const sel = `.foc-chat .fc-main .fc-msg[data-rkey="${target.rkey}"]`;
await p.waitForFunction((s) => [...document.querySelectorAll(s + " .fc-tools button")].some((b) => b.textContent === "edit"), sel, { timeout: 20000 });
const others = await p.evaluate((rk) => [...document.querySelectorAll(".foc-chat .fc-main .fc-msg")].filter((m) => m.dataset.rkey !== rk && [...m.querySelectorAll(".fc-tools button")].some((b) => b.textContent === "edit")).length, target.rkey);
console.log("edit buttons on other rows", others);
await p.hover(sel);
await p.click(`${sel} .fc-tools button:text-is("edit")`);
await p.waitForSelector(`${sel} .fc-composer .ProseMirror`);
const pre = await p.$eval(`${sel} .fc-composer .ProseMirror`, (e) => e.textContent.slice(0, 80));
console.log("prefilled", JSON.stringify(pre), "matches", pre === target.text.replace(/\n/g, "").slice(0, pre.length));
await p.screenshot({ path: "tools/screenshots/foc-edit-open.png" });
await p.click(`${sel} .fc-composer .ProseMirror`);
await p.keyboard.press("End");
await p.keyboard.type(" [edited by probe]");
await p.click(`${sel} .fc-composer button:text-is("Save")`);
await p.waitForFunction((s) => { const t = document.querySelector(s + " .fc-text"); return t && t.textContent.includes("[edited by probe]"); }, sel, { timeout: 20000 });
const after = await p.evaluate((s) => ({
  calls: window.__editCalls,
  edited: !!document.querySelector(s + " .fc-who .ed"),
  composerGone: !document.querySelector(s + " .fc-composer")
}), sel);
console.log("after", JSON.stringify(after));
await p.screenshot({ path: "tools/screenshots/foc-edit-saved.png" });
// Esc cancels
await p.hover(sel);
await p.click(`${sel} .fc-tools button:text-is("edit")`);
await p.waitForSelector(`${sel} .fc-composer .ProseMirror`);
await p.press(`${sel} .fc-composer .ProseMirror`, "Escape");
const cancelled = await p.evaluate((s) => !document.querySelector(s + " .fc-composer") && !!document.querySelector(s + " .fc-text"), sel);
console.log("esc cancels", cancelled);
const test = await p.evaluate(async () => {
  for (const v of window.__ojs_runtime._variables) if (v._name === "test_focPostToDoc_roundtrip") {
    v._module.value("test_focPostToDoc_roundtrip");
  }
  const m = [...window.__ojs_runtime._variables].find((v) => v._name === "test_focPostToDoc_roundtrip")._module;
  try { return await m.value("test_focPostToDoc_roundtrip"); } catch (e) { return "FAIL " + e.message; }
});
console.log("test", test);
// Edit in the channel row, then open the thread: both placements keep a body.
await p.hover(sel);
await p.click(`${sel} .fc-tools button:text-is("edit")`);
await p.waitForSelector(`${sel} .fc-composer .ProseMirror`);
await p.evaluate((rk) => { location.hash = location.hash.replace(/&msg=[^&]*/, "") + "&msg=" + rk; }, target.rkey);
await p.waitForSelector(`.foc-chat .fc-thread .fc-msg[data-rkey="${target.rkey}"]`, { timeout: 20000 });
await p.waitForTimeout(500);
const both = await p.evaluate((rk) => {
  const row = (root) => { const m = document.querySelector(root + ' .fc-msg[data-rkey="' + rk + '"]'); return m && { text: !!m.querySelector(".fc-text"), editor: !!m.querySelector(".fc-composer") }; };
  return { channel: row(".foc-chat .fc-main"), thread: row(".foc-chat .fc-thread") };
}, target.rkey);
console.log("placements", JSON.stringify(both));
console.log("pageerrors", JSON.stringify(errs));
await b.close();
