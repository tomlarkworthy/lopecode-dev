// Shared by the RPC performance scripts. Reads the cb4 state file; prints no secret.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const st = JSON.parse(readFileSync(resolve(import.meta.dir, "../../cloud-brain/.emitted/cb4.json"), "utf8"));
export const BRAIN = `https://cb4.${st.subdomain}.workers.dev`;
export const FLOOR = `https://cbx-perf-floor.${st.subdomain}.workers.dev`;
export const NS = "/xrpc/com.lopecode.brain.";
export const owner = { authorization: "Bearer " + st.session };
const tokenFile = resolve(import.meta.dir, ".perf-token");
export const token = () => ({ authorization: "Bearer " + readFileSync(tokenFile, "utf8").trim() });
export const saveToken = (t: string) => writeFileSync(tokenFile, t);
export const hasToken = () => existsSync(tokenFile);
export const admin = () => ({ "x-perf-admin": readFileSync(resolve(import.meta.dir, ".floor-admin"), "utf8").trim() });
export const call = async (path: string, init: RequestInit = {}) => {
  const r = await fetch((path.startsWith("http") ? "" : BRAIN) + path, init);
  const text = await r.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, text, headers: r.headers };
};
export const post = (path: string, body: any, headers: any = owner) => call(path, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) });
export const stats = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), q = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
  const r = (x: number) => Math.round(x * 10) / 10;
  return { n: s.length, min: r(s[0]), p50: r(q(0.5)), p90: r(q(0.9)), p99: r(q(0.99)), max: r(s[s.length - 1]), mean: r(s.reduce((a, b) => a + b, 0) / s.length) };
};
export const row = (name: string, xs: number[], extra = "") => { const s = stats(xs); return `${name.padEnd(30)} n ${String(s.n).padStart(4)}  min ${String(s.min).padStart(6)}  p50 ${String(s.p50).padStart(6)}  p90 ${String(s.p90).padStart(6)}  p99 ${String(s.p99).padStart(6)}  max ${String(s.max).padStart(7)} ${extra}`; };
export const save = (name: string, data: any) => writeFileSync(resolve(import.meta.dir, "results", name + ".json"), JSON.stringify(data));
// One timed request. The body is read to its end. Returns ms, ttfb, status and the colo of the answer.
export const timed = async (url: string, init: RequestInit = {}) => {
  const t = performance.now();
  const r = await fetch(url, init);
  const ttfb = performance.now() - t;
  const buf = await r.arrayBuffer();
  return { ms: performance.now() - t, ttfb, status: r.status, bytes: buf.byteLength, colo: (r.headers.get("cf-ray") || "").split("-")[1] || "", perf: r.headers.get("x-perf") || "", price: r.headers.get("x-brain-price"), body: buf.byteLength < 4000 ? new TextDecoder().decode(buf) : "" };
};
// Cases run in turn, one call each a round, so drift in the network falls on all of them alike.
export const interleave = async (cases: Record<string, () => Promise<any>>, rounds: number, { warm = 3, gap = 0 } = {}) => {
  const out: Record<string, any[]> = Object.fromEntries(Object.keys(cases).map((k) => [k, []]));
  for (let i = -warm; i < rounds; i++)
    for (const [k, f] of Object.entries(cases)) {
      const r = await f();
      if (i >= 0) out[k].push(r);
      if (gap) await new Promise((r) => setTimeout(r, gap));
    }
  return out;
};
export const report = (out: Record<string, any[]>) => {
  for (const [k, rs] of Object.entries(out)) {
    const st = [...new Set(rs.map((r) => r.status))].join(","), colo = [...new Set(rs.map((r) => r.colo))].join(",");
    console.log(row(k, rs.map((r) => r.ms), ` status ${st} colo ${colo}`));
  }
};
