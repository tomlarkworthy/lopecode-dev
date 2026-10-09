#!/usr/bin/env bun
// Keep a digest's picked sources in the Brain's files: corpus/<day>/<source>/<id>.pdf|.html
//   BRAIN_BASE=cb4 bun tools/cloud-brain/digests/keep.ts 2026-10-09
// A paper is kept as arXiv's PDF, anything else as the page's HTML. Files are private, tagged
// corpus and src-<source>. HTML is stored as text/plain: an owner's file under /static runs on the
// Brain's address as whoever is signed in, and these pages are other people's.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const day = process.argv[2];
if (!/^\d{4}-\d\d-\d\d$/.test(day || "")) { console.error("usage: keep.ts <YYYY-MM-DD>"); process.exit(1); }
const here = import.meta.dir, root = resolve(here, "../../..");
const seed = readFileSync(join(here, `${day}.ojs`), "utf8");
const m = seed.match(/\npicks = (\[[\s\S]*?\n\])\n/);
if (!m) throw new Error("no picks cell");
const picks: any[] = new Function("return " + m[1])();
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36";
const tmp = mkdtempSync(join(tmpdir(), "keep-"));
const safe = (s: string) => s.replace(/[^A-Za-z0-9@._-]/g, "-").slice(0, 80);
const put = (path: string, file: string, type: string, tags: string) => {
  const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", `/xrpc/com.lopecode.brain.static.put?path=${path}&type=${encodeURIComponent(type)}&tags=${tags}`,
    "--owner", "-X", "POST", "-H", `content-type: ${type}`, "--data-binary", "@" + file], { encoding: "utf8", env: process.env });
  const line = (r.stdout || "").trim().split("\n").pop() || "";
  return / \[200\]$/.test(line) ? JSON.parse(line.replace(/ \[200\]$/, "")) : { error: line.slice(0, 160) };
};
const call = (path: string) => {
  const r = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", path, "--owner"], { encoding: "utf8", env: process.env });
  return JSON.parse(((r.stdout || "").trim().split("\n").pop() || "{}").replace(/ \[\d+\]$/, ""));
};
// A second run fetches only what is not kept yet.
const have = new Map<string, any>((call(`/xrpc/com.lopecode.brain.static.list?prefix=corpus/${day}/`).files || []).map((f: any) => [f.path.replace(/\.[a-z]+$/, ""), f]));
const index: any[] = [];
for (const p of picks) {
  const arxiv = /^\d{4}\.\d{4,5}$/.test(p.id) ? p.id : (String(p.url).match(/arxiv\.org\/abs\/(\d{4}\.\d{4,5})/) || [])[1];
  // A Reddit thread page answers a script challenge (www, 8.4 KB) or "Welcome to Reddit" (old), 2026-10-09.
  // The thread's own feed, <url>.rss, holds the post and its comments.
  const reddit = /^https:\/\/www\.reddit\.com\/r\/[^/]+\/comments\//.test(String(p.url));
  const from = arxiv ? `https://arxiv.org/pdf/${arxiv}` : reddit ? String(p.url).replace(/\/?$/, "/.rss") : p.url;
  const row: any = { id: p.id, title: p.title, source: p.source, url: p.url, from };
  const stem = `corpus/${day}/${safe(p.source)}/${safe(arxiv || p.id)}`, kept = have.get(stem);
  if (kept) { index.push({ ...row, path: kept.path, size: kept.size, sha256: kept.sha256 }); continue; }
  try {
    const res = await fetch(from, { headers: { "user-agent": UA }, redirect: "follow" });
    const bytes = new Uint8Array(await res.arrayBuffer());
    const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    if (!res.ok || (arxiv && !pdf)) throw new Error(`${res.status}${arxiv && !pdf ? ", not a PDF" : ""}`);
    const path = `${stem}.${pdf ? "pdf" : reddit ? "xml" : "html"}`;
    const file = join(tmp, "f"); writeFileSync(file, bytes);
    const out = put(path, file, pdf ? "application/pdf" : "text/plain; charset=utf-8", `corpus,src-${safe(p.source).toLowerCase()}`);
    Object.assign(row, out.error ? { error: out.error } : { path, size: out.size, sha256: out.sha256 });
  } catch (e) { row.error = String((e as Error).message || e); }
  index.push(row);
  console.log(row.error ? `FAIL ${p.id} ${row.error}` : `kept ${row.path} ${row.size}`);
  await new Promise((r) => setTimeout(r, arxiv ? 3000 : reddit ? 8000 : 500));
}
const file = join(tmp, "index.json");
writeFileSync(file, JSON.stringify({ day, keptAt: new Date().toISOString(), items: index }, null, 1));
console.log(JSON.stringify(put(`corpus/${day}/index.json`, file, "application/json", "corpus")).slice(0, 200));
console.log(`${index.filter((r) => !r.error).length} of ${index.length} kept, ${index.reduce((a, r) => a + (r.size || 0), 0)} bytes`);

// Each pick as an entry of the knowledge base: the source, with its kept copy, and the finding (why it was picked),
// which cites the source. The text of a source is the summary the day's snapshot holds for it, when it holds one.
const summaries = new Map<string, string>();
for (const src of new Set(picks.map((p) => p.source))) {
  const r = await fetch(`https://${process.env.BRAIN_BASE}.endpointservices.workers.dev/static/snapshot/${day}/${src}.json`).catch(() => null);
  for (const it of (r && r.ok ? ((await r.json()) as any).items : []) || []) if (it.summary) summaries.set(String(it.id), it.summary);
}
const method = `digest:research-${day}`, entries: any[] = [];
for (const r of index) {
  const p = picks.find((x) => x.id === r.id), arxiv = /^\d{4}\.\d{4,5}$/.test(r.id);
  const id = arxiv ? "arxiv:" + r.id : (safe(r.source) + ":" + safe(r.id)).toLowerCase().slice(0, 100);
  const source = safe(r.source).toLowerCase();
  entries.push({ id, kind: arxiv ? "paper" : ["reddit", "hn", "lobsters-ai"].includes(r.source) ? "post" : "article", title: r.title, text: (summaries.get(String(r.id)) || "").slice(0, 16000), url: r.url, source: arxiv ? "arxiv" : source, method, tags: ["digest", `theme-${p.theme}`], ...(r.path ? { file: r.path, sha256: r.sha256 } : {}) });
  if (p.why) entries.push({ id: `finding:${day}:${id}`.slice(0, 100), kind: "finding", title: r.title, text: p.why, url: `https://${process.env.BRAIN_BASE}.endpointservices.workers.dev/library/research-${day}`, source: "digest", method, cites: [id], tags: ["digest", `theme-${p.theme}`] });
}
const body = join(tmp, "entries.json");
writeFileSync(body, JSON.stringify({ entries }));
const kb = spawnSync("bun", [join(root, "tools/cloud-brain/brain.ts"), "curl", "/xrpc/com.lopecode.brain.knowledge.put", "--owner", "-X", "POST", "-H", "content-type: application/json", "--data-binary", "@" + body], { encoding: "utf8", env: process.env });
console.log("knowledge.put", entries.length, (kb.stdout || "").trim().split("\n").pop()!.replace(/"ids":\[[^\]]*\]/, '"ids":[…]').slice(0, 200));
