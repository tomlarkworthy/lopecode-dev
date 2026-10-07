// Experiment 2026-10-06: does Function.prototype.toString on a Cloudflare Worker return a module's cells as written,
// so a Worker could serve its source from the functions it runs instead of carrying a second copy as text?
// Uploads each module's source AS A JS MODULE to the scratch Worker cb-tostring (deleted at the end), replays define() against a
// recorder (no cell is run), and compares fn.toString() with the text that was uploaded.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const E = (f: string) => resolve(import.meta.dir, "../../cloud-brain/.emitted", f);
const token = readFileSync(resolve(import.meta.dir, ".cf-token"), "utf8").trim();
const st = JSON.parse(readFileSync(E("cb3.json"), "utf8"));
const NAME = "cb-tostring";
const S = `https://api.cloudflare.com/client/v4/accounts/${st.account}/workers/scripts/${NAME}`;
const worker = `
import define from "./mod.js";
export default { fetch() {
  const cells = [];
  const record = (args) => { const fn = args[args.length - 1]; const name = typeof args[0] === "string" ? args[0] : null;
    const inputs = args.find((a) => Array.isArray(a)) || [];
    cells.push({ name, inputs, kind: typeof fn, text: typeof fn === "function" ? fn.toString() : JSON.stringify(fn) }); };
  const variable = { define: (...a) => (record(a), variable), import: () => variable };
  const main = new Proxy({}, { get: (_, k) => k === "variable" ? () => variable : k === "define" ? (...a) => (record(a), variable) : () => main });
  const runtime = new Proxy({}, { get: (_, k) => k === "module" ? () => main : () => () => null });
  let error = null; try { define(runtime, () => ({})); } catch (e) { error = String(e && e.stack || e); }
  return Response.json({ cells, error, nonce: "NONCE" });
} };`;
for (const f of process.argv.slice(2)) {
  const e = JSON.parse(readFileSync(E(f), "utf8"));
  const src = e.parts.find((p: any) => p.path === "source.js").text;
  const text: string = JSON.parse(src.slice("export default ".length).replace(/;\s*$/, "")).text;
  const nonce = f + ":" + Date.now();
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify({ main_module: "worker.js", compatibility_date: "2026-10-01" })], { type: "application/json" }));
  form.append("worker.js", new File([worker.replace("NONCE", nonce)], "worker.js", { type: "application/javascript+module" }));
  form.append("mod.js", new File([text], "mod.js", { type: "application/javascript+module" }));
  const up = await fetch(S, { method: "PUT", headers: { authorization: "Bearer " + token }, body: form });
  const uj: any = await up.json();
  if (!uj.success) { console.log(f, "UPLOAD REFUSED", JSON.stringify(uj.errors).slice(0, 600)); continue; }
  await fetch(S + "/subdomain", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
  let out: any = null;
  for (let i = 0; i < 20 && !out; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    const r = await fetch(`https://${NAME}.${st.subdomain}.workers.dev/?${Date.now()}`);
    const j: any = await r.json().catch(() => null);
    // the version before may still answer for some seconds: take only the answer carrying this upload's nonce
    if (j && j.nonce === nonce) out = j;
  }
  if (!out) { console.log(f, "no answer"); continue; }
  const fns = out.cells.filter((c: any) => c.kind === "function");
  const verbatim = fns.filter((c: any) => text.includes(c.text));
  const chars = verbatim.reduce((n: number, c: any) => n + c.text.length, 0);
  const tail = text.slice(text.indexOf("export default function define"));
  console.log(JSON.stringify({ module: e.meta.module, uploadedChars: text.length, defineCalls: out.cells.length, functions: fns.length, verbatim: verbatim.length,
    verbatimChars: chars, defineTailChars: tail.length, unaccounted: text.length - chars - tail.length, error: out.error && out.error.slice(0, 200),
    notVerbatim: fns.filter((c: any) => !text.includes(c.text)).slice(0, 3).map((c: any) => [c.name, c.text.slice(0, 80)]) }));
}
const del: any = await (await fetch(S + "?force=true", { method: "DELETE", headers: { authorization: "Bearer " + token } })).json();
console.log("scratch Worker deleted:", del.success);
