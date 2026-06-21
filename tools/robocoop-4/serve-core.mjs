// Tiny CORS static server for the robocoop-4 .mjs core (dev only). Serves this dir at CORE_BASE.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, normalize, join } from 'node:path';
const ROOT = new URL('.', import.meta.url).pathname;
const PORT = Number(process.env.PORT || 8899);
const MIME = { '.mjs': 'text/javascript', '.js': 'text/javascript', '.json': 'application/json' };
createServer(async (req, res) => {
  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
  if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
  try {
    const rel = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
    const buf = await readFile(join(ROOT, rel));
    res.writeHead(200, { ...cors, 'Content-Type': MIME[extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { res.writeHead(404, cors); res.end('not found: ' + e.message); }
}).listen(PORT, '127.0.0.1', () => console.log('robocoop-4 core served at http://127.0.0.1:' + PORT + '/'));
