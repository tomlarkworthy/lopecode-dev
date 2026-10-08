// Reads what Cloudflare records for the token minted for cb4-x-logs, then mints a twin with the same policy, tries it, and deletes it. Prints no value.
import { api, account } from "./lib.ts";
const a = await account();
const list = (await api(`/accounts/${a}/tokens`)).result as any[];
const t = list.find((x) => /^cb4-x-logs: minted by/.test(x.name));
console.log("recorded:", t ? JSON.stringify({ name: t.name, status: t.status, expires_on: t.expires_on, policies: t.policies.map((p: any) => ({ effect: p.effect, resources: Object.keys(p.resources).map((k) => k.replace(a, "<account>")), groups: p.permission_groups.map((g: any) => g.name) })) }) : "none");
console.log("minted tokens by a deployer:", list.filter((x) => /minted by/.test(x.name)).map((x) => x.name));
if (t && process.argv[2] === "twin") {
  const body = { name: "cb4-x-logs twin (scratch, delete)", policies: t.policies.map((p: any) => ({ effect: p.effect, resources: p.resources, permission_groups: p.permission_groups.map((g: any) => ({ id: g.id })) })), expires_on: new Date(Date.now() + 3600e3).toISOString().slice(0, 19) + "Z" };
  const r = await api(`/accounts/${a}/tokens`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const H = { authorization: "Bearer " + r.result.value, "content-type": "application/json" };
  const F = async (path: string, init: any = {}) => { const x = await fetch("https://api.cloudflare.com/client/v4/accounts/" + a + path, { ...init, headers: H }); return x.status; };
  const to = Date.now();
  console.log("  twin → telemetry/keys          ", await F("/workers/observability/telemetry/keys", { method: "POST", body: JSON.stringify({ timeframe: { from: to - 600e3, to }, datasets: ["cloudflare-workers"], limit: 2 }) }));
  console.log("  twin → script settings read    ", await F("/workers/scripts/cb4-core/settings"));
  console.log("  twin → script content read     ", await F("/workers/scripts/cb4-core"));
  console.log("  twin → secrets list            ", await F("/workers/scripts/cb4-core/secrets"));
  console.log("  twin → D1 list                 ", await F("/d1/database"));
  console.log("  twin → create token            ", await F("/tokens", { method: "POST", body: JSON.stringify(body) }));
  console.log("  twin → delete script (cb4-guard stub, expect refusal)", await F("/workers/scripts/cb4-nonexistent-zz", { method: "DELETE" }));
  console.log("  delete twin", (await api(`/accounts/${a}/tokens/${r.result.id}`, { method: "DELETE" })).status);
}
