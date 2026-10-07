// CPU time Cloudflare recorded for the spike Worker.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { account } from "../../cloud-brain/.emitted/cf.ts";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
const since = process.argv[2], until = new Date().toISOString();
const r = await fetch("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ query: `query { viewer { accounts(filter: {accountTag: "${account}"}) {
  workersInvocationsAdaptive(limit: 100, filter: {scriptName: "cb4-guard", datetime_geq: "${since}", datetime_leq: "${until}"}) { sum { requests errors cpuTimeUs wallTime } quantiles { cpuTimeP50 cpuTimeP99 } dimensions { status datetimeMinute } } } } }` }) });
const j: any = await r.json();
if (j.errors) console.log(JSON.stringify(j.errors).slice(0, 400));
else for (const x of j.data.viewer.accounts[0].workersInvocationsAdaptive) console.log(x.dimensions.datetimeMinute, x.dimensions.status, "requests", x.sum.requests, "errors", x.sum.errors, "cpu mean", Math.round(x.sum.cpuTimeUs / x.sum.requests / 100) / 10, "ms  p50", Math.round(x.quantiles.cpuTimeP50 / 100) / 10, "p99", Math.round(x.quantiles.cpuTimeP99 / 100) / 10);
