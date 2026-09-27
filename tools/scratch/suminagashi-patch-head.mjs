// Card metadata for the suminagashi notebook. exporter-3 re-reads these from the live <head>,
// so they survive save-in-place.
import fs from 'fs';

const FILE = 'lopebooks/notebooks/@tomlarkworthy_suminagashi.html';
const TITLE = 'Suminagashi';
const DESC = 'Japanese paper marbling on simulated water. Touch the tray to float ink and surfactant in turn; the films spread by the Marangoni effect, fold as the water is stirred, and never mix. A WebGL2 simulation in a single HTML file.';
const IMAGE = 'https://cdn.bsky.app/img/feed_fullsize/plain/did:plc:j7nm3lrd5h7fm3sfhcv3lhfv/bafkreieiopxxpaaodelbvntdnv2nqqj3nlo3jc6vq4eidmxus2qs7xuy2q@jpeg';

const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = fs.readFileSync(FILE, 'utf8');
const headEnd = html.indexOf('</head>');
let head = html.slice(0, headEnd);
head = head.replace(/<title>[\s\S]*?<\/title>/, `<title>${attr(TITLE)}</title>`);
for (const k of ['property="og:title"', 'property="og:description"', 'name="description"', 'property="og:image"', 'name="twitter:card"'])
  head = head.replace(new RegExp(`\\n?\\s*<meta ${k}[^>]*>`, 'g'), '');
head = head.replace(/(<title>[\s\S]*?<\/title>)/,
  `$1\n<meta property="og:title" content="${attr(TITLE)}">` +
  `\n<meta name="description" content="${attr(DESC)}">` +
  `\n<meta property="og:description" content="${attr(DESC)}">` +
  `\n<meta property="og:image" content="${attr(IMAGE)}">` +
  `\n<meta name="twitter:card" content="summary_large_image">`);
fs.writeFileSync(FILE, head + html.slice(headEnd));
