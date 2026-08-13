// Deep QA of the pairing surface: the change stream (arming, fidelity, coalescing,
// self-suppression, the toggle) and the MCP tools. Deterministic — no model turns.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail) => { results.push({ name, ok: !!ok, detail }); console.log((ok ? "PASS" : "FAIL") + "  " + name + (detail !== undefined ? "  " + JSON.stringify(detail) : "")); };

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } });
const p = await ctx.newPage();
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

// --- a replayed change must not read as an edit made now
const restored = await p.evaluate(async () => {
  const D = window.__CB_DEPS;
  const def = (await D.importShim("/@tomlarkworthy/local-change-history.js?v=4")).default;
  const h = await D.runtime.module(def).value("history");
  h.push({ t: Date.now(), op: "upd", source: "git", pid: "_qa_restore", module: "qa",
    provenance: { source: "git", oid: "deadbeef" }, _name: "restored_cell", _inputs: [], _definition: "function _restored_cell(){return 1}" });
  return true;
});
await sleep(8000);
check("A15 a git-sourced change is labelled a restore, not an edit",
  (await pushes()).some((c) => /restored_cell \(restored\)/.test(c)), (await pushes()).slice(-1));
check("A16 the event carries its provenance for the agent to check",
  (await p.evaluate(() => window.__nbEvents().filter((e) => e.what === "restored_cell").map((e) => ({ via: e.via, oid: e.provenance && e.provenance.oid }))))[0]?.oid === "deadbeef");

// --- /local-disk (synthetic handle: the native picker cannot be driven headlessly,
// everything downstream of it is the real path)
const refuseUnmounted = await p.evaluate(() => {
  try { window.__RC5FS.writeSync("/local-disk/x.txt", "nope"); return "wrote anyway"; } catch (err) { return err.message; }
});
check("D1 writing with nothing mounted is refused in-turn", /REFUSED .*no local folder is mounted/.test(refuseUnmounted), refuseUnmounted);

