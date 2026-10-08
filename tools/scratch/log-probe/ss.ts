import { api, account } from "./lib.ts";
const a = await account(), n = process.argv[2];
const g = await api(`/accounts/${a}/workers/scripts/${n}/script-settings`); console.log("GET", g.status, JSON.stringify(g.result ?? g.errors).slice(0, 300));
if (process.argv[3] === "set") { const p = await api(`/accounts/${a}/workers/scripts/${n}/script-settings`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ observability: { enabled: true, logs: { enabled: true, invocation_logs: false } } }) }); console.log("PATCH", p.status, JSON.stringify(p.result ?? p.errors).slice(0, 400)); }
