// Editing transport for the new Observable site (Notebooks 2.0 on observablehq.com).
//
// Measured 2026-11-22 against the scrap notebook 3ec6cd9f87b28862:
//   read   GET  https://observablehq.com/api/export/<id>  notebook-kit HTML, <script id=<node id>> per
//               cell, the current draft; 404 without cookies. It carries no version, so:
//   version GET  /api/notebook/<id>/edits?version=<newest node id>  -> {version: <current>, ...}
//   fallback GET https://observablehq.com/d/<id>  page HTML; its RSC payload holds {version, role,
//               body:{cells}}. curl gets 429 from Vercel's checkpoint, headless Chromium passes it.
//   write  POST https://observablehq.com/api/notebook/<id>/edits  {version, edits:[event...]}
//               -> 200 {"version":N+1}; a stale version -> 409 "Conflict".
//   tail   GET  /api/notebook/<id>/edits?version=N  -> {version, base, events:[...], ...}
// Auth is the D + sesh cookies (tools/.observable-next-cookies.json, gitignored).
// An insert_node sent with new_node_mode "js" is stored as mode "ojs".

import fs from 'fs';
import { EventEmitter } from 'events';
import * as cheerio from 'cheerio';
import { chromium } from 'playwright';
import { chromeOptions } from './lib/playwright-chrome.js';

const ORIGIN = 'https://observablehq.com';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

export function isNextCookiesFile(file) {
  try { const c = JSON.parse(fs.readFileSync(file, 'utf8')); return 'D' in c && 'sesh' in c; } catch { return false; }
}

export function loadNextCookies(file) {
  const c = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!c.D || !c.sesh) throw new Error(`${file}: needs 'D' and 'sesh' (from devtools on observablehq.com)`);
  return { D: c.D, sesh: c.sesh };
}

const cookieHeader = (c) => `D=${c.D}; sesh=${c.sesh}`;

export function notebookIdFromTarget(target) {
  if (/^[a-f0-9]{16}$/.test(target)) return target;
  const m = new URL(target).pathname.match(/^\/d\/([a-f0-9]{16})/);
  if (!m) throw new Error(`new-site push needs a /d/<id> URL or a 16-hex id: ${target}`);
  return m[1];
}

function rscPayload(html) {
  return [...html.matchAll(/self\.__next_f\.push\((\[.*?\])\)<\/script>/gs)]
    .map((m) => { try { return JSON.parse(m[1])[1]; } catch { return ''; } })
    .filter((s) => typeof s === 'string')
    .join('');
}

// RSC text rows `<hex>:T<hexByteLen>,<text>` hold long strings; a cell value of "$<hex>" points at one.
function rscTextRows(payload) {
  const rows = new Map();
  const buf = Buffer.from(payload, 'utf8');
  const re = /(?:^|\n|\})([0-9a-f]+):T([0-9a-f]+),/g;
  const next = /([0-9a-f]+):T([0-9a-f]+),/y; // a text row has no terminator; the next row can follow at once
  let m = re.exec(payload);
  while (m) {
    const end = m.index + m[0].length;
    const start = Buffer.byteLength(payload.slice(0, end), 'utf8');
    const text = buf.subarray(start, start + parseInt(m[2], 16)).toString('utf8');
    rows.set(m[1], text);
    next.lastIndex = re.lastIndex = end + text.length;
    m = next.exec(payload);
    if (m) m.index = next.lastIndex - m[0].length;
    else m = re.exec(payload);
  }
  return rows;
}

// React Flight writes a string that starts with `$` as `$$…`.
const resolveRef = (v, rows) =>
  typeof v !== 'string' ? v
    : /^\$[0-9a-f]+$/.test(v) && rows.has(v.slice(1)) ? rows.get(v.slice(1))
    : v.startsWith('$$') ? v.slice(1) : v;

// The notebook object is the JSON value that contains `"body":{..."cells":[`; scan out its
// balanced braces from the `{` that opens it.
function extractNotebook(payload, id) {
  const at = payload.indexOf(`"id":"${id}"`);
  const bodyAt = payload.indexOf('"body":{', at < 0 ? 0 : at);
  if (bodyAt < 0) throw new Error('notebook body not found in page payload');
  let depth = 0, start = -1;
  for (let i = bodyAt; i >= 0; i--) {
    const ch = payload[i];
    if (ch === '}') depth++;
    else if (ch === '{') { if (depth === 0) { start = i; break; } depth--; }
  }
  for (let i = start, d = 0, str = false; i < payload.length; i++) {
    const ch = payload[i];
    if (str) { if (ch === '\\') i++; else if (ch === '"') str = false; continue; }
    if (ch === '"') str = true;
    else if (ch === '{') d++;
    else if (ch === '}' && --d === 0) return JSON.parse(payload.slice(start, i + 1));
  }
  throw new Error('unterminated notebook object in page payload');
}

const headers = (cookies) => ({ 'Cookie': cookieHeader(cookies), 'Origin': ORIGIN, 'User-Agent': UA });

// notebook-kit's deserialize (vendor/notebook-kit/src/lib/serialize.ts): type -> mode, <\/script unescape, 4-space dedent.
const MODES = {
  'text/markdown': 'md', 'text/html': 'html', 'application/x-tex': 'tex', 'application/sql': 'sql',
  'application/sql+view': 'sql.view', 'text/vnd.graphviz': 'dot', 'application/vnd.node.javascript': 'node',
  'text/x-python': 'python', 'text/x-r': 'r', 'application/vnd.observable.javascript': 'ojs', 'text/x-typescript': 'ts',
};
const isEmpty = (l) => !/\S/.test(l);
function dedent(text) {
  const lines = text.split(/\r\n?|\n/);
  if (isEmpty(lines[lines.length - 1])) lines.pop();
  if (isEmpty(lines[0])) lines.shift();
  return lines.map((l) => l.replace(/^ {4}/, '')).join('\n');
}

