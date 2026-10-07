// Cloud Brain seed: a CORS proxy to the Cloudflare API, in your own account. Holds no credential.
const cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE", "access-control-expose-headers": "cf-entrypoint", "access-control-max-age": "86400" };
export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/client/v4/")) return new Response("Cloud Brain seed", { headers: cors });
    const headers = new Headers();
    for (const name of ["authorization", "content-type"]) if (request.headers.has(name)) headers.set(name, request.headers.get(name));
    const upstream = await fetch("https://api.cloudflare.com" + url.pathname + url.search, { method: request.method, headers, body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body });
    const out = new Headers(upstream.headers);
    for (const [k, v] of Object.entries(cors)) out.set(k, v);
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
