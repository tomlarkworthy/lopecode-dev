// Deploys the spike to the scratch Worker cb-distil-spike and enables its workers.dev address.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { raw, account } from "../../cloud-brain/.emitted/cf.ts";
const NAME = "cb-distil-spike";
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify({ main_module: "worker.js", compatibility_date: "2026-09-01" })], { type: "application/json" }));
form.append("worker.js", new File([readFileSync(resolve(import.meta.dir, "worker.bundle.js"))], "worker.js", { type: "application/javascript+module" }));
form.append("quickjs.wasm", new File([readFileSync(resolve(import.meta.dir, "node_modules/@jitl/quickjs-wasmfile-release-sync/dist/emscripten-module.wasm"))], "quickjs.wasm", { type: "application/wasm" }));
const S = `/accounts/${account}/workers/scripts/${NAME}`;
const put = await raw(S, { method: "PUT", body: form });
console.log("put", put.status, put.ok, put.errors, put.result && put.result.startup_time_ms != null ? "startup " + put.result.startup_time_ms + " ms" : "");
const sub = await raw(S + "/subdomain", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ enabled: true }) });
console.log("subdomain", sub.status, sub.ok);
