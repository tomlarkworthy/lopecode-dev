/**
 * Drives a scratch Brain from the command line, in the installer's place.
 *   bun tools/cloud-brain/brain.ts install-deployer [--token] # --token: send .cf-token as the deployer's Cloudflare token; without it an update keeps the one the Worker has. Uploads .emitted/deployer.json as the deployer: <base>-deployer, or <base>-guard on a Brain from before 2026-10-08
 *   bun tools/cloud-brain/brain.ts migrate-deployer         # an old Brain: installs <base>-deployer, copies the rows of <base>-guard to it, and marks <base>-guard replaced
 *   bun tools/cloud-brain/brain.ts retire-guard             # after every Worker is deployed again: <base>-guard becomes a stub with no token and no recovery key
 *   bun tools/cloud-brain/brain.ts apply core.json [...] --reason="why"   # infra.apply with the recovery key; --reason= is required here and by redistil --apply, remove and rollback
 *   bun tools/cloud-brain/brain.ts saw [name…]   # seen.json: the hash each seed here is built on, sent as `was` by apply and remove; with names, record what runs now (after merging its source)
 *   bun tools/cloud-brain/brain.ts state | confirm | approval on|off | approve | rollback | remove <name>
 *   bun tools/cloud-brain/brain.ts redistil | distil | bindings | shell   # redistil: each Worker against its source, "same" when healthy
 *   bun tools/cloud-brain/brain.ts curl <path> [--owner] [-X POST -d '{}']   # the kernel; --owner or --other sends a minted session as Authorization: Bearer
 *   bun tools/cloud-brain/brain.ts curl <path> --as NAME [-X POST -d '{}']       # the same call with the token NAME of .emitted/<base>-tokens.json. A token is not the owner present; an agent's writes go this way
 *   bun tools/cloud-brain/brain.ts token NAME <method…> [--daily=USD] | token list | token revoke NAME   # token.create as the owner; the value goes to .emitted/<base>-tokens.json (mode 600) and is not printed
 *   bun tools/cloud-brain/brain.ts session [did]                               # mint a session token for the owner, or for another DID
 *   bun tools/cloud-brain/brain.ts page up [--minutes N] [--token LOPE-…] [--url https://…] [--keep] | page state | page down   # the Brain's page in a browser of the cluster, signed in and paired with a channel on this machine
 * State (recovery key, deployer key, session tokens) is in .emitted/<base>.json, git-ignored. The Cloudflare token is never printed.
 */
import { existsSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
const BASE = process.env.BRAIN_BASE || "cb1";
const OWNER = "did:plc:j7nm3lrd5h7fm3sfhcv3lhfv";
const E = (f: string) => resolve(import.meta.dir, ".emitted", f);
const token = readFileSync(resolve(import.meta.dir, "../scratch/cloud-brain-experiments/.cf-token"), "utf8").trim();
const statePath = E(BASE + ".json");
const st: any = existsSync(statePath) ? JSON.parse(readFileSync(statePath, "utf8")) : {};
const save = () => writeFileSync(statePath, JSON.stringify(st, null, 1));
// Tokens made here for agents: { name: value } in a git-ignored file of mode 600.
const tokens = (f = BASE + "-tokens.json"): any => (existsSync(E(f)) ? JSON.parse(readFileSync(E(f), "utf8")) : {});
const keepTokens = (t: any) => writeFileSync(E(BASE + "-tokens.json"), JSON.stringify(t, null, 1), { mode: 0o600 });
// A kept token's value, or "". Own string properties only: t["toString"] and t["__proto__"] are truthy on any object.
const keptToken = (t: any, name: string): string => (Object.hasOwn(t, name) && typeof t[name] === "string" ? t[name] : "");
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
  // Only "no such script" means a first install: any other failure stops here, before a token is sent.
  const exists = await api(`/accounts/${st.account}/workers/scripts/${name}/settings`).then(() => true, (e) => { if (/ 404 /.test(String(e.message))) return false; throw e; });
  const bindings: any[] = [
    // An update keeps the token the Worker has: the owner may have replaced it in the dashboard, and the file
    // here would put the old one back (2026-10-09). --token sends the file's.
    exists && !process.argv.includes("--token") ? { type: "inherit", name: "CF_API_TOKEN" } : { type: "secret_text", name: "CF_API_TOKEN", text: token },
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
  // previews_enabled: false, on every install. With previews on, each old version answers at <8 hex of its id>-<name>.
  await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true, previews_enabled: false }) });
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
// was: the hash the seeds in this checkout are built on, kept beside them in seen.json and committed with them, so
// it travels with the source: a checkout that has another's change has its hash too. It is not what runs when the
// command begins (an apply at 12:58 on 2026-10-10 replaced a kernel deployed from elsewhere at 12:45 that way), and
// not the state file, which sessions that do not know of each other share.
const seenPath = resolve(import.meta.dir, "seen.json");
const seenAll = (): any => existsSync(seenPath) ? JSON.parse(readFileSync(seenPath, "utf8")) : {};
const sawGet = (worker: string) => (seenAll()[BASE] ?? {})[worker];
const sawPut = (worker: string, hash: string | null, at = Date.now()) => { const all = seenAll(); (all[BASE] ??= {})[worker] = { hash, at }; writeFileSync(seenPath, JSON.stringify(all, null, 1) + "\n"); };
const HOW = (worker: string) => `Read its source (curl "/xrpc/com.lopecode.brain.getSource?worker=${worker}" --owner), merge it into the seed, build and emit again, then: saw ${worker}`;
// What to send as was, or a refusal made here. file: the emitted record, which must be newer than the record of
// the Worker's last change: one emitted before it was built from a seed without that change.
const sawOf = (worker: string, running: any[], file?: string): { was: string | null } | { refused: string } => {
  const now = running.find((x: any) => x.worker === worker)?.hash ?? null, rec = sawGet(worker);
  if (!rec) {
    if (now === null) return { was: null };
    return { refused: `${worker} runs ${String(now).slice(0, 12)} and seen.json has no hash for it. ${HOW(worker)}` };
  }
  if (file && statSync(E(file)).mtimeMs < rec.at) return { refused: `${file} was emitted before ${worker} last changed in this checkout (${new Date(rec.at).toLocaleTimeString()}): build and emit again` };
  return { was: rec.hash };
};
const MOVED = (worker: string) => `  ${worker} is not what the seed in this checkout is built on. ${HOW(worker)}`;
const brief = (s: any) => ({ approval: s.approval, workers: (s.workers || []).map((w: any) => `${w.worker} ${String(w.hash).slice(0, 12)} ${w.state}${w.lastError ? " ERR " + w.lastError : ""}`), kernel: Object.fromEntries(Object.entries(s.kernel || {}).map(([k, v]: any) => [k, `${v.state} ${String(v.hash).slice(0, 12)} ${v.reason || ""}${v.deadline ? " until " + new Date(v.deadline).toISOString() : ""}`])), pending: (s.pending || []).map((p: any) => p.worker) });

