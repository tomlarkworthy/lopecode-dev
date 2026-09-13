// Writes a copy of a notebook with a test suite module and the harness blocks it needs.
//   --carry <id>=<notebook.html>   copy block <id> from that notebook, unless the base already has it
//   --suite <id>=<module.js>       add (or replace) module block <id> with this source, and add it to mains
// Carried and suite blocks go immediately before bootconf.json, in argument order, so an attachment
// listed before its module stays before it.
//
// run: bun tools/merge-forks/embed-suite.ts --base <notebook.html> --out <copy.html> [--carry id=nb]... --suite id=js
import { readFileSync } from "node:fs";
import { blockSpans, blockContent, findSpan, rawBlock, guardedWrite } from "../lib/notebook-blocks.ts";

const args = process.argv.slice(2);
const opt = (flag: string) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
const pair = (s: string) => { const i = s.indexOf("="); return [s.slice(0, i), s.slice(i + 1)]; };
const [base] = opt("--base"), [out] = opt("--out");
if (!base || !out) throw new Error("--base and --out are required");

const prev = readFileSync(base, "utf8");
let html = prev;
const present = new Set(blockSpans(html).map((s) => s.id));
const incoming: string[] = [];
const report: string[] = [];

for (const [id, from] of opt("--carry").map(pair)) {
  if (present.has(id)) { report.push(`kept ${id} (already present)`); continue; }
  const block = rawBlock(readFileSync(from, "utf8"), id);
  if (!block) throw new Error(`${from} has no block ${id}`);
  incoming.push(block);
  report.push(`carried ${id} from ${from}`);
}

const suites = opt("--suite").map(pair);
for (const [id, path] of suites) {
  const block = `<script id="${id}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${readFileSync(path, "utf8").replace(/\n$/, "")}\n</script>`;
  const existing = findSpan(html, id);
  if (existing) {
    html = html.slice(0, existing.start) + block + html.slice(existing.end);
    report.push(`replaced ${id} from ${path}`);
  } else {
    incoming.push(block);
    report.push(`added ${id} from ${path}`);
  }
}

const conf = findSpan(html, "bootconf.json");
if (!conf) throw new Error(`${base} has no bootconf.json`);
const bootconf = JSON.parse(blockContent(html, "bootconf.json")!);
for (const [id] of suites) if (!bootconf.mains.includes(id)) bootconf.mains.push(id);
const confBlock = `<script id="bootconf.json"\n        type="text/plain"\n        data-mime="application/json"\n>\n${JSON.stringify(bootconf, null, 2)}\n</script>`;
html = html.slice(0, conf.start) + incoming.map((b) => b + "\n").join("") + confBlock + html.slice(conf.end);

guardedWrite(out, prev, html, incoming.join("\n"), "embed-suite");
console.log(report.join("\n"));
console.log(`mains ${JSON.stringify(bootconf.mains)}\nwrote ${out}`);
