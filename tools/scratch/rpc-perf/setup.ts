// bun setup.ts up | down : the token, the secret and the rows the scratch services read.
import { call, post, NS, owner, saveToken, token, hasToken } from "./lib.ts";
import { unlinkSync } from "node:fs";
import { resolve } from "node:path";
const P = "com.lopecode.brain.";
if (process.argv[2] === "up") {
  const methods = ["perf", "perf2", "perf3"].flatMap((s) => ["free", "owner", "priced", "fail", "settle", "chain", "chainp", "headers", "inside", "echo"].map((m) => `${P}${s}.${m}`));
  await post(NS + "token.revoke", { name: "perf" });
  const t = await post(NS + "token.create", { name: "perf", methods });
  if (t.status !== 200) throw new Error("token.create " + t.status + " " + t.text.slice(0, 200));
  saveToken(t.data.token);
  console.log("token perf made, methods", methods.length);
  console.log("secret.put", (await post(NS + "secret.put", { name: "PERF_SECRET", value: "perf" })).status, "setRule", (await post(NS + "secret.setRule", { name: "PERF_SECRET", allow: 'caller.worker == "brain-x-perf"' })).status);
  const s = await call(NS + "perf.inside?op=setup&len=0&sql=1", { headers: owner });
  console.log("inside setup", s.status, s.text.slice(0, 200));
} else {
  console.log("inside clean", (await call(NS + "perf.inside?op=clean", { headers: owner })).text.slice(0, 200));
  console.log("secret.delete", (await post(NS + "secret.delete", { name: "PERF_SECRET" })).text.slice(0, 100));
  console.log("token.revoke", (await post(NS + "token.revoke", { name: "perf" })).text.slice(0, 100));
  if (hasToken()) unlinkSync(resolve(import.meta.dir, ".perf-token"));
}
