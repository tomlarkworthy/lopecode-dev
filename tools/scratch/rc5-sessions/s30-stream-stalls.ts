// No-model probe for the stream-idle watchdog in robocoop-5-core's createOpenRouterClient.
// A local SSE server plays OpenRouter; the client under test is the module's own cell (not a copy).
//   bun probe.ts <core.js> [idleMs=2000]
// Scenarios (each request to the server takes the next behaviour in its list):
//   keepalive: attempt 1 sends ": OPENROUTER PROCESSING" every 400 ms forever; attempt 2 answers.
//   silent:    attempt 1 sends headers then nothing; attempt 2 answers.
//   slowdata:  one attempt streams a content delta every idleMs/2 for 3*idleMs, then answers (must NOT retry).
//   thinkforever: attempt 1 streams reasoning deltas every 200 ms and never answers; attempt 2 must carry
//              reasoning {effort:'low'} (budget = idleMs) and answers.
//   shortthink: reasoning for idleMs/2 then answers (must NOT retry).
// PASS = keepalive, silent, thinkforever return "ok" on attempt 2 within ~idleMs (+ backoff for the idle
// cases); slowdata and shortthink return on attempt 1.
import { createServer } from "node:http";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { importNotebookModule } from "../../notebook-import.ts";

const [coreArg, idleArg] = process.argv.slice(2);
const idleMs = Number(idleArg || 2000);
// The pre-fix module has no streamIdleMs option: shorten its constant in a temp copy so both run fast.
let src = readFileSync(resolve(coreArg), "utf8");
const patchedConst = /const STREAM_IDLE_MS = 180000;/.test(src);
if (patchedConst) src = src.replace("const STREAM_IDLE_MS = 180000;", `const STREAM_IDLE_MS = ${idleMs};`);
const tmp = resolve(import.meta.dir, ".probe-core.js");
writeFileSync(tmp, src);
const m = await importNotebookModule(tmp, { overrides: { globalThis } });
const createOpenRouterClient = await m.value("createOpenRouterClient");

const answer = 'data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}],"provider":"fake"}\n\ndata: [DONE]\n\n';
let plan: string[] = [], seen = 0, bodies: any[] = [];
const open = new Set<any>();
const server = createServer((req, res) => {
  let raw = ""; req.on("data", (c) => (raw += c)); req.on("end", () => handle(req, res, raw));
});
function handle(req: any, res: any, raw: string) {
  try { if (raw) bodies.push(JSON.parse(raw)); } catch {}
  if (req.url?.endsWith("/models")) { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"data":[]}'); }
  const mode = plan[seen++] ?? "answer";
  if (mode !== "cap429") res.writeHead(200, { "content-type": "text/event-stream" });
  open.add(res); res.on("close", () => open.delete(res));
  if (mode === "answer") return res.end(answer);
  if (mode === "cap429") { res.writeHead(429, { "content-type": "application/json" }); return res.end('{"error":{"message":"Rate limit exceeded. Come back tomorrow or switch to your own API key."}}'); }
  if (mode === "keepalive") { const t = setInterval(() => res.write(": OPENROUTER PROCESSING\n\n"), 400); res.on("close", () => clearInterval(t)); return; }
  if (mode === "silent") { res.write(""); return; }
  if (mode === "slowdata") {
    let n = 0; const t = setInterval(() => {
      if (n++ * (idleMs / 2) >= 3 * idleMs) { clearInterval(t); return res.end(answer); }
      res.write('data: {"choices":[{"delta":{"content":"."}}],"provider":"fake"}\n\n');
    }, idleMs / 2);
    res.on("close", () => clearInterval(t));
  }
  if (mode === "thinkforever" || mode === "shortthink") {
    const t0 = Date.now(); const t = setInterval(() => {
      if (mode === "shortthink" && Date.now() - t0 >= idleMs / 2) { clearInterval(t); return res.end(answer); }
      res.write('data: {"choices":[{"delta":{"reasoning":"hmm "}}],"provider":"fake"}\n\n');
    }, 200);
    res.on("close", () => clearInterval(t));
  }
}
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as any).port;
const client = createOpenRouterClient({ apiKey: "x", baseUrl: `http://127.0.0.1:${port}`, cacheModels: new Set(), ...(patchedConst ? {} : { streamIdleMs: idleMs, reasoningBudgetMs: idleMs }) });

async function runErr(name: string, p: string[], capMs: number) {
  plan = p; seen = 0; bodies = [];
  const t0 = Date.now(); let err: any;
  try { await client.chat({ model: "m", messages: [{ role: "user", content: "hi" }], signal: AbortSignal.timeout(capMs) }); } catch (e) { err = e; }
  const ms = Date.now() - t0; const ok = !!err && seen === 1 && ms < 1000;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${ms} ms, requests=${seen}, err=${err ? String(err.message).slice(0, 80) : "-"}`);
  return ok;
}
async function run(name: string, p: string[], capMs: number, expectAttempts: number, expectReasoning?: any) {
  plan = p; seen = 0; bodies = [];
  const t0 = Date.now();
  const ctrl = new AbortController();
  const cap = setTimeout(() => ctrl.abort(), capMs);
  let out: any, err: any;
  try { out = await client.chat({ model: "m", messages: [{ role: "user", content: "hi" }], signal: ctrl.signal }); } catch (e) { err = e; }
  clearTimeout(cap);
  for (const r of open) r.destroy();
  const ms = Date.now() - t0;
  const lastReasoning = JSON.stringify(bodies.at(-1)?.reasoning ?? null);
  const ok = /ok$/.test(out?.message?.content ?? "") && seen === expectAttempts && (expectReasoning === undefined || lastReasoning === JSON.stringify(expectReasoning));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${ms} ms, requests=${seen}, content=${out?.message?.content ?? "-"}, reasoning sent on last request=${lastReasoning}, err=${err ? (err.name + ": " + err.message).slice(0, 80) : "-"}${ms >= capMs ? " (hit the probe cap: still waiting)" : ""}`);
  return ok;
}
const capMs = idleMs * 6 + 5000;
const results = [
  await run("keepalive-only then answer", ["keepalive", "answer"], capMs, 2),
  await run("silent then answer", ["silent", "answer"], capMs, 2),
  await run("slow steady visible data (no retry)", ["slowdata"], capMs, 1),
  await run("thinks forever then answer", ["thinkforever", "answer"], capMs, 2, { effort: "low" }),
  await run("short think (no retry)", ["shortthink"], capMs, 1, null),
  await runErr("daily-cap 429 fails fast (no retry)", ["cap429", "cap429", "cap429"], capMs),
  await run("thinks forever twice then answer", ["thinkforever", "thinkforever", "answer"], capMs, 3, { enabled: false }),
];
server.close(); m.dispose?.();
console.log(results.every(Boolean) ? "ALL PASS" : "SOME FAIL");
process.exit(results.every(Boolean) ? 0 : 1);
