import { call, NS, owner, FLOOR } from "./lib.ts";
for (const [k, h] of [["anon", {}], ["session", owner]] as any) {
  const r = await call(NS + "perf.headers", { headers: h });
  console.log(k, "request headers at the service:", r.data.bytes, "bytes;", r.data.headers.filter(([n]: any) => n.startsWith("x-brain")).map(([n, l]: any) => `${n}:${l}`).join(" "));
  console.log("  all:", r.data.headers.map(([n, l]: any) => `${n}:${l}`).join(" "));
  console.log("  response x-brain-served-by:", r.headers.get("x-brain-served-by"));
}
const c = await call(NS + "perf.chain?d=3");
console.log("chain 4 response served-by:", c.headers.get("x-brain-served-by"), "| body bytes", c.text.length);
