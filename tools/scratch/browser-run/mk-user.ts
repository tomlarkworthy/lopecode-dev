// Writes bruser.json into tools/cloud-brain/.emitted: a scratch service that uses brain-x-browser by its own key,
// for the check of 2026-10-08 that each caller has its own browsers. Deployed with `brain.ts apply`, removed after.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const P = "com.lopecode.brain.", name = "bruser", deps = ["cloudflare", "xrpc", "Response"];
const cell = `function _${name}_service(${deps.join(",")}) {
  const B = "${P}browser.";
  const call = async (m, o) => { const r = await xrpc.fetch(B + m, o); return { status: r.status, body: await r.json().catch(() => null) }; };
  const post = (m, body, params) => call(m, { method: "POST", params, body: JSON.stringify(body || {}), headers: { "content-type": "application/json" } });
  return cloudflare.Service("${name}", async (request) => {
    const q = new URL(request.url).searchParams, out = {};
    out.extend = await post("extend", {}, { seconds: q.get("seconds") || "20" });
    out.run = await post("run", { url: "https://example.com/", expression: "document.title", timeout: 10000 });
    out.status = ((s) => ({ status: s.status, owner: s.body && s.body.owner, browser: s.body && s.body.browser, mine: s.body && s.body.mine }))(await call("status"));
    // The owner's browsers: no parameter reaches them, and the two methods that do are not for a Worker.
    out.listAsOwner = await call("list", { params: { owner: "owner", browser: "a" } });
    out.evalOwnerPage = await post("eval", { name: "one", expression: "1", browser: "a", owner: "owner" });
    out.all = await call("all");
    out.end = await post("end", { owner: "owner", browser: "a" });
    if (q.get("close")) out.close = await post("close", { all: true });
    return Response.json(out);
  }, { methods: { "${P}${name}.go": { type: "query", who: "owner" } }, calls: ["${P}browser.*"] });
}`;
const id = `_brain${name}_${name}_service`;
const text = `
const ${id} = ${cell};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("${id}", "${name}_service", ${JSON.stringify(deps)}, ${id});  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
${deps.filter((d) => d !== "Response").map((d) => `  main.define("${d}", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("${d}", _));`).join("  \n")}
  return main;
}
`;
writeFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted", `${name}.json`), JSON.stringify({ name, hash: "scratch", meta: { secrets: [] }, source: { module: "@tomlarkworthy/brain-" + name, text } }));
console.log("written", name);
