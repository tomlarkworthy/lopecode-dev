// Build the modern "Blank Notebook" by merging the editable-md + atproto stack
// (from virtual-monorepo.html) into the robocoop-5 canonical bundle, then swapping
// in a fresh blank-notebook welcome module + bootconf.
//
// Robust block splitting: the real <script> element boundaries are the *unescaped*
// </script> closings (exporter templates embed escaped `<\/script>`). Between two
// real closings, only the FIRST `<script` opening is a real element start; any later
// `<script id=...` before the next real closing is data inside the block.

import { readFileSync, writeFileSync } from "node:fs";

type Block = { id: string | null; start: number; end: number; text: string; type?: string; mime?: string };

function splitBlocks(html: string): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;
  const closeRe = /<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = closeRe.exec(html))) {
    const closeEnd = m.index + m[0].length;
    // first real <script after cursor is this element's start tag
    const startIdx = html.indexOf("<script", cursor);
    if (startIdx === -1 || startIdx > m.index) { cursor = closeEnd; continue; }
    const tagEnd = html.indexOf(">", startIdx);
    const startTag = html.slice(startIdx, tagEnd + 1);
    const idM = startTag.match(/\sid="([^"]*)"/);
    const typeM = startTag.match(/\stype="([^"]*)"/);
    const mimeM = startTag.match(/\sdata-mime="([^"]*)"/);
    blocks.push({
      id: idM ? idM[1] : null,
      type: typeM ? typeM[1] : undefined,
      mime: mimeM ? mimeM[1] : undefined,
      start: startIdx,
      end: closeEnd,
      text: html.slice(startIdx, closeEnd),
    });
    cursor = closeEnd;
  }
  return blocks;
}

const ROOT = "/Users/tom.larkworthy/dev/lopecode-dev";
const basePath = `${ROOT}/lopebooks/notebooks/@tomlarkworthy_robocoop-5.html`;
const overlayPath = `${ROOT}/lopebooks/notebooks/@tomlarkworthy_virtual-monorepo.html`;
const modJsPath = `${ROOT}/modules/@tomlarkworthy/blank-notebook.js`;
const outPath = process.argv[2] || `${ROOT}/tools/blank-notebook-new.html`;

let base = readFileSync(basePath, "utf8");
const overlay = readFileSync(overlayPath, "utf8");
const modJs = readFileSync(modJsPath, "utf8");

const baseBlocks = splitBlocks(base);
const overlayBlocks = splitBlocks(overlay);
const baseIds = new Set(baseBlocks.filter(b => b.id).map(b => b.id!));

// Collect overlay data blocks (modules + file attachments) absent from base,
// excluding virtual-monorepo's own content and non-module infra.
const SKIP_IDS = new Set(["bootconf.json", "main", "networking_script", "importmap"]);
const toAdd = overlayBlocks.filter(b =>
  b.id &&
  !baseIds.has(b.id) &&
  !SKIP_IDS.has(b.id) &&
  !b.id.startsWith("@tomlarkworthy/virtual-monorepo") &&
  b.type === "text/plain"
);

console.log("Merging in from virtual-monorepo:");
for (const b of toAdd) console.log("  +", b.id);

// Build the new blank-notebook module block.
const blankBlock = `<script id="@tomlarkworthy/blank-notebook" type="text/plain" data-mime="application/javascript">\n${modJs.trimEnd()}\n</script>`;

// Insert all new blocks before the unique @tomlarkworthy/robocoop-5 anchor
// (early data-block region, well before any boot execution).
const anchor = `<script id="@tomlarkworthy/robocoop-5"`;
const anchorIdx = base.indexOf(anchor);
if (anchorIdx === -1) throw new Error("anchor not found");
const inserted = toAdd.map(b => b.text).join("\n") + "\n" + blankBlock + "\n";
base = base.slice(0, anchorIdx) + inserted + base.slice(anchorIdx);

// --- Rewrite the real bootconf.json (a genuine element, not escaped-in-template) ---
function realBootconf(html: string): { block: Block; json: any } {
  const cand = splitBlocks(html).filter(b => b.id === "bootconf.json");
  for (let i = cand.length - 1; i >= 0; i--) {
    const inner = html.slice(html.indexOf(">", cand[i].start) + 1, cand[i].end - "</script>".length).trim();
    try { return { block: cand[i], json: JSON.parse(inner) }; } catch {}
  }
  throw new Error("real bootconf.json not found");
}

// The embedded bootconf is a flat object: { mains, hash, headless, ... }.
const { block: bcBlock, json: bootconf } = realBootconf(base);
const bcTagEnd = base.indexOf(">", bcBlock.start);
const bcOpenTag = base.slice(bcBlock.start, bcTagEnd + 1);

bootconf.mains = [
  "@tomlarkworthy/lopepage-2",
  "@tomlarkworthy/blank-notebook",
  "@tomlarkworthy/editable-md",
  "@tomlarkworthy/robocoop-5",
  "@tomlarkworthy/robocoop-5-engine",
  "@tomlarkworthy/robocoop-5-srctools",
  "@tomlarkworthy/at-login",
  "@tomlarkworthy/at-write",
  "@tomlarkworthy/claude-code-pairing",
  "@tomlarkworthy/save-in-place",
];
bootconf.hash =
  "#view=S100(@tomlarkworthy/blank-notebook,@tomlarkworthy/at-write,@tomlarkworthy/claude-code-pairing,@tomlarkworthy/robocoop-5)";

const newBc = bcOpenTag + "\n" + JSON.stringify(bootconf, null, 2) + "\n";
base = base.slice(0, bcBlock.start) + newBc + base.slice(bcBlock.end - "</script>".length);

// Rewrite <title>
base = base.replace(/<title>[\s\S]*?<\/title>/, "<title>Blank Notebook</title>");

writeFileSync(outPath, base);
console.log(`\nWrote ${outPath} (${(base.length / 1e6).toFixed(2)} MB)`);
console.log("mains:", bootconf.mains.length, "hash:", bootconf.hash);
