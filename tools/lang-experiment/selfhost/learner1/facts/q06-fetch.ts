import { toSrcs, type Cand } from "./h.ts";
const F = (name: string, body: string, extra: Partial<Cand> = {}): Cand => ({ name, src: `const r = async (fetch: Fetch) => { const res = await fetch("x.json"); ${body} };`, show: ["r"], fetchBody: '{"a":1}', ...extra });
export const cands: Cand[] = [
  F("accept-ok-boolean", `const b: boolean = res.ok; return b;`),
  F("reject-ok-not-string", `const b: string = res.ok; return b;`),
  F("accept-status-number", `const n: number = res.status; return n;`),
  F("reject-status-not-string", `const n: string = res.status; return n;`),
  F("accept-json-unknown", `const v: unknown = await res.json(); return typeof v;`),
  F("reject-json-not-record", `const v: { readonly a: number } = await res.json(); return v.a;`),
  F("accept-text-string", `const t: string = await res.text(); return t.length;`),
  F("accept-arrayBuffer", `const b: ArrayBuffer = await res.arrayBuffer(); return b.byteLength;`),
  F("member-headers", `return res.headers;`),
  F("member-statusText", `return res.statusText;`),
  F("member-blob", `return await res.blob();`),
  F("member-clone", `return res.clone().ok;`),
  F("member-body", `return res.body;`),
  F("member-url", `return res.url;`),
  F("reject-response-as-cell-value", `return res;`),
  F("reject-response-in-record", `return { res };`),
  F("read-body-twice", `const a = await res.text(); const b = await res.text(); return a + b;`),
  { name: "reject-response-passed-to-other-cell", src: `const r = async (fetch: Fetch) => await fetch("x.json");
const s = async (r) => await r.text();`, fetchBody: '{"a":1}' },
  { name: "reject-nested-fn-captures-response", src: `const r = async (fetch: Fetch) => { const res = await fetch("x.json"); const read = async () => await res.text(); return await read(); };`, fetchBody: "hi", show: ["r"] },
  F("accept-cast-json", `const c = cast<{ readonly a: number }>(await res.json()); return c.ok ? c.value.a : -1;`),
  F("accept-init-method-headers", `return res.status;`.replace("", ""), { src: `const r = async (fetch: Fetch) => { const res = await fetch("x", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); return res.status; };` }),
];
export const srcs = toSrcs(cands);
