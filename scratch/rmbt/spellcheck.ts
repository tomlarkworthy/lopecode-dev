// Spell check the PROSE of a lopecode module, and nothing else.
//
// No aspell/hunspell on this machine, so the dictionary is /usr/share/dict/words
// (235,976 entries) plus an allow-list of the vocabulary this notebook actually
// needs. That trade is the point: a general dictionary alone flags "homography",
// "wasm" and "scanline" on every line and the real typos drown. The allow-list is
// the interesting artifact -- every word in it is a deliberate decision that the
// spelling is intended.
//
// Only md`...` template bodies are read. Code, comments and identifiers are not
// prose and a checker that reads them reports nothing but noise. Within the
// prose, these are stripped before checking: fenced blocks, inline `code`, link
// TARGETS (but not link text), ${...} interpolations, and bare URLs.
//
//   bun scratch/rmbt/spellcheck.ts modules/@tomlarkworthy/coded-landmark-tracking.js
import { readFileSync } from "node:fs";

const path = process.argv[2] ?? "modules/@tomlarkworthy/coded-landmark-tracking.js";
const src = readFileSync(path, "utf8");

const dict = new Set(
  readFileSync("/usr/share/dict/words", "utf8").split("\n").map((w) => w.toLowerCase().trim()).filter(Boolean)
);

// Domain vocabulary, deliberate spellings, and proper nouns. Anything here is a
// claim that the spelling is intended -- not a way to silence a warning.
const ALLOW = `
lopecode observable observablehq notebook notebooks md html svg dom css js json api urls url
homography homographies homographic jacobian jacobians affine collinear collinearity
barcode barcodes scanline scanlines scanned rasterise raster subpixel px mm ms fps
wasm assemblyscript webassembly binaryen zig asc runtime runtimes async await
webcam webcams macbook arducam ov9281 uvc mono cmos mipi usb
lopepage exporter jumpgate fileattachment fileattachments importmap
levenberg marquardt gauss newton lsq rms residual residuals
untimed unwarmed prerender reproject reprojection
tooth teeth centres centre colour colours colourise behaviour recognised
optimise optimised optimisation normalise normalised
dataflow reactive memoised
sigma parameterise parameterised
config configs stride strides pixelwise
tilt yaw
claude anthropic github
// /usr/share/dict/words is the 1934 web2 list. These are ordinary modern English
// and their absence is the dictionary's age, not a spelling question.
laptop laptops download downloads offline online overkill pixel pixels payload
proxies qualifies larger weakest supplies entries slower cheaper held realtime
labelled rewrote unoptimized javascript multi pre const src properties
`.trim().split(/\s+/);
for (const w of ALLOW) dict.add(w);

// md`...` bodies. Backticks inside are escaped as \` in the module file, which is
// also how the template ends -- so scan for the first UNESCAPED backtick.
const proseBlocks: { at: number; text: string }[] = [];
for (const m of src.matchAll(/\bmd`/g)) {
  const start = m.index! + m[0].length;
  let i = start;
  while (i < src.length) {
    if (src[i] === "\\") { i += 2; continue; }
    if (src[i] === "`") break;
    i++;
  }
  proseBlocks.push({ at: start, text: src.slice(start, i) });
}

const clean = (s: string) =>
  s
    .replace(/```[\s\S]*?```/g, " ")     // fenced code
    .replace(/~~~[\s\S]*?~~~/g, " ")     // the notebook's other fence
    .replace(/\$\{[^}]*\}/g, " ")        // interpolations
    .replace(/\\`[^`]*?\\`/g, " ")       // inline code, escaped backticks
    .replace(/`[^`]*`/g, " ")
    .replace(/\]\([^)]*\)/g, "] ")       // link targets, keeping link text
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\\\[|\\\]/g, " ");

const lineOf = (idx: number) => src.slice(0, idx).split("\n").length;

type Hit = { word: string; line: number; context: string };
const hits = new Map<string, Hit>();
for (const b of proseBlocks) {
  const text = clean(b.text);
  for (const m of text.matchAll(/[A-Za-z][A-Za-z']*/g)) {
    const raw = m[0];
    const w = raw.toLowerCase().replace(/'s$/, "");
    if (w.length < 3) continue;
    if (dict.has(w)) continue;
    // possessives, plurals and -ed/-ing of allowed stems
    if (w.endsWith("s") && dict.has(w.slice(0, -1))) continue;
    if (w.endsWith("es") && dict.has(w.slice(0, -2))) continue;
    if (w.endsWith("ed") && (dict.has(w.slice(0, -2)) || dict.has(w.slice(0, -1)))) continue;
    if (w.endsWith("ing") && (dict.has(w.slice(0, -3)) || dict.has(w.slice(0, -3) + "e"))) continue;
    if (w.endsWith("ly") && dict.has(w.slice(0, -2))) continue;
    if (hits.has(w)) continue;
    const at = b.at + (m.index ?? 0);
    const ctx = text.slice(Math.max(0, (m.index ?? 0) - 45), (m.index ?? 0) + raw.length + 45).replace(/\s+/g, " ").trim();
    hits.set(w, { word: raw, line: lineOf(at), context: ctx });
  }
}

const rows = [...hits.values()].sort((a, b) => a.line - b.line);
console.log(`${proseBlocks.length} md cells, ${rows.length} words not in dictionary or allow-list\n`);
for (const r of rows) console.log(`  line ${String(r.line).padStart(5)}  ${r.word.padEnd(18)} …${r.context}…`);
