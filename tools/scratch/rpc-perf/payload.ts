// Bodies of 1 KB, 1 MB and 20 MB up and down, through kernel -> core -> service and to the floor Worker. bun payload.ts
import { BRAIN, FLOOR, NS, owner, admin, timed, interleave, row, stats, save } from "./lib.ts";
const B = BRAIN + NS, all: any = {};
const body = (n: number) => { const b = new Uint8Array(n); for (let i = 0; i < n; i += 65536) crypto.getRandomValues(b.subarray(i, Math.min(n, i + 65536))); return b; };
for (const [label, n, rounds] of [["1 KB", 1024, 50], ["1 MB", 1 << 20, 20], ["20 MB", 20 << 20, 4]] as [string, number, number][]) {
  const b = body(n), H = { ...owner, "content-type": "application/octet-stream" };
  const out = await interleave({
    [`up ${label} floor buffer`]: () => timed(FLOOR + "/echo?mode=buffer", { method: "POST", body: b }),
    [`up ${label} brain buffer`]: () => timed(B + "perf.echo?mode=buffer", { method: "POST", headers: H, body: b }),
    [`up ${label} floor stream`]: () => timed(FLOOR + "/echo?mode=stream", { method: "POST", body: b }),
    [`up ${label} brain stream`]: () => timed(B + "perf.echo?mode=stream", { method: "POST", headers: H, body: b }),
    [`down ${label} floor`]: () => timed(FLOOR + "/bytes?n=" + n),
    [`down ${label} brain`]: () => timed(B + "perf.free?bytes=" + n)
  }, rounds, { warm: 1 });
  for (const [k, rs] of Object.entries(out)) console.log(row(k, rs.map((r) => r.ms), ` ttfb p50 ${stats(rs.map((r) => r.ttfb)).p50} status ${[...new Set(rs.map((r) => r.status))]} bytes ${rs[0].bytes} inside ${rs[0].body.slice(0, 60)}`));
  Object.assign(all, out);
}
// The 45 MB notebook: the library's path (kernel, core, library, core, static, R2) against one Worker and R2, and one Worker alone.
const N = 45362100;
console.log("r2 put", (await timed(FLOOR + "/r2/big?n=" + N, { method: "PUT", headers: admin() })).body);
const big = await interleave({
  "45 MB floor, made in the Worker": () => timed(FLOOR + "/bytes?n=" + N),
  "45 MB floor from R2": () => timed(FLOOR + "/r2/big", { headers: admin() }),
  "45 MB library (owner)": () => timed(BRAIN + "/library/fairy-dog-calendar", { headers: { ...owner, "accept-encoding": "identity" } })
}, 4, { warm: 0 });
for (const [k, rs] of Object.entries(big)) console.log(row(k, rs.map((r) => r.ms), ` ttfb p50 ${stats(rs.map((r) => r.ttfb)).p50} min ${stats(rs.map((r) => r.ttfb)).min} bytes ${rs[0].bytes} status ${rs[0].status} MB/s best ${(rs[0].bytes / 1e6 / (Math.min(...rs.map((r) => r.ms - r.ttfb)) / 1000)).toFixed(1)}`));
Object.assign(all, big);
console.log("r2 delete", (await timed(FLOOR + "/r2/big", { method: "DELETE", headers: admin() })).body);
save("payload-" + Date.now(), Object.fromEntries(Object.entries(all).map(([k, rs]: any) => [k, rs.map((r: any) => ({ ...r, body: r.body.slice(0, 80) }))])));
