import { api, account, query } from "./lib.ts";
const a = await account(); const NAME = "cbx-logprobe";
const sub = (await api(`/accounts/${a}/workers/subdomain`)).result.subdomain;
const hex = (n: number) => "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90".slice(0, n);
const v: Record<string, string> = { h8: hex(8), h16: hex(16), h24: hex(24), h32: hex(32), h40: hex(40), uuid: "3f2b8c1e-7a4d-4e9b-9c0a-1d2e3f4a5b6c", did: "did:plc:j7nm3lrd5h7fm3sfhcv3lhfv", a20: "Zq9xLm2PkR7vTn4WbY8c", a32: "Zq9xLm2PkR7vTn4WbY8cHd3FgJ6sNe1U", a40: "Zq9xLm2PkR7vTn4WbY8cHd3FgJ6sNe1UoAi5MtXz", words: "the quick brown fox jumps over the lazy dog again", next: "/link?channel=whatsapp&code=" + hex(24), marker: "SHAPES1" };
if (process.argv[2] === "hit") { console.log((await fetch(`https://${NAME}.${sub}.workers.dev/plain?${new URLSearchParams(v)}`)).status); process.exit(0); }
const now = Date.now();
const r = await query(a, { queryId: "p", timeframe: { from: now - 900000, to: now }, view: "events", limit: 50, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$workers.scriptName", operation: "eq", type: "string", value: NAME }] } });
const e = (r.result?.events?.events || []).find((e: any) => e.$workers?.event?.request?.search?.marker === "SHAPES1");
if (!e) { console.log("not yet"); process.exit(1); }
const s = e.$workers.event.request.search;
for (const k in v) console.log(k.padEnd(6), String(v[k].length).padStart(3), s[k] === v[k] ? "stored" : JSON.stringify(s[k]));
console.log(e.$workers.event.request.url);
