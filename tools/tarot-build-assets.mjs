// Build the embeddable tarot asset bundle: 78 AVIF cards + velvet + trimmed metadata.
// Source deck is the Rider-Waite-Smith scans from @triptych/tarot-utilities (public domain).
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCRATCH = path.join(ROOT, 'scratch/tarot-deck');
const OUT = path.join(ROOT, 'data/tarot');
const QUALITY = 25;   // full 350x600; visually indistinguishable at display size, 1.40MB total

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(SCRATCH, 'deck'), { recursive: true });

// The source scans live as file attachments of @triptych/tarot-utilities. Fetch them once;
// data/tarot/ is committed, so this only runs when re-encoding from scratch.
if (!fs.existsSync(path.join(SCRATCH, 'deck/tarot-images.json'))) {
  console.log('fetching source deck from observablehq…');
  const mod = await (await fetch('https://api.observablehq.com/@triptych/tarot-utilities.js?v=4')).text();
  const map = mod.match(/const fileAttachments = new Map\(\[([\s\S]*?)\]\);/)[1];
  const entries = [...map.matchAll(/\["([^"]+)", \{url: "([^"]+)"/g)]
    .map((m) => ({ name: m[1], url: m[2] }))
    .filter((e) => e.name.endsWith('.jpg') || e.name === 'tarot-images.json');
  for (let i = 0; i < entries.length; i += 10) {
    await Promise.all(entries.slice(i, i + 10).map(async (e) => {
      const buf = Buffer.from(await (await fetch(e.url)).arrayBuffer());
      fs.writeFileSync(path.join(SCRATCH, 'deck', e.name), buf);
    }));
  }
  console.log(`fetched ${entries.length} source files`);
}

// Card back and velvet backdrop come from the original app notebook.
if (!fs.existsSync(path.join(SCRATCH, 'cardback.webp'))) {
  const mod = await (await fetch('https://api.observablehq.com/@tomlarkworthy/tarot-backend.js?v=4')).text();
  const map = mod.match(/const fileAttachments = new Map\(\[([\s\S]*?)\]\);/)[1];
  const all = [...map.matchAll(/\["([^"]+)", \{url: "([^"]+)"/g)].map((m) => ({ name: m[1], url: m[2] }));
  for (const [src, dst] of [['image-4.webp', 'cardback.webp'],
                            ['imgonline-com-ua-TextureSeamless-ddu5gFbCzzWeXp (1) (1).webp', 'velvet.webp']]) {
    const e = all.find((x) => x.name === src);
    fs.writeFileSync(path.join(SCRATCH, dst), Buffer.from(await (await fetch(e.url)).arrayBuffer()));
  }
  console.log('fetched back + velvet');
}

const avif = (src, dst, q = QUALITY, longEdge = null) => {
  const args = [];
  if (longEdge) args.push('-Z', String(longEdge));
  args.push('-s', 'format', 'avif', '-s', 'formatOptions', String(q), src, '--out', dst);
  execFileSync('sips', args, { stdio: 'ignore' });
};

// --- cards -------------------------------------------------------------
const meta = JSON.parse(fs.readFileSync(path.join(SCRATCH, 'deck/tarot-images.json'), 'utf8'));
const cards = meta.cards.map(c => {
  const stem = c.img.replace(/\.jpg$/, '');
  avif(path.join(SCRATCH, 'deck', c.img), path.join(OUT, `${stem}.avif`));
  return {
    id: stem,
    name: c.name,
    number: c.number,
    arcana: c.arcana,
    suit: c.suit,
    keywords: c.keywords,
    light: c.meanings.light.slice(0, 5),
    shadow: c.meanings.shadow.slice(0, 5),
  };
});

// --- background --------------------------------------------------------
// No back.avif: the card back is drawn as SVG in the module (see cardBackDefs).
avif(path.join(SCRATCH, 'velvet.webp'), path.join(OUT, 'velvet.avif'), 35, 900);

fs.writeFileSync(path.join(OUT, 'deck.json'), JSON.stringify(cards));

// --- report ------------------------------------------------------------
const files = fs.readdirSync(OUT);
const total = files.reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
const group = (pred) => files.filter(pred).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log(`cards   ${cards.length} files  ${(group(f => /^[mcpsw]\d\d\.avif$/.test(f)) / 1024).toFixed(0)} KB`);
console.log(`velvet  ${(fs.statSync(path.join(OUT, 'velvet.avif')).size / 1024).toFixed(0)} KB`);
console.log(`deck    ${(fs.statSync(path.join(OUT, 'deck.json')).size / 1024).toFixed(0)} KB metadata`);
console.log(`TOTAL   ${(total / 1048576).toFixed(2)} MB raw -> ${(total * 4 / 3 / 1048576).toFixed(2)} MB base64`);
