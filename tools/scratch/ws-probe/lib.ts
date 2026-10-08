// Shared by the probes: the Brain's address, the owner's session, a scratch token. Nothing here prints a secret.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
export const BASE = process.env.BRAIN_BASE || "cb4";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted", BASE + ".json"), "utf8"));
export const HOST = `${BASE}.${st.subdomain}.workers.dev`;
export const P = "com.lopecode.brain.";
export const session: string = st.session;
export const other: string = st.otherSession;
const R = resolve(import.meta.dir, "results");
mkdirSync(R, { recursive: true });
export const save = (name: string, data: any) => writeFileSync(resolve(R, `${name}-${Date.now()}.json`), JSON.stringify(data, null, 1));
export const call = async (m: string, body?: any, auth = session) => {
  const r = await fetch(`https://${HOST}/xrpc/${P}${m}`, { method: body === undefined ? "GET" : "POST", headers: { ...(auth ? { authorization: "Bearer " + auth } : {}), "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json().catch(() => null), headers: r.headers };
};
// A standing token for the scratch methods, kept in results/ (git-ignored) and revoked by `bun lib.ts revoke`.
export const token = async (methods = ["wsprobe.ws", "wsprobe.paid", "wsprobe.open"]) => {
  const f = resolve(R, "token.json");
  if (existsSync(f)) return JSON.parse(readFileSync(f, "utf8")).token as string;
  const r = await call("token.create", { name: "wsprobe", methods });
  if (!r.body || !r.body.token) throw new Error("token.create " + r.status);
  writeFileSync(f, JSON.stringify({ token: r.body.token }));
  return r.body.token as string;
};
// One WebSocket: what the handshake did, the first messages, and how it closed.
export const open = (path: string, auth: string | null, { wait = 2500, send = null as string | null, protocols = undefined as any } = {}) =>
  new Promise<any>((done) => {
    const t0 = performance.now(), out: any = { path, got: [] as string[] };
    let ws: WebSocket;
    try {
      ws = new (WebSocket as any)(`wss://${HOST}${path}`, { headers: auth ? { authorization: "Bearer " + auth } : {}, ...(protocols ? { protocols } : {}) });
    } catch (e: any) { return done({ ...out, threw: String(e.message || e) }); }
    const end = () => { try { ws.close(1000, "probe done"); } catch {} done(out); };
    ws.onopen = () => { out.openMs = Math.round(performance.now() - t0); if (send) ws.send(send); setTimeout(end, wait); };
    ws.onmessage = (e) => out.got.push(String(e.data).slice(0, 400));
    ws.onerror = (e: any) => { out.error = String(e.message || e.type || e); };
    ws.onclose = (e) => { out.close = { code: e.code, reason: e.reason, ms: Math.round(performance.now() - t0) }; done(out); };
  });
// The handshake as plain HTTP, to read the status, the body and x-brain-served-by when the upgrade is refused.
export const shake = async (path: string, auth: string | null) => {
  const args = ["-s", "-i", "--http1.1", "--max-time", "6", "-H", "Connection: Upgrade", "-H", "Upgrade: websocket", "-H", "Sec-WebSocket-Version: 13", "-H", "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==", ...(auth ? ["-H", "authorization: Bearer " + auth] : []), `https://${HOST}${path}`];
  const p = Bun.spawnSync(["curl", ...args]);
  const text = p.stdout.toString();
  const [head, ...rest] = text.split("\r\n\r\n");
  const lines = head.split("\r\n");
  return { status: lines[0], servedBy: (lines.find((l) => /^x-brain-served-by/i.test(l)) || "").slice(19), upgrade: (lines.find((l) => /^upgrade:/i.test(l)) || ""), body: rest.join("\n\n").replace(/[^\x20-\x7e]/g, ".").slice(0, 300), exit: p.exitCode };
};
if (import.meta.main && process.argv[2] === "revoke") console.log(JSON.stringify((await call("token.revoke", { name: "wsprobe" })).body));
