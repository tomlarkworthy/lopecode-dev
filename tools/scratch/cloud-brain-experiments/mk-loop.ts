// Scratch, 2026-10-07: a channel with no outside, for checking people and turns on a deployed Brain.
// The owner posts what "arrived" (loop.receive); what the Brain sends back is kept in rows (loop.sent).
const text = `
const _loop_service = function _loop_service(cloudflare, loopApp) {return (
cloudflare.Worker("loop", loopApp, { methods: {
  "com.lopecode.brain.loop.receive": { type: "procedure", who: "owner" },
  "com.lopecode.brain.loop.sent": { type: "query", who: "owner" },
  "com.lopecode.brain.loop.send": { type: "procedure", allow: 'caller.kind in ["owner", "token"] || caller.id == "worker:brain-x-inbox"' },
  "com.lopecode.brain.loop.claim": { type: "procedure", allow: 'caller.id == "kernel"' },
  "com.lopecode.brain.loop.know": { type: "procedure", allow: 'caller.id == "kernel"' },
  "com.lopecode.brain.loop.room": { type: "procedure", allow: 'caller.id == "kernel"' },
  "com.lopecode.brain.loop.setRoom": { type: "procedure", who: "owner" }
} })
)};
const _loop_app = function _loopApp(hono, rows, inbox) {
  const app = new hono.Hono();
  const NS = "/xrpc/com.lopecode.brain.loop.";
  const kernel = async (c, next) => (c.req.header("x-brain-caller") === "kernel" ? next() : c.json({ error: "AuthRequired", message: "the kernel" }, 401));
  app.post(NS + "receive", async (c) => {
    const { address, text, key, raw, source } = await c.req.json();
    // raw and source: appended as given, to check what a channel that lies can do.
    if (raw) return c.json(await inbox.append({ source: source || "loop", key, body: raw }));
    if (await rows.get("known/" + address)) return c.json(await inbox.append({ source: "loop", key, body: { text, address, at: Date.now() } }));
    const code = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, "0")).join("");
    await rows.put("code/" + code, { address, exp: Date.now() + 600000 });
    return c.json({ stranger: true, code });
  });
  app.post(NS + "send", async (c) => {
    const { to, text, room } = await c.req.json();
    if (typeof to !== "string" || !(await rows.get("known/" + to))) return c.json({ error: "Forbidden", message: "loop.send writes to a linked address only" }, 403);
    await rows.append("sent", { to, text, ...(room ? { room } : {}), at: Date.now() }, 50);
    return c.json({ sent: true });
  });
  app.get(NS + "sent", async (c) => c.json({ sent: (await rows.get("sent")) || [] }));
  app.post(NS + "claim", kernel, async (c) => {
    const { code, peek } = await c.req.json();
    const row = typeof code === "string" ? await rows.get("code/" + code) : null;
    if (!row || row.exp < Date.now()) return c.json({ error: "NotFound", message: "no such code" }, 404);
    if (!peek) {
      await rows.delete("code/" + code);
      await rows.put("known/" + row.address, { at: Date.now() });
    }
    return c.json({ address: row.address });
  });
  app.post(NS + "know", kernel, async (c) => {
    const { address, forget } = await c.req.json();
    if (forget) await rows.delete("known/" + address);
    else await rows.put("known/" + address, { at: Date.now() });
    return c.json({ known: !forget });
  });
  // Rooms, 2026-10-07: the owner says who is in one (setRoom); the kernel asks when it hands out a turn (room).
  app.post(NS + "setRoom", async (c) => {
    const { id, ...room } = await c.req.json();
    await rows.put("room/" + id, room);
    return c.json({ id });
  });
  app.post(NS + "room", kernel, async (c) => {
    const { id } = await c.req.json(), room = await rows.get("room/" + id);
    return c.json(room ? { id, known: true, complete: true, served: true, ...room } : { id, known: false });
  });
  return app;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  main.variable(observer("loop_service")).define("loop_service", ["cloudflare", "loopApp"], _loop_service);
  main.variable(observer("loopApp")).define("loopApp", ["hono", "rows", "inbox"], _loop_app);
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));
  main.define("hono", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("hono", _));
  main.define("rows", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("rows", _));
  main.define("inbox", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("inbox", _));
  return main;
}
`;
require("fs").writeFileSync("tools/cloud-brain/.emitted/loop.json", JSON.stringify({ name: "brain-x-loop", hash: "", meta: { secrets: [] }, source: { module: "@tomlarkworthy/brain-loop", text } }));
