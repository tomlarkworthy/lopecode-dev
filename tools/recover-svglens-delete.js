// One-off recovery: resiliently delete ALL nodes from a corrupted Observable doc.
// Observable recompiles the whole doc per edit, so single ops stall past any fixed
// timeout. On a stall we re-fetch ground truth and reconnect, so the run converges.
// Usage: node tools/recover-svglens-delete.js <docId> <cookies-file> [keepLast]
import WebSocket from 'ws';
import fs from 'fs';

const [, , DOC_ID, COOKIE_FILE, KEEP_LAST_ARG] = process.argv;
const KEEP_LAST = parseInt(KEEP_LAST_ARG || '0', 10); // stop when this many nodes remain
const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
const OP_TIMEOUT = 45000;

const log = (m) => console.log(`[recover] ${m}`);

async function fetchNodes() {
  const resp = await fetch(`https://api.observablehq.com/document/${DOC_ID}`, {
    headers: { cookie: `T=${cookies.T}; I=${cookies.I}` },
  });
  if (!resp.ok) throw new Error(`fetch ${resp.status}`);
  const doc = await resp.json();
  return { nodes: doc.nodes || [], version: doc.version };
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
  let round = 0;
  while (true) {
    const { nodes, version } = await fetchNodes();
    log(`round ${++round}: ${nodes.length} nodes at v${version}`);
    if (nodes.length <= KEEP_LAST) { log(`done — ${nodes.length} nodes remain`); break; }
    let conn;
    try { conn = await connect(version); } catch (e) { log(`connect failed: ${e.message}; retrying`); continue; }
    let deleted = 0;
    try {
      // Delete oldest-first (leave the newest KEEP_LAST untouched if requested)
      const targets = KEEP_LAST > 0 ? nodes.slice(0, nodes.length - KEEP_LAST) : nodes;
      for (const node of targets) {
        await removeOne(conn, node.id);
        if (++deleted % 25 === 0) log(`  deleted ${deleted}/${targets.length} this round`);
      }
      log(`  round ${round} deleted ${deleted}; reconciling`);
    } catch (e) {
      log(`  stalled after ${deleted} (${e.message}); reconnecting`);
    } finally {
      try { conn.ws.close(); } catch {}
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
