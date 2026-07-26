// Delete a single Observable cell by its leading name, resiliently (reconnect on stall).
// Observable recompiles the whole doc per edit, so a big doc can stall past a fixed timeout;
// on a stall we re-fetch ground truth and reconnect. Usage:
//   node tools/delete-cell-by-name.js <docId> <cookies-file> <cellName>
import WebSocket from 'ws';
import fs from 'fs';

const [, , DOC_ID, COOKIE_FILE, CELL_NAME] = process.argv;
if (!DOC_ID || !COOKIE_FILE || !CELL_NAME) {
  console.error('Usage: node tools/delete-cell-by-name.js <docId> <cookies-file> <cellName>');
  process.exit(1);
}
const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
const OP_TIMEOUT = 45000;
const log = (m) => console.log(`[delete-cell] ${m}`);

async function fetchNodes() {
  const resp = await fetch(`https://api.observablehq.com/document/${DOC_ID}`, {
    headers: { cookie: `T=${cookies.T}; I=${cookies.I}` },
  });
  if (!resp.ok) throw new Error(`fetch ${resp.status}`);
  const doc = await resp.json();
  return { nodes: doc.nodes || [], version: doc.version };
}

function nameOf(v) {
  const m = /^\s*(?:viewof |mutable )?([A-Za-z_$][\w$]*)\s*=/.exec(v || '');
  return m ? m[1] : null;
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
      } else if (msg.type === 'error') {
        clearTimeout(to); reject(new Error(`ws error: ${msg.message}`));
      }
    });
    ws.on('error', (e) => { clearTimeout(to); reject(e); });
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version: docVersion, next: true })));
  });
}

function removeOne(conn, nodeId) {
  return new Promise((resolve, reject) => {
    const newVersion = conn.version + 1;
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
      events: [{ version: newVersion, type: 'remove_node', node_id: nodeId }],
      edits: [], version: conn.version, subversion: conn.subversion,
    }));
  });
}

(async () => {
  while (true) {
    const { nodes, version } = await fetchNodes();
    const targets = nodes.filter((n) => nameOf(n.value) === CELL_NAME);
    if (targets.length === 0) { log(`no node named "${CELL_NAME}" remains at v${version} — done`); break; }
    log(`v${version}: ${targets.length} node(s) named "${CELL_NAME}" -> ${targets.map((n) => n.id).join(',')}`);
    let conn;
    try { conn = await connect(version); } catch (e) { log(`connect failed: ${e.message}; retrying`); continue; }
    try {
      for (const node of targets) { await removeOne(conn, node.id); log(`  removed node ${node.id}`); }
    } catch (e) {
      log(`  stalled (${e.message}); reconnecting`);
    } finally {
      try { conn.ws.close(); } catch {}
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
