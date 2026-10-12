// The counts of tools/cloud-brain/records/dv-5-read-first-20-runs.md, from the lines logs.deploys answered
// on 2026-10-12 23:34:07 CEST, kept in tests/tools/fixtures/dv-5-deploy-lines.json (Cloudflare keeps 7 days).
//
//   bun tests/tools/dv-5-runs.ts          prints them
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const SPEC_TO = 1791711342999; // 09:35:42 UTC 2026-10-11, the last verdict line the spec counted
const OUT = new Set(["deploy.verified", "deploy.failed", "deploy.verify.none", "deploy.verify.stale"]);

export type Run = { t: number; target: string; hash: string; at: string; ms?: number; other?: number; tests?: number; page: "short" | "root" | null; reason?: string; deployer: string };

export const load = () => JSON.parse(readFileSync(resolve(import.meta.dir, "fixtures/dv-5-deploy-lines.json"), "utf8"));

// A run is a verdict line; its page is read from the deploy.verify line of that Worker and hash before it.
export function runsOf(lines: any[]): Run[] {
  const pending = new Map<string, any>();
  const runs: Run[] = [];
  for (const l of lines) {
    const key = l.target + " " + l.hash;
    if (l.at === "deploy.verify") pending.set(key, l);
    else if (OUT.has(l.at)) {
      const v = pending.get(key);
      pending.delete(key);
      runs.push({ t: l.t, target: l.target, hash: l.hash, at: l.at, ms: l.ms, other: l.otherTestsRan, tests: l.tests, reason: l.reason, deployer: l.deployer,
        page: v ? (v.run.includes("/static/shell/verify.html") ? "short" : "root") : null });
    }
  }
  return runs;
}

export const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b), n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
};
export const p90 = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.ceil(0.9 * s.length) - 1];
};
const count = <T>(xs: T[]) => {
  const c: Record<string, number> = {};
  for (const x of xs) c[String(x)] = (c[String(x)] ?? 0) + 1;
  return c;
};

export function group(rs: Run[]) {
  const ms = rs.filter((r) => r.ms != null).map((r) => r.ms!);
  return { runs: rs.length, verdicts: count(rs.map((r) => r.at.replace("deploy.", ""))), min: Math.min(...ms), median: median(ms), p90: p90(ms), max: Math.max(...ms),
    otherTestsRan: count(rs.filter((r) => r.other != null).map((r) => r.other)) };
}

export function summary(lines: any[] = load().lines) {
  const runs = runsOf(lines);
  const first = runs.find((r) => r.page === "short")!;
  const before = runs.filter((r) => r.t < first.t), after = runs.filter((r) => r.t >= first.t);
  const by = (rs: Run[]) => {
    const m = new Map<string, number[]>();
    for (const r of rs) if (r.ms != null) m.set(r.target, [...(m.get(r.target) ?? []), r.ms]);
    return m;
  };
  const b = by(before), a = by(after);
  const workers = [...new Set([...b.keys(), ...a.keys()])].sort().map((w) => ({ worker: w, before: b.get(w)?.length ?? 0, beforeMedian: b.has(w) ? median(b.get(w)!) : null, after: a.get(w)?.length ?? 0, afterMedian: a.has(w) ? median(a.get(w)!) : null }));
  const both = workers.filter((w) => w.before && w.after);
  return {
    switchedAt: first.t,
    pages: { before: count(before.map((r) => r.page)), after: count(after.map((r) => r.page)) },
    spec45: group(runs.filter((r) => r.t <= SPEC_TO)),
    before: group(before),
    first20: group(after.slice(0, 20)),
    after: group(after),
    first20Runs: after.slice(0, 20),
    none: after.map((r, i) => ({ n: i + 1, ...r })).filter((r) => r.at === "deploy.verify.none"),
    firstOther10: after.find((r) => r.other === 10)?.t,
    lastOther9: Math.max(...after.filter((r) => r.other === 9).map((r) => r.t)),
    deployersAfter: [...new Set(after.map((r) => r.deployer.slice(0, 12)))],
    hashesRunTwiceAfter: Object.values(count(after.map((r) => r.target + r.hash))).filter((n) => n > 1).length,
    putBacksAfter: lines.filter((l) => l.at === "deploy.put-back" && l.t >= first.t).map((l) => ({ t: l.t, target: l.target, reason: l.reason })),
    confirmedAfterNone: lines.filter((l) => l.at === "deploy.confirmed").map((l) => l.hash),
    workers, both: both.length, lower: both.filter((w) => w.afterMedian! < w.beforeMedian!).length,
    last: after[after.length - 1].t,
  };
}

export function report(): string[] {
  const out: string[] = [];
  const say = (...xs: unknown[]) => out.push(xs.join(" "));
  const utc = (t: number) => new Date(t).toISOString().slice(5, 19).replace("T", " ");
  const s = summary();
  const line = (name: string, g: ReturnType<typeof group>) =>
    say(name.padEnd(28), "runs", String(g.runs).padEnd(3), JSON.stringify(g.verdicts), "ms min", g.min, "median", g.median, "p90", g.p90, "max", g.max, "otherTestsRan", JSON.stringify(g.otherTestsRan));
  say("first run on shell/verify.html", utc(s.switchedAt), "UTC; last run read", utc(s.last), "UTC; pages", JSON.stringify(s.pages));
  line("the spec's 45, on /", s.spec45);
  line("every run before the file", s.before);
  line("the first 20 on the file", s.first20);
  line("every run since the file", s.after);
  s.first20Runs.forEach((r, i) => say(String(i + 1).padStart(2), utc(r.t), r.target.padEnd(18), r.hash.slice(0, 12), r.at.replace("deploy.", ""), "tests", r.tests, "other", r.other, "ms", r.ms));
  for (const r of s.none) say("none: run", r.n, utc(r.t), r.target, r.hash.slice(0, 12), "confirmed", s.confirmedAfterNone.includes(r.hash), "|", r.reason);
  say("otherTestsRan 9 last at", utc(s.lastOther9), "and 10 first at", utc(s.firstOther10!), "; deployers since", s.deployersAfter.join(" "), "; hashes run twice since", s.hashesRunTwiceAfter);
  for (const p of s.putBacksAfter) say("put-back since:", utc(p.t), p.target, "|", p.reason);
  for (const w of s.workers) say(w.worker.padEnd(20), "before", w.before, w.beforeMedian ?? "-", " after", w.after, w.afterMedian ?? "-");
  say("Workers run both ways", s.both, "; median lower since in", s.lower);
  return out;
}

if (import.meta.main) console.log(report().join("\n"));
