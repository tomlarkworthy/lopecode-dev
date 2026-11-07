// Boot the spec with only the frame, the spec module and save-in-place as mains, then export the
// live runtime: the exporter writes only booted modules, so robocoop-5, pairing and the rest drop out.
//   bun tools/scratch/ordinal-diagram/trim-export.ts <in.html> <out.html>
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { blockContent, findSpan } from "../../lib/notebook-blocks.ts";
import { chromeOptions } from "../../lib/playwright-chrome.js";

const [inPath, outPath] = process.argv.slice(2).map((p) => resolve(p));
const MAINS = ["@tomlarkworthy/lopepage-2", "@spec/ordinal-diagram", "@tomlarkworthy/save-in-place"];
const HASH = "#view=R100(S100(@spec/ordinal-diagram))";

const html = readFileSync(inPath, "utf8");
const span = findSpan(html, "bootconf.json");
if (!span) throw new Error("no bootconf.json block");
const conf = JSON.parse(blockContent(html, "bootconf.json")!);
conf.mains = MAINS;
conf.hash = HASH;
const block = html.slice(span.start, span.end);
const opener = block.slice(0, block.indexOf(">") + 1);
const tmp = outPath.replace(/\.html$/, ".boot.html");
writeFileSync(tmp, html.slice(0, span.start) + opener + "\n" + JSON.stringify(conf, null, 2) + "\n</script>" + html.slice(span.end));

const browser = await chromium.launch({ headless: true, ...chromeOptions(chromium, { headless: true }) });
const page = await browser.newPage();
const errors: string[] = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("file://" + tmp + HASH);
await page.waitForFunction(() => {
  const rt: any = (window as any).__ojs_runtime;
  return rt && [...rt._variables].some((v: any) => v._name === "exportToHTML" && typeof v._value === "function");
}, null, { timeout: 120000 });
await page.waitForTimeout(5000);
const out = await page.evaluate(async (hash) => {
  const rt: any = (window as any).__ojs_runtime;
  const exportToHTML = [...rt._variables].find((v: any) => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const resp = await exportToHTML({ mains: new Map(rt.mains), runtime: rt, options: { hash } });
  return { mains: [...rt.mains.keys()], html: resp?.source ?? resp };
}, HASH);
await browser.close();
if (typeof out.html !== "string" || out.html.length < 1000) throw new Error("export returned no HTML");
writeFileSync(outPath, out.html);
console.log(JSON.stringify({ mains: out.mains, bytes: out.html.length, pageErrors: errors.slice(0, 5) }));
