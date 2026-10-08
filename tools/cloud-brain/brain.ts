/**
 * Drives a scratch Brain from the command line, in the installer's place.
 *   bun tools/cloud-brain/brain.ts install-deployer         # uploads .emitted/deployer.json as the deployer: <base>-deployer, or <base>-guard on a Brain from before 2026-10-08
 *   bun tools/cloud-brain/brain.ts migrate-deployer         # an old Brain: installs <base>-deployer, copies the rows of <base>-guard to it, and marks <base>-guard replaced
 *   bun tools/cloud-brain/brain.ts retire-guard             # after every Worker is deployed again: <base>-guard becomes a stub with no token and no recovery key
 *   bun tools/cloud-brain/brain.ts apply core.json [...]    # infra.apply with the recovery key
 *   bun tools/cloud-brain/brain.ts state | confirm | approval on|off
 *   bun tools/cloud-brain/brain.ts curl <path> [--owner] [-X POST -d '{}']   # the kernel; --owner or --other sends a minted session as Authorization: Bearer
 *   bun tools/cloud-brain/brain.ts session [did]                               # mint a session token for the owner, or for another DID
 * State (recovery key, deployer key, session tokens) is in .emitted/<base>.json, git-ignored. The Cloudflare token is never printed.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const BASE = process.env.BRAIN_BASE || "cb1";
const OWNER = "did:plc:j7nm3lrd5h7fm3sfhcv3lhfv";
const E = (f: string) => resolve(import.meta.dir, ".emitted", f);
const token = readFileSync(resolve(import.meta.dir, "../scratch/cloud-brain-experiments/.cf-token"), "utf8").trim();
const statePath = E(BASE + ".json");
const st: any = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
const save = () => writeFileSync(statePath, JSON.stringify(st, null, 1));
const hex = (n = 32) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
const api = async (path: string, init: RequestInit = {}) => {
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, { ...init, headers: { authorization: "Bearer " + token, ...(init.headers || {}) } });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`${init.method || "GET"} ${path.replace(/[0-9a-f]{32}/, "<account>")} ${r.status} ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.result;
};
const emitted = (f: string) => JSON.parse(readFileSync(E(f), "utf8"));
// A module's attachments, as the notebook holds them: build.ts writes a newline before the text.
const filesOf = (source: string) => {
  const names = /new Map\(\[([^\]]*)\]\.map\(\(name\)/.exec(source);
  const files: any = {};
  for (const n of names ? JSON.parse("[" + names[1] + "]") : []) files[n] = "\n" + readFileSync(resolve(import.meta.dir, n), "utf8");
  return files;
};
// The deployer's script. Until 2026-10-08 it was <base>-guard, and a state file from before then names no script.
const scriptName = () => st.deployerScript ?? (st.recoveryKey ? BASE + "-guard" : BASE + "-deployer");
const urlOf = (name: string) => `https://${name}.${st.subdomain}.workers.dev`;
const G = () => urlOf(scriptName());
// The deployer's own key was guardKey in a state file from before 2026-10-08. Both fields are kept.
const deployerKey = () => { st.deployerKey ??= st.guardKey ?? hex(); st.guardKey ??= st.deployerKey; return st.deployerKey; };
const deployerEmit = () => emitted(existsSync(E("deployer.json")) ? "deployer.json" : "guard.json");
const at = async (base: string, method: string, body?: any, raw?: string) => {
  const r = await fetch(`${base}/xrpc/com.lopecode.brain.infra.${method}`, { method: body === undefined && raw === undefined ? "GET" : "POST", headers: { authorization: "Bearer " + st.recoveryKey, "content-type": "application/json" }, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
  return { status: r.status, text: await r.text() };
};
// Uploads the deployer's code under one script name. `replacedBy` makes it a deployer that changes nothing.
const install = async (name: string, { replacedBy = null as string | null } = {}) => {
  const e = deployerEmit();
  const exists = await api(`/accounts/${st.account}/workers/scripts/${name}/settings`).then(() => true, () => false);
  const bindings: any[] = [
    { type: "secret_text", name: "CF_API_TOKEN", text: token },
    { type: "secret_text", name: "RECOVERY_KEY", text: st.recoveryKey },
    { type: "secret_text", name: "BRAIN_KEY", text: deployerKey() },
    { type: "durable_object_namespace", name: "ROWS", class_name: "Rows" },
    { type: "json", name: "BRAIN_CONFIG", json: { base: BASE, account: st.account, subdomain: st.subdomain, owner: OWNER, self: name, ...(replacedBy ? { replacedBy } : {}), ...(st.probationMs ? { probationMs: st.probationMs } : {}) } },
    { type: "json", name: "BRAIN_INFO", json: { ...e.info, name: "brain-deployer", deployedAt: new Date().toISOString() } },
  ];
  const metadata: any = { main_module: "worker.js", compatibility_date: "2026-10-01", compatibility_flags: [...new Set([...e.meta.flags, "nodejs_als"])], observability: { enabled: true, logs: { enabled: true, invocation_logs: false } }, bindings };
  if (!exists) metadata.migrations = { new_tag: "v1", new_sqlite_classes: ["Rows"] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  for (const p of e.parts) form.append(p.path, p.base64 != null ? new File([Buffer.from(p.base64, "base64")], p.path, { type: "application/wasm" }) : new File([p.text], p.path, { type: "application/javascript+module" }));
  const S = `/accounts/${st.account}/workers/scripts/${name}`;
  await api(S, { method: "PUT", body: form });
  await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
  await api(S + "/schedules", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(replacedBy ? [] : e.meta.crons.map((cron: string) => ({ cron }))) });
  console.log(`${exists ? "updated" : "installed"} ${name} ${e.hash.slice(0, 12)} at ${urlOf(name)}${replacedBy ? " (replaced by " + replacedBy + ")" : ""}`);
};
const digestOf = async (base: string) => JSON.parse((await at(base, "rowsDigest")).text).classes as Record<string, { rows: number; sha256: string }>;
const sameDigest = (a: any, b: any) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
const B = () => `https://${BASE}.${st.subdomain}.workers.dev`;
const deployer = async (method: string, body?: any) => {
  const r = await fetch(`${G()}/xrpc/com.lopecode.brain.infra.${method}`, { method: body === undefined ? "GET" : "POST", headers: { authorization: "Bearer " + st.recoveryKey, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text();
  try { return JSON.parse(text); } catch { return { status: r.status, text: text.slice(0, 600) }; }
};
const brief = (s: any) => ({ approval: s.approval, workers: (s.workers || []).map((w: any) => `${w.worker} ${String(w.hash).slice(0, 12)} ${w.state}${w.lastError ? " ERR " + w.lastError : ""}`), kernel: Object.fromEntries(Object.entries(s.kernel || {}).map(([k, v]: any) => [k, `${v.state} ${String(v.hash).slice(0, 12)} ${v.reason || ""}${v.deadline ? " until " + new Date(v.deadline).toISOString() : ""}`])), pending: (s.pending || []).map((p: any) => p.worker) });

const [cmd, ...args] = process.argv.slice(2);
// install-guard: the name of this command until 2026-10-07, when the deployer was called the guard.
if (cmd === "install-deployer" || cmd === "install-guard") {
  // A new Brain's base has no dash: brain-logs reads every script named BASE-…, so cb4 would read the Brain cb4-test.
  if (!st.recoveryKey && !/^[a-z][a-z0-9]{1,30}$/.test(BASE)) throw new Error("BRAIN_BASE is lower-case letters and digits, with no dash");
  st.account ??= (await api("/accounts"))[0].id;
  st.subdomain ??= (await api(`/accounts/${st.account}/workers/subdomain`)).subdomain;
  const name = scriptName();
  st.recoveryKey ??= hex();
  st.deployerScript ??= name;
  save();
  await install(name);
} else if (cmd === "migrate-deployer") {
  // A Brain from before 2026-10-08. <base>-guard must already run this deployer's code (install-deployer), for exportRows.
  const from = BASE + "-guard", to = BASE + "-deployer";
  if (scriptName() !== from) throw new Error(`the deployer of ${BASE} is ${scriptName()}: nothing to move`);
  await install(to);
  for (let i = 0; ; i++) {
    if ((await at(urlOf(to), "getState").catch(() => ({ status: 0 }))).status === 200) break;
    if (i >= 40) throw new Error("the new deployer did not answer at " + urlOf(to));
    await new Promise((r) => setTimeout(r, 2000));
  }
  // The rows hold each Worker's key. They go from one deployer to the other and are not printed or kept here.
  const out = await at(urlOf(from), "exportRows");
  if (out.status !== 200) throw new Error("exportRows " + out.status + " " + out.text.slice(0, 200));
  console.log(`exported ${JSON.parse(out.text).rows.length} rows, ${out.text.length} characters`);
  const put = await at(urlOf(to), "importRows", undefined, out.text);
  if (put.status !== 200) throw new Error("importRows " + put.status + " " + put.text.slice(0, 200));
  const a = await digestOf(urlOf(from)), b = await digestOf(urlOf(to));
  for (const [k, v] of Object.entries(a)) console.log(" ", k.padEnd(12), String(v.rows).padStart(3), v.sha256.slice(0, 12), b[k] && b[k].sha256 === v.sha256 && b[k].rows === v.rows ? "equal" : "DIFFERS");
  if (!sameDigest(a, b)) throw new Error("the rows of the two deployers differ: nothing else was changed");
  // From here one deployer changes things. The old one keeps its rows and its bindings and refuses every write.
  await install(from, { replacedBy: urlOf(to) });
  st.deployerScript = to;
  save();
  console.log(`the deployer of ${BASE} is ${to}. Apply every service through it, then run retire-guard.`);
} else if (cmd === "retire-guard") {
  // The stub keeps the Rows class and its binding, so the old rows stay. It holds no token and no recovery key.
  const from = BASE + "-guard", to = urlOf(scriptName());
  if (scriptName() === from) throw new Error("the deployer of this Brain is still " + from);
  const code = `const gone = (env) => ({ error: "Replaced", message: "this deployer was replaced by " + env.BRAIN_CONFIG.replacedBy, deployer: env.BRAIN_CONFIG.replacedBy });
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return Response.redirect(env.BRAIN_CONFIG.replacedBy + "/", 302);
    return new Response(JSON.stringify(gone(env)), { status: 410, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
  }
};
// The rows of the deployer that ran here until it was replaced. Nothing reads or writes them.
export class Rows {
  constructor(state) { this.state = state; }
  async fetch() { return new Response("replaced", { status: 410 }); }
  async alarm() {}
}
`;
  // keep_bindings: Cloudflare keeps the secrets of a script across an upload unless told to keep none. Seen 2026-10-07.
  const metadata = { main_module: "worker.js", compatibility_date: "2026-10-01", keep_bindings: [], bindings: [{ type: "durable_object_namespace", name: "ROWS", class_name: "Rows" }, { type: "json", name: "BRAIN_CONFIG", json: { base: BASE, replacedBy: to } }] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new File([code], "worker.js", { type: "application/javascript+module" }));
  const S = `/accounts/${st.account}/workers/scripts/${from}`;
  await api(S, { method: "PUT", body: form });
  await api(S + "/schedules", { method: "PUT", headers: { "content-type": "application/json" }, body: "[]" });
  let now = (await api(S + "/settings")).bindings.map((b: any) => b.name).sort();
  for (const name of now.filter((n: string) => !["ROWS", "BRAIN_CONFIG"].includes(n))) await api(`${S}/secrets/${name}`, { method: "DELETE" });
  now = (await api(S + "/settings")).bindings.map((b: any) => b.name).sort();
  if (now.join() !== "BRAIN_CONFIG,ROWS") throw new Error(`${from} still holds: ${now.join(", ")}`);
  console.log(`${from} is a stub. Its bindings: ${now.join(", ")}`);
} else if (cmd === "bindings") {
  // Names and types only: a bound value is never read back.
  for (const b of (await api(`/accounts/${st.account}/workers/scripts/${args[0] || scriptName()}/settings`)).bindings) console.log(" ", b.name.padEnd(16), b.type, b.service || b.class_name || "");
} else if (cmd === "apply") {
  const force = args.includes("--force");
  for (const f of args.filter((a) => !a.startsWith("--"))) {
    const e = emitted(f);
    // Source, not code: the deployer distils it. The record's parts are not sent; its hash is only compared.
    const w: any = { module: e.source.module, source: e.source.text, files: filesOf(e.source.text), force };
    // The signing key is SESSION_KEY; it was COOKIE_KEY until 2026-10-07. Both names are sent with one value, and
    // the state file keeps both fields.
    const named = ["SESSION_KEY", "COOKIE_KEY"].filter((n) => e.meta.secrets.includes(n));
    if (named.length) { st.sessionKey ??= st.cookieKey ?? hex(); st.cookieKey ??= st.sessionKey; save(); w.secrets = Object.fromEntries(named.map((n) => [n, n === "SESSION_KEY" ? st.sessionKey : st.cookieKey])); }
    const t = performance.now();
    const out = await deployer("apply", { workers: [w] });
    console.log(f, Math.round(performance.now() - t) + " ms", JSON.stringify(out.results ? out.results.map((r: any) => ({ ...r, hash: String(r.hash).slice(0, 12) })) : out));
    for (const r of out.results || []) if (r.hash && r.hash !== e.hash) console.log(`  the deployer distilled ${String(r.hash).slice(0, 12)}; the browser emitted ${e.hash.slice(0, 12)}`);
  }
} else if (cmd === "redistil") {
  // After a deployer update: distil every Worker's kept source again; --apply deploys the ones whose code changes.
  const out = await deployer("redistil", { apply: args.includes("--apply") });
  console.log("distiller", String(out.distiller).slice(0, 12));
  for (const r of out.results || []) console.log(" ", r.worker.padEnd(18), r.state, r.from ? String(r.from).slice(0, 12) + " -> " : "", String(r.hash || "").slice(0, 12), r.applied || "", r.reason || "");
  if (!out.results) console.log(JSON.stringify(out).slice(0, 400));
} else if (cmd === "shell") {
  // The notebook file goes to blob storage as the request's body, not inside JSON. The deployer passes it on.
  const file = Bun.file(resolve(import.meta.dir, args[0] || ".emitted/shell.html"));
  const t = performance.now();
  const r = await fetch(`${G()}/xrpc/com.lopecode.brain.infra.shell`, { method: "POST", headers: { authorization: "Bearer " + st.recoveryKey, "content-type": "text/html; charset=utf-8" }, body: file });
  console.log(r.status, Math.round(performance.now() - t) + " ms", (await r.text()).slice(0, 300));
} else if (cmd === "distil") {
  // Sends each record's carried source to the deployer and compares what it distils with the browser's hash.
  for (const f of args) {
    const e = emitted(f);
    const files = filesOf(e.source.text);
    const t = performance.now();
    const out = await deployer("distil", { module: e.source.module, source: e.source.text, files, ...(e.meta.role === "deployer" || e.meta.role === "guard" ? { cell: "deployer_service" } : {}) });
    console.log(f.padEnd(14), Math.round(performance.now() - t) + " ms", out.hash ? `${out.hash.slice(0, 12)} browser ${e.hash.slice(0, 12)} ${out.hash === e.hash ? "identical" : "DIFFERS"}` : JSON.stringify(out).slice(0, 300));
  }
} else if (cmd === "remove") console.log(JSON.stringify(await deployer("apply", { remove: args })));
else if (cmd === "state") console.log(JSON.stringify(args[0] === "--full" ? await deployer("getState") : brief(await deployer("getState")), null, 1));
else if (cmd === "confirm") console.log(JSON.stringify(await deployer("confirm", {})));
else if (cmd === "approval" || cmd === "approve" || cmd === "rollback") {
  const action = cmd === "approval" ? "approval:" + args[0] : cmd + ":" + args.join(":");
  const r = await fetch(G() + "/", { method: "POST", body: new URLSearchParams({ key: st.recoveryKey, action }) });
  console.log(r.status, /class="note">([^<]*)/.exec(await r.text())?.[1]);
} else if (cmd === "session") {
  // An owner session for checks, in the format of brain-kernel's sessionToken cell, signed with the key this
  // script gave the kernel at install (SESSION_KEY; a state file from before 2026-10-07 has it as cookieKey). The product path is atproto sign-in; a format drift shows as signedIn: false.
  const b64u = (b: Uint8Array) => Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const payload = b64u(new TextEncoder().encode(JSON.stringify({ did: args[0] || OWNER, exp: Date.now() + 7 * 24 * 3600e3, epoch: 0 })));
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(st.sessionKey ?? st.cookieKey), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const token = `v1.${payload}.${b64u(new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(payload))))}`;
  if (args[0]) st.otherSession = token; else st.session = token;
  delete st.cookie; delete st.otherCookie;
  save();
  console.log("minted for " + (args[0] || OWNER));
} else if (cmd === "curl") {
  const path = args[0], rest = args.slice(1).filter((a) => a !== "--owner" && a !== "--other");
  const extra = args.includes("--owner") && st.session ? ["-H", "authorization: Bearer " + st.session] : args.includes("--other") && st.otherSession ? ["-H", "authorization: Bearer " + st.otherSession] : [];
  const p = Bun.spawn(["curl", "-s", "-m", "30", "-w", " [%{http_code}]\n", ...extra, ...rest, (path.startsWith("http") ? "" : B()) + path], { stdout: "inherit", stderr: "inherit" });
  await p.exited;
} else console.log("unknown command");
