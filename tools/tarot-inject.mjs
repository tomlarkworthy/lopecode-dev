// Inject @tomlarkworthy/tarot and @tomlarkworthy/tarot-deck, each preceded by its own
// file-attachment blocks (a module placed ahead of its own attachments loses them silently
// under a streaming load — the generated loader calls contentSync synchronously).
//
// The split is the point: tarot keeps deck.json + velvet.avif (46 KB) and tarot-deck owns
// the 78 card scans (1.56 MB). exporter-3 orders blocks by emitted size, so the app lands
// near the front of the document and the deck last, and tarot loads the deck lazily from
// inside showCards rather than importing it.
import fs from 'fs';
import path from 'path';

const NOTEBOOK = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const HASH = '#view=S100(@tomlarkworthy/tarot)';
const ASSETS = 'data/tarot';
// [module id, js path, which asset files it owns]
const MODULES = [
  ['@tomlarkworthy/tarot', 'modules/@tomlarkworthy/tarot.js', (f) => !f.endsWith('.avif') || f === 'velvet.avif'],
  ['@tomlarkworthy/tarot-deck', 'modules/@tomlarkworthy/tarot-deck.js', (f) => f.endsWith('.avif') && f !== 'velvet.avif'],
];
// runtime-sdk gives showCards its importShim; declaring it a main keeps its block in the
// size-sorted mains group, ahead of the deck, so the static import it costs resolves early.
const EXTRA_MAINS = ['@tomlarkworthy/tarot-deck', '@tomlarkworthy/runtime-sdk'];

const MIME = { '.avif': 'image/avif', '.json': 'application/json' };

let html = fs.readFileSync(NOTEBOOK, 'utf8');

// --- 1. strip any previous injection (idempotent re-run) ----------------
const before = html.length;
html = html.replace(
  new RegExp(`\\n<!-- tarot:begin -->[\\s\\S]*?<!-- tarot:end -->`, 'g'),
  ''
);
if (html.length !== before) console.log('removed previous injection');

// --- 2. build the blocks -----------------------------------------------
const files = fs.readdirSync(ASSETS).sort();
const blocks = [];
let claimed = 0;
for (const [id, js, owns] of MODULES) {
  const mine = files.filter(owns);
  claimed += mine.length;
  for (const name of mine) {
    const bytes = fs.readFileSync(path.join(ASSETS, name));
    const mime = MIME[path.extname(name)];
    if (!mime) throw new Error(`no mime mapping for ${name}`);
    blocks.push(`<script id="${id}/${encodeURIComponent(name)}" type="text/plain" data-encoding="base64" data-mime="${mime}">${bytes.toString('base64')}</script>`);
  }
  const src = fs.readFileSync(js, 'utf8');
  if (src.includes('</script')) throw new Error(`${id} source contains a literal </script>`);
  blocks.push(`<script id="${id}" type="text/plain" data-mime="application/javascript">${src}</script>`);
  console.log(`  ${id.padEnd(28)} ${String(mine.length).padStart(2)} attachments`);
}
if (claimed !== files.length) throw new Error(`${files.length - claimed} asset(s) claimed by no module`);

const payload = `\n<!-- tarot:begin -->\n${blocks.join('\n')}\n<!-- tarot:end -->`;

// --- 3. insert before the streaming sentinel ---------------------------
const anchor = html.lastIndexOf('<script id="streaming_sentinel">');
if (anchor < 0) throw new Error('streaming_sentinel anchor not found');
html = html.slice(0, anchor) + payload + '\n\n' + html.slice(anchor);

// --- 4. patch bootconf: add to mains, set the default view -------------
// exporter-3 carries a *template* of this block in its own source, so match every
// candidate and keep the one that is actually JSON.
const bootRe = /(<script id="bootconf\.json"\s+type="text\/plain"\s+data-mime="application\/json"\s*>)([\s\S]*?)(<\/script>)/g;
const candidates = [...html.matchAll(bootRe)].filter((c) => {
  try { JSON.parse(c[2]); return true; } catch { return false; }
});
if (candidates.length !== 1) throw new Error(`expected 1 real bootconf, found ${candidates.length}`);
const hit = candidates[0];
const conf = JSON.parse(hit[2]);
for (const id of [...MODULES.map(([m]) => m), ...EXTRA_MAINS])
  if (!conf.mains.includes(id)) conf.mains.push(id);
// debugger-2 pins the whole page to 24-30fps whether or not its pane is on screen —
// measured: dropping it alone takes idle rAF from 41.7ms to 8.3ms. It is the only main
// that does; every other module boots at the display rate. Nothing here needs it.
conf.mains = conf.mains.filter((m) => m !== '@tomlarkworthy/debugger-2');
conf.hash = HASH;
const replacement = `${hit[1]}${JSON.stringify(conf, null, 2)}${hit[3]}`;
html = html.slice(0, hit.index) + replacement + html.slice(hit.index + hit[0].length);

fs.writeFileSync(NOTEBOOK, html);

const kb = (n) => (n / 1024).toFixed(0);
console.log(`injected ${files.length} attachments + ${MODULES.length} modules`);
console.log(`mains now ${conf.mains.length}, hash ${conf.hash}`);
console.log(`notebook ${(fs.statSync(NOTEBOOK).size / 1048576).toFixed(2)} MB (payload ${kb(payload.length)} KB)`);
