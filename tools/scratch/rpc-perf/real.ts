// Real methods, from outside, in turn. bun real.ts [rounds]
import { BRAIN, FLOOR, NS, owner, call, timed, interleave, report, save } from "./lib.ts";
const rounds = Number(process.argv[2] || 100), B = BRAIN + NS;
const lease = await call(NS + "lease.get", { headers: owner });
console.log("lease held by a tab:", lease.data && lease.data.held);
const J = { ...owner, "content-type": "application/json" };
const cases: Record<string, () => Promise<any>> = {
  "floor": () => timed(FLOOR + "/"),
  "lease.get session": () => timed(B + "lease.get", { headers: owner }),
  "inbox.list session": () => timed(B + "inbox.list", { headers: owner }),
  "service.list anon": () => timed(B + "service.list"),
  "quota.get session": () => timed(B + "quota.get", { headers: owner }),
  "library.list anon": () => timed(B + "library.list"),
  "getFeedSkeleton anon (no feed)": () => timed(BRAIN + "/xrpc/app.bsky.feed.getFeedSkeleton?feed=" + encodeURIComponent("at://did:plc:x/app.bsky.feed.generator/perf")),
  "describeFeedGenerator anon": () => timed(BRAIN + "/xrpc/app.bsky.feed.describeFeedGenerator"),
  "library 304 session": () => timed(BRAIN + "/library/fairy-dog-calendar", { headers: { ...owner, "if-none-match": ETAG } }),
  "metrics.query anon 1 h": () => timed(B + "metrics.query")
};
// A poll by a tab that does not hold the lease reads the lease and nothing else. Only while another tab holds it.
if (lease.data && lease.data.held) cases["inbox.poll session, not holder"] = () => timed(B + "inbox.poll", { method: "POST", headers: J, body: JSON.stringify({ tab: "perf-probe" }) });
const head = await fetch(BRAIN + "/library/fairy-dog-calendar", { headers: { ...owner, "if-none-match": 'W/"x"', range: "bytes=0-0" } });
const sha = head.headers.get("x-library-sha256") || (head.headers.get("etag") || "").replace(/^W\/"|"$/g, "");
await head.body?.cancel();
const ETAG = 'W/"' + sha + '"';
console.log("library head", head.status, "sha known:", !!sha);
const out = await interleave(cases, rounds);
console.log(new Date().toISOString(), "rounds", rounds);
report(out);
const polls = (out["inbox.poll session, not holder"] || []).map((r) => r.body).filter((b) => /"held":true/.test(b)).length;
console.log("polls that took the lease (should be 0):", polls);
save("real-" + Date.now(), out);
