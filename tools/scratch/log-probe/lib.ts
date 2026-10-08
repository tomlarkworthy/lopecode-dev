// Shared by the log probe. Prints no secret.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
export const raw = (path: string, init: RequestInit = {}) => fetch("https://api.cloudflare.com/client/v4" + path, { ...init, headers: { authorization: "Bearer " + token, ...(init.headers || {}) } });
export const api = async (path: string, init: RequestInit = {}) => {
  const r = await raw(path, init);
  const j: any = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok && j.success !== false, result: j.result, errors: j.errors, headers: r.headers };
};
export const account = async () => (await api("/accounts")).result[0].id;
export const save = (name: string, data: any) => writeFileSync(resolve(import.meta.dir, "results", name + ".json"), JSON.stringify(data, null, 1));
export const query = async (acct: string, body: any) => api(`/accounts/${acct}/workers/observability/telemetry/query`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
