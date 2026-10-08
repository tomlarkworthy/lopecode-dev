// Writes perf.json, perf2.json, perf3.json into tools/cloud-brain/.emitted: three scratch services with one body,
// for the RPC performance record of 2026-10-08. Not part of the Brain. Deployed with `brain.ts apply`, removed after.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const P = "com.lopecode.brain.";
const names = ["perf", "perf2", "perf3"];
const deps = ["cloudflare", "xrpc", "secrets", "sql", "rows", "cel", "decide", "callerOf", "sha256", "Response"];
const make = (name: string, next: string) => {
  const open = `{ type: "query", who: "anyone" }`, trusted = `{ type: "query", who: "owner" }`;
  const pay = `{ type: "query", allow: 'caller.trusted || caller.kind == "worker"', price: "0.000001" }`;
  const methods = `{
      "${P}${name}.free": ${open}, "${P}${name}.owner": ${trusted}, "${P}${name}.headers": ${open}, "${P}${name}.chain": ${open},
      "${P}${name}.priced": ${pay}, "${P}${name}.fail": ${pay}, "${P}${name}.settle": ${pay}, "${P}${name}.chainp": ${pay},
      "${P}${name}.inside": ${trusted}, "${P}${name}.echo": { type: "procedure", who: "owner" }
    }`;
  const cell = `function _${name}_service(${deps.join(",")}) {
  const S = { n: 0, born: 0 };
  const NAME = "${name}", NEXT = "${next}", P = "${P}";
  const tick = () => new Promise((r) => setTimeout(r, 1));
  const enc = new TextEncoder();
  let hkey = null;
  const hmacKey = () => (hkey ??= crypto.subtle.importKey("raw", enc.encode("k".repeat(43)), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]));
  const RULE = 'caller.session || (caller.worker == "brain-x-feed" && origin.kind == "owner")';
  const ledger = (len) => Array.from({ length: len }, (_, i) => ({ t: 1791440000000 + i, i: "0123456789abc", u: 1, A: 1000000, m: P + "perf.priced", c: "owner", o: "owner", v: "session" }));
  return cloudflare.Service(
    NAME,
    async (request) => {
      const url = new URL(request.url), q = url.searchParams, m = url.pathname.split(".").pop();
      if (!S.born) S.born = Date.now();
      S.n++;
      const tag = { "x-perf": NAME + ";n=" + S.n + ";age=" + (Date.now() - S.born) };
      const J = (v, init = {}) => Response.json(v, { ...init, headers: { ...tag, ...(init.headers || {}) } });
      const num = (k, d) => Number(q.get(k) ?? d);
      if (m === "free" || m === "owner" || m === "priced") {
        const bytes = num("bytes", 0);
        if (!bytes) return J({ ok: true, m, n: S.n });
        const chunk = crypto.getRandomValues(new Uint8Array(65536));
        let left = bytes;
        const body = new ReadableStream({ pull(c) { if (left <= 0) return c.close(); const k = Math.min(left, chunk.length); c.enqueue(k === chunk.length ? chunk : chunk.subarray(0, k)); left -= k; } });
        return new Response(body, { headers: { ...tag, "content-type": "application/octet-stream" } });
      }
      if (m === "fail") return J({ error: "Boom", message: "on purpose" }, { status: 500 });
      if (m === "settle") return J({ ok: true }, { headers: { "x-brain-cost": "0" } });
      if (m === "headers") {
        const list = [...request.headers].map(([k, v]) => [k, v.length]);
        return J({ headers: list, bytes: list.reduce((a, [k, n]) => a + k.length + n + 4, 0) });
      }
      if (m === "chain" || m === "chainp") {
        const d = num("d", 0), t = Date.now();
        let inner = null;
        if (d > 0) {
          const r = await xrpc.fetch(P + NEXT + "." + m, { params: { d: String(d - 1) } });
          inner = { status: r.status, body: await r.json().catch(() => null) };
        }
        return J({ me: NAME, n: S.n, ms: Date.now() - t, inner });
      }
      if (m === "echo") {
        const mode = q.get("mode") || "buffer", t = Date.now();
        let bytes = 0;
        if (mode === "buffer") bytes = (await request.arrayBuffer()).byteLength;
        else if (mode === "stream") { const rd = request.body.getReader(); for (;;) { const { done, value } = await rd.read(); if (done) break; bytes += value.length; } }
        return J({ bytes, mode, ms: Date.now() - t });
      }
      if (m === "inside") {
        const op = q.get("op") || "noop", n = Math.min(num("n", 10), 400), par = num("par", 1), reps = Math.min(num("reps", 1000), 200000), len = Math.min(num("len", 0), 4000);
        const target = /^perf[23]?\\.[a-z0-9]+$/.test(q.get("target") || "") ? q.get("target") : NAME + ".free";
        const own = { headers: { "x-brain-context": "none" } };
        const context = { caller: callerOf({ caller: "owner", via: "session" }), origin: callerOf({ caller: "owner", via: "session" }), request: { method: P + "perf.free", path: "/xrpc/" + P + "perf.free", verb: "GET", params: {} } };
        const key = await hmacKey(), payload = enc.encode("x".repeat(160)), sig = await crypto.subtle.sign("HMAC", key, payload);
        const big = JSON.stringify(ledger(len || 2000));
        const io = {
          noop: async () => tick(),
          xrpc: async () => (await xrpc.fetch(P + target)).arrayBuffer(),
          xrpcq: async () => xrpc.query(P + target),
          x501: async () => (await xrpc.fetch(P + NAME + ".nope")).arrayBuffer(),
          priced: async () => (await xrpc.fetch(P + NAME + ".priced", own)).arrayBuffer(),
          pricedfail: async () => (await xrpc.fetch(P + NAME + ".fail", own)).arrayBuffer(),
          pricedsettle: async () => (await xrpc.fetch(P + NAME + ".settle", own)).arrayBuffer(),
          "secret-held": async () => secrets.PERF_SECRET,
          "secret-get": async () => xrpc.fetch(P + "secret.get", { params: { name: "PERF_SECRET" } }).then((r) => r.arrayBuffer()),
          sql1: async () => sql.exec("SELECT 1 AS one"),
          sqlt: async () => sql.exec("SELECT v FROM perf_t WHERE k = ?", "a"),
          sqlw: async (i) => sql.exec("INSERT INTO perf_t (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v", "a", String(i)),
          "rows-get": async () => rows.get("small"),
          "rows-miss": async () => rows.get("absent"),
          "rows-put": async (i) => rows.put("small", { i }),
          "rows-list": async () => rows.list("l/"),
          "rows-inc": async () => rows.increment("count"),
          "rows-append": async (i) => rows.append("big", { t: Date.now(), i: "0123456789abc", u: 1, A: 1000000, m: P + "perf.priced", c: "owner", o: "owner", v: "session" }, 100000),
          "rows-getbig": async () => rows.get("big"),
          "rows-append-getbig": async (i) => { await io["rows-append"](i); return rows.get("big"); }
        };
        const cpu = {
          empty: () => 0,
          sha: () => sha256("k".repeat(64)),
          "hmac-import-sign": async () => crypto.subtle.sign("HMAC", await crypto.subtle.importKey("raw", enc.encode("k".repeat(64)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), payload),
          "hmac-sign": () => crypto.subtle.sign("HMAC", key, payload),
          "hmac-verify": () => crypto.subtle.verify("HMAC", key, sig, payload),
          "cel-parse": () => cel.parse(RULE),
          "cel-decide": () => decide({ allow: RULE }, context),
          "who-decide": () => decide({ who: "owner" }, context),
          callerof: () => callerOf({ caller: "owner", via: "session" }),
          "json-ledger": () => JSON.parse(big).length,
          headers: () => { const h = new Headers(request.headers); for (const k of [...h.keys()]) if (k.startsWith("x-brain-")) h.delete(k); h.set("x-brain-caller", "owner"); return h; },
          url: () => new URL(request.url).pathname
        };
        if (op === "setup") {
          await rows.put("small", { i: 0 });
          for (let i = 0; i < 10; i++) await rows.put("l/" + i, { worker: "brain-x-" + i, methods: { a: { type: "query", who: "owner" } } });
          await rows.put("big", ledger(len));
          const made = q.get("sql") ? await sql.exec("CREATE TABLE IF NOT EXISTS perf_t (k TEXT PRIMARY KEY, v TEXT)").then(() => sql.exec("INSERT OR REPLACE INTO perf_t (k, v) VALUES ('a', '1')")).then(() => true, (e) => String(e.message)) : null;
          return J({ setup: true, len, made });
        }
        if (op === "clean") {
          const dropped = await sql.exec("DROP TABLE IF EXISTS perf_t").then(() => true, (e) => String(e.message));
          return J({ deleted: await rows.deletePrefix(""), dropped });
        }
        if (cpu[op]) {
          // CPU by repetition between two timers: the clock of a Worker moves only at I/O.
          await tick();
          const t0 = Date.now();
          for (let i = 0; i < reps; i++) await cpu[op](i);
          await tick();
          return J({ op, reps, ms: Date.now() - t0, bytes: op === "json-ledger" ? big.length : undefined });
        }
        if (!io[op]) return J({ error: "InvalidRequest", message: "op" }, { status: 400 });
        const t = Date.now(), ms = [];
        const one = async (i) => { const t1 = Date.now(); await io[op](i); return Date.now() - t1; };
        if (par > 1) for (let i = 0; i < n; i += par) ms.push(...(await Promise.all(Array.from({ length: Math.min(par, n - i) }, (_, j) => one(i + j)))));
        else for (let i = 0; i < n; i++) ms.push(await one(i));
        return J({ op, n, par, total: Date.now() - t, ms });
      }
      return J({ error: "MethodNotImplemented", message: m }, { status: 501 });
    },
    { methods: ${methods}, calls: [${names.map((n) => `"${P}${n}.*"`).join(", ")}] }
  );
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
  writeFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted", `${name}.json`), JSON.stringify({ name, hash: "scratch", meta: { secrets: ["PERF_SECRET"] }, source: { module: "@tomlarkworthy/brain-" + name, text } }));
};
names.forEach((n, i) => make(n, names[(i + 1) % names.length]));
console.log("written", names.join(" "));
