// Cloudflare's own numbers for cb4, read-only (GraphQL analytics). bun cfstats.ts [hours]
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
const hours = Number(process.argv[2] || 24);
const account = ((await (await fetch("https://api.cloudflare.com/client/v4/accounts", { headers: { authorization: "Bearer " + token } })).json()) as any).result[0].id;
const until = new Date().toISOString(), since = new Date(Date.now() - hours * 3600e3).toISOString();
const gql = async (body: string) => {
  const r = await fetch("https://api.cloudflare.com/client/v4/graphql", { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ query: `query { viewer { accounts(filter: {accountTag: "${account}"}) { ${body} } } }` }) });
  const j: any = await r.json();
  if (j.errors) return { error: JSON.stringify(j.errors).slice(0, 400) };
  return j.data.viewer.accounts[0];
};
const f = `filter: {datetime_geq: "${since}", datetime_leq: "${until}"}`;
const w: any = await gql(`workersInvocationsAdaptive(limit: 1000, ${f}) { sum { requests subrequests errors cpuTimeUs wallTime } quantiles { cpuTimeP50 cpuTimeP99 wallTimeP50 wallTimeP99 } dimensions { scriptName } }`);
if (w.error) console.log("workers:", w.error);
else {
  const rows = w.workersInvocationsAdaptive.filter((x: any) => /^(cb4|cbx)/.test(x.dimensions.scriptName)).sort((a: any, b: any) => b.sum.requests - a.sum.requests);
  console.log(`WORKERS last ${hours} h   requests  subreq  errors  cpu p50 µs  cpu p99 µs  wall p50 µs  wall p99 µs  cpu total ms`);
  let tot = 0, cpu = 0;
  for (const x of rows) { tot += x.sum.requests; cpu += x.sum.cpuTimeUs; console.log(" ", x.dimensions.scriptName.padEnd(16), String(x.sum.requests).padStart(8), String(x.sum.subrequests).padStart(7), String(x.sum.errors).padStart(6), String(Math.round(x.quantiles.cpuTimeP50)).padStart(10), String(Math.round(x.quantiles.cpuTimeP99)).padStart(11), String(Math.round(x.quantiles.wallTimeP50)).padStart(12), String(Math.round(x.quantiles.wallTimeP99)).padStart(12), String(Math.round(x.sum.cpuTimeUs / 1000)).padStart(10)); }
  console.log("  total requests", tot, "cpu ms", Math.round(cpu / 1000));
  const all = w.workersInvocationsAdaptive.reduce((a: number, x: any) => a + x.sum.requests, 0);
  console.log("  whole account, every script:", all);
}
const d: any = await gql(`d1AnalyticsAdaptiveGroups(limit: 1000, filter: {datetimeHour_geq: "${since}", datetimeHour_leq: "${until}"}) { sum { readQueries writeQueries rowsRead rowsWritten queryBatchResponseBytes } quantiles { queryBatchTimeMsP50 queryBatchTimeMsP90 } dimensions { databaseId } }`);
if (d.error) console.log("d1:", d.error);
else for (const x of d.d1AnalyticsAdaptiveGroups) console.log("D1", x.dimensions.databaseId.slice(0, 8), JSON.stringify(x.sum), JSON.stringify(x.quantiles));
const o: any = await gql(`durableObjectsInvocationsAdaptiveGroups(limit: 1000, ${f}) { sum { requests wallTime } dimensions { scriptName } }`);
if (o.error) console.log("do:", o.error);
else for (const x of o.durableObjectsInvocationsAdaptiveGroups.filter((x: any) => /^cb4/.test(x.dimensions.scriptName))) console.log("DO", x.dimensions.scriptName, JSON.stringify(x.sum));
const dbs: any = (await (await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/d1/database`, { headers: { authorization: "Bearer " + token } })).json() as any).result;
console.log("d1 ids", dbs.map((x: any) => x.uuid.slice(0, 8) + "=" + x.name).join(" "));
