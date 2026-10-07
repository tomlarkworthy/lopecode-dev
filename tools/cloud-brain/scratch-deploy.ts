/**
 * Step 1 stop-and-show only: uploads an emitted Worker (from .emitted/<file>.json) to a scratch name.
 * The guard replaces this in step 2. Token: tools/scratch/cloud-brain-experiments/.cf-token (never printed).
 *   bun tools/cloud-brain/scratch-deploy.ts fixture.json cb-step1-fixture [SECRET=value ...]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const [file, name, ...kv] = process.argv.slice(2);
const token = readFileSync(resolve(import.meta.dir, "../scratch/cloud-brain-experiments/.cf-token"), "utf8").trim();
const api = async (path: string, init: RequestInit = {}) => {
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, { ...init, headers: { authorization: "Bearer " + token, ...(init.headers || {}) } });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`${init.method || "GET"} ${path.replace(/[0-9a-f]{32}/, "<account>")} ${r.status} ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.result;
};
const e = JSON.parse(readFileSync(resolve(import.meta.dir, ".emitted", file), "utf8"));
const account = (await api("/accounts"))[0].id;
const given = Object.fromEntries(kv.map((s) => s.split("=")));
const bindings = e.meta.bindings
  .filter((b: any) => b.type !== "service") // no brain-core exists on a scratch deploy
  .map((b: any) => (b.type === "secret_text" ? { ...b, text: given[b.name] ?? "" } : b));
bindings.push({ type: "json", name: "BRAIN_INFO", json: { ...e.info, name } });
const metadata: any = { main_module: "worker.js", compatibility_date: "2026-10-01", bindings };
if (e.meta.resources.includes("rows")) metadata.migrations = { new_tag: "v1", new_sqlite_classes: ["Rows"] };
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
for (const p of e.parts) form.append(p.path, new File([p.text], p.path, { type: "application/javascript+module" }));
let t = performance.now();
try {
  await api(`/accounts/${account}/workers/scripts/${name}`, { method: "PUT", body: form });
} catch (err: any) {
  if (!/migration|new_tag|already/i.test(err.message)) throw err;
  delete metadata.migrations; // the class was declared by an earlier upload
  const again = new FormData();
  again.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  for (const p of e.parts) again.append(p.path, new File([p.text], p.path, { type: "application/javascript+module" }));
  await api(`/accounts/${account}/workers/scripts/${name}`, { method: "PUT", body: again });
}
console.log(`uploaded ${name} in ${Math.round(performance.now() - t)} ms, hash ${e.hash.slice(0, 12)}, parts ${e.parts.map((p: any) => p.path + ":" + p.text.length).join(" ")}`);
await api(`/accounts/${account}/workers/scripts/${name}/subdomain`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
const sub = (await api(`/accounts/${account}/workers/subdomain`)).subdomain;
console.log(`https://${name}.${sub}.workers.dev`);
const settings = await api(`/accounts/${account}/workers/scripts/${name}/settings`);
console.log("bindings: " + settings.bindings.map((b: any) => b.type + ":" + b.name).join(" "));
