// Does the browser-native session actually load project memory, and do the wiki paths
// the prompt points at resolve?
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const HASH = "#view=C100(S25(@tomlarkworthy/claude-code-pairing),S75(@tomlarkworthy/claude-code-browser))";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + HASH, { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(4000);

console.log("fs:", JSON.stringify(await p.evaluate(async () => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const files = w.__vol.toJSON();
  const md = files["/home/user/project/CLAUDE.md"];
  const doc = await window.__RC5FS_read?.("x");
  return {
    claudeMdBytes: md ? String(md).length : 0,
    claudeMdHead: md ? String(md).split("\n").slice(0, 3).join(" / ") : null,
    contentPaths: window.__RC5FS.list().filter((k) => k.startsWith("/content/")).length,
    wikiPaths: window.__RC5FS.list().filter((k) => k.includes("markdown-wiki")).slice(0, 3),
    wikiRead: (window.__RC5FS.readSync("/content/@tomlarkworthy/markdown-wiki/notebook-programming-concepts.md") || "").slice(0, 60),
  };
})));

await p.evaluate(() => window.__sendKeys("/context"));
await sleep(1500);
await p.evaluate(() => window.__sendKeys("\r"));
await sleep(9000);
console.log("---- /context ----");
console.log(await p.evaluate(() => window.__dumpTerm()));
await b.close(); process.exit(0);