export function parseExport(html) {
  const $ = cheerio.load(html);
  return $('notebook script').toArray().map((el) => ({
    id: Number($(el).attr('id')),
    mode: MODES[$(el).attr('type')] ?? 'js',
    value: dedent($(el).text().replace(/<\\(?=\\*\/script(\s|>))/gi, '<')),
    pinned: $(el).attr('pinned') !== undefined,
  }));
}

// GET /edits?version=N answers {version: <current>} for any N from the oldest kept version to the
// current one, and 404 outside it. A node id is the version that inserted it, so the newest node is in range.
async function currentVersion(id, cookies, nodes) {
  const n = Math.max(0, ...nodes.map((c) => c.id));
  if (!n) return null;
  const r = await fetch(`${ORIGIN}/api/notebook/${id}/edits?version=${n}`, { headers: headers(cookies) });
  return r.ok ? (await r.json()).version : null;
}

/** Returns { id, version, nodes:[{id,value,mode,pinned}] } from /api/export, with the page read as fallback. */
export async function fetchNextNotebook(target, cookies) {
  const id = notebookIdFromTarget(target);
  const r = await fetch(`${ORIGIN}/api/export/${id}`, { headers: headers(cookies) });
  if (!r.ok) throw new Error(`GET /api/export/${id}: ${r.status} (cookies stale, no access, or not a new-site notebook)`);
  const nodes = parseExport(await r.text());
  const version = await currentVersion(id, cookies, nodes);
  if (version != null) return { id, version, nodes };
  const page = await fetchNextNotebookPage(id, cookies);
  return { id, version: page.version, nodes };
}

/** The /d/<id> page read: headless Chromium, RSC payload. Needed only when no node id is in the kept history. */
export async function fetchNextNotebookPage(id, cookies) {
  const browser = await chromium.launch({ headless: true, ...chromeOptions(chromium, { headless: true }) });
  let timer;
  try {
    const ctx = await browser.newContext({ userAgent: UA });
    await ctx.addCookies(Object.entries(cookies).map(([name, value]) => ({
      name, value, domain: '.observablehq.com', path: '/', secure: true,
    })));
    const page = await ctx.newPage();
    // Not networkidle: the page holds streaming connections open. A first visit can be the
    // Vercel checkpoint (429), which reloads itself into the real page.
    const url = `${ORIGIN}/d/${id}`;
    const html = new Promise((resolve, reject) => page.on('response', (r) => {
      if (r.url() === url && r.status() === 200) r.text().then(resolve, reject);
    }));
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    const text = await Promise.race([html, new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`no 200 for ${url} within 60s`)), 60000); })]);
    const payload = rscPayload(text);
    const nb = extractNotebook(payload, id);
    const rows = rscTextRows(payload);
    if (nb.role !== 'editor' && nb.role !== 'owner') {
      throw new Error(`role "${nb.role}" on ${id}: cookies are stale or lack edit access`);
    }
    const nodes = (nb.body?.cells || []).map(({ id, value, mode, pinned }) => ({ id, value: resolveRef(value, rows), mode, pinned }));
    const unresolved = nodes.filter((n) => /^\$[0-9a-f]+$/.test(n.value));
    if (unresolved.length) throw new Error(`unresolved RSC refs in nodes ${unresolved.map((n) => n.id).join(', ')}`);
    return { id, version: nb.version, publish_version: nb.publish_version, role: nb.role, nodes };
  } finally {
    clearTimeout(timer);
    await browser.close();
  }
}

/**
 * Same surface as connectWS in lope-push-ws.js: `send({type:'save', events, version})` and a
 * `ws` emitter that yields `saveconfirm` / `error` messages, so waitForConfirm works unchanged.
 * A network failure is reported as status 0; the caller re-reads the version and retries.
 */
export function connectNext(target, cookies, version, options = {}) {
  const id = notebookIdFromTarget(target);
  const ws = new EventEmitter();
  const emit = (msg) => setImmediate(() => ws.emit('message', Buffer.from(JSON.stringify(msg))));
  ws.close = () => {};
  return Promise.resolve({
    ws,
    version,
    subversion: null,
    async send(msg) {
      try {
        const edits = msg.events.map(({ version: _v, ...e }) => e);
        const body = JSON.stringify({ version: msg.version, edits });
        if (options.verbose) console.log(`>> POST ${body.slice(0, 200)}`);
        const r = await fetch(`${ORIGIN}/api/notebook/${id}/edits`, {
          method: 'POST',
          headers: { ...headers(cookies), 'Referer': `${ORIGIN}/d/${id}`, 'Content-Type': 'application/json' },
          body,
        });
        const text = await r.text();
        if (options.verbose) console.log(`<< ${r.status} ${text.slice(0, 200)}`);
        if (r.ok) emit({ type: 'saveconfirm', version: JSON.parse(text).version, subversion: null });
        else emit({ type: 'error', message: text.trim().slice(0, 200), status: r.status });
      } catch (err) {
        emit({ type: 'error', message: err.message, status: 0 });
      }
    },
  });
}
