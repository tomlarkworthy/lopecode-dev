import http from "node:http";
import fs from "node:fs";

const PORT = 8899;
const OUT = process.env.OUT || "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu/recovered-notebook.html";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST,OPTIONS", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Private-Network": "true" };

http.createServer((req, res) => {
  if (req.method === "OPTIONS") { res.writeHead(204, CORS); return res.end(); }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const buf = Buffer.concat(chunks);
    fs.writeFileSync(OUT, buf);
    console.error("[writeback] wrote", buf.length, "bytes to", OUT);
    res.writeHead(200, { ...CORS, "Content-Type": "text/plain" });
    res.end("ok " + buf.length);
  });
}).listen(PORT, "127.0.0.1", () => console.error("[writeback] listening on 127.0.0.1:" + PORT + " -> " + OUT));
