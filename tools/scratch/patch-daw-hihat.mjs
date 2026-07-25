// One-off: point the Observable copy of @tomlarkworthy/daw at hihat@1.wav.
// The name "hihat.wav" is burned on that document (deleted names stay reserved),
// so the two cells holding it in serialized state must reference the @1 upload.
// Usage: node tools/scratch/patch-daw-hihat.mjs [--dry-run]
import WebSocket from 'ws';
import fs from 'fs';

const DOC_ID = '601d836901a78ad3';
const OLD = 'hihat.wav', NEW = 'hihat@1.wav';
const dryRun = process.argv.includes('--dry-run');
const cookies = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));
const log = (m) => console.log(`[patch] ${m}`);

const doc = await (await fetch(`https://api.observablehq.com/document/${DOC_ID}`, {
  headers: { Cookie: `T=${cookies.T}; I=${cookies.I}`, Origin: 'https://observablehq.com' },
})).json();

const targets = doc.nodes
  .filter(n => (n.value || '').includes(OLD))
  .map(n => ({ id: n.id, value: n.value.split(OLD).join(NEW) }));

if (!targets.length) { log(`no node references "${OLD}" — nothing to do`); process.exit(0); }
targets.forEach(t => log(`node ${t.id}: ${OLD} -> ${NEW}`));
if (dryRun) { log('dry run'); process.exit(0); }

const conn = await new Promise((resolve, reject) => {
  const ws = new WebSocket(`wss://ws.observablehq.com/document/${DOC_ID}/edit`, {
    headers: { Origin: 'https://observablehq.com', Cookie: `T=${cookies.T}; I=${cookies.I}` },
  });
  const to = setTimeout(() => { ws.close(); reject(new Error('connect timeout')); }, 30000);
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'load') {
      clearTimeout(to);
      let version = msg.version;
      for (const evt of msg.events || []) if (evt.version) version = evt.version;
      resolve({ ws, version, subversion: msg.subversion });
    } else if (msg.type === 'error') { clearTimeout(to); reject(new Error(`ws ${msg.status}: ${msg.message}`)); }
  });
  ws.on('error', (e) => { clearTimeout(to); reject(e); });
  ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version: doc.version, next: true })));
});
log(`connected at version ${conn.version}`);

for (const t of targets) {
  const version = conn.version + 1;
  await new Promise((resolve, reject) => {
    const to = setTimeout(() => reject(new Error(`timeout v${version}`)), 45000);
    const onMsg = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.type === 'saveconfirm' && msg.version === version) {
        clearTimeout(to); conn.ws.off('message', onMsg);
        conn.version = msg.version; conn.subversion = msg.subversion;
        resolve();
      } else if (msg.type === 'error') { clearTimeout(to); conn.ws.off('message', onMsg); reject(new Error(msg.message)); }
    };
    conn.ws.on('message', onMsg);
    conn.ws.send(JSON.stringify({
      type: 'save',
      events: [{ version, type: 'modify_node', node_id: t.id, new_node_value: t.value }],
      edits: [], version: conn.version, subversion: conn.subversion,
    }));
  });
  log(`✓ node ${t.id} (version ${conn.version})`);
}
conn.ws.close();
