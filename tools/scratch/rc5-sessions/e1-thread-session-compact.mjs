// E1 (plan/rc5-entrances.md step 1): a thread is a compact robocoop-5 chat on one session id, saved as
// @rc5-threads/<id> under its own name, and a thread whose cell is gone is flagged orphaned in the full chat.
// Checks, with a fake agent (no model calls):
//   thread   rc5Thread({id}) with a pending start sends it once, saves @rc5-threads/<id>, currentModules names it
//   follow   the thread's "full chat" link makes the full chat show that session
//   orphan   the thread has no annotation_/prompt_ cell, so the full chat's picker flags it and offers delete
//   delete   clicking delete removes the session from mains
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S100(@tomlarkworthy/robocoop-5))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const until = async (f, ms = 15000) => { const t0 = Date.now(); while (!f()) { if (Date.now() - t0 > ms) return false; await sleep(100); } return true; };
  ["rc5Thread", "rc5_pendingStarts", "currentModules", "rc5_threadOrphans"].forEach(n => H.force(n));
  await until(() => H.byName("rc5Thread") && H.byName("rc5_pendingStarts") && document.querySelector("[data-rc5-group]"), 30000);
  const rc5Thread = H.byName("rc5Thread"), starts = H.byName("rc5_pendingStarts");
  if (typeof rc5Thread !== "function") return { pass: false, why: "rc5Thread missing" };
  const rt = window.__ojs_runtime;
  const full = document.querySelector("[data-rc5-group]:not([data-rc5-session])");
  const ctl = full.controller;
  const sent = [];
  const agent = () => { const messages = []; return { messages, async send(t) { sent.push(t); messages.push({ role: "user", content: t }, { role: "assistant", content: "ok" }); } }; };
  const id = "e1" + Math.random().toString(36).slice(2, 7);
  starts.set(id, { text: "hello thread" });
  const chat = rc5Thread({ id, context: { note: "probe" }, agent });
  document.body.append(chat);
  const saved = await until(() => rt.mains.has("@rc5-threads/" + id));
  const mod = rt.mains.get("@rc5-threads/" + id);
  const named = await until(() => [...(H.byName("currentModules") || new Map()).values()].some(i => i && i.module === mod && i.name === "@rc5-threads/" + id));
  // follow: the compact chat's full-chat link
  const link = [...chat.querySelectorAll("a")].find(a => /full chat/.test(a.textContent));
  link?.addEventListener("click", e => e.preventDefault(), { once: true });
  link?.click();
  const followed = await until(() => full.active?.id === id, 5000);
  // orphan: no annotation_<id> / prompt_<id> cell exists
  const opts = () => [...full.querySelectorAll("*")].flatMap(el => el.shadowRoot ? [...el.shadowRoot.querySelectorAll("option")] : []).map(o => o.textContent);
  const flagged = await until(() => opts().some(t => /orphaned/.test(t) && t.includes("hello thread")), 5000);
  const drop = [...full.querySelectorAll("button")].find(b => /delete orphan/.test(b.textContent));
  const dropShown = !!drop && drop.style.display !== "none";
  drop?.click();
  const deleted = await until(() => !rt.mains.has("@rc5-threads/" + id), 5000);
  chat.remove();
  const checks = { sentOnce: sent.length === 1 && sent[0] === "hello thread", saved, named, followed, flagged, dropShown, deleted };
  return { id, checks, opts: opts().slice(0, 4), pass: Object.values(checks).every(Boolean) };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
