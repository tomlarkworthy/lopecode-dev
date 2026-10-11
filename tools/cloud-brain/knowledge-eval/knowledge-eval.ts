#!/usr/bin/env bun
// Ranks the question sets of queries.json with several pipelines and scores each (knowledge-reranking.md).
// Nothing here changes the Brain. It reads: a dump of the entries (knowledge.list), the live search by meaning,
// and @cf/baai/bge-reranker-base through ai.run. Every answer is cached in .emitted/rerank/, so a second run is free.
//
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-eval/knowledge-eval.ts dump --as TOKEN     # the entries, once
//   BRAIN_BASE=cb4 bun tools/cloud-brain/knowledge-eval/knowledge-eval.ts run --as TOKEN [--sets real,builder,synthetic] [--arms "live;dense"] [--show]
//
// --arms is split on ";" (an arm's name may have a comma). The run ends with the pooled table: every question together
// against "as asked", with a paired bootstrap.
//
// The arms named dense, as asked, rrf, cc and ce are built on the search by meaning AS IT WAS until 2026-10-11 07:15 UTC,
// whose answers are in the cache of the machine that ran them. The service now answers the fused order at that address,
// so those arms cannot be made again: with no cached answer they throw. ranks-2026-10-11.json beside this file has the
// rank each arm gave each question. "base 1500" is the nearest arm that can be made again (the same model, cosines
// worked out here), and "live" is the service as it is.
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const dir = join(here, "..", ".emitted", "rerank");
mkdirSync(dir, { recursive: true });
const arg = (k: string, d = "") => { const i = process.argv.indexOf("--" + k); return i < 0 ? d : process.argv[i + 1] ?? "true"; };
const flag = (k: string) => process.argv.includes("--" + k);
const as = arg("as");
const RERANKER = "@cf/baai/bge-reranker-base";

// One call through brain.ts, with a token: [status, body]. The token's value is never read here.
// A call that answers nothing (a reset connection) is tried again: three were seen in 900 calls.
const brain = (path: string, body?: unknown): [number, any] => { for (let n = 0; ; n++) { const r = brainOnce(path, body); if (r[0] || n >= 3) return r; } };
const brainOnce = (path: string, body?: unknown): [number, any] => {
  const tmp = join(dir, "body.json");
  if (body !== undefined) writeFileSync(tmp, JSON.stringify(body));
  const r = Bun.spawnSync(["bun", join(here, "..", "brain.ts"), "curl", path, "--as", as, ...(body !== undefined ? ["-X", "POST", "-H", "content-type: application/json", "-d", "@" + tmp] : [])], { env: process.env });
  const out = r.stdout.toString(), m = /\s*\[(\d+)\]\s*$/.exec(out);
  let j: any = null;
  try { j = JSON.parse(m ? out.slice(0, m.index) : out); } catch {}
  return [m ? Number(m[1]) : 0, j];
};
const X = "/xrpc/com.lopecode.brain.";
const cacheFile = join(dir, "cache.json");
const cache: Record<string, any> = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
const cached = (key: string, make: () => any) => {
  if (!(key in cache)) { cache[key] = make(); writeFileSync(cacheFile, JSON.stringify(cache)); }
  return cache[key];
};

if (process.argv[2] === "dump") {
  const all = new Map<string, any>();
  for (let cursor = "", n = 0; n < 50; n++) {
    const [s, j] = brain(X + "knowledge.list?limit=100" + (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""));
    if (s !== 200) throw new Error("knowledge.list answered " + s);
    for (const e of j.entries) all.set(e.id, e);
    if (!j.cursor) break;
    cursor = j.cursor;
  }
  writeFileSync(join(dir, "entries.json"), JSON.stringify([...all.values()]));
  console.log(all.size + " entries");
  process.exit(0);
}

const entries: any[] = JSON.parse(readFileSync(join(dir, "entries.json"), "utf8"));
const byId = new Map(entries.map((e) => [e.id, e]));

