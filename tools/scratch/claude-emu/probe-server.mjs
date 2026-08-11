import http from "node:http";

const PORT = 8787;
http.createServer((req, res) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Private-Network": "true",
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); return res.end(); }
  res.writeHead(200, { ...cors, "Content-Type": "text/plain" });
  res.end("pong " + req.method + " " + req.url);
}).listen(PORT, "127.0.0.1", () => console.log("probe listening on 127.0.0.1:" + PORT));
