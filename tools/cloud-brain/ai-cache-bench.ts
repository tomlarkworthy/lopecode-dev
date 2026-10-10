/**
 * Prompt-cache timing of one model, through a Brain. The record is ai-cache.md.
 *   BRAIN_BASE=cb4 bun tools/cloud-brain/ai-cache-bench.ts <target> <prefixTokens> [--quick]
 * target: cf:@cf/zai-org/glm-5.3-flash   the Brain's ai.v1/chat/completions (Workers AI)
 *         or:xiaomi/mimo-v2.5-pro        OpenRouter's own address, with the key the robocoop-5 eval tools read from a
 *                                        git-ignored .env (cb4 holds no OpenRouter key); or:slug@Provider pins one
 * One run: a prefix no call before it has sent, then 6 calls 2 s apart, then one after 1, 5 and 15 minutes idle.
 * A cf: call sends x-session-affinity, the run's name, unless AFFINITY=0. USD is the usd of a cf: call (0.02).
 * Each call ends in a new question. Lines of JSON go to .emitted/ai-cache/. Nothing secret is written.
 */
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
const BASE = process.env.BRAIN_BASE || "cb4";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, ".emitted", BASE + ".json"), "utf8"));
const host = `https://${BASE}.${st.subdomain}.workers.dev`;
const [target, size = "8000"] = process.argv.slice(2), quick = process.argv.includes("--quick");
const [kind, rest] = [target.slice(0, 2), target.slice(3)];
const [model, provider] = kind === "or" ? rest.split(/@(?=[A-Z])/) : [rest];
const orKey = () => {
  if (process.env.OPENROUTER_API_KEY) return process.env.OPENROUTER_API_KEY;
  for (const f of ["../robocoop-5/.env", "../robocoop-4/.env", "../../.env"]) {
    try {
      const m = /^OPENROUTER_API_KEY=(.*)$/m.exec(readFileSync(resolve(import.meta.dir, f), "utf8"));
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    } catch {}
  }
  throw new Error("OPENROUTER_API_KEY not found");
};
const run = Date.now().toString(36);
const words = "river stone ledger window copper morning signal harbour paper engine valley market thread winter garden station letter bridge candle forest number silver meadow lantern harvest compass orchard village mirror kettle anchor pocket ribbon saddle timber velvet walnut yellow basket cellar dinner feather hammer island jacket kitchen ladder marble needle oyster pepper quarry rocket salmon tunnel".split(" ");
let seed = [...run].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const next = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32;
// About 1.25 tokens a word of this list, and a full stop each 12 words.
const prefix = `Run ${run}. Notes, of no meaning, to be kept in mind.\n` + Array.from({ length: Math.round(Number(size) / 1.25) }, (_, i) => words[Math.floor(next() * words.length)] + (i % 12 === 11 ? "." : "")).join(" ");
const out = resolve(import.meta.dir, ".emitted", "ai-cache");
mkdirSync(out, { recursive: true });
const file = resolve(out, `${target.replace(/[^A-Za-z0-9.-]+/g, "_")}${process.env.AFFINITY === "0" ? "-noaffinity" : ""}-${size}-${run}.jsonl`);

const call = async (n: number, idle: number) => {
  const body: any = {
    model,
    messages: [{ role: "system", content: prefix }, { role: "user", content: `Question ${n} of run ${run}: answer with the one word OK.` }],
    stream: true, max_tokens: 16, temperature: 0
  };
  let url = `${host}/xrpc/com.lopecode.brain.ai.v1/chat/completions?usd=${process.env.USD || "0.02"}`, bearer = st.session;
  if (kind === "cf") body.stream_options = { include_usage: true };
  else {
    Object.assign(body, { usage: { include: true }, reasoning: { enabled: false }, ...(provider ? { provider: { only: [provider], allow_fallbacks: false } } : {}) });
    url = "https://openrouter.ai/api/v1/chat/completions";
    bearer = orKey();
  }
  const t = performance.now(), at = new Date().toISOString();
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + bearer, ...(kind === "cf" && process.env.AFFINITY !== "0" ? { "x-session-affinity": run } : {}) }, body: JSON.stringify(body) });
  const headers = performance.now() - t;
  let first: number | null = null, text = "", buffer = "", usage: any = null, served: any = null, raw = "";
  const reader = r.body!.getReader(), dec = new TextDecoder();
  for (let c = await reader.read(); !c.done; c = await reader.read()) {
    buffer += dec.decode(c.value, { stream: true });
    if (raw.length < 600) raw += buffer.slice(0, 600);
    for (let i = buffer.indexOf("\n"); i >= 0; i = buffer.indexOf("\n")) {
      const line = buffer.slice(0, i).trim();
      buffer = buffer.slice(i + 1);
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      let j: any;
      try { j = JSON.parse(line.slice(6)); } catch { continue; }
      const d = j.choices && j.choices[0] && j.choices[0].delta;
      const piece = d && (d.content || d.reasoning || d.reasoning_content);
      if (piece && first === null) first = performance.now() - t;
      if (d && d.content) text += d.content;
      if (j.usage) usage = j.usage;
      if (j.provider) served = j.provider;
    }
  }
  const total = performance.now() - t, u = usage || {};
  const row = {
    target, size: Number(size), run, n, idle, at, status: r.status, headersMs: Math.round(headers), firstMs: first === null ? null : Math.round(first), totalMs: Math.round(total),
    prompt: u.prompt_tokens ?? null, cached: (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) ?? null, completion: u.completion_tokens ?? null,
    reasoning: (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) ?? null,
    cost: u.cost ?? null, neurons: u.neurons ?? null, provider: served, charged: r.headers.get("x-brain-price"), text: text.slice(0, 40),
    ...(r.status !== 200 || !usage ? { raw: raw.slice(0, 500) } : {})
  };
  appendFileSync(file, JSON.stringify(row) + "\n");
  console.log(JSON.stringify(row));
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let n = 0;
for (let i = 0; i < (quick ? 2 : 6); i++) {
  await call(++n, i ? 2 : 0);
  await sleep(2000);
}
for (const idle of quick ? [] : [60, 300, 900]) {
  await sleep(idle * 1000);
  await call(++n, idle);
}
