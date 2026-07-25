// One-off recovery: resiliently insert decompiled cells into an (empty) Observable doc.
// Append-only, so resume is by count: fetch N existing, insert dump[N..]. Reconnect on stall.
// Usage: node tools/recover-svglens-insert.js <docId> <cookies-file> <dump.json>
import WebSocket from 'ws';
import fs from 'fs';

const [, , DOC_ID, COOKIE_FILE, DUMP_FILE] = process.argv;
const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
const cells = JSON.parse(fs.readFileSync(DUMP_FILE, 'utf8')); // [{names, source}]
const TARGET = cells.length;
const OP_TIMEOUT = 45000;

const log = (m) => console.log(`[insert] ${m}`);

async function fetchDoc() {
  const resp = await fetch(`https://api.observablehq.com/document/${DOC_ID}`, {
    headers: { cookie: `T=${cookies.T}; I=${cookies.I}` },
  });
  if (!resp.ok) throw new Error(`fetch ${resp.status}`);
  const doc = await resp.json();
  return { count: (doc.nodes || []).length, version: doc.version };
}

function connect(docVersion) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://ws.observablehq.com/document/${DOC_ID}/edit`, {
      headers: { Origin: 'https://observablehq.com', Cookie: `T=${cookies.T}; I=${cookies.I}` },
    });
    const to = setTimeout(() => { ws.close(); reject(new Error('connect timeout')); }, 30000);
    ws.on('message', (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'load') {
        clearTimeout(to);
        let version = msg.version, subversion = msg.subversion;
        for (const evt of msg.events || []) if (evt.version) version = evt.version;
        resolve({ ws, version, subversion });
      } else if (msg.type === 'error') { clearTimeout(to); reject(new Error(`ws error: ${msg.message}`)); }
    });
    ws.on('error', (e) => { clearTimeout(to); reject(e); });
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version: docVersion, next: true })));
  });
}

function insertOne(conn, source) {
  return new Promise((resolve, reject) => {
    const newVersion = conn.version + 1;
    const nodeId = newVersion; // Observable requires node_id = event version
    const to = setTimeout(() => reject(new Error(`timeout v${newVersion}`)), OP_TIMEOUT);
    const onMsg = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'saveconfirm' && msg.version === newVersion) {
        clearTimeout(to); conn.ws.off('message', onMsg);
        conn.version = msg.version; conn.subversion = msg.subversion;
        resolve();
      }
    };
    conn.ws.on('message', onMsg);
    conn.ws.send(JSON.stringify({
      type: 'save',
      events: [{
        version: newVersion, type: 'insert_node', node_id: nodeId,
        new_next_node_id: null, // append at end
        new_node_value: source, new_node_pinned: false, new_node_mode: 'js',
        new_node_data: null, new_node_name: null,
      }],
      edits: [], version: conn.version, subversion: conn.subversion,
    }));
  });
}

(async () => {
  let round = 0;
  while (true) {
    const { count, version } = await fetchDoc();
    log(`round ${++round}: ${count}/${TARGET} present at v${version}`);
    if (count >= TARGET) { log(`done — ${count} nodes present`); break; }
    let conn;
    try { conn = await connect(version); } catch (e) { log(`connect failed: ${e.message}; retrying`); continue; }
    let done = 0;
    try {
      for (let i = count; i < TARGET; i++) {
        await insertOne(conn, cells[i].source);
        done++;
        if (done % 25 === 0) log(`  inserted ${count + done}/${TARGET}`);
      }
      log(`  round ${round} inserted ${done}; reconciling`);
    } catch (e) {
      log(`  stalled after ${done} this round (${e.message}); reconnecting`);
    } finally {
      try { conn.ws.close(); } catch {}
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
