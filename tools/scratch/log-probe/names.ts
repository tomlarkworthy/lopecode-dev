import { api, account, query, save } from "./lib.ts";
const a = await account(); const NAME = "cbx-logprobe";
const sub = (await api(`/accounts/${a}/workers/subdomain`)).result.subdomain;
const names = ["code","token","key","sig","state","iss","password","session","auth","hub.verify_token","hub.challenge","cursor","path","name","access_token","api_key","apikey","jwt","ticket","nonce","signature","credential","cc","verify_token","hubtoken","mycode","Authorization","bearer","passwd","pin","otp"];
if (process.argv[2] === "hit") {
  const q = names.map((n, i) => encodeURIComponent(n) + "=PLAINV" + i).join("&") + "&hexy=" + "ab12".repeat(16) + "&jwty=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.abcDEF123_-x&long=" + "Zq9".repeat(20);
  console.log((await fetch(`https://${NAME}.${sub}.workers.dev/plain?${q}`)).status, new Date().toISOString()); process.exit(0);
}
const now = Date.now();
const r = await query(a, { queryId: "p", timeframe: { from: now - 900000, to: now }, view: "events", limit: 50, parameters: { datasets: ["cloudflare-workers"], filters: [{ key: "$workers.scriptName", operation: "eq", type: "string", value: NAME }] } });
const e = (r.result?.events?.events || []).find((e: any) => e.$workers?.event?.request?.search?.cursor);
if (!e) { console.log("not yet"); process.exit(1); }
save("names", e);
const s = e.$workers.event.request.search;
console.log("url:", e.$workers.event.request.url);
console.log("kept:", Object.keys(s).filter((k) => s[k] !== "REDACTED").join(" "));
console.log("redacted:", Object.keys(s).filter((k) => s[k] === "REDACTED").join(" "));
