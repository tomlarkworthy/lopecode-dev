// Set the notebook's <title>/description/og:image.
// These are durable: exporter-3 takes `title` from document.title and re-reads
// description + og:image out of the live <head>, so a later save-in-place keeps them.
import fs from 'fs';

const FILE = process.argv[2] || 'lopebooks/notebooks/@tomlarkworthy_tarot.html';
const TITLE = 'thetarot.online — a three-card tarot reading';
const DESC = 'Ask the cards a question and draw three from the Rider-Waite-Smith deck: past, present, future, interpreted by a language model. The whole app is one HTML file.';
const IMAGE = 'https://tomlarkworthy.github.io/lopebooks/assets/@tomlarkworthy_tarot.png';

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let html = fs.readFileSync(FILE, 'utf8');
const headEnd = html.indexOf('</head>');
if (headEnd < 0) throw new Error('no </head>');
let head = html.slice(0, headEnd);
const rest = html.slice(headEnd);

head = head.replace(/<title>[\s\S]*?<\/title>/, `<title>${attr(TITLE)}</title>`);
head = head.replace(/\n?\s*<meta property="og:title"[^>]*>/g, '');
head = head.replace(/\n?\s*<meta property="og:description"[^>]*>/g, '');
head = head.replace(/\n?\s*<meta name="description"[^>]*>/g, '');
head = head.replace(/\n?\s*<meta property="og:image"[^>]*>/g, '');

head = head.replace(/(<title>[\s\S]*?<\/title>)/,
  `$1\n  <meta property="og:title" content="${attr(TITLE)}">` +
  `\n  <meta name="description" content="${attr(DESC)}">` +
  `\n  <meta property="og:description" content="${attr(DESC)}">` +
  `\n  <meta property="og:image" content="${attr(IMAGE)}">`);

fs.writeFileSync(FILE, head + rest);

const check = fs.readFileSync(FILE, 'utf8').slice(0, fs.readFileSync(FILE, 'utf8').indexOf('</head>'));
console.log([...check.matchAll(/<(?:title|meta)[^>]*>(?:[^<]*<\/title>)?/g)]
  .map((m) => m[0]).filter((s) => /title|description|og:/.test(s)).join('\n'));
