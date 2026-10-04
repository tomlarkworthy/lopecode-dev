import { readFileSync } from "fs";
import { $ } from "bun";
import { blockContent, findSpan, guardedWrite } from "../../lib/notebook-blocks.ts";
const ID = "@tomlarkworthy/pyodide";
for (const repo of ["lopecode", "lopebooks"]) {
  const old = (await $`git -C ${repo} show HEAD:notebooks/quick_start.html`.quiet()).stdout.toString();
  const path = `${repo}/notebooks/quick_start.html`;
  const html = readFileSync(path, "utf8");
  const span = findSpan(html, ID)!, raw = html.slice(span.start, span.end);
  const open = raw.slice(0, raw.indexOf(">") + 1);
  const next = html.slice(0, span.start) + open + blockContent(old, ID)! + "</script>" + html.slice(span.end);
  guardedWrite(path, html, next, blockContent(old, ID)!, "revert pyodide");
  console.log(repo, "pyodide restored", blockContent(next, ID) === blockContent(old, ID));
}