// The service's own full-text table, made here from the dump: same tokenizer, same weights (knowledgeSql.search).
// `name`: the entry's id, the service's fourth column since 2026-10-11. The figures of 2026-10-11 before the deploy were
// made with the last part of the id and the file name of the url.
const db = new Database(":memory:");
db.run("CREATE VIRTUAL TABLE f USING fts5(title, text, tags, name, tokenize = 'porter unicode61')");
const nameOf = (e: any) => [e.id.split(":").pop(), (e.url || "").split("/").pop()?.replace(/\.(md|html)$/, "")].filter(Boolean).join(" ");
entries.forEach((e, i) => db.run("INSERT INTO f (rowid, title, text, tags, name) VALUES (?,?,?,?,?)", [i + 1, e.title, e.text || "", (e.tags || []).join(" "), nameOf(e)]));
const STOP = new Set("a an and are as at be by do does for from how i in is it its my of on or that the this to what when where which who why with can me we you".split(" "));
const words = (q: string) => q.split(/\s+/).map((w) => w.replace(/["*]/g, "")).filter(Boolean).slice(0, 20);
// Without any: every word needed, knowledgeMatch as it was until 2026-10-11. any: any word, stop words left out, as it
// is now. name: whether the fourth column is searched.
const lexical = (q: string, kind: string | undefined, o: { any?: boolean; name?: boolean; limit?: number } = {}): string[] => lexicalScored(q, kind, o).map((x) => x[0]);
const lexicalScored = (q: string, kind: string | undefined, { any = false, name = false, limit = 100 }: { any?: boolean; name?: boolean; limit?: number } = {}): [string, number][] => {
  let ws = words(q);
  if (any) ws = ((kept) => (kept.length ? kept : ws))(ws.filter((w) => !STOP.has(w.toLowerCase())));
  if (!ws.length) return [];
  const match = (name ? "" : "{title text tags} : ") + "(" + ws.map((w) => `"${w}"`).join(any ? " OR " : " ") + ")";
  const rows = db.query("SELECT rowid, -bm25(f, 4.0, 1.0, 2.0, 4.0) AS s FROM f WHERE f MATCH ? ORDER BY s DESC LIMIT 5000").all(match) as any[];
  return rows.map((r) => [entries[r.rowid - 1], r.s] as [any, number]).filter(([e]) => !kind || e.kind === kind).slice(0, limit).map(([e, s]) => [e.id, s]);
};
// The live search by meaning, 100 deep: [[id, score]].
const dense = (q: string, kind?: string): [string, number][] =>
  cached("dense|" + (kind || "") + "|" + q, () => {
    throw new Error("no cached answer of the search by meaning as it was before 2026-10-11 for: " + q + " (see the header)");
    const [s, j] = brain(X + "knowledge.search?semantic=true&limit=100&q=" + encodeURIComponent(q) + (kind ? "&kind=" + kind : ""));
    if (s !== 200) throw new Error("knowledge.search answered " + s + " for " + q);
    return j.entries.map((e: any) => [e.id, e.score]);
  });
// Reciprocal rank fusion (Cormack, Clarke, Buettcher 2009): score = sum over lists of 1 / (k + rank).
const rrf = (lists: string[][], k = 60): string[] => {
  const s = new Map<string, number>();
  for (const l of lists) l.forEach((id, i) => s.set(id, (s.get(id) || 0) + 1 / (k + i + 1)));
  return [...s.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
};
// A convex combination of the two scores, each brought to 0..1 over its own list (Bruch, Gai, Ingber 2023): an entry
// one list lacks counts 0 there. a is the weight of the search by meaning.
const cc = (d: [string, number][], l: [string, number][], a: number): string[] => {
  const norm = (xs: [string, number][]) => { const v = xs.map((x) => x[1]), lo = Math.min(...v), hi = Math.max(...v); return new Map(xs.map(([id, s]) => [id, hi > lo ? (s - lo) / (hi - lo) : 1])); };
  const D = norm(d), L = norm(l), ids = new Set([...D.keys(), ...L.keys()]);
  return [...ids].map((id) => [id, a * (D.get(id) || 0) + (1 - a) * (L.get(id) || 0)] as [string, number]).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
};
// What of an entry the cross-encoder reads. head: the title and the start of the text. window: the title and the
// stretch of the text that has most of the question's words (the model reads 512 tokens, a doc is up to 16000 characters).
const CHARS = 1200;
const passage = (e: any, q: string, how: "head" | "window"): string => {
  const text = e.text || "";
  if (how === "head" || text.length <= CHARS) return (e.title + "\n" + text).slice(0, CHARS + e.title.length + 1);
  const qs = new Set(words(q).map((w) => w.toLowerCase()).filter((w) => !STOP.has(w)));
  let best = 0, bestN = -1;
  for (let at = 0; at < text.length; at += CHARS / 2) {
    const seen = new Set((text.slice(at, at + CHARS).toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => qs.has(w)));
    if (seen.size > bestN) (bestN = seen.size), (best = at);
  }
  return e.title + "\n" + text.slice(best, best + CHARS);
};
// The cross-encoder's score for each id, one call for the lot. { id: score }.
const scores = (q: string, ids: string[], how: "head" | "window"): Record<string, number> => {
  const got: Record<string, number> = {}, need: string[] = [];
  for (const id of ids) { const k = "rr|" + how + "|" + q + "|" + id; if (k in cache) got[id] = cache[k]; else need.push(id); }
  if (need.length) {
    const contexts = need.map((id) => ({ text: passage(byId.get(id), q, how) }));
    const bytes = JSON.stringify({ query: q, contexts }).length;
    const t0 = Date.now();
    const [s, j] = brain(X + "ai.run?model=" + RERANKER + "&usd=" + Math.max(0.000002, (bytes / 3) * 0.00311e-6 * 1.5).toFixed(6), { query: q, contexts, top_k: need.length });
    if (s !== 200 || !j?.result?.response) throw new Error("ai.run answered " + s + " " + JSON.stringify(j).slice(0, 200));
    (cache.calls ||= []).push({ n: need.length, bytes, ms: Date.now() - t0, tokens: j.result.usage?.prompt_tokens });
    for (const r of j.result.response) { got[need[r.id]] = r.score; cache["rr|" + how + "|" + q + "|" + need[r.id]] = r.score; }
    writeFileSync(cacheFile, JSON.stringify(cache));
  }
  return got;
};
const rerank = (q: string, pool: string[], n: number, how: "head" | "window"): string[] => {
  const top = pool.slice(0, n), s = scores(q, top, how);
  return [...top.sort((a, b) => (s[b] ?? -1) - (s[a] ?? -1)), ...pool.slice(n)];
};

// Another embedding model, tried here without a second index: every entry and every question embedded through ai.run,
// the vectors kept in a file, the cosine worked out on this machine. chars: how much of title and text is embedded.
const MODELS: Record<string, { model: string; usd: number; ask: string }> = {
  qwen3: { model: "@cf/qwen/qwen3-embedding-0.6b", usd: 0.0118e-6, ask: "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery:" },
  m3: { model: "@cf/baai/bge-m3", usd: 0.0118e-6, ask: "" },
  base: { model: "@cf/baai/bge-base-en-v1.5", usd: 0.0666e-6, ask: "Represent this sentence for searching relevant passages: " }
};
const vecs: Record<string, Record<string, number[]>> = {};
const vecFile = (m: string) => join(dir, "vec-" + m + ".json");
const embedAll = (m: string, texts: string[]): number[][] => {
  const M = MODELS[m], store = (vecs[m] ||= existsSync(vecFile(m)) ? JSON.parse(readFileSync(vecFile(m), "utf8")) : {});
  const key = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex").slice(0, 24);
  const need = [...new Set(texts.filter((s) => !(key(s) in store)))];
  for (let i = 0; i < need.length; ) {
    let batch: string[] = [], bytes = 0;
    while (i < need.length && batch.length < 32 && (bytes + need[i].length < 40000 || !batch.length)) (bytes += need[i].length), batch.push(need[i++]);
    const [s, j] = brain(X + "ai.run?model=" + M.model + "&usd=" + Math.max(0.000002, (JSON.stringify(batch).length / 2.5) * M.usd * 1.5).toFixed(6), { text: batch });
    if (s !== 200 || j?.result?.data?.length !== batch.length) throw new Error(M.model + " answered " + s + " " + JSON.stringify(j).slice(0, 200));
    batch.forEach((b, n) => (store[key(b)] = j.result.data[n].map((x: number) => Math.round(x * 1e5) / 1e5)));
    writeFileSync(vecFile(m), JSON.stringify(store));
  }
  return texts.map((s) => store[key(s)]);
};
const cos = (a: number[], b: number[]) => { let d = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) (d += a[i] * b[i]), (x += a[i] * a[i]), (y += b[i] * b[i]); return d / Math.sqrt(x * y); };
const corpus: Record<string, number[][]> = {};
const denseBy = (m: string, chars: number, q: string, kind?: string): [string, number][] => {
  const E = (corpus[m + chars] ||= embedAll(m, entries.map((e) => (e.title + "\n\n" + (e.text || "")).slice(0, chars))));
  const v = embedAll(m, [MODELS[m].ask + q])[0];
  return entries.map((e, i) => [e.id, cos(v, E[i])] as [string, number]).filter(([id]) => !kind || byId.get(id).kind === kind).sort((a, b) => b[1] - a[1]).slice(0, 100);
};
type Q = { q: string; kind?: string; mode?: string; want: string[]; set?: string };
const arms: Record<string, (x: Q) => string[]> = {
  // What the caller got: the words search for a question asked by words, else the search by meaning.
  "as asked": (x) => (x.mode === "words" ? lexical(x.q, x.kind) : dense(x.q, x.kind).map((d) => d[0])),
  "dense": (x) => dense(x.q, x.kind).map((d) => d[0]),
  // What the service answers now (since 2026-10-11 07:15 UTC: the two lists as one order), asked 100 deep.
  "live": (x) => cached("live2|" + (x.kind || "") + "|" + x.q, () => { const [s, j] = brain(X + "knowledge.search?semantic=true&limit=100&q=" + encodeURIComponent(x.q) + (x.kind ? "&kind=" + x.kind : "")); if (s !== 200) throw new Error("knowledge.search answered " + s); return j.entries.map((e: any) => e.id); }),
  "live, as asked": (x) => cached("liveas|" + (x.mode || "") + (x.kind || "") + "|" + x.q, () => { const [s, j] = brain(X + "knowledge.search?limit=100&q=" + encodeURIComponent(x.q) + (x.kind ? "&kind=" + x.kind : "") + (x.mode === "words" ? "" : "&semantic=true")); if (s !== 200) throw new Error("knowledge.search answered " + s); return j.entries.map((e: any) => e.id); }),
  "words, all (as it was)": (x) => lexical(x.q, x.kind),
  "words, any": (x) => lexical(x.q, x.kind, { any: true }),
  "words, any +name": (x) => lexical(x.q, x.kind, { any: true, name: true }),
  "rrf dense + any": (x) => rrf([dense(x.q, x.kind).map((d) => d[0]), lexical(x.q, x.kind, { any: true })]),
  "rrf dense + any +name": (x) => rrf([dense(x.q, x.kind).map((d) => d[0]), lexical(x.q, x.kind, { any: true, name: true })]),
  ...Object.fromEntries([10, 20].map((k) => ["rrf k=" + k + " +name", (x: Q) => rrf([dense(x.q, x.kind).map((d) => d[0]), lexical(x.q, x.kind, { any: true, name: true })], k)])),
  ...Object.fromEntries([0.3, 0.5, 0.6, 0.7, 0.8].map((a) => ["cc a=" + a + " +name", (x: Q) => cc(dense(x.q, x.kind), lexicalScored(x.q, x.kind, { any: true, name: true }), a)])),
  "cc a=0.7": (x) => cc(dense(x.q, x.kind), lexicalScored(x.q, x.kind, { any: true }), 0.7),
  ...Object.fromEntries([["base", 1500], ["qwen3", 1500], ["qwen3", 16000], ["m3", 1500], ["m3", 16000]].flatMap(([m, c]: any) => [
    [m + " " + c, (x: Q) => denseBy(m, c, x.q, x.kind).map((d) => d[0])],
    [m + " " + c + " cc0.5 +name", (x: Q) => cc(denseBy(m, c, x.q, x.kind), lexicalScored(x.q, x.kind, { any: true, name: true }), 0.5)],
    [m + " " + c + " rrf +name", (x: Q) => rrf([denseBy(m, c, x.q, x.kind).map((d) => d[0]), lexical(x.q, x.kind, { any: true, name: true })])]
  ])),
  "dense > ce30 head": (x) => rerank(x.q, dense(x.q, x.kind).map((d) => d[0]), 30, "head"),
  "rrf+name > ce30 head": (x) => rerank(x.q, arms["rrf dense + any +name"](x), 30, "head"),
  "rrf+name > ce30 window": (x) => rerank(x.q, arms["rrf dense + any +name"](x), 30, "window"),
  "rrf+name > ce50 window": (x) => rerank(x.q, arms["rrf dense + any +name"](x), 50, "window"),
  // The cross-encoder's order and the fused order, fused again: a wrong cross-encoder score cannot bury a top answer.
  "rrf+name > ce30 window, fused": (x) => ((pool) => rrf([rerank(x.q, pool, 30, "window").slice(0, 30), pool.slice(0, 30)], 10).concat(pool.slice(30)))(arms["rrf dense + any +name"](x))
};

if (process.argv[2] === "run") {
  const file = JSON.parse(readFileSync(join(here, "queries.json"), "utf8"));
  const want = arg("sets", "real,builder,synthetic").split(",");
  const only = arg("arms") ? arg("arms").split(";") : Object.keys(arms);
  const sets: Record<string, Q[]> = {};
  for (const s of want) sets[s] = (file[s] || []).filter((x: Q) => x.want.length);
  for (const [s, qs] of Object.entries(sets)) for (const x of qs) for (const w of x.want) if (!byId.has(w)) throw new Error(s + ": no entry " + w);
  const rankOf = (ids: string[], x: Q) => { const i = ids.findIndex((id) => x.want.includes(id)); return i < 0 ? Infinity : i + 1; };
  const out: any = {};
  for (const name of only) {
    out[name] = {};
    for (const [s, qs] of Object.entries(sets)) {
      const ranks = qs.map((x) => rankOf(arms[name](x), x));
      const share = (f: (r: number) => boolean) => ranks.filter(f).length / ranks.length;
      out[name][s] = { n: ranks.length, mrr: ranks.reduce((a, r) => a + (r <= 10 ? 1 / r : 0), 0) / ranks.length, hit1: share((r) => r === 1), hit3: share((r) => r <= 3), hit10: share((r) => r <= 10), ranks };
    }
  }
  const pad = (s: string, n: number) => s.padEnd(n);
  console.log(pad("arm", 32) + Object.entries(sets).map(([s, qs]) => pad(`${s} (${qs.length}): MRR  @1   @3   @10`, 34)).join(""));
  for (const name of only) console.log(pad(name, 32) + Object.keys(sets).map((s) => ((m) => pad(`${"".padEnd(s.length + 7)}${m.mrr.toFixed(3)} ${m.hit1.toFixed(2)} ${m.hit3.toFixed(2)} ${m.hit10.toFixed(2)}`, 34))(out[name][s])).join(""));
  if (flag("show")) for (const [s, qs] of Object.entries(sets)) qs.forEach((x, i) => console.log(s.padEnd(10) + only.map((n) => String(out[n][s].ranks[i] === Infinity ? "-" : out[n][s].ranks[i]).padStart(4)).join("") + "  " + (x.kind ? "[" + x.kind + "] " : "") + x.q));
  writeFileSync(join(dir, "results.json"), JSON.stringify({ at: new Date().toISOString(), entries: entries.length, out }, null, 1));
  // Every question together against "as asked": the change in MRR with a paired bootstrap (4000 resamples, a fixed
  // seed), and how many questions moved up or down within the first ten.
  if (out["as asked"]) {
    const rr = (r: number | null) => (r == null || r > 10 ? 0 : 1 / r);
    const flat = (a: string) => Object.keys(sets).flatMap((s) => out[a][s].ranks.map(rr));
    const base = flat("as asked");
    let seed = 7;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    console.log("\npooled (" + base.length + ")".padEnd(22) + "MRR    change  95% interval      better/worse  in first ten");
    const rows = only.map((a) => {
      const x = flat(a), n = x.length, d = x.map((v, i) => v - base[i]), mean = d.reduce((p, c) => p + c, 0) / n, bs: number[] = [];
      for (let b = 0; b < 4000; b++) { let s = 0; for (let i = 0; i < n; i++) s += d[Math.floor(rnd() * n)]; bs.push(s / n); }
      bs.sort((p, q) => p - q);
      return [a, x.reduce((p, c) => p + c, 0) / n, mean, bs[100], bs[3899], d.filter((v) => v > 0).length, d.filter((v) => v < 0).length, x.filter((v) => v > 0).length] as any[];
    });
    for (const r of rows.sort((p, q) => q[1] - p[1])) console.log(pad(r[0], 32) + r[1].toFixed(3) + "  " + (r[2] >= 0 ? "+" : "") + r[2].toFixed(3) + "  [" + r[3].toFixed(3) + ", " + r[4].toFixed(3) + "]   " + (r[5] + "/" + r[6]).padEnd(13) + r[7]);
  }
  const calls = cache.calls || [];
  if (calls.length) console.log(`cross-encoder calls so far: ${calls.length}, median ${calls.map((c: any) => c.ms).sort((a: number, b: number) => a - b)[calls.length >> 1]} ms (through brain.ts), tokens ${calls.reduce((a: number, c: any) => a + (c.tokens || 0), 0)}`);
}
