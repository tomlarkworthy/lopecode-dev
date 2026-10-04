import { readFileSync } from "fs";
import { blockContent, findSpan, guardedWrite } from "../../lib/notebook-blocks.ts";
const SW = "@tomlarkworthy/switchboard", AGENT = "@tomlarkworthy/robocoop-5";
for (const repo of ["lopecode", "lopebooks"]) {
  const path = `${repo}/notebooks/quick_start.html`;
  const html = readFileSync(path, "utf8");
  const text = blockContent(html, "bootconf.json")!;
  const conf = JSON.parse(text);
  if (conf.mains.includes(SW)) { console.log(repo, "already has switchboard"); continue; }
  // Textual insert after the agent's entry, so the block's formatting is untouched.
  const at = text.indexOf(`"${AGENT}",`);
  if (at < 0) throw new Error("agent entry not found");
  const lineStart = text.lastIndexOf("\n", at) + 1, indent = text.slice(lineStart, at);
  const end = at + `"${AGENT}",`.length;
  const nextText = text.slice(0, end) + "\n" + indent + `"${SW}",` + text.slice(end);
  JSON.parse(nextText);
  const span = findSpan(html, "bootconf.json")!;
  const raw = html.slice(span.start, span.end);
  const next = html.slice(0, span.start) + raw.replace(text, nextText) + html.slice(span.end);
  guardedWrite(path, html, next, "", "quick_start mains");
  console.log(repo, JSON.parse(nextText).mains.join(", "));
}
