// brain.ts apply, remove and saw against seen.json, with a local stand-in for the deployer.
// Issue seen-json-6-of-19-workers: a Worker with no entry was refused with advice to merge, when the seed was ahead.
//
//   cd tests/tools && bun test brain-seen.test.ts      # not from the repo root, see brain-cli.test.ts
//   BRAIN_TS=/path/to/another/brain.ts bun test …
// Each test runs a copy of brain.ts in a directory of its own: seen.json is read beside the script.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, utimesSync, realpathSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const script = process.env.BRAIN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/brain.ts");
const RUNS = "a".repeat(64), BUILT = "b".repeat(64), DEPLOYED = Date.parse("2026-10-10T12:00:00Z");

const rig = (seen?: any) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "brain-seen-")));
  copyFileSync(script, join(dir, "brain.ts"));
  if (seen) writeFileSync(join(dir, "seen.json"), JSON.stringify({ t: seen }));
  const posts: any[] = [];
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: async (req) => {
    if (req.url.endsWith("infra.getState")) return Response.json({ workers: [{ worker: "brain-x-w", hash: RUNS, deployedAt: DEPLOYED }] });
    const body: any = await req.json();
    posts.push(body);
    return Response.json({ results: (body.workers || []).map(() => ({ worker: "brain-x-w", state: "deployed", hash: BUILT })) });
  } });
  writeFileSync(join(dir, "t.json"), JSON.stringify({ recoveryKey: "key-for-the-test", deployerScript: "t-deployer", subdomain: "none", deployerUrl: `http://127.0.0.1:${server.port}` }));
  const emit = (name: string, hash: string, mtime?: number) => {
    writeFileSync(join(dir, name), JSON.stringify({ hash, meta: { worker: "brain-x-w", secrets: [] }, source: { module: "@t/w", text: "const a = 1;" } }));
    if (mtime) utimesSync(join(dir, name), mtime / 1000, mtime / 1000);
  };
  const run = async (...args: string[]) => {
    const p = Bun.spawn(["bun", join(dir, "brain.ts"), ...args], { env: { ...process.env, BRAIN_BASE: "t", BRAIN_STATE_DIR: dir }, stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    await p.exited;
    return out;
  };
  const seenNow = () => (existsSync(join(dir, "seen.json")) ? JSON.parse(readFileSync(join(dir, "seen.json"), "utf8")).t : undefined);
  return { run, emit, posts, seenNow, stop: () => server.stop(true) };
};

test("apply of a Worker with no entry is not sent, and says the seed may be ahead and what to compare", async () => {
  const r = rig();
  try {
    r.emit("w.json", BUILT);
    const out = await r.run("apply", "w.json", "--reason=test");
    expect(r.posts).toEqual([]);
    expect(out).toContain("w.json not sent: brain-x-w runs aaaaaaaaaaaa and seen.json has no entry for it");
    expect(out).toContain("does not say it changed elsewhere");
    expect(out).toContain('getSource?worker=brain-x-w", field text');
    expect(out).toContain("source.text of w.json");
    expect(out).toContain("the seed is ahead: saw brain-x-w, then apply w.json again");
    expect(out).toContain("merge it into the seed, build and emit again, then: saw brain-x-w");
    expect(out).not.toContain("--owner");
    expect(r.seenNow()).toBeUndefined();
  } finally { r.stop(); }
});

test("apply of a Worker with no entry whose record has the hash that runs says there is nothing to deploy", async () => {
  const r = rig();
  try {
    r.emit("w.json", RUNS);
    const out = await r.run("apply", "w.json", "--reason=test");
    expect(r.posts).toEqual([]);
    expect(out).toContain("w.json has the same hash, so the seed builds to what runs and there is nothing to deploy: saw brain-x-w");
    expect(out).not.toContain("Compare what runs");
  } finally { r.stop(); }
});

test("remove of a Worker with no entry is not sent and names the read, with no session", async () => {
  const r = rig();
  try {
    const out = await r.run("remove", "brain-x-w", "--reason=test");
    expect(r.posts.map((p) => p.remove)).toEqual([[]]);
    expect(out).toContain("brain-x-w not sent: brain-x-w runs aaaaaaaaaaaa and seen.json has no entry for it");
    expect(out).toContain("then: saw brain-x-w");
    expect(out).not.toContain("--owner");
  } finally { r.stop(); }
});

test("saw with no name lists a Worker with no entry and says its first apply is refused", async () => {
  const r = rig();
  try {
    const out = await r.run("saw");
    expect(out).toMatch(/brain-x-w\s+none\s+no entry: its first apply from here is refused until its source is compared and: saw brain-x-w/);
    expect(r.seenNow()).toBeUndefined();
  } finally { r.stop(); }
});

test("saw NAME records the hash that runs with the time it was deployed; a record emitted after that is sent, one before is refused", async () => {
  const r = rig();
  try {
    r.emit("old.json", BUILT, DEPLOYED - 60_000);
    r.emit("new.json", BUILT, DEPLOYED + 60_000);
    await r.run("saw", "brain-x-w");
    expect(r.seenNow()).toEqual({ "brain-x-w": { hash: RUNS, at: DEPLOYED } });
    const old = await r.run("apply", "old.json", "--reason=test");
    expect(old).toContain("old.json not sent: old.json was emitted before brain-x-w last changed");
    expect(r.posts).toEqual([]);
    await r.run("apply", "new.json", "--reason=test");
    expect(r.posts.length).toBe(1);
    expect(r.posts[0].workers[0].was).toBe(RUNS);
    expect(r.seenNow()["brain-x-w"].hash).toBe(BUILT);
    expect(r.seenNow()["brain-x-w"].at).toBeGreaterThan(DEPLOYED + 60_000);
  } finally { r.stop(); }
});
