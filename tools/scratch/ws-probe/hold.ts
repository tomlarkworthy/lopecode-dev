// Holds one WebSocket through kernel -> core -> service: a ping every 30 s, a server tick every 60 s. Reports how it ended.
import { session, save, HOST, P } from "./lib.ts";
const minutes = Number(process.argv[2] || 10), quiet = process.argv[3] === "quiet";
const ws = new (WebSocket as any)(`wss://${HOST}/xrpc/${P}wsprobe.ws?every=${quiet ? 600000 : 60000}`, { headers: { authorization: "Bearer " + session } });
const t0 = Date.now(), out: any = { minutes, quiet, pings: 0, echoes: 0, ticks: 0 };
const done = (how: any) => { out.how = how; out.heldS = Math.round((Date.now() - t0) / 1000); save("hold", out); console.log(JSON.stringify(out)); process.exit(0); };
ws.onopen = () => { if (!quiet) setInterval(() => { ws.send("ping " + ++out.pings); }, 30000); setTimeout(() => { ws.close(1000, "held"); }, minutes * 60000); };
ws.onmessage = (e: any) => { const d = String(e.data); if (d.startsWith("ping")) out.echoes++; else if (d.includes('"tick"')) out.ticks++; };
ws.onclose = (e: any) => done({ close: e.code, reason: e.reason });
ws.onerror = (e: any) => { out.error = String(e.message || e.type); };
