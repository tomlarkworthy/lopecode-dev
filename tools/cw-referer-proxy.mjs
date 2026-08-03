// Diagnostic: forward an already-SigV4-signed request from the notebook to AWS, adding the
// Origin/Referer headers a file:// page cannot set. Tests whether the CWDBSharing role's
// GetMetricData grant carries an aws:Referer-style condition scoped to the AWS console origin.
// Credentials stay in the browser; only the signature transits. Run: node tools/cw-referer-proxy.mjs
import { createServer } from 'node:http';

const PORT = 8791;
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return res.writeHead(204, CORS).end();
  const chunks = [];
  for await (const c of req) chunks.push(c);
  let spec;
  try { spec = JSON.parse(Buffer.concat(chunks).toString()); }
  catch (e) { return res.writeHead(400, CORS).end('bad json'); }

  const { host, headers, body, referer } = spec;
  const out = { ...headers };
  delete out.host;
  if (referer) { out.referer = referer; out.origin = referer.replace(/\/$/, ''); }

  try {
    const r = await fetch(`https://${host}/`, { method: 'POST', headers: out, body });
    const text = await r.text();
    res.writeHead(200, { ...CORS, 'content-type': 'application/json' });
    res.end(JSON.stringify({ status: r.status, body: text.slice(0, 2000) }));
  } catch (e) {
    res.writeHead(200, { ...CORS, 'content-type': 'application/json' });
    res.end(JSON.stringify({ proxyError: e.message }));
  }
}).listen(PORT, () => console.log('cw-referer-proxy on http://localhost:' + PORT));
