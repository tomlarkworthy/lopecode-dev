// bun deploy.ts up|down   — scratch Worker cbx-browser-spike. The Cloudflare token is never printed.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const token = readFileSync(resolve(import.meta.dir, "../cloud-brain-experiments/.cf-token"), "utf8").trim();
const NAME = "cbx-browser-spike";
const api = async (path: string, init: RequestInit = {}) => {
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, { ...init, headers: { authorization: "Bearer " + token, ...(init.headers || {}) } });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.success === false) throw new Error(`${init.method || "GET"} ${path.replace(/[0-9a-f]{32}/, "<account>")} ${r.status} ${JSON.stringify(j.errors || j).slice(0, 400)}`);
  return j.result;
};
const account = (await api("/accounts"))[0].id;
const S = `/accounts/${account}/workers/scripts/${NAME}`;
if (process.argv[2] === "down") {
  await api(S + "?force=true", { method: "DELETE" });
  console.log("deleted " + NAME);
} else {
  const keyFile = resolve(import.meta.dir, ".key");
  if (!existsSync(keyFile)) writeFileSync(keyFile, crypto.randomUUID().replaceAll("-", ""));
  const key = readFileSync(keyFile, "utf8").trim();
  const exists = await api(S + "/settings").then(() => true, () => false);
  const metadata: any = {
    main_module: "worker.js", compatibility_date: "2026-10-01",
    bindings: [
      { type: "browser", name: "BROWSER" },
      { type: "durable_object_namespace", name: "PAGE", class_name: "Page" },
      { type: "secret_text", name: "KEY", text: key }
    ]
  };
  if (!exists) metadata.migrations = { new_tag: "v1", new_sqlite_classes: ["Page"] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("worker.js", new File([readFileSync(resolve(import.meta.dir, "worker.js"), "utf8")], "worker.js", { type: "application/javascript+module" }));
  await api(S, { method: "PUT", body: form });
  await api(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
  const sub = (await api(`/accounts/${account}/workers/subdomain`)).subdomain;
  writeFileSync(resolve(import.meta.dir, ".url"), `https://${NAME}.${sub}.workers.dev`);
  console.log(`${exists ? "updated" : "installed"} https://${NAME}.${sub}.workers.dev`);
}
