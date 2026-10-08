// Part 1: does an Upgrade pass kernel -> core -> service, as each kind of caller, on a method and on a path.
import { open, shake, session, token, call, save, P } from "./lib.ts";
const X = "/xrpc/" + P;
const tok = await token();
const cases: [string, string, string | null][] = [
  ["method, owner session", X + "wsprobe.ws", session],
  ["method, token", X + "wsprobe.ws", tok],
  ["method, anonymous (rule refuses)", X + "wsprobe.ws", null],
  ["open method, anonymous", X + "wsprobe.open", null],
  ["open method, owner session", X + "wsprobe.open", session],
  ["priced method, owner session", X + "wsprobe.paid", session],
  ["path, owner session", "/wsprobe/ws", session],
  ["path, anonymous", "/wsprobe/ws", null],
];
const out: any[] = [];
for (const [label, path, auth] of cases) {
  const h = await shake(path, auth), w = await open(path + "?every=400", auth, { wait: 1500, send: "ping" });
  out.push({ label, shake: h, ws: w });
  console.log(label.padEnd(36), "|", h.status, "|", h.servedBy || "-", "|", h.body.slice(0, 110), "| ws:", w.openMs != null ? `open ${w.openMs} ms, ${w.got.length} msgs` : `no (${w.error || ""} ${w.close ? w.close.code : ""})`);
}
const plain = await call("wsprobe.open", undefined, null);
console.log("plain GET, no upgrade:", plain.status, JSON.stringify(plain.body).slice(0, 200));
for (const m of ["ws", "paid"]) {
  const r = await call("wsclient.go?m=" + m);
  out.push({ label: "worker to worker " + m, r: r.body });
  console.log("worker -> core -> wsprobe." + m, r.status, JSON.stringify(r.body).slice(0, 500));
}
save("hops", out);
