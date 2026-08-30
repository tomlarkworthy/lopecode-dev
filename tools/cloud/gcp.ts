// Read-only Google API access from a service-account key, with no gcloud installed.
// Every call here is a GET and the token is minted with cloud-platform.read-only
// where the API accepts it, so a mistake cannot write to a LIVE project. Tom asked
// for a scan on 2026-08-20; the keys are the ones committed in
// vendor/corepox/firebase/accounts (which is its own problem, see the report).
import {createSign} from "node:crypto";

export type SA = {client_email: string; private_key: string; project_id: string};

export const load = async (f: string): Promise<SA> => JSON.parse(await Bun.file(f).text());

const b64 = (o: any) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o))
  .toString("base64url");

const cache = new Map<string, {t: string; exp: number}>();
export async function token(sa: SA, scope: string): Promise<string> {
  const key = sa.client_email + "|" + scope;
  const now = Math.floor(Date.now() / 1000);
  const hit = cache.get(key);
  if (hit && hit.exp > now + 60) return hit.t;
  const claim = {iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token",
                 iat: now, exp: now + 3600};
  const input = `${b64({alg: "RS256", typ: "JWT"})}.${b64(claim)}`;
  const sig = createSign("RSA-SHA256").update(input).sign(sa.private_key, "base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: {"content-type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                               assertion: `${input}.${sig}`})});
  const j: any = await r.json();
  if (!j.access_token) throw new Error("token: " + JSON.stringify(j).slice(0, 300));
  cache.set(key, {t: j.access_token, exp: now + 3500});
  return j.access_token;
}

export async function get(sa: SA, url: string, scope =
  "https://www.googleapis.com/auth/cloud-platform.read-only"): Promise<any> {
  const t = await token(sa, scope);
  const r = await fetch(url, {headers: {authorization: "Bearer " + t}});
  const txt = await r.text();
  let j: any; try { j = JSON.parse(txt); } catch { j = {raw: txt.slice(0, 400)}; }
  if (!r.ok) return {__error: r.status, __msg: j?.error?.message ?? j?.raw ?? r.statusText};
  return j;
}
