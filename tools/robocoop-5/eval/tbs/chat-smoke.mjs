// One real model step through the bundle's streaming client: proves the request path (retry, idle
// timeout, SSE reassembly) still completes a turn after a core change. Costs one short mimo call.
import { resolve, join } from "node:path";
import { createDriver } from "../driver.mjs";
import { here } from "./tasks.mjs";
import { loadKey } from "./keyload.mjs";
import { fetchPatchSource } from "./page-init.mjs";

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const notebook = resolve(flag("--notebook", join(here, "..", "robocoop-5-eval-bigcap-df3.html")));
const driver = await createDriver({ notebookPath: notebook, apiKey: loadKey(), model: flag("--model", "xiaomi/mimo-v2.5-pro"), timeoutMs: 240000 });
let r;
try {
  // --patch '{"reasoning":{"enabled":false}}' — prove the page-init request patch reaches the wire:
  // the wrapped fetch also logs each patched body's keys into the tool timer list the snapshot returns.
  const patch = flag("--patch", null) ? JSON.parse(flag("--patch")) : null;
  // df8 time floor off; --expect-floor lowers it to 60 s (df9 repeats the floor veto until the floor is reached)
  const noFloor = args.includes("--no-time-floor") ? "globalThis.__rc5MinTurnMs = 0;" : args.includes("--expect-floor") ? "globalThis.__rc5MinTurnMs = 60000;" : "";
  const init = patch ? fetchPatchSource(patch) + `;(() => { const f = globalThis.fetch; globalThis.fetch = function (u, i) { const r = f.call(this, u, i); try { if (i && typeof i.body === "string" && /chat\\/completions/.test(String(u))) (globalThis.__rc5ToolTimes = globalThis.__rc5ToolTimes || []).push({ name: "__request", start: 0, ms: 0, body: globalThis.__rc5LastBody || JSON.parse(i.body) }); } catch {} return r; }; })()` : undefined;
  // --expect-floor (df8): a summary that already carries a GATES list is sent back once by the time floor.
  const question = args.includes("--expect-floor")
    ? "Call glob with pattern /src/@user/*.js once, then call task_complete with exactly this summary: GATES: files listed = 1 -> 1"
    : args.includes("--expect-veto")
    ? "Call glob with pattern /src/@user/*.js once, then call task_complete with a one-line summary."
    : "Reply with exactly the word ok and nothing else, then call task_complete.";
  r = await driver.runQuestion({ id: "chat", question, setup: (init || noFloor) ? { initScript: [noFloor, init].filter(Boolean).join(";") } : undefined });
  // --expect-veto: the bundle's completion guard must push back once (GATES list) and then accept
  if (args.includes("--expect-floor")) {
    const tools = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
    const floored = tools.some((c) => /REJECTED.*this turn still has about/.test(c));
    const gated = tools.some((c) => /REJECTED: before finishing/.test(c));
    // the model may also earn a GATES veto on the way (its summary drifts); the floor veto + completion is the claim
    const good = floored && r.finishReason === "completed";
    console.log(`${good ? "ok  " : "FAIL"} time floor vetoed then accepted: floored=${floored} gatesVeto=${gated} finish=${r.finishReason} steps=${r.steps}`);
    if (!good) process.exitCode = 1;
  }
  if (args.includes("--expect-veto")) {
    const tools = (r.conversation || []).filter((m) => m.role === "tool").map((m) => String(m.content));
    const vetoed = tools.some((c) => /REJECTED: before finishing, write down every number/.test(c));
    const vetoes = tools.filter((c) => /^REJECTED/.test(c)).map((c) => c.slice(10, 50));
    console.log(`     vetoes=${vetoes.length}: ${JSON.stringify(vetoes)}`);
    console.log(`${vetoed && r.finishReason === "completed" ? "ok  " : "FAIL"} completion vetoed once then accepted: vetoed=${vetoed} finish=${r.finishReason} steps=${r.steps}`);
    if (!(vetoed && r.finishReason === "completed")) process.exitCode = 1;
    if (!vetoed) for (const m of r.conversation || []) if (m.role !== "system") console.log("  ", m.role, JSON.stringify(m.tool_calls ? m.tool_calls.map((t) => t.function) : m.content).slice(0, 220));
  }
  if (patch) {
    const reqs = (r.toolTimes || []).filter((t) => t.name === "__request");
    const okPatch = reqs.length > 0 && reqs.every((t) => Object.entries(patch).every(([k, v]) => JSON.stringify(t.body[k]) === JSON.stringify(v)));
    console.log(`${okPatch ? "ok  " : "FAIL"} request patch on the wire: ${reqs.length} requests, first body keys=${reqs[0] ? Object.keys(reqs[0].body).join(",") : "-"}`);
    if (!okPatch) process.exitCode = 1;
  }
} finally { await driver.close(); }
const ok = r && !r.error && r.finishReason === "completed" && r.steps >= 1;
console.log(`${ok ? "ok  " : "FAIL"} one streamed step completed: steps=${r?.steps} finish=${r?.finishReason} error=${String(r?.error ?? "").slice(0, 160)} usage=${JSON.stringify(r?.usage ?? null).slice(0, 120)}`);
process.exit(ok ? 0 : 1);
