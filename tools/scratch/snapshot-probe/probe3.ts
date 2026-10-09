import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
const HOST = `cb4.${st.subdomain}.workers.dev`;
const UA = "lopecode-cloud-brain-snapshot/1 (+https://github.com/tomlarkworthy/lopecode)";
const S: [string, string][] = [
  ["anthropic-news-rss", "https://www.anthropic.com/rss.xml"], ["anthropic-news-feed", "https://www.anthropic.com/news/rss.xml"], ["anthropic-research", "https://www.anthropic.com/research/rss.xml"],
  ["openai-news", "https://openai.com/news/rss.xml"], ["openai-blog", "https://openai.com/blog/rss.xml"],
  ["deepmind", "https://deepmind.google/blog/rss.xml"], ["google-research", "https://research.google/blog/rss/"],
  ["meta-ai", "https://ai.meta.com/blog/rss/"], ["meta-research", "https://research.facebook.com/feed/"], ["meta-eng", "https://engineering.fb.com/category/ai-research/feed/"],
  ["bair", "https://bair.berkeley.edu/blog/feed.xml"], ["msr", "https://www.microsoft.com/en-us/research/feed/"],
  ["simonw", "https://simonwillison.net/atom/everything/"], ["karpathy-bear", "https://karpathy.bearblog.dev/feed/"], ["karpathy-gh", "https://karpathy.github.io/feed.xml"],
  ["lilianweng", "https://lilianweng.github.io/index.xml"], ["raschka", "https://magazine.sebastianraschka.com/feed"], ["importai", "https://jack-clark.net/feed/"], ["importai-substack", "https://importai.substack.com/feed"],
  ["eugeneyan", "https://eugeneyan.com/rss/"], ["huyenchip", "https://huyenchip.com/feed.xml"], ["interconnects", "https://www.interconnects.ai/feed"], ["hamel", "https://hamel.dev/index.xml"],
  ["gwern", "https://gwern.net/feed"], ["gwern-substack", "https://gwern.substack.com/feed"], ["gwern-rss", "https://gwern.net/rss.xml"],
];
const out: any[] = [];
await Promise.all(S.map(async ([name, url]) => {
  const t = performance.now();
  const r = await fetch(`https://${HOST}/xrpc/com.lopecode.brain.proxy.fetch`, { method: "POST", headers: { authorization: "Bearer " + st.session, "content-type": "application/json" }, body: JSON.stringify({ url, headers: { "user-agent": UA } }) });
  const text = await r.text();
  writeFileSync(resolve(import.meta.dir, name + ".body"), text);
  const parts = text.split(/<(?:item|entry)[\s>]/);
  const d = /<(?:pubDate|published|updated)>([^<]+)</.exec(parts[1] || "");
  out.push({ name, status: r.status, type: (r.headers.get("content-type") || "").slice(0, 30), bytes: text.length, ms: Math.round(performance.now() - t), items: parts.length - 1, newest: d ? d[1].slice(0, 25) : null });
}));
out.sort((a, b) => S.findIndex((s) => s[0] === a.name) - S.findIndex((s) => s[0] === b.name));
for (const o of out) console.log(JSON.stringify(o));
writeFileSync(resolve(import.meta.dir, "results-blogs.json"), JSON.stringify({ at: new Date().toISOString(), out }, null, 1));
