// Which public sources answer a Worker on Cloudflare's network, through proxy.fetch on cb4. Prints no secret.
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
const HOST = `cb4.${st.subdomain}.workers.dev`;
const UA = "lopecode-cloud-brain-snapshot/1 (+https://github.com/tomlarkworthy/lopecode)";
const S: [string, string][] = [
  ["hn-algolia-front", "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=50"],
  ["hn-firebase-top", "https://hacker-news.firebaseio.com/v0/topstories.json"],
  ["arxiv-api", "https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL&sortBy=submittedDate&sortOrder=descending&max_results=100"],
  ["arxiv-rss-cs.AI", "https://rss.arxiv.org/rss/cs.AI"],
  ["reddit-ml-json", "https://www.reddit.com/r/MachineLearning/top.json?t=day&limit=50"],
  ["reddit-ml-rss", "https://www.reddit.com/r/MachineLearning/top/.rss?t=day&limit=50"],
  ["reddit-localllama-json", "https://www.reddit.com/r/LocalLLaMA/top.json?t=day&limit=50"],
  ["reddit-old-ml-json", "https://old.reddit.com/r/MachineLearning/top.json?t=day&limit=50"],
  ["hf-daily-papers", "https://huggingface.co/api/daily_papers?limit=50"],
  ["lobsters-hottest", "https://lobste.rs/hottest.json"],
  ["lobsters-ai-tag", "https://lobste.rs/t/ai.json"],
  ["hf-trending-models", "https://huggingface.co/api/trending?type=model&limit=30"],
  ["github-trending-search", "https://api.github.com/search/repositories?q=topic:llm+pushed:%3E2026-10-01&sort=stars&order=desc&per_page=30"],
];
const out: any[] = [];
for (const [name, url] of S) {
  const t = performance.now();
  const r = await fetch(`https://${HOST}/xrpc/com.lopecode.brain.proxy.fetch`, { method: "POST", headers: { authorization: "Bearer " + st.session, "content-type": "application/json" }, body: JSON.stringify({ url, headers: { "user-agent": UA, accept: "application/json, application/atom+xml, application/rss+xml, */*" } }) });
  const text = await r.text();
  const row = { name, outer: r.status, upstream: r.headers.get("x-proxy-status") || null, type: r.headers.get("content-type"), bytes: text.length, ms: Math.round(performance.now() - t), head: text.slice(0, 110).replace(/\s+/g, " ") };
  out.push(row); console.log(JSON.stringify(row));
  writeFileSync(resolve(import.meta.dir, name + ".body"), text);
}
writeFileSync(resolve(import.meta.dir, "results.json"), JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
