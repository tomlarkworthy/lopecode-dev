// Runs one telemetry query and saves the raw answer.  bun query.ts <name> '<json body without timeframe>' [minutes]
import { api, account, query, save } from "./lib.ts";
const [name, body, mins = "30"] = process.argv.slice(2);
const a = await account();
const to = Date.now(), from = to - Number(mins) * 60000;
const b = { queryId: "probe-" + name, timeframe: { from, to }, ...JSON.parse(body) };
const t = performance.now();
const r = await query(a, b);
const ms = Math.round(performance.now() - t);
save(name, { request: b, status: r.status, errors: r.errors, result: r.result });
const hdr = ["ratelimit", "ratelimit-policy", "retry-after", "x-ratelimit-remaining"].map((h) => h + "=" + r.headers.get(h)).join(" ");
console.log(name, "status", r.status, ms + "ms", hdr, r.ok ? "" : JSON.stringify(r.errors).slice(0, 400));
const res = r.result || {};
console.log("result keys:", Object.keys(res).join(","), "statistics:", JSON.stringify(res.statistics));
if (res.events) console.log("events:", Object.keys(res.events).join(","), "count", res.events.count, "n", res.events.events?.length);
if (res.invocations) console.log("invocations:", Object.keys(res.invocations).length);
if (res.calculations) console.log("calculations:", JSON.stringify(res.calculations).slice(0, 600));
