// One-off: remove a node from an Observable notebook via the WS edit protocol.
//   node tools/robocoop-5/remove-node.mjs <notebookId> <nodeId>
// Cookies from tools/.observable-cookies.json. Used to drop the spurious `import { x } from "@user/other"`
// cell that lope-push-ws reconstructed from example text inside robocoop-5-engine's systemPrompt.
import WebSocket from "ws";
import { readFileSync } from "node:fs";

const [notebookId, nodeIdArg] = process.argv.slice(2);
const nodeId = Number(nodeIdArg);
if (!notebookId || !Number.isFinite(nodeId)) { console.error("usage: remove-node.mjs <notebookId> <nodeId>"); process.exit(2); }

const c = JSON.parse(readFileSync(new URL("../.observable-cookies.json", import.meta.url)));
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36";

// current version + confirm the node exists
const doc = await (await fetch(`https://api.observablehq.com/document/${notebookId}`, {
  headers: { Origin: "https://observablehq.com", Referer: "https://observablehq.com/", "User-Agent": UA, Cookie: `I=${c.I}; T=${c.T}` },
})).json();
const node = (doc.nodes || []).find((n) => n.id === nodeId);
if (!node) { console.error(`node ${nodeId} not found (version ${doc.version})`); process.exit(1); }
console.log(`removing node ${nodeId} = ${JSON.stringify(node.value).slice(0, 80)} (doc v${doc.version})`);

const ws = new WebSocket(`wss://ws.observablehq.com/document/${notebookId}/edit`, {
  headers: { Origin: "https://observablehq.com", Cookie: `T=${c.T}; I=${c.I}` },
});
const done = new Promise((resolve, reject) => {
  const to = setTimeout(() => reject(new Error("timeout")), 30000);
  let version, subversion, target;
  ws.on("open", () => ws.send(JSON.stringify({ type: "hello", token: c.T, version: doc.version, next: true })));
  ws.on("error", (e) => { clearTimeout(to); reject(e); });
  ws.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === "load") {
      version = msg.version; subversion = msg.subversion;
      for (const e of msg.events || []) if (e.version) version = e.version;
      target = version + 1;
      ws.send(JSON.stringify({ type: "save", events: [{ version: target, type: "remove_node", node_id: nodeId }], edits: [], version, subversion }));
    } else if (msg.type === "saveconfirm" && msg.version === target) {
      clearTimeout(to); console.log(`removed. final version: ${msg.version}`); ws.close(); resolve();
    } else if (msg.type === "error") {
      clearTimeout(to); reject(new Error(`${msg.message} (status ${msg.status})`));
    }
  });
});
await done;
process.exit(0);
