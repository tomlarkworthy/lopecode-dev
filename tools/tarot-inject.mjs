// Inject the tarot module + its 81 file attachments into a lopecode notebook.
// Attachments are written BEFORE the module block (a module placed ahead of its own
// attachments loses them silently under a streaming load).
import fs from 'fs';
import path from 'path';

const NOTEBOOK = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const MODULE_ID = '@tomlarkworthy/tarot';
const ASSETS = 'data/tarot';
const MODULE_JS = 'modules/@tomlarkworthy/tarot.js';
const HASH = '#view=S100(@tomlarkworthy/tarot)';

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
const blocks = files.map((name) => {
  const bytes = fs.readFileSync(path.join(ASSETS, name));
  const mime = MIME[path.extname(name)];
  if (!mime) throw new Error(`no mime mapping for ${name}`);
  return `<script id="${MODULE_ID}/${encodeURIComponent(name)}" type="text/plain" data-encoding="base64" data-mime="${mime}">${bytes.toString('base64')}</script>`;
});

const moduleSrc = fs.readFileSync(MODULE_JS, 'utf8');
if (moduleSrc.includes('</script')) throw new Error('module source contains a literal </script>');
blocks.push(`<script id="${MODULE_ID}" type="text/plain" data-mime="application/javascript">${moduleSrc}</script>`);

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
if (!conf.mains.includes(MODULE_ID)) conf.mains.push(MODULE_ID);
conf.hash = HASH;
const replacement = `${hit[1]}${JSON.stringify(conf, null, 2)}${hit[3]}`;
html = html.slice(0, hit.index) + replacement + html.slice(hit.index + hit[0].length);

fs.writeFileSync(NOTEBOOK, html);

const kb = (n) => (n / 1024).toFixed(0);
console.log(`injected ${files.length} attachments + 1 module`);
console.log(`mains now ${conf.mains.length}, hash ${conf.hash}`);
console.log(`notebook ${(fs.statSync(NOTEBOOK).size / 1048576).toFixed(2)} MB (payload ${kb(payload.length)} KB)`);
