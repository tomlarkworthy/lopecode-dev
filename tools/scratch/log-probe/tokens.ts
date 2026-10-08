// What the present token is and whether it may mint tokens. Read-only unless "mint" is given. Prints no token value.
import { api, account, save } from "./lib.ts";
const a = await account();
const red = (s: any) => JSON.stringify(s).replace(/[0-9a-f]{32}/g, "<id>").slice(0, 500);
const vU = await api("/user/tokens/verify"); console.log("user verify", vU.status, red(vU.result || vU.errors));
const vA = await api(`/accounts/${a}/tokens/verify`); console.log("account verify", vA.status, red(vA.result || vA.errors));
const pgA = await api(`/accounts/${a}/tokens/permission_groups`); console.log("account permission_groups", pgA.status, pgA.ok ? pgA.result.length : red(pgA.errors));
const pgU = await api(`/user/tokens/permission_groups`); console.log("user permission_groups", pgU.status, pgU.ok ? pgU.result.length : red(pgU.errors));
const groups = (pgA.ok ? pgA.result : pgU.ok ? pgU.result : []) as any[];
save("permission_groups", groups);
for (const g of groups.filter((g) => /observab|tail|workers script|token|logs/i.test(g.name))) console.log("  ", g.name.padEnd(46), JSON.stringify(g.scopes), g.id.slice(0, 6) + "…");
const lA = await api(`/accounts/${a}/tokens`); console.log("list account tokens", lA.status, lA.ok ? lA.result.map((t: any) => `${t.name} [${t.status}] exp ${t.expires_on || "-"} groups ${(t.policies || []).flatMap((p: any) => p.permission_groups.map((g: any) => g.name)).length}`) : red(lA.errors));
const lU = await api(`/user/tokens`); console.log("list user tokens", lU.status, lU.ok ? lU.result.length : red(lU.errors));
if (process.argv[2] === "mint") {
  const names = (process.argv[3] || "Workers Observability Read").split(","); const want = groups.filter((g) => names.includes(g.name) && g.scopes.includes("com.cloudflare.api.account"));
  console.log("minting with", want.map((g) => g.name));
  const body = { name: "cbx-logprobe-minted (scratch, delete)", policies: [{ effect: "allow", resources: { [`com.cloudflare.api.account.${a}`]: "*" }, permission_groups: want.map((g) => ({ id: g.id })) }], expires_on: new Date(Date.now() + 3600e3).toISOString().replace(/\.\d+Z$/, "Z") };
  for (const base of [`/accounts/${a}/tokens`, `/user/tokens`]) {
    const r = await api(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    console.log("POST", base.replace(a, "<acct>"), r.status, r.ok ? `id ${r.result.id.slice(0, 6)}… value length ${r.result.value?.length} status ${r.result.status} expires ${r.result.expires_on}` : red(r.errors));
    if (!r.ok) continue;
    const minted = r.result.value, id = r.result.id;
    const H = { authorization: "Bearer " + minted, "content-type": "application/json" };
    const F = async (path: string, init: any = {}) => { const x = await fetch("https://api.cloudflare.com/client/v4" + path, { ...init, headers: H }); const j: any = await x.json().catch(() => ({})); return `${x.status} ${j.success ? "ok" : JSON.stringify(j.errors || {}).slice(0, 120)}`; };
    const to = Date.now(), tf = { from: to - 3600e3, to };
    console.log("  minted → telemetry/query:", await F(`/accounts/${a}/workers/observability/telemetry/query`, { method: "POST", body: JSON.stringify({ queryId: "minted", timeframe: tf, view: "events", limit: 1, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$metadata.service", operation: "eq", type: "string", value: "cbx-logprobe" }] } }) }));
    console.log("  minted → telemetry/keys:", await F(`/accounts/${a}/workers/observability/telemetry/keys`, { method: "POST", body: JSON.stringify({ timeframe: tf, datasets: ["cloudflare-workers"], limit: 5 }) }));
    console.log("  minted → list scripts (should be refused):", await F(`/accounts/${a}/workers/scripts`));
    console.log("  minted → script content (should be refused):", await F(`/accounts/${a}/workers/scripts/cbx-logprobe/settings`));
    console.log("  minted → create token (should be refused):", await F(base, { method: "POST", body: JSON.stringify(body) }));
    console.log("  minted → d1 list (should be refused):", await F(`/accounts/${a}/d1/database`));
    const roll = await api(`${base}/${id}/value`, { method: "PUT", headers: { "content-type": "application/json" }, body: "{}" });
    console.log("  roll:", roll.status, roll.ok ? "new value length " + String(roll.result).length : red(roll.errors), "| old value after roll:", await F(`/accounts/${a}/workers/observability/telemetry/keys`, { method: "POST", body: JSON.stringify({ timeframe: tf, datasets: ["cloudflare-workers"], limit: 1 }) }));
    const del = await api(`${base}/${id}`, { method: "DELETE" });
    console.log("  delete:", del.status, del.ok);
    break;
  }
}
