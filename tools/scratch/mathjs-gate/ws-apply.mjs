#!/usr/bin/env node
// Apply node-id-keyed WS edits to an Observable document.
// usage: ws-apply.mjs --slug @user/slug --ops ops.json [--apply]
// ops.json: [{type:"modify",id,value} | {type:"remove",id} | {type:"insert",before,value}]
import fs from 'node:fs';
import WebSocket from 'ws';

const arg = (k) => { const i = process.argv.indexOf(k); return i < 0 ? undefined : process.argv[i + 1]; };
const SLUG = arg('--slug');
const OPS = JSON.parse(fs.readFileSync(arg('--ops'), 'utf8'));
const APPLY = process.argv.includes('--apply');
const cookies = JSON.parse(fs.readFileSync('tools/.observable-cookies.json', 'utf8'));
const H = { Origin: 'https://observablehq.com', Cookie: `I=${cookies.I}; T=${cookies.T}` };

const fetchDoc = async () =>
  (await fetch(`https://api.observablehq.com/document/${SLUG}`, { headers: H })).json();

let doc = await fetchDoc();
const byId = new Map(doc.nodes.map((n) => [n.id, n]));
const one = (s) => (s || '').replace(/\s+/g, ' ').slice(0, 100);
for (const o of OPS) {
  if (o.type !== 'insert' && !byId.has(o.id)) throw new Error(`node ${o.id} not in document`);
  if (o.type === 'modify') console.log(`MOD ${o.id}\n  - ${one(byId.get(o.id).value)}\n  + ${one(o.value)}`);
  if (o.type === 'remove') console.log(`DEL ${o.id}  ${one(byId.get(o.id).value)}`);
  if (o.type === 'insert') console.log(`INS before ${o.before}  ${one(o.value)}`);
}
console.log(`${SLUG} v${doc.version}: ${OPS.length} ops`);
if (!APPLY) process.exit(0);

let version, subversion = 0, ws, saves = 0;
const connect = async () => {
  const d = await fetchDoc();
  version = d.version;
  ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, { headers: H });
  await new Promise((res, rej) => {
    ws.on('open', () => ws.send(JSON.stringify({ type: 'hello', token: cookies.T, version, next: true })));
    ws.on('message', (m) => { const p = JSON.parse(m); if (p.type === 'load') { version = p.version; subversion = p.subversion; res(); } });
    ws.on('error', rej);
    setTimeout(() => rej(new Error('hello timeout')), 30000);
  });
  saves = 0;
};
const send = (event) => new Promise((res, rej) => {
  const to = setTimeout(() => rej(new Error(`timeout v${version + 1}`)), 45000);
  const on = (m) => {
    const p = JSON.parse(m);
    if (p.type === 'saveconfirm') { clearTimeout(to); ws.off('message', on); version = p.version; subversion = p.subversion; res(); }
    else if (p.type === 'error') { clearTimeout(to); ws.off('message', on); rej(new Error(`${p.status} ${p.message}`)); }
  };
  ws.on('message', on);
  ws.send(JSON.stringify({ type: 'save', events: [event], edits: [], version, subversion }));
});
await connect();
for (const [n, o] of OPS.entries()) {
  if (saves >= 40) { ws.close(); await connect(); }
  const v = version + 1;
  const event = o.type === 'modify'
    ? { version: v, type: 'modify_node', node_id: o.id, new_node_value: o.value }
    : o.type === 'remove'
      ? { version: v, type: 'remove_node', node_id: o.id }
      : { version: v, type: 'insert_node', node_id: v, new_next_node_id: o.before ?? null, new_node_value: o.value, new_node_pinned: true, new_node_mode: 'js', new_node_data: null, new_node_name: null };
  for (let attempt = 0; ; attempt++) {
    try { await send(event); break; }
    catch (e) {
      if (attempt >= 5) throw e;
      console.error(`\n  retry ${o.type} ${o.id ?? o.before}: ${e.message}`);
      ws.close(); await connect();
      event.version = version + 1;
      if (o.type === 'insert') event.node_id = event.version;
    }
  }
  saves++;
  process.stdout.write(`\r  ${n + 1}/${OPS.length} (v${version})   `);
  await new Promise((r) => setTimeout(r, 200));
}
ws.close();
console.log(`\ndone, version ${version}`);
