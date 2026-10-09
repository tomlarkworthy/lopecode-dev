import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
const HOST = `cb4.${st.subdomain}.workers.dev`;
const UA = "lopecode-cloud-brain-snapshot/1 (+https://github.com/tomlarkworthy/lopecode)";
for (const [name, url] of [["arxiv-rss-combined", "https://rss.arxiv.org/rss/cs.AI+cs.LG+cs.CL"], ["reddit-localllama-rss", "https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day&limit=50"], ["hf-trending-20", "https://huggingface.co/api/trending?type=model&limit=20"]]) {
  const t = performance.now();
  const r = await fetch(`https://${HOST}/xrpc/com.lopecode.brain.proxy.fetch`, { method: "POST", headers: { authorization: "Bearer " + st.session, "content-type": "application/json" }, body: JSON.stringify({ url, headers: { "user-agent": UA } }) });
  const text = await r.text();
  writeFileSync(resolve(import.meta.dir, name + ".body"), text);
  console.log(name, r.status, text.length, Math.round(performance.now() - t) + "ms", "items", text.split(/<(?:item|entry)[\s>]/).length - 1, "new", (text.match(/Announce Type: new/g) || []).length, "cross", (text.match(/Announce Type: cross/g) || []).length, text.slice(0, 80).replace(/\s+/g, " "));
}
