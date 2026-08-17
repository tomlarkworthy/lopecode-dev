/**
 * Drop one symbol from an `import {...} from "..."` cell on ObservableHQ.
 *
 * `lope-push-ws.js --cells` cannot do this: byte-exact matching duplicates import
 * cells rather than editing them, so the edit goes over raw WS like
 * push-ccp-imports.mjs does.
 *
 * Usage:
 *   node tools/push-drop-import-symbol.mjs <slug> <symbol> <source-module> [--apply]
 * Idempotent: if the symbol is already gone it reports and exits 0.
 */
import { readFileSync } from 'fs';
import WebSocket from 'ws';

const [slug, symbol, sourceModule] = process.argv.slice(2);
const apply = process.argv.includes('--apply');
if (!slug || !symbol || !sourceModule) {
  console.error('usage: node tools/push-drop-import-symbol.mjs <slug> <symbol> <source-module> [--apply]');
  process.exit(2);
}

const { T, I } = JSON.parse(readFileSync('tools/.observable-cookies.json', 'utf8'));
const cookie = `I=${I}; T=${T}`;
const doc = await (
  await fetch(`https://api.observablehq.com/document/${slug}`, {
    headers: { Origin: 'https://observablehq.com', Cookie: cookie },
  })
).json();

const node = doc.nodes.find(
  (n) => typeof n.value === 'string' &&
    /^\s*import\s*\{/.test(n.value) &&
    n.value.includes(`"${sourceModule}"`) &&
    new RegExp(`\\b${symbol}\\b`).test(n.value)
);
if (!node) {
  console.log(`${slug}: no import cell from ${sourceModule} still naming ${symbol} — nothing to do`);
  process.exit(0);
}

// Rebuild the specifier list, keeping the cell's existing layout (one-per-line or inline).
const m = /^(\s*import\s*\{)([\s\S]*?)(\}\s*from\s*"[^"]+"\s*)$/.exec(node.value);
if (!m) { console.error(`${slug}: could not parse import cell:\n${node.value}`); process.exit(1); }
const multiline = m[2].includes('\n');
const kept = m[2].split(',').map((s) => s.trim()).filter(Boolean).filter((s) => s !== symbol);
const body = multiline ? `\n  ${kept.join(',\n  ')}\n` : ` ${kept.join(', ')} `;
const next = `${m[1]}${body}${m[3]}`;

console.log(`${slug} (version ${doc.version}) node ${node.id}`);
console.log(`  before: ${node.value.replace(/\n/g, ' ').replace(/\s+/g, ' ')}`);
console.log(`  after : ${next.replace(/\n/g, ' ').replace(/\s+/g, ' ')}`);
if (!apply) { console.log('  DRY RUN — pass --apply to write'); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: 'https://observablehq.com', Cookie: cookie },
});
await new Promise((res, rej) => {
  ws.on('open', () =>
    ws.send(JSON.stringify({ type: 'hello', token: T, version: doc.version, next: true })));
  ws.on('message', (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.type === 'load') {
      ws.send(JSON.stringify({
        type: 'save', edits: [], version: msg.version, subversion: msg.subversion,
        events: [{ version: msg.version + 1, type: 'modify_node', node_id: node.id, new_node_value: next }],
      }));
    } else if (msg.type === 'saveconfirm') {
      console.log(`  confirmed — version ${msg.version}`);
      ws.close(); res();
    } else if (msg.type === 'error') { ws.close(); rej(new Error(JSON.stringify(msg))); }
  });
  ws.on('error', rej);
  setTimeout(() => rej(new Error('timeout')), 60000);
});
