// Validate the @tomlarkworthy/fileattachments fix on the LIVE new.observablehq.com,
// by rewriting the served module in flight. Nothing on Observable changes.
//   bun tools/newobs-fileattach-live-test.ts [url] [waitMs]
//   NO_PATCH=1 ... to measure the unpatched baseline
import { chromium } from "playwright";

const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const waitMs = Number(process.argv[3] ?? 32000);
const PATCH = !process.env.NO_PATCH;

const OLD_MAP = `(FileAttachment) => {
  let fileMap;
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  try {
    FileAttachment("");
  } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  return fileMap || new Map();
}`;

const NEW_MAP = `(FileAttachment) => {
  let fileMap;
  const backup_get = Map.prototype.get;
  const backup_has = Map.prototype.has;
  const backup_set = Map.prototype.set;
  Map.prototype.has = Map.prototype.get = function (...args) {
    fileMap = this;
  };
  // notebook-kit memoises unknown names, so the probe must not WRITE to the registry
  Map.prototype.set = function () {
    return this;
  };
  try {
    FileAttachment("");
  } catch (e) {}
  Map.prototype.has = backup_has;
  Map.prototype.get = backup_get;
  Map.prototype.set = backup_set;
  return fileMap || new Map();
}`;

const OLD_GET = `function _getFileAttachments(main,getFileAttachmentsMap){return(
function getFileAttachments(module = main) {
  const FileAttachment = module._builtins.get("FileAttachment");
  return new Map(
    [...getFileAttachmentsMap(FileAttachment).entries()].map(
      ([name, payload]) => [name, FileAttachment.call(null, name)]
    )
  );
}
)}`;

const NEW_GET = `function _getFileAttachments(main,getFileAttachmentsMap,FileAttachment){return(
function getFileAttachments(module = main) {
  // classic observablehq.com gives each notebook its own FileAttachment in module._builtins;
  // notebook-kit (new.observablehq.com) has one runtime-level builtin keyed by resolved href
  const FA = module._builtins.get("FileAttachment") ?? FileAttachment;
  const files = new Map();
  for (const [key] of getFileAttachmentsMap(FA).entries()) {
    const name = /^[a-z][a-z0-9+.-]*:\\/\\//i.test(key)
      ? decodeURIComponent(key.slice(key.lastIndexOf("/") + 1))
      : key;
    if (name) files.set(name, FA.call(null, key));
  }
  return files;
}
)}`;

const OLD_DEF = `define("getFileAttachments", ["main","getFileAttachmentsMap"], _getFileAttachments)`;
const NEW_DEF = `define("getFileAttachments", ["main","getFileAttachmentsMap","FileAttachment"], _getFileAttachments)`;

const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

let patched = 0;
if (PATCH) {
  await page.route("**/fileattachments.js*", async (route) => {
    const res = await ctx.request.get(route.request().url());
    let src = await res.text();
    const before = src;
    for (const [from, to] of [[OLD_MAP, NEW_MAP], [OLD_GET, NEW_GET], [OLD_DEF, NEW_DEF]] as const) {
      if (!src.includes(from)) throw new Error("patch target not found:\n" + from.slice(0, 80));
      src = src.replace(from, to);
    }
    if (src === before) throw new Error("no-op patch");
    patched++;
    await route.fulfill({
      status: 200,
      body: src,
      headers: { "content-type": "text/javascript; charset=utf-8", "access-control-allow-origin": "*" },
    });
  });
}

const errs = new Set<string>();
page.on("console", (m) => { if (m.type() === "error") errs.add(m.text().split("\n")[0].slice(0, 130)); });
page.on("pageerror", (e) => errs.add("[pageerror] " + e.message.slice(0, 130)));

await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(waitMs);

console.log(`patch active: ${PATCH}   modules rewritten: ${patched}`);
const frame = page.frames().find((f) => f.url().includes("chat-worker"))!;
const dom = await frame.evaluate(() => ({
  cells: document.querySelectorAll(".observablehq--inspect, .observablehq--error").length,
  errored: [...new Set([...document.querySelectorAll(".observablehq--error")].map((e) => (e.textContent ?? "").trim().slice(0, 110)))],
}));
console.log(`rendered cells: ${dom.cells}   errored: ${dom.errored.length}`);
for (const e of dom.errored) console.log("  ERR", e);
console.log("\nconsole errors:");
for (const e of errs) if (!/dependancy map|langApiRestored|sourceModule/.test(e)) console.log("  ", e);

await page.screenshot({ path: `tools/screenshots/newobs-fa-${PATCH ? "patched" : "baseline"}.png` });
await browser.close();
