// Offline test: extract data-mime blocks from a real lopebook, then reconstruct
// using the strip-and-inject strategy. Verify the resulting HTML preserves
// the boot shell (executable scripts) and the file table (data-mime blocks).
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";

const path = process.argv[2] || "lopecode/notebooks/@tomlarkworthy_atproto-comments.html";
const html = readFileSync(path, "utf8");

// === EXTRACT (mirrors extractFiles in lopefeed) ===
const dom = new JSDOM(html);
const dataScripts = dom.window.document.querySelectorAll("script[data-mime][id]");
const files = [];
for (const el of dataScripts) {
  files.push({
    id: el.getAttribute("id"),
    mime: el.getAttribute("data-mime"),
    encoding: (el.getAttribute("data-encoding") || "text").toLowerCase(),
    body: el.textContent || ""
  });
}
console.log(`extracted ${files.length} files`);

// === RECONSTRUCT (mirrors reconstructHtml strategy) ===
// 1. Use the same HTML as the "shell" (what a lopefeed running this notebook would have).
// 2. Strip its data-mime <script> blocks.
// 3. Inject blocks back in.
const stripped = html.replace(
  /<script\b[^>]*\bdata-mime\b[^>]*>[\s\S]*?<\/script>/g,
  ""
);
const escapeAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
const escapeScriptBody = s => s.replace(/<\/script/gi, "<\\/script");
const blocks = files.map(f =>
  `<script id="${escapeAttr(f.id)}" type="text/plain" data-mime="${escapeAttr(f.mime)}" data-encoding="${escapeAttr(f.encoding)}">${escapeScriptBody(f.body)}</script>`
).join("\n");

let reconstructed;
if (stripped.includes("</body>")) {
  reconstructed = stripped.replace("</body>", `\n${blocks}\n</body>`);
} else {
  reconstructed = stripped + "\n" + blocks;
}

// === VERIFY ===
console.log(`original size: ${(html.length / 1024).toFixed(1)} KB`);
console.log(`stripped size: ${(stripped.length / 1024).toFixed(1)} KB`);
console.log(`reconstructed size: ${(reconstructed.length / 1024).toFixed(1)} KB`);

// Re-parse the reconstructed HTML and check counts match
const dom2 = new JSDOM(reconstructed);
const reExec = dom2.window.document.querySelectorAll("script:not([data-mime])");
const reData = dom2.window.document.querySelectorAll("script[data-mime][id]");
const origExec = dom.window.document.querySelectorAll("script:not([data-mime])");
console.log(`exec scripts: orig=${origExec.length}, recon=${reExec.length}`);
console.log(`data-mime scripts: orig=${dataScripts.length}, recon=${reData.length}`);

// Spot-check: look for the bootconf.json
const bcOrig = dom.window.document.getElementById("bootconf.json");
const bcRecon = dom2.window.document.getElementById("bootconf.json");
console.log(`bootconf.json present: orig=${!!bcOrig}, recon=${!!bcRecon}`);
if (bcOrig && bcRecon) {
  console.log(`bootconf.json identical: ${bcOrig.textContent === bcRecon.textContent}`);
}

// Spot-check: a known module
const modOrig = dom.window.document.getElementById("@tomlarkworthy/atproto-comments");
const modRecon = dom2.window.document.getElementById("@tomlarkworthy/atproto-comments");
console.log(`module body byte-match: ${modOrig?.textContent === modRecon?.textContent}`);

// Sanity: the executable scripts (boot shell) should be intact
const networkingOrig = dom.window.document.getElementById("networking_script");
const networkingRecon = dom2.window.document.getElementById("networking_script");
console.log(`networking_script preserved: ${networkingOrig?.textContent === networkingRecon?.textContent}`);

const mainOrig = dom.window.document.querySelector('script[type="module"]#main');
const mainRecon = dom2.window.document.querySelector('script[type="module"]#main');
console.log(`main module script preserved: ${mainOrig?.textContent === mainRecon?.textContent}`);
