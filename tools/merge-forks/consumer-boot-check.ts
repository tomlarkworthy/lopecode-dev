// T4: boot the notebooks that render through visualizer and record what they show, so a merge can be
// compared with the notebooks as they were. Per notebook, after the runtime settles: rendered cell nodes
// (.observablehq), of those the ones in an error state (.observablehq--error), import headers, and the
// distinct page errors. --check fails on fewer rendered nodes, more error nodes, or a page error the
// baseline did not have.
//
// run: bun tools/merge-forks/consumer-boot-check.ts (--write <baseline.json> | --check <baseline.json>) [--wait 10000] [notebook.html ...]
import { chromium } from "playwright";
import { resolve } from "node:path";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

// one notebook per visualizer importer found by the 2026-09-13 AST survey (sheet is embedded only in the newsletter)
const DEFAULT = [
  "lopebooks/notebooks/@tomlarkworthy_grid-container.html",
  "lopecode/notebooks/quick_start.html",
  "lopebooks/notebooks/tomlarkworthy_lopecode-newsletter-002.html",
  "lopebooks/notebooks/tomlarkworthy_spreadsheet.html",
  "lopebooks/notebooks/@tomlarkworthy_infinite-canvas.html",
  "lopebooks/notebooks/@tomlarkworthy_moldable-webpage.html",
  "lopecode/notebooks/@tomlarkworthy_lopecode-tour.html",
  "lopecode/notebooks/@tomlarkworthy_lopepage.html"
];

const args = process.argv.slice(2);
const opt = (flag: string) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; };
const write = opt("--write"), checkFile = opt("--check");
if (!write && !checkFile) throw new Error("usage: consumer-boot-check.ts (--write <baseline.json> | --check <baseline.json>) [notebook.html ...]");
const wait = Number(opt("--wait") ?? 10000);
const listed = args.filter((a, i) => a.endsWith(".html") && !args[i - 1]?.startsWith("--"));
const notebooks = listed.length ? listed : DEFAULT;

type Result = { nodes: number; errors: number; imports: number; mains: string[]; pageErrors: string[] };
const browser = await chromium.launch();
const results: Record<string, Result | { missing: true }> = {};
for (const nb of notebooks) {
  if (!existsSync(nb)) { results[nb] = { missing: true }; console.log(`missing ${nb}`); continue; }
  const page = await browser.newPage({ viewport: { width: 1280, height: 1600 } });
  const pageErrors = new Set<string>();
  page.on("pageerror", (e) => pageErrors.add(e.message.split("\n")[0].slice(0, 300)));
  await page.goto(`file://${resolve(nb)}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForFunction(() => (window as any).__ojs_runtime?.mains?.size, undefined, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(wait);
  const r = await page.evaluate(() => ({
    nodes: document.querySelectorAll(".observablehq").length,
    errors: document.querySelectorAll(".observablehq--error").length,
    imports: document.querySelectorAll(".lope-viz-import").length,
    mains: [...((window as any).__ojs_runtime?.mains?.keys() ?? [])]
  }));
  results[nb] = { ...r, pageErrors: [...pageErrors].sort() };
  console.log(`${nb}: ${r.nodes} nodes, ${r.errors} errors, ${r.imports} import headers, ${pageErrors.size} page errors`);
  await page.close();
}
await browser.close();

if (write) {
  writeFileSync(write, JSON.stringify({ taken: new Date().toISOString(), wait, results }, null, 2) + "\n");
  console.log(`wrote ${write}`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(checkFile!, "utf8")).results as Record<string, any>;
const problems: string[] = [];
for (const [nb, now] of Object.entries(results) as [string, any][]) {
  const was = baseline[nb];
  if (!was) { problems.push(`${nb}: not in baseline`); continue; }
  if (now.missing || was.missing) { if (!!now.missing !== !!was.missing) problems.push(`${nb}: missing ${was.missing ? "before" : "now"}`); continue; }
  if (now.nodes < was.nodes) problems.push(`${nb}: rendered nodes ${was.nodes} -> ${now.nodes}`);
  if (now.errors > was.errors) problems.push(`${nb}: error nodes ${was.errors} -> ${now.errors}`);
  const added = now.pageErrors.filter((e: string) => !was.pageErrors.includes(e));
  if (added.length) problems.push(`${nb}: new page errors ${JSON.stringify(added)}`);
}
console.log(problems.length ? `FAIL\n  ${problems.join("\n  ")}` : "ok");
process.exit(problems.length ? 1 : 0);
