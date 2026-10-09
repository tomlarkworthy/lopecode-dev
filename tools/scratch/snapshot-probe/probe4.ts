import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
const HOST = `cb4.${st.subdomain}.workers.dev`;
const UA = "lopecode-cloud-brain-snapshot/1 (+https://github.com/tomlarkworthy/lopecode)";
for (const url of process.argv.slice(2)) {
  const r = await fetch(`https://${HOST}/xrpc/com.lopecode.brain.proxy.fetch`, { method: "POST", headers: { authorization: "Bearer " + st.session, "content-type": "application/json" }, body: JSON.stringify({ url, headers: { "user-agent": UA } }) });
  const t = await r.text();
  console.log(r.status, t.length, [...r.headers].filter(([k]) => /ratelimit|retry/i.test(k)).map((x) => x.join("=")).join(" "), url.slice(0, 70));
}
