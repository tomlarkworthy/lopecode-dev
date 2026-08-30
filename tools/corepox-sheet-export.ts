// The handover file, checked as a FILE. Rendering the plate in the page proves
// nothing about the download: the bloom filter belongs to corepox-assets' sheet,
// which is in the document and not in the blob unless it was cloned in.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-components,@tomlarkworthy/corepox-assets))");
await p.waitForFunction(() => !!document.querySelector('a[download="corepox-art-sheet.svg"]'),
  {timeout: 60000});
const svg = await p.evaluate(() => {
  const a = document.querySelector('a[download="corepox-art-sheet.svg"]')!;
  return new XMLSerializer().serializeToString(a.parentElement!.querySelector("svg")!);
});
await Bun.write("tools/screenshots/corepox-art-sheet.svg", svg);
// A reference is only a problem if the FILE cannot resolve it, so check each id
const refs = new Set([...svg.matchAll(/(?:href|xlink:href)="#([^"]+)"/g)].map(m => m[1]));
const urls = new Set([...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]));
const dangling = [...refs, ...urls].filter(id => !svg.includes(`id="${id}"`));
const remote = [...svg.matchAll(/(?:href|xlink:href)="([^"#][^"]*)"/g)].map(m => m[1])
  .filter(u => !u.startsWith("data:"));
console.log(`${(svg.length / 1024).toFixed(0)} KB`);
console.log(`internal refs: ${[...refs, ...urls].length} (${[...new Set([...refs, ...urls])].join(", ")})`);
console.log(`dangling: ${dangling.length ? dangling.join(" ") : "none"}`);
console.log(`remote urls: ${remote.length ? remote.join(" ") : "none"}`);

// render the FILE, on its own, in a fresh page
const q = await b.newPage({viewport: {width: 1400, height: 1000}});
const qerr: string[] = [];
q.on("requestfailed", r => qerr.push("failed request " + r.url().slice(0, 80)));
await q.goto("file://" + process.cwd() + "/tools/screenshots/corepox-art-sheet.svg");
await q.waitForTimeout(1500);
await q.screenshot({path: "tools/screenshots/corepox-art-sheet-standalone.png"});
console.log(qerr.length ? qerr.join("\n") : "standalone render: no failed requests");
await b.close();