const [cmd, ...all] = process.argv.slice(2);
// --reason="…": why a change is made. The deployer logs it, and refuses an apply, a redistil --apply, a remove and a rollback without one.
if (all.includes("--reason")) { console.error('write --reason="why", with the equals sign'); process.exit(2); }
const reason = all.find((a) => a.startsWith("--reason="))?.slice("--reason=".length);
const args = all.filter((a) => !a.startsWith("--reason="));
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
  // The versions before the stub held the token and the recovery key: their preview addresses are switched off.
  await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true, previews_enabled: false }) });
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
  const seen = (await deployer("getState")).workers || [];
  for (const f of args.filter((a) => !a.startsWith("--"))) {
    const e = emitted(f);
    // Source, not code: the deployer distils it. The record's parts are not sent; its hash is only compared.
    const saw: any = sawOf(e.meta.worker, seen, f);
    if (saw.refused) { console.log(f, "not sent:", saw.refused); continue; }
    const w: any = { module: e.source.module, source: e.source.text, files: filesOf(e.source.text), force, was: saw.was };
    // The signing key is SESSION_KEY; it was COOKIE_KEY until 2026-10-07. Both names are sent with one value, and
    // the state file keeps both fields.
    const named = ["SESSION_KEY", "COOKIE_KEY"].filter((n) => e.meta.secrets.includes(n));
    if (named.length) { st.sessionKey ??= st.cookieKey ?? hex(); st.cookieKey ??= st.sessionKey; save(); w.secrets = Object.fromEntries(named.map((n) => [n, n === "SESSION_KEY" ? st.sessionKey : st.cookieKey])); }
    const t = performance.now();
    const out = await deployer("apply", { workers: [w], reason });
    console.log(f, Math.round(performance.now() - t) + " ms", JSON.stringify(out.results ? out.results.map((r: any) => ({ ...r, hash: String(r.hash).slice(0, 12) })) : out));
    for (const r of out.results || []) if (r.hash && r.hash !== e.hash) console.log(`  the deployer distilled ${String(r.hash).slice(0, 12)}; the browser emitted ${e.hash.slice(0, 12)}`);
    for (const r of out.results || []) {
      if (["deployed", "probation", "same", "unchanged"].includes(r.state) && r.hash) sawPut(r.worker, r.hash);
      if (r.state === "refused" && "running" in r) console.log(MOVED(r.worker));
    }
  }
} else if (cmd === "redistil") {
  // After a deployer update: distil every Worker's kept source again; --apply deploys the ones whose code changes.
  const out = await deployer("redistil", { apply: args.includes("--apply"), reason });
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
} else if (cmd === "remove") {
  const seen = (await deployer("getState")).workers || [];
  const asked = args.map((worker) => ({ worker, saw: sawOf(worker, seen) as any }));
  for (const a of asked) if (a.saw.refused) console.log(a.worker, "not sent:", a.saw.refused);
  const out = await deployer("apply", { remove: asked.filter((a) => !a.saw.refused).map((a) => ({ worker: a.worker, was: a.saw.was })), reason });
  console.log(JSON.stringify(out));
  for (const r of out.results || []) {
    if (r.state === "removed") sawPut(r.worker, null);
    if (r.state === "refused" && "running" in r) console.log(MOVED(r.worker));
  }
} else if (cmd === "saw") {
  // saw: the record against what runs. saw NAME…: record what runs now, after its source is merged into the seed.
  const seen = (await deployer("getState")).workers || [];
  const runs = (worker: string) => seen.find((x: any) => x.worker === worker)?.hash ?? null;
  // at 0: saw comes after the emit of the merged seed, and that record is the one to send.
  for (const worker of args) sawPut(worker, runs(worker), 0);
  const rec = seenAll()[BASE] ?? {};
  for (const worker of [...new Set([...Object.keys(rec), ...seen.map((x: any) => x.worker)])].sort()) console.log(worker.padEnd(20), rec[worker] ? String(rec[worker].hash).slice(0, 12) : "none".padEnd(12), !rec[worker] ? "" : rec[worker].hash === runs(worker) ? "" : "MOVED: runs " + String(runs(worker)).slice(0, 12));
}
else if (cmd === "state") console.log(JSON.stringify(args[0] === "--full" ? await deployer("getState") : brief(await deployer("getState")), null, 1));
else if (cmd === "confirm") console.log(JSON.stringify(await deployer("confirm", {})));
else if (cmd === "approval" || cmd === "approve" || cmd === "rollback") {
  // A rollback names what is running, as the page's button does.
  const running = cmd === "rollback" ? ":" + (((await deployer("getState")).workers || []).find((x: any) => x.worker === args[0])?.hash ?? "") : "";
  const action = cmd === "approval" ? "approval:" + args[0] : cmd + ":" + args.join(":") + running;
  const r = await fetch(G() + "/", { method: "POST", body: new URLSearchParams({ key: st.recoveryKey, action, ...(reason ? { reason } : {}) }) });
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
} else if (cmd === "page") {
  // The Brain's own page in a browser of the cluster (brain-x-browser), signed in as the owner and paired with a
  // channel on this machine. The page dials ws://127.0.0.1 as a local tab does; a shim installed over CDP stands in
  // for WebSocket on loopback addresses and a CDP binding carries each frame to a real local socket here.
  const flag = (n: string, d = "") => { const i = args.indexOf("--" + n); return i < 0 ? d : args[i + 1]; };
  // --url: any hosted notebook. A page of another origin gets no session and, by default, a browser of its own.
  if (args.includes("--url") && !/^https:\/\//.test(flag("url") || "")) { console.log("--url takes an https address"); process.exit(1); }
  const other = flag("url") && new URL(flag("url")).origin !== B();
  const NS = "com.lopecode.brain.", NAME = flag("browser", other ? "test" : "brain"), PAGE = flag("name", "page");
  const call = async (m: string, body?: any, q = "") => {
    const r = await fetch(`${B()}/xrpc/${NS}${m}${q}`, { method: body === undefined ? "GET" : "POST", headers: { authorization: "Bearer " + st.session, "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: (await r.json().catch(() => null)) as any };
  };
  const evalIn = async (expression: string) => (await call("browser.eval", { browser: NAME, name: PAGE, expression })).body;
  const mine = async () => ((await call("browser.all")).body?.browsers || []).find((b: any) => b.owner === "owner" && b.browser === NAME);
  const state = async () => {
    const b = await mine();
    if (!b || !b.up) return { up: false, remaining: b ? b.remaining : 0 };
    const v = await evalIn(`JSON.stringify({ signedIn: !!localStorage.getItem("brain_session"), heapMB: Math.round((performance.memory || {}).usedJSHeapSize / 1e6), url: location.href.replace(/cc=[^&]*/, "cc=…") })`);
    return { up: true, remaining: b.remaining, pages: b.pages, ...(v && v.value ? JSON.parse(v.value) : { error: v }) };
  };
  if (args[0] === "state") console.log(JSON.stringify(await state()));
  else if (args[0] === "down") console.log(JSON.stringify((await call("browser.end", { owner: "owner", browser: NAME })).body));
  else if (args[0] === "up") {
    const minutes = Number(flag("minutes", "30")), cc = flag("token"), keep = args.includes("--keep");
    const view = flag("view", "C100(S70(@tomlarkworthy/cloud-brain,@tomlarkworthy/brain-shell),S30(@tomlarkworthy/claude-code-pairing))");
    const given = flag("url");
    const url = given ? given + (cc && !/[#&]cc=/.test(given) ? (given.includes("#") ? "&" : "#") + "cc=" + cc : "") : `${B()}/#view=${view}${cc ? "&cc=" + cc : ""}`;
    let paidUntil = 0;
    const extend = async (seconds: number) => {
      const r = await call("browser.extend", {}, `?browser=${NAME}&seconds=${Math.min(Math.max(Math.round(seconds), 10), 3600)}`);
      if (r.status !== 200) throw new Error("extend " + r.status + " " + JSON.stringify(r.body));
      paidUntil = r.body.paidUntil;
      console.log(`bought ${r.body.added} s for ${r.body.costUsd} USD`);
    };
    const had = await mine();
    if (had && had.remaining > 0) paidUntil = Date.now() + had.remaining * 1000;
    if (minutes * 60 - (had ? had.remaining : 0) >= 10) await extend(minutes * 60 - (had ? had.remaining : 0));
    const o = await call("browser.open", { browser: NAME, name: PAGE, url });
    if (o.status !== 200) throw new Error("open " + o.status + " " + JSON.stringify(o.body));
    // The session goes in this body only. A browser belongs to its caller, so only the owner's own session reaches this page.
    const s = other ? { value: "not signed in: not this Brain\x27s origin" } : await evalIn(`location.origin !== ${JSON.stringify(B())} ? "not signed in: the page is at " + location.origin : localStorage.getItem("brain_session") ? "was signed in" : (localStorage.setItem("brain_session", ${JSON.stringify(st.session)}), "signed in")`);
    console.log(`page ${o.body.existing ? "reused" : "opened"}, ${s && s.value}`);

    const SHIM = `(() => {
  if (globalThis.__lopeBridgeIn) return;
  const Native = globalThis.WebSocket, socks = new Map(); let n = 0;
  const out = (m) => globalThis.__lopeBridge(JSON.stringify(m));
  class Bridged extends EventTarget {
    constructor(url, protocols) {
      super(); this.url = String(url); this.readyState = 0; this.protocol = ""; this.extensions = ""; this.binaryType = "blob"; this.bufferedAmount = 0;
      this.id = ++n; socks.set(this.id, this);
      out({ id: this.id, t: "open", url: this.url, protocols: protocols || [] });
    }
    send(d) { if (this.readyState !== 1) throw new DOMException("not open", "InvalidStateError"); out({ id: this.id, t: "send", d: String(d) }); }
    close(code, reason) { if (this.readyState >= 2) return; this.readyState = 2; out({ id: this.id, t: "close", code, reason }); }
    _in(m) {
      const fire = (type, ev) => { const h = this["on" + type]; this.dispatchEvent(ev); if (typeof h === "function") h.call(this, ev); };
      if (m.t === "open") { this.readyState = 1; fire("open", new Event("open")); }
      else if (m.t === "message") fire("message", new MessageEvent("message", { data: m.d }));
      else if (m.t === "close") { this.readyState = 3; socks.delete(this.id); if (m.error) fire("error", new Event("error")); fire("close", new CloseEvent("close", { code: m.code || 1006, reason: m.reason || "", wasClean: !m.error })); }
    }
  }
  for (const k of ["CONNECTING", "OPEN", "CLOSING", "CLOSED"]) { Bridged[k] = Native[k]; Bridged.prototype[k] = Native[k]; }
  globalThis.__lopeBridgeIn = (m) => { const s = socks.get(m.id); if (s) s._in(m); };
  globalThis.WebSocket = new Proxy(Native, { construct: (T, [u, p]) => /^wss?:\\/\\/(127\\.0\\.0\\.1|localhost)[:/]/.test(String(u)) ? new Bridged(u, p) : new T(u, p) });
})()`;
    const stamp = () => new Date().toISOString().slice(11, 19);
    let first = true, cutAt = 0, gone = false;
    // One CDP socket, until Cloudflare or the service closes it. Resolves with the close code.
    const bridge = () => new Promise<number>(async (done) => {
      const ws = new (WebSocket as any)(`${B().replace("https", "wss")}/xrpc/${NS}browser.cdp?browser=${NAME}`, { headers: { authorization: "Bearer " + st.session } });
      let id = 0, sid = ""; const waiting = new Map<number, (m: any) => void>(), local = new Map<number, WebSocket>();
      const send = (method: string, params: any = {}, sessionId?: string) => new Promise<any>((ok) => { const i = ++id; waiting.set(i, ok); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
      const toPage = (m: any) => send("Runtime.evaluate", { expression: `__lopeBridgeIn(${JSON.stringify(m)})` }, sid);
      ws.onmessage = (e: any) => {
        const m = JSON.parse(e.data);
        if (m.id && waiting.has(m.id)) { waiting.get(m.id)!(m.result || m); waiting.delete(m.id); return; }
        if (m.method !== "Runtime.bindingCalled" || m.params.name !== "__lopeBridge") return;
        const b = JSON.parse(m.params.payload);
        if (b.t === "open") {
          console.log(stamp(), "page dialled", b.url);
          const l = new WebSocket(b.url, b.protocols.length ? b.protocols : undefined); local.set(b.id, l);
          l.onopen = () => { console.log(stamp(), "local socket open" + (cutAt ? `, ${Date.now() - cutAt} ms after the cut` : "")); cutAt = 0; toPage({ id: b.id, t: "open" }); };
          l.onmessage = (ev) => toPage({ id: b.id, t: "message", d: String(ev.data) });
          l.onerror = () => {};
          l.onclose = (ev) => { if (local.delete(b.id)) { console.log(stamp(), "local socket closed", ev.code); toPage({ id: b.id, t: "close", code: ev.code, reason: ev.reason, error: ev.code !== 1000 }); } };
        } else if (b.t === "send") local.get(b.id)?.send(b.d);
        else if (b.t === "close") local.get(b.id)?.close();
      };
      ws.onerror = () => {};
      ws.onclose = (e: any) => { for (const [k, l] of [...local]) { local.delete(k); l.close(); } done(e.code || 0); };
      await new Promise((ok) => { ws.onopen = ok; });
      const t = (await send("Target.getTargets")).targetInfos.find((x: any) => x.type === "page" && x.url.startsWith(new URL(url).origin));
      if (!t) { console.log("no page of " + new URL(url).origin + " in the browser"); gone = true; return ws.close(); }
      sid = (await send("Target.attachToTarget", { targetId: t.targetId, flatten: true })).sessionId;
      await send("Runtime.enable", {}, sid);
      await send("Page.enable", {}, sid);
      await send("Runtime.addBinding", { name: "__lopeBridge" }, sid);
      await send("Page.addScriptToEvaluateOnNewDocument", { source: SHIM }, sid);
      // The pairing module dials once, at load, and does not dial again after a close: the page is loaded again.
      await send("Page.navigate", { url }, sid);
      await send("Page.reload", {}, sid);
      console.log(stamp(), first ? "bridge up" : "bridge up again");
      first = false;
    });
    process.on("SIGINT", () => { console.log(`\nbridge stopped. The browser stays up until its time runs out (${Math.max(0, Math.round((paidUntil - Date.now()) / 1000))} s); "page down" closes it now.`); process.exit(0); });
    const timer = setInterval(async () => { if (keep && paidUntil - Date.now() < 120e3) await extend(minutes * 60).catch((e) => console.log(String(e.message))); }, 30e3);
    for (;;) {
      const code = await bridge();
      cutAt = Date.now();
      if (gone) { console.log(`the page "${PAGE}" of browser "${NAME}" is at another address; "page down" then "page up" opens it again`); break; }
      if (Date.now() > paidUntil - 5000) { console.log(stamp(), `the browser's time ran out; "page up" buys more`); break; }
      console.log(stamp(), "cdp socket closed", code, "; connecting again");
      await new Promise((r) => setTimeout(r, 500));
    }
    clearInterval(timer);
    process.exit(0);
  } else console.log("page up [--minutes N] [--token LOPE-…] [--view …] [--url https://…] [--browser NAME] [--name PAGE] [--keep] | page state | page down");
} else if (cmd === "token") {
  // A token for an agent of this checkout, made with the owner's session and never printed. The owner, event 150 of
  // cb4's issue record: an agent calls with a token, and may use the owner's session to make one.
  const asOwner = async (m: string, body?: any) => {
    const r = await fetch(B() + "/xrpc/com.lopecode.brain." + m, { method: body ? "POST" : "GET", headers: { authorization: "Bearer " + st.session, ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: (await r.json().catch(() => ({}))) as any };
  };
  const kept = tokens();
  if (args[0] === "list") {
    const r = await asOwner("token.list");
    console.log(JSON.stringify({ kept: Object.keys(kept), brain: r.body }));
  } else if (args[0] === "revoke" && args[1]) {
    const r = await asOwner("token.revoke", { name: args[1] });
    if (r.status === 200) { delete kept[args[1]]; keepTokens(kept); }
    console.log(r.status, JSON.stringify(r.body));
  } else if (args[0] && args.length > 1) {
    const daily = args.find((a) => a.startsWith("--daily="));
    const methods = args.slice(1).filter((a) => !a.startsWith("--"));
    if (keptToken(kept, args[0])) { console.log(`a token "${args[0]}" is kept already; "token revoke ${args[0]}" first`); process.exit(1); }
    const r = await asOwner("token.create", { name: args[0], methods, ...(daily ? { daily: Number(daily.slice(8)) } : {}) });
    if (r.status !== 200 || !r.body.token) { console.log(r.status, JSON.stringify({ ...r.body, token: undefined })); process.exit(1); }
    keepTokens({ ...kept, [args[0]]: r.body.token });
    console.log(`made "${args[0]}" for ${methods.join(", ")}; call with: curl <path> --as ${args[0]}`);
  } else console.log("token NAME <method…> [--daily=USD] | token list | token revoke NAME");
} else if (cmd === "curl") {
  const as = args.indexOf("--as"), name = as < 0 ? "" : args[as + 1];
  const path = args[0], rest = args.slice(1).filter((a, i) => a !== "--owner" && a !== "--other" && i + 1 !== as && i + 1 !== as + 1);
  const have = name ? { ...tokens(BASE + "-issues-tokens.json"), ...tokens() } : {};
  if (as >= 0 && !name) { console.log("--as needs a name: curl <path> --as NAME"); process.exit(1); }
  if (as >= 0 && !keptToken(have, name)) { console.log(`no token "${name}" is kept; make one with: token ${name} <method…>`); process.exit(1); }
  const extra = name ? ["-H", "authorization: Bearer " + keptToken(have, name)] : args.includes("--owner") && st.session ? ["-H", "authorization: Bearer " + st.session] : args.includes("--other") && st.otherSession ? ["-H", "authorization: Bearer " + st.otherSession] : [];
  const p = Bun.spawn(["curl", "-s", "-m", "30", "-w", " [%{http_code}]\n", ...extra, ...rest, (path.startsWith("http") ? "" : B()) + path], { stdout: "inherit", stderr: "inherit" });
  await p.exited;
} else console.log("unknown command");
