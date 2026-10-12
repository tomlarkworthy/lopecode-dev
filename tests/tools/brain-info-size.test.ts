// tools/cloud-brain/brain-info-size.ts: the size of the BRAIN_INFO the deployer would bind from an emitted record,
// refused where the record is written (tab-tests.ts --emit) and where it is sent (brain.ts apply).
// Issue brain-info-size-known-before-apply.
//
//   bun test --timeout=30000 ./tests/tools/brain-info-size.test.ts     # from the repo root, with the ./
// No browser and no Brain: the emit is given a record's text, and brain.ts a local stand-in for the deployer.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, existsSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { LIMIT, boundInfo, infoSize, infoRefusal, line } from "../../tools/cloud-brain/brain-info-size.ts";
import { emitAll, report } from "../../tools/cloud-brain/tab-tests.ts";

const TOOLS = resolve(import.meta.dir, "../../tools/cloud-brain");
const NS = "com.lopecode.brain.issue.";
// A record as the tracker declares its methods: one rule for each, written as tr-1 wrote it.
const record = (methods: number, pad = 0) => {
  const names = Array.from({ length: methods }, (_, i) => NS + "m" + String(i).padStart(2, "0"));
  return {
    hash: "a".repeat(64),
    meta: {
      worker: "brain-x-issues", role: "recipe", module: "@tomlarkworthy/brain-issues", calls: [], crons: [], flags: [], methods: names,
      access: Object.fromEntries(names.map((n) => [n, { type: "procedure", who: "owner", allow: "caller.kind in ['owner','token','worker','deployer']" }])),
      paths: [], secrets: ["ISSUES_SIGNING_KEY" + "X".repeat(pad)], resources: ["blobs", "sql"], cloudflare: [], bindings: [{ type: "d1", name: "SQL" }]
    },
    source: { module: "@tomlarkworthy/brain-issues", text: "const a = 1;" }
  };
};
// The record of n methods padded to exactly `bytes` of BRAIN_INFO.
const sized = (methods: number, bytes: number) => record(methods, bytes - infoSize(record(methods))!);

test("the fields are the ones the deployer binds: its own expression, read from the seed, gives the same JSON", () => {
  const seed = readFileSync(join(TOOLS, "brain-deployer.ojs"), "utf8");
  const at = seed.indexOf('name: "BRAIN_INFO",\n      json: {');
  expect(at).toBeGreaterThan(0);
  const from = seed.indexOf("{", seed.indexOf("json:", at)), text = seed.slice(from, seed.indexOf("\n", from));
  const deployers = new Function("m", "w", "return (" + text + ")");
  // A meta with every field, and one with the optional ones absent, as the deployer's `||` reads them.
  const full = record(3), bare = { hash: "b".repeat(64), meta: { worker: "brain-x-w", role: "recipe", methods: [], paths: [], secrets: [], resources: [] } };
  for (const rec of [full, bare]) {
    const theirs = deployers(rec.meta, { hash: rec.hash });
    expect(theirs.deployedAt).toHaveLength(24);
    expect(JSON.stringify({ ...theirs, deployedAt: boundInfo(rec).deployedAt })).toBe(JSON.stringify(boundInfo(rec)));
  }
});

test("a record at the limit fits and one byte over is refused, with the size, the limit and the Worker", () => {
  const at = sized(28, LIMIT), over = sized(28, LIMIT + 1);
  expect([infoSize(at), infoSize(over)]).toEqual([LIMIT, LIMIT + 1]);
  expect(infoRefusal(at)).toBe(null);
  expect(infoRefusal(over)).toStartWith(`BRAIN_INFO of brain-x-issues would be ${LIMIT + 1} bytes, 1 over the limit of ${LIMIT} (28 methods)`);
  expect(infoRefusal(over, LIMIT + 1)).toBe(null);
  expect(line("brain-x-issues", LIMIT + 1, 28)).toBe(`brain-x-issues ${LIMIT + 1} of ${LIMIT}, 28 methods, OVER by 1`);
  expect(line("brain-x-issues", LIMIT, 28)).toBe(`brain-x-issues ${LIMIT} of ${LIMIT}, 28 methods, 0 bytes left`);
});

test("the size is bytes and not characters, and grows by a method's name twice and its rule", () => {
  const plain = record(1), wide = record(1);
  wide.meta.secrets = ["ISSUES_SIGNING_KEé"];
  plain.meta.secrets = ["ISSUES_SIGNING_KEe"];
  expect(infoSize(wide)! - infoSize(plain)!).toBe(1);
  const one = infoSize(record(11))! - infoSize(record(10))!;
  expect(one).toBe(2 * (NS + "m10").length + JSON.stringify({ type: "procedure", who: "owner", allow: "caller.kind in ['owner','token','worker','deployer']" }).length + '"",'.length + '"":,'.length);
  // What no record of this shape reaches: the count of methods where the next is refused.
  const most = Array.from({ length: 60 }, (_, i) => i).findLast((n) => !infoRefusal(record(n)))!;
  expect(infoRefusal(record(most + 1))).toContain(`(${most + 1} methods)`);
});

