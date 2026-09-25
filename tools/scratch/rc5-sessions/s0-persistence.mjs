// S0 (plan/robocoop-5-multi-session.md): is "saved" exactly "in runtime.mains"?
// Creates two runtime modules with a data cell + JSON attachment each, mains only one,
// exports via exporter-3 the way the pairing fork does, reloads the bytes, reads back.
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const nb = resolve(process.argv[2] || resolve(here, "../../../lopebooks/notebooks/@tomlarkworthy_robocoop-5.html"));
const outDir = resolve(here, "out"); mkdirSync(outDir, { recursive: true });
const out = resolve(outDir, "s0-exported.html");

const browser = await chromium.launch();
const page = await browser.newPage();
const errors = []; page.on("pageerror", e => errors.push(String(e)));

const waitFor = async (p, names) => p.waitForFunction(ns => {
  const rt = window.__ojs_runtime; if (!rt) return false;
  return ns.every(n => [...rt._variables].some(v => v._name === n && v._value !== undefined));
}, names, { timeout: 90000, polling: 250 });

await page.goto(pathToFileURL(nb).href);
await waitFor(page, ["exportToHTML", "realize"]);

const exported = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const val = n => [...rt._variables].find(v => v._name === n && v._value !== undefined)?._value;
  // setFileAttachment/jsonFileAttachment may be unobserved: force them via a temporary observer.
  const force = async n => {
    const v = [...rt._variables].find(x => x._name === n && x._type === 1);
    if (!v) throw new Error("no variable " + n);
    if (v._value !== undefined) return v._value;
    const tmp = v._module.variable(true).define([n], x => x);
    rt._computeNow?.();
    for (let i = 0; i < 200 && v._value === undefined; i++) await new Promise(r => setTimeout(r, 25));
    tmp.delete();
    return v._value;
  };
  const realize = val("realize");
  const setFileAttachment = await force("setFileAttachment");
  const jsonFileAttachment = await force("jsonFileAttachment");
  const obs = { pending() {}, fulfilled() {}, rejected() {} };
  const make = async (name, payload) => {
    const m = rt.module();
    const src = `function _session_meta(){return(${JSON.stringify(payload)})}`;
    const [fn] = await realize([src], rt);
    m.variable(obs).define("session_meta", [], fn);
    await setFileAttachment(jsonFileAttachment("turn_0001_0.json", { name, bytes: [1, 2, 3] }), m);
    return m;
  };
  const saved = await make("@rc5-sessions/s0-saved", { kind: "robocoop-5/session", which: "saved" });
  const unsaved = await make("@rc5-sessions/s0-unsaved", { kind: "robocoop-5/session", which: "unsaved" });
  rt.mains.set("@rc5-sessions/s0-saved", saved);
  const res = await val("exportToHTML")({ mains: rt.mains });
  return typeof res === "string" ? res : res.source;
});
writeFileSync(out, exported);

const count = s => exported.split(s).length - 1;
const bootconf = exported.match(/<script id="bootconf\.json"[^>]*>([\s\S]*?)<\/script>/)?.[1];
const report = {
  bytes: exported.length,
  savedModuleBlock: count('id="@rc5-sessions/s0-saved"'),
  savedAttachmentBlock: count('id="@rc5-sessions/s0-saved/turn_0001_0.json"'),
  unsavedMentions: count("s0-unsaved"),
  unsavedPayloadMentions: count('\\"which\\":\\"unsaved\\"') + count('"which":"unsaved"'),
  bootconfMainsHasSaved: JSON.parse(bootconf).mains.includes("@rc5-sessions/s0-saved"),
};
console.log("export:", JSON.stringify(report));

const page2 = await browser.newPage();
page2.on("pageerror", e => errors.push("reload: " + String(e)));
await page2.goto(pathToFileURL(out).href);
await page2.waitForFunction(() => window.__ojs_runtime?.mains?.has?.("@rc5-sessions/s0-saved"), null, { timeout: 90000 });
const back = await page2.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const m = rt.mains.get("@rc5-sessions/s0-saved");
  const v = [...rt._variables].find(x => x._module === m && x._name === "session_meta");
  const probe = m.variable(true).define(["session_meta", "FileAttachment"], async (meta, FA) => ({ meta, file: await FA("turn_0001_0.json").json() }));
  rt._computeNow?.();
  for (let i = 0; i < 400 && probe._value === undefined; i++) await new Promise(r => setTimeout(r, 25));
  const r = probe._value; probe.delete();
  return { hasVar: !!v, value: r, mains: [...rt.mains.keys()].filter(k => k.startsWith("@rc5-sessions/")),
           panes: document.querySelectorAll(".lp2-pane").length, hash: location.hash };
});
console.log("reload:", JSON.stringify(back));
console.log("errors:", JSON.stringify(errors.slice(0, 10)));
await browser.close();
