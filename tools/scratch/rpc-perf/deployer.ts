// The deployer and its Durable Object, read-only. bun deployer.ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { FLOOR, timed, interleave, row, save } from "./lib.ts";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
const D = `https://${st.deployerScript ?? "cb4-deployer"}.${st.subdomain}.workers.dev`, H = { authorization: "Bearer " + st.recoveryKey };
const out = await interleave({
  "floor": () => timed(FLOOR + "/"),
  "deployer wrapper (_health)": () => timed(D + "/xrpc/_health"),
  "deployer infra.getState": () => timed(D + "/xrpc/com.lopecode.brain.infra.getState", { headers: H }),
  "deployer infra.rowsDigest": () => timed(D + "/xrpc/com.lopecode.brain.infra.rowsDigest", { headers: H })
}, 40);
for (const [k, rs] of Object.entries(out)) console.log(row(k, rs.map((r) => r.ms), ` status ${[...new Set(rs.map((r) => r.status))]} bytes ${rs[0].bytes}`));
const t = performance.now();
const par = await Promise.all(Array.from({ length: 50 }, () => timed(D + "/xrpc/com.lopecode.brain.infra.getState", { headers: H })));
console.log(row("getState x50 at once", par.map((r) => r.ms), ` all done in ${Math.round(performance.now() - t)} ms, status ${[...new Set(par.map((r) => r.status))]}`));
save("deployer-" + Date.now(), { out, par });
