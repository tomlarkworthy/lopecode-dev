// Exercise the riskiest path in an exporter-mcp build: the lazily-loaded FileAttachment
// libraries (CodeMirror / lezer / acorn) that reach the runtime as `URL.createObjectURL(blob)`
// followed by `import(url)` — i.e. exactly the blob-module pattern the sandbox forbids.
// Clicking "edit" mounts CodeMirror, so a .cm-editor in the DOM proves the chain worked.
// Usage: bun tools/exporter-mcp/interact.ts <file.html> [--offline]
import { chromium } from "playwright";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"))!;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
if (args.includes("--offline")) {
  await page.route("**/*", (r) => (r.request().url().startsWith("file:") ? r.continue() : r.abort()));
}
const errors: string[] = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));

await page.goto(`file://${resolve(file)}`, { waitUntil: "load", timeout: 60000 });
await page.waitForSelector(".observablehq", { timeout: 30000 });
await page.waitForTimeout(3000);

const clicked = await page.evaluate(() => {
  const el = [...document.querySelectorAll(".cell-editor div")].find(
    (e) => e.textContent?.trim() === "edit" && (e as HTMLElement).offsetParent !== null
  ) as HTMLElement | undefined;
  el?.click();
  return !!el;
});
if (!clicked) throw new Error("no visible edit affordance found");
await page.waitForTimeout(4000);

const result = await page.evaluate(() => ({
  codemirror: document.querySelectorAll(".cm-editor").length,
  cmContent: (document.querySelector(".cm-content") as HTMLElement | null)?.innerText.slice(0, 120) ?? null,
  // modules that came from an object URL rather than a page block — the registry-only path
  objectUrlModules: (window as any).__lopeModules
    ? [...(window as any).__lopeModules.keys()].filter((k: string) => /^(blob:|blob-request:|lope-vfs:)/.test(k))
    : null,
}));

console.log(JSON.stringify(result, null, 2));
console.log(`errors: ${errors.length}`);
for (const e of errors.slice(0, 10)) console.log(`   ${e}`);
await page.screenshot({ path: file.replace(/\.html$/, "-edit.png") });
await browser.close();
process.exit(result.codemirror > 0 ? 0 : 1);
