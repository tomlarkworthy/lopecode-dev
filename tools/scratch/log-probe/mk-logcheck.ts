// Writes logcheck.json and logcheck-broken.json into tools/cloud-brain/.emitted: one scratch service for the live
// check of logs, 2026-10-08. Not part of the Brain. The broken one throws when a Worker loads it.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const P = "com.lopecode.brain.";
const make = (file: string, salt: string, broken: boolean) => {
  const cell = `function _logcheck_service(cloudflare,xrpc,log,Response${broken ? ",boom" : ""}) {return (cloudflare.Service(
  "logcheck",
  async (request) => {
    const url = new URL(request.url), m = url.pathname.split(".").pop(), body = await request.text();
    log({ at: "logcheck." + m, note: ${JSON.stringify(salt)} });
    if (m === "throw") throw new RangeError("logcheck threw on purpose");
    const r = await xrpc.fetch("${P}logs.query", { method: "POST", params: { worker: m === "own" ? "brain-x-logcheck" : "brain-core" }, body, headers: { "content-type": "application/json" } });
    return new Response(r.body, { status: r.status, headers: { "content-type": "application/json" } });
  },
  { methods: { "${P}logcheck.own": { type: "procedure", who: "owner" }, "${P}logcheck.other": { type: "procedure", who: "owner" }, "${P}logcheck.throw": { type: "procedure", who: "owner" } }, calls: ["${P}logs.query"] }
));}`;
  const boom = `function _boom(library) {return (library("boom", "if (globalThis.navigator && navigator.userAgent === 'Cloudflare-Workers') throw new Error('boom at start'); export const x = 1;"));}`;
  const imp = (n: string) => `  main.define("${n}", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("${n}", _));`;
  const text = `
const _brainlogcheck_logcheck_service = ${cell};
${broken ? "const _brainlogcheck_boom = " + boom + ";" : ""}

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainlogcheck_logcheck_service", "logcheck_service", ["cloudflare","xrpc","log","Response"${broken ? ',"boom"' : ""}], _brainlogcheck_logcheck_service);
${broken ? '  $def("_brainlogcheck_boom", "boom", ["library"], _brainlogcheck_boom);' : ""}
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));
${["cloudflare", "xrpc", "log", "library"].map(imp).join("\n")}
  return main;
}
`;
  writeFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted", file), JSON.stringify({ name: "logcheck", hash: "scratch", meta: { secrets: [] }, source: { module: "@tomlarkworthy/brain-logcheck", text } }));
};
make("logcheck.json", "one", false);
make("logcheck-broken.json", "two", true);
console.log("written");
