import { readFileSync } from "node:fs";
const st = JSON.parse(readFileSync("tools/cloud-brain/.emitted/cb4.json", "utf8"));
const r = await fetch("https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.sqlprobe.run", { method: "POST", headers: { "content-type": "application/json", cookie: "brain_session=" + st.cookie }, body: JSON.stringify({ statements: [["SELECT 1 AS one"]], times: 4 }) });
console.log("first calls on a new brain-db instance, ms:", ((await r.json()) as any).out.map((o: any) => o.ms + (o.results ? "" : " " + o.message)).join(" "));
