// Applies a scripted list of modify_node / insert_node operations to an Observable notebook.
//
// lope-push-ws.js --cells cannot do this job: it only addresses named cells, it drops imports
// outright, and new cells land at the end of the notebook. This ship needs an edited import
// statement, five new anonymous md cells, and those cells at specific positions.
//
// Sources come from lope-push-ws.js --dump (index into that JSON), so nothing is retyped.
import { readFileSync } from "node:fs";
import WebSocket from "ws";

const [, , specPath, ...flags] = process.argv;
if (!specPath) throw new Error("usage: push-observable.mjs <spec.json> [--dry-run]");
const dry = flags.includes("--dry-run");

// spec: { slug, dump, ops: [{kind:"modify", node, cell} | {kind:"insert", before, cell, label}] }
const spec = JSON.parse(readFileSync(specPath, "utf8"));
const cells = JSON.parse(readFileSync(spec.dump, "utf8"));
const { T, I } = JSON.parse(readFileSync("tools/.observable-cookies.json", "utf8"));
const cookie = `I=${I}; T=${T}`;

const doc = await (
  await fetch(`https://api.observablehq.com/document/${spec.slug}`, {
    headers: { Origin: "https://observablehq.com", Cookie: cookie }
  })
).json();
if (!doc.nodes) throw new Error("no nodes — auth expired? " + JSON.stringify(doc).slice(0, 200));
const byId = new Map(doc.nodes.map((n) => [n.id, String(n.value)]));

const plan = [];
for (const op of spec.ops) {
  const source = cells[op.cell].source;
  const label = op.label || cells[op.cell].names.join(",") || source.slice(0, 40).replace(/\n/g, " ");
  if (op.kind === "modify") {
    if (!byId.has(op.node)) throw new Error(`node ${op.node} not on target`);
    if (byId.get(op.node) === source) {
      console.log(`skip   modify ${op.node}  ${label}  (identical)`);
      continue;
    }
    plan.push({ ...op, source, label });
  } else if (op.kind === "insert") {
    // An insert is not idempotent, so refuse if the text is already somewhere on the target.
    const dupe = doc.nodes.find((n) => String(n.value) === source);
    if (dupe) {
      console.log(`skip   insert         ${label}  (already node ${dupe.id})`);
      continue;
    }
    if (!byId.has(op.before)) throw new Error(`anchor node ${op.before} not on target`);
    plan.push({ ...op, source, label });
  } else throw new Error("unknown op kind " + op.kind);
}

console.log(`\n${spec.slug} @ version ${doc.version}: ${plan.length} operation(s)`);
for (const p of plan)
  console.log(
    `  ${p.kind.padEnd(6)} ${p.kind === "modify" ? "node " + p.node : "before " + p.before}  ${p.label}  (${p.source.length} bytes)`
  );
if (dry || !plan.length) {
  console.log(dry ? "\nDRY RUN — nothing sent" : "\nnothing to do");
  process.exit(0);
}

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: "https://observablehq.com", Cookie: cookie }
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await new Promise((resolve, reject) => {
  let version = null,
    subversion = null,
    waiting = null;

  ws.on("open", () =>
    ws.send(JSON.stringify({ type: "hello", token: T, version: doc.version, next: true }))
  );
  ws.on("error", reject);
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === "load") {
      version = m.version;
      subversion = m.subversion;
      run().then(resolve, reject);
    } else if (m.type === "saveconfirm" && waiting) waiting.ok(m);
    else if (m.type === "error" && waiting) waiting.fail(new Error(JSON.stringify(m)));
  });

  const send = (events) =>
    new Promise((ok, fail) => {
      waiting = { ok, fail };
      ws.send(JSON.stringify({ type: "save", events, edits: [], version, subversion }));
      setTimeout(() => fail(new Error("timeout")), 30000);
    });

  async function run() {
    for (const p of plan) {
      const v = version + 1;
      const ev =
        p.kind === "modify"
          ? { version: v, type: "modify_node", node_id: p.node, new_node_value: p.source }
          : {
              version: v,
              type: "insert_node",
              node_id: v,
              new_next_node_id: p.before,
              new_node_value: p.source,
              new_node_pinned: false,
              new_node_mode: "js",
              new_node_data: null,
              new_node_name: null
            };
      const confirm = await send([ev]);
      version = confirm.version;
      subversion = confirm.subversion;
      console.log(`  ok  ${p.kind} ${p.label} -> version ${version}`);
      await sleep(400); // the save endpoint 404s on sustained back-to-back writes
    }
    ws.close();
  }
});
console.log("done");