const mkTree = (readonly) => p.evaluate((ro) => {
  const enc = new TextEncoder();
  const mk = (name, bytes) => ({ kind: "file", name,
    getFile: async () => ({ size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }),
    createWritable: async function () { const self = this; return { write: async (c) => { self.__written = c; }, close: async () => {} }; } });
  const dir = (name, entries) => ({ kind: "directory", name, __entries: entries,
    entries: async function* () { for (const e of entries) yield [e.name, e]; },
    queryPermission: async () => (ro ? "denied" : "granted"),
    requestPermission: async () => (ro ? "denied" : "granted"),
    getDirectoryHandle: async (n, o) => { let d = entries.find((e) => e.name === n && e.kind === "directory"); if (!d && o && o.create) { d = dir(n, []); entries.push(d); } return d; },
    getFileHandle: async (n, o) => { let f = entries.find((e) => e.name === n && e.kind === "file"); if (!f && o && o.create) { f = mk(n, new Uint8Array()); entries.push(f); } return f; } });
  const tree = dir("qa-project", [
    mk("README.md", enc.encode("# qa project\n")),
    mk("logo.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe])),
    mk("huge.txt", enc.encode("x".repeat(600 * 1024))),
    dir("src", [mk("index.js", enc.encode("export const answer = 42;\n"))]),
    dir("node_modules", [mk("junk.js", enc.encode("nope"))]),
  ]);
  window.__QA_TREE = tree;
  return window.__mountLocalDisk(tree);
}, readonly);

const m1 = await mkTree(false);
check("D2 mount indexes text and skips the rest", m1.files === 2 && m1.skipped === 2 && !m1.readonly, m1);
check("D3 node_modules is not walked", !(await p.evaluate(() => window.__RC5FS.list().some((x) => x.includes("node_modules")))));
const wrote2 = await p.evaluate(async () => {
  window.__RC5FS.writeSync("/local-disk/src/new.txt", "hello disk\n");
  await new Promise((r) => setTimeout(r, 400));
  const src = window.__QA_TREE.__entries.find((e) => e.name === "src");
  return (src.__entries.find((e) => e.name === "new.txt") || {}).__written || null;
});
check("D4 a write reaches the real file handle", wrote2 === "hello disk\n", wrote2);

// restart: the mount and the stream must both survive it
await p.evaluate(() => window.__autostart());
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(9000);
const inside = await p.evaluate(() => {
  const fs = document.querySelector("#cb-cli-frame").contentWindow.__REG.fs;
  try { return { ls: fs.readdirSync("/local-disk"), md: /local-disk/.test(fs.readFileSync("/home/user/project/CLAUDE.md", "utf8")) }; }
  catch (err) { return { ls: "ERR " + err.message }; }
});
check("D5 the mount survives a restart and is listable in-session", Array.isArray(inside.ls) && inside.ls.includes("README.md"), inside);
check("D6 the session's memory tells it about the mount", inside.md === true);
const beforeR = (await pushes()).length;
await addModule("@qa/after-restart");
await sleep(8000);
check("D7 the change stream re-arms after a restart", (await pushes()).length > beforeR, (await pushes()).slice(beforeR));

const ro = await mkTree(true);
const refuseRo = await p.evaluate(() => {
  try { window.__RC5FS.writeSync("/local-disk/README.md", "nope"); return "wrote anyway"; } catch (err) { return err.message; }
});
check("D8 a read-only mount refuses writes in-turn", ro.readonly === true && /REFUSED .*read-only/.test(refuseRo), refuseRo);

// --- E: a fork of this notebook must be a working notebook, not a dead one.
// A blob: fork is an opaque origin: no IndexedDB, no localStorage, not a secure context.
// That last one cost a whole session — crypto.randomUUID does not exist there and cli.js
// calls it at startup, so the fork mounted, said "Running", and printed nothing.
const forkPage = new Promise((res) => ctx.on("page", res));
const clicked = await p.evaluate(async () => {
  let ex = null;
  for (const [mod, info] of window.__CB_DEPS.currentModules) if (info && info.name === "@tomlarkworthy/exporter-3") ex = mod;
  if (!ex) return "no exporter-3";
  (await ex.value("forkAnchor"))({}, "fork").click();
  return "clicked";
});
check("E1 the fork affordance runs", clicked === "clicked", clicked);
const fp = await Promise.race([forkPage, sleep(150000).then(() => null)]);
check("E2 a fork tab opens", !!fp, fp && fp.url().slice(0, 24));
if (fp) {
  await fp.waitForLoadState("load", { timeout: 120000 }).catch(() => {});
  const fh = await fp.waitForFunction(() => {
    const h = window.__termHealth && window.__termHealth();
    return h && h.renderedChars > 0 ? h : false;
  }, { timeout: 120000, polling: "raf" }).then((x) => x.jsonValue()).catch(() => null);
  check("E3 the forked session paints", !!fh && fh.renderedChars > 0 && fh.wedges === 0,
    fh && { chars: fh.renderedChars, buffered: fh.bufferedChars, wedges: fh.wedges });
  const fdump = () => fp.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
  check("E4 the fork carries the runtime, not just the UI",
    await fp.evaluate(() => [...document.querySelectorAll('script[type="text/plain"][id]')].some((s) => /claude-code-browser\/cli\.js/.test(s.id))));
  const powers = await fp.evaluate(() => ({ secure: window.isSecureContext, uuid: typeof crypto.randomUUID }));
  check("E5 the fork really is the hostile environment this guards", powers.secure === false && powers.uuid === "undefined", powers);
  let listening = false;
  for (let i = 0; i < 20 && !listening; i++) { await sleep(1500); listening = /Listening for channel messages/.test(await fdump()); }
  check("E6 pairing works in the fork", listening);
  await fp.evaluate(() => window.__NBNOTIFY("fork qa hello", { type: "qa" }));
  let delivered = false;
  for (let i = 0; i < 8 && !delivered; i++) { await sleep(1500); delivered = /fork qa hello/.test(await fdump()); }
  check("E7 a notification reaches the forked session", delivered);
  await fp.close();
}

// --- health after all that
const h = await p.evaluate(() => window.__termHealth());
check("C1 terminal never wedged", h.wedges === 0 && h.renderedChars > 0, { wedges: h.wedges, chars: h.renderedChars, instances: h.instances });
check("C2 no page errors", pageErrors.length === 0, pageErrors.slice(0, 3));

console.log("\n==== " + results.filter((r) => r.ok).length + "/" + results.length + " passed ====");
for (const r of results.filter((x) => !x.ok)) console.log("  FAILED: " + r.name + "  " + JSON.stringify(r.detail));
await b.close();
process.exit(results.every((r) => r.ok) ? 0 : 1);
