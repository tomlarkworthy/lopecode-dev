// Assemble lopebooks/notebooks/tomlarkworthy_monty.html from a base notebook plus
// monty-module.js and the gzipped assets built by build-assets.sh.
// Usage: bun tools/monty/build-notebook.ts [base.html] [out.html]
import { readFileSync, writeFileSync } from "node:fs";

const root = new URL("../../", import.meta.url).pathname;
const base = process.argv[2] ?? `${root}lopebooks/notebooks/tomlarkworthy_spreadsheet.html`;
const outPath = process.argv[3] ?? `${root}lopebooks/notebooks/tomlarkworthy_monty.html`;
const MOD = "@tomlarkworthy/monty";
const DROP = "@tomlarkworthy/spreadsheet";
const assets = [
  ["monty-lib-0.0.23.js.gz", "application/gzip"],
  ["monty-worker-0.0.23.js.gz", "application/gzip"],
  ["monty.component.core.wasm.gz", "application/gzip"],
  ["monty.component.core2.wasm.gz", "application/gzip"],
  ["monty.component.core3.wasm.gz", "application/gzip"],
  ["monty.component.core4.wasm.gz", "application/gzip"],
];

let html = readFileSync(base, "utf8");

const cut = (from: string, to: string) => {
  const a = html.indexOf(from);
  if (a < 0) throw new Error(`not found: ${from}`);
  const b = html.indexOf(to, a);
  if (b < 0) throw new Error(`no end for: ${from}`);
  html = html.slice(0, a) + html.slice(b + to.length);
  return a;
};

// Drop the base's prerender snapshot; the next export regenerates it.
if (html.includes('<style id="lope-prerender-style">')) {
  const start = html.indexOf('<style id="lope-prerender-style">');
  const cleanup = html.indexOf('<script id="lope-prerender-cleanup">', start);
  const end = html.indexOf("</script>", cleanup) + "</script>".length;
  html = html.slice(0, start) + html.slice(end);
}

const at = cut(`<script id="${DROP}"`, "</script>");
const blocks = assets.map(([name, mime]) => {
  const b64 = readFileSync(`${root}tools/monty/assets/${name}`).toString("base64");
  return `<script id="${MOD}/${encodeURIComponent(name)}" \n  type="text/plain"\n  data-encoding="base64"\n  data-mime="${mime}"\n>\n${b64}\n</script>\n`;
});
const moduleSrc = readFileSync(`${root}tools/monty/monty-module.js`, "utf8").trimEnd();
blocks.push(`<script id="${MOD}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n${moduleSrc}</script>`);
html = html.slice(0, at) + blocks.join("\n") + html.slice(at);

html = html.replaceAll(`<title>${DROP}</title>`, `<title>${MOD}</title>`)
  .replaceAll(`content="${DROP}"`, `content="${MOD}"`);

// Pin every py cell open (editor-5 keeps pins in its cell_options.json attachment).
const optionsId = '<script id="@tomlarkworthy/editor-5/cell_options.json"';
const oa = html.indexOf(optionsId);
if (oa < 0) throw new Error("no editor-5 cell_options.json");
const ob = html.indexOf("</script>", oa);
const options = { __attachMenu: true, [MOD]: Object.fromEntries(["fib", "word_counts", "hypot"].map((n) => [n, { pinned: true }])) };
html = html.slice(0, oa) + `${optionsId} \n  type="text/plain"\n  data-encoding="base64"\n  data-mime="application/json;charset=utf-8"\n>\n${Buffer.from(JSON.stringify(options)).toString("base64")}\n` + html.slice(ob);

// The exporter's source also contains a bootconf template, so take the last block.
const bc = html.lastIndexOf('<script id="bootconf.json"');
html = html.slice(0, bc) + html.slice(bc).replace(/(<script id="bootconf.json"[^>]*>\s*)\{[\s\S]*?\}(\s*<\/script>)/, (_, a, b) =>
  a + JSON.stringify({
    mains: ["@tomlarkworthy/save-in-place", "@tomlarkworthy/lopepage-2", MOD],
    hash: `#view=R100(S100(${MOD}))`,
    headless: true,
  }, null, 2) + b);

if (html.includes(`id="${DROP}"`)) throw new Error(`${DROP} still present`);
writeFileSync(outPath, html);
console.log(`${outPath} ${(html.length / 1e6).toFixed(2)} MB`);
