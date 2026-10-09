import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
for (const k of ["deployerKey", "guardKey"]) {
  if (!st[k]) continue;
  const r = await fetch(`https://cb4-x-snapshot.${st.subdomain}.workers.dev/__tick`, { headers: { "x-brain-deployer": st[k] } });
  const t = await r.text();
  console.log(k, r.status, t.slice(0, 300));
  if (r.status === 200) { try { const v = JSON.parse(t).value ?? JSON.parse(t); console.log("alarm in s:", v.alarm ? Math.round((v.alarm - v.now) / 1000) : null, "last:", JSON.stringify(v.last)); } catch {} break; }
}
