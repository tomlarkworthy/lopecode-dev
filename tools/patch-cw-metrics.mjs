// Splice the dashboard/render cells into the @tomlarkworthy/cw-metrics module block.
// export_module times out against a backgrounded tab, so persist deterministically instead.
// Idempotent: guarded on the $def registration, not on any mention of the name.
import { readFileSync, writeFileSync } from 'node:fs';

const FILE = 'lopebooks/notebooks/@tomlarkworthy_aws-dashboard.html';
const CELLS = 'tools/cw-metrics-cells.js';

const html = readFileSync(FILE, 'utf8');
const cells = readFileSync(CELLS, 'utf8');

// The exporter emits a trailing space after the id attribute; match the header loosely.
const header = /<script id="@tomlarkworthy\/cw-metrics"\s*\n\s*type="text\/plain"\s*\n\s*data-mime="application\/javascript"\s*\n>\n/;
const m0 = header.exec(html);
if (!m0) throw new Error('cw-metrics module block not found');
const bodyStart = m0.index + m0[0].length;
const bodyEnd = html.indexOf('\n</script>', bodyStart);
if (bodyEnd < 0) throw new Error('cw-metrics module block end not found');
let body = html.slice(bodyStart, bodyEnd);

if (/\$def\("[^"]+", "cwDashboard"/.test(body)) {
  console.log('already present — nothing to do');
  process.exit(0);
}

const DEFS = [
  ['_cwdash01', 'cwDashboard', []],
  ['_cwshared01', 'cwCallConsole', []],
  ['_cwfetchdash01', 'cwFetchDashboard', ['cwCallConsole', 'cwDashboard']],
  ['_cwfetch01', 'cwFetchWidget', ['cwDashboard', 'cwCallConsole']],
  ['_cwplot01', 'cwPlotWidget', ['htl', 'Plot']],
  ['_cwtest01', 'cwSelfTest', ['cwDashboard', 'cwPlotWidget', 'htl']]
];

// 1. function consts go immediately before define()
const anchor = 'export default function define(runtime, observer) {';
if (!body.includes(anchor)) throw new Error('define() anchor not found');
body = body.replace(anchor, cells + '\n' + anchor);

// 2. $def registrations go after the last existing one, preserving cell order
const lastDef = body.match(/^\s*\$def\("_14ltwf2", "cwCall".*$/m);
if (!lastDef) throw new Error('cwCall $def anchor not found');
const lines = DEFS.map(([pid, name, deps]) => `  $def("${pid}", "${name}", ${JSON.stringify(deps)}, ${pid});  `).join('\n');
body = body.replace(lastDef[0], lastDef[0] + '\n' + lines);

writeFileSync(FILE, html.slice(0, bodyStart) + body + html.slice(bodyEnd));
console.log(`patched: added ${DEFS.map((d) => d[1]).join(', ')}`);
