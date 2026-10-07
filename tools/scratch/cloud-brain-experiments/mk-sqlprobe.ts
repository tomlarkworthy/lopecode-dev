const text = `
const _probe_service = function _sqlprobe_service(cloudflare, sqlprobeApp) {return (
cloudflare.Worker("sqlprobe", sqlprobeApp, { methods: { "com.lopecode.brain.sqlprobe.run": { type: "procedure", who: "owner" } } })
)};
const _probe_app = function _sqlprobeApp(hono, sql) {
  const app = new hono.Hono();
  // Scratch, 2026-10-07: sends whatever statements the owner posts through the sql platform cell, as this Worker.
  app.post("/xrpc/com.lopecode.brain.sqlprobe.run", async (c) => {
    const { statements, times = 1 } = await c.req.json();
    const out = [];
    for (let i = 0; i < times; i++) {
      const t = Date.now();
      try {
        const results = await sql.batch(statements);
        out.push({ ms: Date.now() - t, results: results.map((r) => ({ rows: r.rows.length, first: r.rows[0] || null, changes: r.changes })) });
      } catch (e) {
        out.push({ ms: Date.now() - t, status: e.status, error: e.error, message: e.message });
      }
    }
    return c.json({ out });
  });
  return app;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("sqlprobe_service")).define("sqlprobe_service", ["cloudflare", "sqlprobeApp"], _probe_service);
  main.variable(observer("sqlprobeApp")).define("sqlprobeApp", ["hono", "sql"], _probe_app);
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));
  main.define("sql", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("sql", _));
  return main;
}
`;
require("fs").writeFileSync("tools/cloud-brain/.emitted/sqlprobe.json", JSON.stringify({ name: "brain-x-sqlprobe", hash: "", meta: { secrets: [] }, source: { module: "@tomlarkworthy/brain-sqlprobe", text } }));