test("what is not a Worker's record is not measured and not refused", () => {
  for (const not of [null, undefined, {}, { meta: {} }, { meta: { worker: 7 } }, "text", 0, []]) expect([infoSize(not), infoRefusal(not)]).toEqual([null, null]);
  // The records brain.ts is tested with elsewhere: a meta of a name and its secrets.
  expect(infoRefusal({ hash: "a".repeat(64), meta: { worker: "brain-x-w", secrets: [] } })).toBe(null);
});

test("the emit writes no file for a record over the limit, says why whole, and the run is exit 2", async () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "brain-info-size-")));
  const texts: Record<string, string> = { fits_service: JSON.stringify(sized(28, LIMIT)), big_service: JSON.stringify(sized(28, LIMIT + 1)) };
  const emit = [{ cell: "big_service", file: join(dir, "big.json") }, { cell: "fits_service", file: join(dir, "fits.json") }];
  const { emitted, notEmitted } = await emitAll(emit, [], async (cell) => texts[cell]);
  expect(existsSync(join(dir, "big.json"))).toBe(false);
  expect(readFileSync(join(dir, "fits.json"), "utf8")).toBe(texts.fits_service);
  expect(emitted).toEqual([{ cell: "fits_service", file: join(dir, "fits.json"), hash: "a".repeat(64), bytes: texts.fits_service.length }]);
  expect(notEmitted).toEqual(["big_service " + infoRefusal(sized(28, LIMIT + 1))]);
  expect(notEmitted[0].length).toBeGreaterThan(300);
  expect(report(["test_a"], [], emitted, notEmitted).exit).toBe(2);
  // As before: nothing after a failed test, and a throw of the emit is named.
  const after = await emitAll([{ cell: "fits_service", file: join(dir, "no.json") }], ["test_a x"], async (cell) => texts[cell]);
  expect([after.emitted, after.notEmitted, existsSync(join(dir, "no.json"))]).toEqual([[], ["fits_service a test failed"], false]);
  const thrown = await emitAll([{ cell: "x_service", file: join(dir, "x.json") }], [], async () => { throw new Error("no cell\nat line 2"); });
  expect([thrown.notEmitted, existsSync(join(dir, "x.json"))]).toEqual([["x_service no cell"], false]);
});

// brain.ts with a stand-in for the deployer that counts every request, getState among them.
const rig = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "brain-info-apply-")));
  copyFileSync(join(TOOLS, "brain.ts"), join(dir, "brain.ts"));
  copyFileSync(join(TOOLS, "brain-info-size.ts"), join(dir, "brain-info-size.ts"));
  const RUNS = "c".repeat(64), requests: string[] = [], sent: any[] = [];
  writeFileSync(join(dir, "seen.json"), JSON.stringify({ t: { "brain-x-issues": { hash: RUNS, at: Date.parse("2026-10-10T12:00:00Z") } } }));
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: async (req) => {
    requests.push(new URL(req.url).pathname.split(".").at(-1)!);
    if (req.url.endsWith("infra.getState")) return Response.json({ workers: [{ worker: "brain-x-issues", hash: RUNS, deployedAt: 1 }] });
    const body: any = await req.json();
    sent.push(...(body.workers || []));
    return Response.json({ results: (body.workers || []).map(() => ({ worker: "brain-x-issues", state: "deployed", hash: "a".repeat(64) })) });
  } });
  writeFileSync(join(dir, "t.json"), JSON.stringify({ recoveryKey: "key-for-the-test", deployerScript: "t-deployer", subdomain: "none", deployerUrl: `http://127.0.0.1:${server.port}` }));
  const run = async (...args: string[]) => {
    const p = Bun.spawn(["bun", join(dir, "brain.ts"), ...args], { env: { ...process.env, BRAIN_BASE: "t", BRAIN_STATE_DIR: dir }, stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    return { out, exit: await p.exited };
  };
  return { dir, run, requests, sent, stop: () => server.stop(true) };
};

test("brain.ts apply of a record over the limit sends nothing, not even with --force, and is exit 1", async () => {
  const r = rig();
  try {
    writeFileSync(join(r.dir, "big.json"), JSON.stringify(sized(28, LIMIT + 1)));
    for (const flags of [[], ["--force"], ["--over-unverified"]]) {
      const { out, exit } = await r.run("apply", "big.json", "--reason=test", ...flags);
      expect(out).toContain(`big.json not sent: BRAIN_INFO of brain-x-issues would be ${LIMIT + 1} bytes, 1 over the limit of ${LIMIT} (28 methods)`);
      expect(exit).toBe(1);
    }
    expect([r.requests, r.sent]).toEqual([[], []]);
  } finally { r.stop(); }
});

test("brain.ts apply sends the record at the limit, and of two records the one that fits", async () => {
  const r = rig();
  try {
    writeFileSync(join(r.dir, "big.json"), JSON.stringify(sized(28, LIMIT + 1)));
    writeFileSync(join(r.dir, "fits.json"), JSON.stringify(sized(28, LIMIT)));
    const both = await r.run("apply", "big.json", "fits.json", "--reason=test");
    expect(both.out).toContain("big.json not sent: BRAIN_INFO of brain-x-issues would be");
    expect(both.out).toContain('fits.json');
    expect(both.out).toContain('"state":"deployed"');
    expect(both.exit).toBe(1);
    expect(r.requests).toEqual(["getState", "apply"]);
    expect(r.sent.map((w) => w.module)).toEqual(["@tomlarkworthy/brain-issues"]);
  } finally { r.stop(); }
});
