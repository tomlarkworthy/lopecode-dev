import WebSocket from "ws";
import fs from "fs";
const SLUG = "@tomlarkworthy/observablejs-toolchain";
const cookies = JSON.parse(fs.readFileSync("tools/.observable-cookies.json","utf8"));
const dir = "tools/toolchain-tests/";
const cells = fs.readdirSync(dir).map(f => ({ name: f.replace(/\.js$/,""), src: fs.readFileSync(dir+f,"utf8").replace(/\s+$/,"") }));

const doc = await (await fetch(`https://api.observablehq.com/document/${SLUG}`, {
  headers: { Origin: "https://observablehq.com", Cookie: `I=${cookies.I}; T=${cookies.T}` }
})).json();
console.log("doc id", doc.id, "version", doc.version);
const existing = new Set(doc.nodes.map(n => (n.value||"").trim().split(/\s|=/)[0]));
const toInsert = cells.filter(c => !existing.has(c.name));
console.log("inserting", toInsert.map(c=>c.name));
if (toInsert.length === 0) { console.log("nothing to insert"); process.exit(0); }

const ws = new WebSocket(`wss://ws.observablehq.com/document/${doc.id}/edit`, {
  headers: { Origin: "https://observablehq.com", Cookie: `T=${cookies.T}; I=${cookies.I}` }
});
let version, subversion;
const send = m => ws.send(JSON.stringify(m));
const waitConfirm = v => new Promise((res,rej)=>{ const to=setTimeout(()=>rej(new Error("timeout v"+v)),30000);
  const h=d=>{const m=JSON.parse(d.toString()); if(m.type==="saveconfirm"&&m.version===v){clearTimeout(to);ws.off("message",h);res(m);} else if(m.type==="error"){clearTimeout(to);ws.off("message",h);rej(new Error(m.message));}}; ws.on("message",h); });
await new Promise((res,rej)=>{ const to=setTimeout(()=>rej(new Error("load timeout")),30000);
  ws.on("message",d=>{const m=JSON.parse(d.toString()); if(m.type==="load"){clearTimeout(to);version=m.version;subversion=m.subversion;for(const e of m.events||[])if(e.version)version=e.version;res();} else if(m.type==="error"){clearTimeout(to);rej(new Error(m.message));}});
  ws.on("open",()=>send({type:"hello",token:cookies.T,version:doc.version,next:true})); ws.on("error",e=>rej(e)); });
console.log("loaded v"+version);
for (const c of toInsert) {
  const v = version+1;
  send({ type:"save", events:[{ version:v, type:"insert_node", node_id:v, new_next_node_id:null,
    new_node_value:c.src, new_node_pinned:false, new_node_mode:"js", new_node_data:null, new_node_name:null }], edits:[], version, subversion });
  const cf = await waitConfirm(v); version=cf.version; subversion=cf.subversion;
  console.log("  inserted", c.name, "-> v"+version);
}
console.log("DONE v"+version);
ws.close(); process.exit(0);
