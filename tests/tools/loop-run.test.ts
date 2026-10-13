// loop.ts run [--dry]: the driver that makes steps, with the lock `loop` (st-5-driver; part 4 of
// plan/cloud-brain-orchestrator-as-steps.md; tools/cloud-brain/records/st-5-driver.md).
//
//   bun test --timeout=30000 ./tests/tools/loop-run.test.ts
// The cases of `drive` have a stand-in for everything the driver asks of the machine and the cluster, the clock among
// them: a sleep returns when the stand-in's time has passed it, and no case waits. The cases of `loop.ts run` start
// the program with stand-ins for brain.ts, lock.sh, issue-as.sh and the step, and stop it with a signal. The cases of
// loop.sh have a stand-in for safehouse and a metadev of their own. No case calls cb4.
import { test, expect, afterAll } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { drive, madeMove, idle, EVERY_MS, CLOCK_MS, RENEW_MS, TOKEN_MS, FOLLOW_MOST, type Driver } from "../../tools/cloud-brain/loop.ts";

type Ev = Record<string, any>;
const S = 1000, H = 3600 * S;
// The stand-in: a clock, a lock one holder has, a record of events, and steps that answer what a case queued for them.
function rig(more: Partial<Driver> & { takes?: number[]; renews?: number[]; releases?: number[]; tokens?: string[]; stepMs?: number } = {}) {
  let now = 0, n = 0, stop = Infinity;
  const sleepers: { at: number; wake: () => void }[] = [];
  const pump = () => setImmediate(() => { const s = sleepers.sort((a, b) => a.at - b.at).shift(); if (s) { now = Math.max(now, s.at); s.wake(); } });
  const sleep = (ms: number) => new Promise<void>((wake) => { sleepers.push({ at: now + ms, wake }); pump(); });
  const R = { log: [] as string[], notes: [] as string[], steps: [] as { at: number; why: string; token: string }[], events: [] as Ev[], seq: 100, back: [] as string[], open: 0,
    lines: [] as (Ev | null)[], running: 0, most: 0, held: "", stopAt: (ms: number) => { stop = ms; }, at: () => now };
  const codes = { take: more.takes || [], renew: more.renews || [], release: more.releases || [] };
  const d: Driver = {
    dry: false, host: "m1", now: () => now, sleep, stopped: () => now >= stop,
    token: () => { const t = more.tokens ? more.tokens.shift() ?? "" : `orch-00000${++n}`; R.log.push(`${now / S} token ${t || "none"}`); return t; },
    revoke: (t) => { R.log.push(`${now / S} revoke ${t}`); return "ended"; },
    lock: (cmd, t) => {
      const code = codes[cmd].shift() ?? 0;
      R.log.push(`${now / S} ${cmd} ${t} ${code}`);
      if (code === 0) R.held = cmd === "release" ? "" : t;
      return { code, said: code === 0 ? `loop ${cmd} by orchestrator-m1` : code === 1 ? "loop is held by orchestrator-fly since a, until b. Not taken." : "cb4 was not reached [000]" };
    },
    step: async (token, why) => {
      R.steps.push({ at: now, why, token }); R.most = Math.max(R.most, ++R.running);
      const seq = R.seq;                                               // the queue's, read as the step begins
      if (more.stepMs) await sleep(more.stepMs);
      R.running--;
      const line = R.lines.length ? R.lines.shift()! : { health: { ok: true }, acts: [] };
      return line && { seq, ...line };
    },
    seq: () => R.seq,
    events: (_t, after) => R.events.filter((e) => e.seq > after),
    returned: () => R.back, open: () => R.open,
    note: (t) => R.notes.push(t),
    ...Object.fromEntries(Object.entries(more).filter(([k]) => !["takes", "renews", "releases", "tokens", "stepMs"].includes(k))),
  };
  const event = (holder: string, e: Ev = {}) => { const x = { seq: ++R.seq, type: "commented", by: { holder: "secret:" + holder, via: "delegation:d" }, ...e }; R.events.push(x); return x; };
  return { d, R, event, sleep };
}
const whys = (R: { steps: { at: number; why: string }[] }) => R.steps.map((s) => `${s.at / S} ${s.why}`);
const moved = (seq: number, act = "ready") => ({ seq, health: { ok: true }, acts: [{ act, id: "a", event: seq + 1 }] });

test("the constants are the spec's: a read every 30 s, a step for the clock at 1,800 s, a renew every 120 s, a new token at 40 hours", () => {
  expect([EVERY_MS, CLOCK_MS, RENEW_MS, TOKEN_MS]).toEqual([30_000, 1_800_000, 120_000, 40 * 3_600_000]);
});

test("it makes its token, takes `loop` with it, makes the first step for the clock, and at a stop releases the lock and ends the token", async () => {
  const { d, R } = rig();
  R.stopAt(60 * S);
  expect(await drive(d)).toBe(0);
  expect(R.log).toEqual(["0 token orch-000001", "0 take orch-000001 0", "60 release orch-000001 0", "60 revoke orch-000001"]);
  expect(R.steps).toEqual([{ at: 0, why: "clock", token: "orch-000001" }]);
  expect(R.notes).toEqual(["stopped. `loop`: loop release by orchestrator-m1. The token orch-000001 is ended"]);
});

test("a take that is refused: exit 1 with the holder named, no step, and the token it made is ended; cb4 not reached, or no token: exit 2", async () => {
  let r = rig({ takes: [1] });
  expect(await drive(r.d)).toBe(1);
  expect([r.R.steps, r.R.log]).toEqual([[], ["0 token orch-000001", "0 take orch-000001 1", "0 revoke orch-000001"]]);
  expect(r.R.notes).toEqual(["`loop` was not taken: loop is held by orchestrator-fly since a, until b. Not taken.. No step was made; the token orch-000001 is ended"]);
  r = rig({ takes: [2] });
  expect(await drive(r.d)).toBe(2);
  expect([r.R.steps, r.R.log]).toEqual([[], ["0 token orch-000001", "0 take orch-000001 2", "0 revoke orch-000001"]]);
  r = rig({ tokens: [""] });
  expect(await drive(r.d)).toBe(2);
  expect([r.R.steps, r.R.log]).toEqual([[], ["0 token none"]]);
  expect(r.R.notes).toEqual(["agent-token made no token for the driver: nothing was taken and no step made"]);
});

test("a step for an event of another token, at the next read; none for an event of the driver's own token", async () => {
  const { d, R, event, sleep } = rig();
  R.stopAt(200 * S);
  const done = drive(d);
  await sleep(40 * S); event("orch-000001", { type: "cost" });       // its own: read at 60 s, no reason
  await sleep(60 * S); event("impl-aaaaaa");                         // a writer's, at 100 s: read at 120 s
  expect(await done).toBe(0);
  expect(whys(R)).toEqual(["0 clock", "120 event"]);
});

test("a step for a run that returned, once a file; and a step for the clock 1,800 s after the last one for the clock", async () => {
  const { d, R, event, sleep } = rig();
  R.stopAt(3700 * S);
  const done = drive(d);
  await sleep(45 * S); R.back = ["impl-aaaaaa"];                     // no step ends it here: it stays in the list
  await sleep(900 * S); event("rev-bbbbbb");
  expect(await done).toBe(0);
  expect(whys(R)).toEqual(["0 clock", "60 run", "960 event", "1800 clock", "3600 clock"]);
});

test("a step that made a move is followed at once by a step for an event, until one makes none; comments, cost events, a duplicate and a refusal are followed by none", async () => {
  const { d, R } = rig();
  R.lines = [moved(100), moved(102, "back"), moved(104, "digest"), { seq: 106, health: { ok: true }, acts: [{ act: "start", id: "a", role: "implementer", exit: 0 }, { act: "ended", token: "t", exit: 0 }, { act: "ready", id: "b", event: 90, duplicate: true }, { act: "finish", id: "c", refused: "403" }] }];
  R.stopAt(50 * S);
  expect(await drive(d)).toBe(0);
  expect(whys(R)).toEqual(["0 clock", "0 event", "0 event", "0 event"]);
  expect([madeMove(null), madeMove({ acts: [] }), madeMove(moved(1, "finish")), madeMove(moved(1, "reject")), madeMove({ acts: [{ act: "ready", id: "a" }] })]).toEqual([false, false, true, true, false]);
});

test(`after ${FOLLOW_MOST} steps one after another that each made a move, the next waits for a reason`, async () => {
  const { d, R } = rig();
  R.lines = Array.from({ length: 30 }, (_, i) => moved(100 + i));
  R.stopAt(20 * S);
  expect(await drive(d)).toBe(0);
  expect(R.steps.length).toBe(FOLLOW_MOST + 1);
  expect(R.notes[0]).toBe(`${FOLLOW_MOST} steps one after another each made a move: the next step waits for a reason`);
});

test("`loop` is renewed every 120 s, also while a step runs, and one step runs at a time", async () => {
  const { d, R, event, sleep } = rig({ stepMs: 400 * S });
  R.stopAt(900 * S);
  const done = drive(d);
  await sleep(10 * S); event("impl-aaaaaa");
  expect(await done).toBe(0);
  const renews = R.log.filter((l) => / renew /.test(l)).map((l) => Number(l.split(" ")[0]));
  expect(renews.length).toBeGreaterThanOrEqual(6);
  for (let i = 1; i < renews.length; i++) expect(renews[i] - renews[i - 1]).toBeLessThanOrEqual(150);
  expect(renews.filter((t) => t < 400).length).toBeGreaterThanOrEqual(3);      // the first step ran from 0 to 400 s
  expect([R.most, whys(R).slice(0, 2)]).toEqual([1, ["0 clock", "430 event"]]);
});

test("a renew that is refused ends the driver after the step that runs, exit 1, with no release; one cb4 did not answer is asked again", async () => {
  let r = rig({ renews: [2, 0, 1] });
  r.R.stopAt(9999 * S);
  expect(await drive(r.d)).toBe(1);
  expect(r.R.log.filter((l) => !/ token /.test(l))).toEqual(["0 take orch-000001 0", "120 renew orch-000001 2", "150 renew orch-000001 0", "270 renew orch-000001 1", "270 revoke orch-000001"]);
  expect(r.R.notes).toEqual(["`loop` was not renewed: cb4 was not reached [000]. It is asked again in 30 s", "`loop` is no longer this driver's: loop is held by orchestrator-fly since a, until b. Not taken.. No more steps; the token orch-000001 is ended"]);
  // Lost while a step runs: the step ends, and no other is begun.
  r = rig({ renews: [1], stepMs: 300 * S });
  r.event("impl-aaaaaa");
  expect(await drive(r.d)).toBe(1);
  expect([r.R.steps.length, r.R.most, r.R.log.some((l) => / release /.test(l))]).toEqual([1, 1, false]);
});

test("a step that printed no line, or one with an error: the driver goes on at the next reason, and the step after a step that was not healthy is the clock's", async () => {
  const { d, R, event, sleep } = rig();
  R.lines = [null, { seq: 0, error: "queue?limit=1 answered 502", health: { ok: true }, acts: [] }, { health: { ok: false, failed: ["redistil: brain-x-page is differs"] }, acts: [] }];
  R.stopAt(400 * S);
  const done = drive(d);
  for (const at of [70, 130, 190, 250, 310]) { await sleep(at * S - R.at()); event("impl-aaaaaa"); }
  expect(await done).toBe(0);
  // 0: no line. 30: the seq is read. 90, 150, 210: an event after a step that was not healthy. 270, 330: after one that was.
  expect(whys(R)).toEqual(["0 clock", "90 clock", "150 clock", "210 clock", "270 event", "330 event"]);
});

test("a step whose line has `unlogged` is said on stderr at each such step, and the driver goes on; a line with none is not said", async () => {
  const { d, R, event, sleep } = rig();
  const out = { token: "impl-9a4e0e", by: "orch-000001", said: "Not logged in · Please run /login" };
  R.lines = [{ health: { ok: true }, acts: [], unlogged: out }, { health: { ok: true }, acts: [], unlogged: out }, { health: { ok: true }, acts: [] }];
  R.stopAt(200 * S);
  const done = drive(d);
  for (const at of [40, 100]) { await sleep(at * S - R.at()); event("impl-aaaaaa"); }
  expect(await done).toBe(0);
  const said = 'no agent is started: the result of impl-9a4e0e says its process is not logged in ("Not logged in · Please run /login"). The steps go on and start none: stop the driver, log `claude` in where it runs, and start it again';
  expect([whys(R), R.notes.slice(0, -1)]).toEqual([["0 clock", "60 event", "120 event"], [said, said]]);
});

test("at 40 hours, between two steps: a new token, `loop` released and taken with it, the old one ended; an event of the old token is still no reason", async () => {
  const { d, R, event, sleep } = rig();
  R.stopAt(40 * H + 100 * S);
  const done = drive(d);
  await sleep(40 * H + 10 * S); event("orch-000001"); event("orch-000002");
  expect(await done).toBe(0);
  const at = 40 * H / S;
  expect(R.log.filter((l) => !/ renew /.test(l))).toEqual(["0 token orch-000001", "0 take orch-000001 0", `${at} token orch-000002`, `${at} release orch-000001 0`, `${at} take orch-000002 0`, `${at} revoke orch-000001`,
    `${at + 120} release orch-000002 0`, `${at + 120} revoke orch-000002`]);
  expect(R.steps.filter((s) => s.at > 40 * H)).toEqual([]);
  expect(R.steps.every((s) => s.why === "clock" && s.token === "orch-000001")).toBe(true);
  expect(R.log.filter((l) => / renew /.test(l) && Number(l.split(" ")[0]) > at).every((l) => / orch-000002 /.test(l))).toBe(true);
});

test("at 40 hours with no new token the old one is kept and asked again; a release cb4 did not answer leaves the lock and ends the new token; a take that is refused is exit 1, one cb4 did not answer exit 2, a release that is refused exit 1", async () => {
  let r = rig({ tokens: ["orch-000001", "", "orch-000002"] });
  r.R.stopAt(40 * H + 45 * S);
  expect(await drive(r.d)).toBe(0);
  expect(r.R.log.filter((l) => / (token|take|release|revoke) /.test(l)).slice(2, 7).map((l) => l.replace(/^\d+ /, ""))).toEqual(["token none", "token orch-000002", "release orch-000001 0", "take orch-000002 0", "revoke orch-000001"]);
  r = rig({ releases: [2] });
  r.R.stopAt(40 * H + 15 * S);
  expect(await drive(r.d)).toBe(0);
  expect(r.R.notes[0]).toBe("`loop` was not released for a new token: cb4 was not reached [000]. The new token orch-000002 is ended");
  expect(r.R.held).toBe("");                                          // the stop's release, with the old token
  expect(r.R.log.slice(-2)).toEqual([`${40 * H / S + 30} release orch-000001 0`, `${40 * H / S + 30} revoke orch-000001`]);
  r = rig({ takes: [0, 1] });
  r.R.stopAt(41 * H);
  expect(await drive(r.d)).toBe(1);
  expect(r.R.log.slice(-2)).toEqual([`${40 * H / S} revoke orch-000002`, `${40 * H / S} revoke orch-000001`]);
  // The take cb4 did not answer: both tokens ended, exit 2. A release that is refused: the lock is another's, exit 1 and no step more.
  r = rig({ takes: [0, 2] });
  r.R.stopAt(41 * H);
  expect(await drive(r.d)).toBe(2);
  expect(r.R.notes).toEqual(["`loop` was released for a new token and not taken again: cb4 was not reached [000]. The tokens: orch-000002 is ended, orch-000001 is ended"]);
  r = rig({ releases: [1] });
  r.R.stopAt(41 * H);
  expect(await drive(r.d)).toBe(1);
  expect(r.R.log.slice(-4).map((l) => l.replace(/^\d+ /, ""))).toEqual(["token orch-000002", "release orch-000001 1", "revoke orch-000002", "revoke orch-000001"]);
  expect(r.R.steps.filter((x) => x.at > 40 * H)).toEqual([]);                // the step at 40 hours is before it
});

test("a stop leaves the token when a run it started has not ended, and says how it is ended", async () => {
  const { d, R } = rig();
  R.open = 2; R.stopAt(10 * S);
  expect(await drive(d)).toBe(0);
  expect(R.log.filter((l) => / revoke /.test(l))).toEqual([]);
  expect(R.notes).toEqual(["stopped. `loop`: loop release by orchestrator-m1. The token orch-000001 is left: 2 runs it started have not ended, and each ends itself with it. It ends 48 hours after it was made, or with `brain.ts agent-token revoke orch-000001`"]);
});

test("--dry: no token is made and no lock asked; the steps are made with the token given, and an event of that token is a reason", async () => {
  const { d, R, event, sleep } = rig({ dry: true });
  R.stopAt(40 * H + 100 * S);
  const done = drive(d, "orch-5e5510");
  await sleep(40 * S); event("orch-5e5510", { type: "moved" });
  expect(await done).toBe(0);
  expect([R.log, R.notes]).toEqual([[], []]);
  expect(whys(R).slice(0, 3)).toEqual(["0 clock", "60 event", "1800 clock"]);
  expect(R.steps.every((s) => s.token === "orch-5e5510")).toBe(true);
});

// ---- a loop with no state file: the machine on Fly.io (fly-4-loop-files; plan/cloud-brain-worker-machine-on-fly.md, part 2, "Off" and the yield)
test("`idle`: a healthy line with no act, nothing given, no `stops` and no `unlogged`; anything else is not", () => {
  const ok = { seq: 7, health: { ok: true }, acts: [], given: [], skipped: [{ id: "a", do: "start", why: "it is labeled `laptop`" }] };
  expect(idle(ok)).toBe(true);
  expect(idle({ health: { ok: true } })).toBe(true);
  for (const not of [null, { ...ok, error: "queue answered 502" }, { ...ok, health: { ok: false, failed: ["x"] } }, { ...ok, health: undefined }, { ...ok, acts: [{ act: "start", id: "a" }] },
    { ...ok, given: [{ do: "triage", id: "a" }] }, { ...ok, stops: ["uptime's first number is 16"] }, { ...ok, unlogged: { token: "impl-1" } }]) expect([not, idle(not as any)]).toEqual([not, false]);
});

test("the machine's driver ends itself at a step with nothing to do: `loop` released, its token ended, exit 0; not while a run of the machine is left, and not after a step that did something", async () => {
  let r = rig({ machine: true, live: () => 0 });
  expect(await drive(r.d)).toBe(0);
  expect(whys(r.R)).toEqual(["0 clock"]);
  expect(r.R.log).toEqual(["0 token orch-000001", "0 take orch-000001 0", "0 release orch-000001 0", "0 revoke orch-000001"]);
  expect(r.R.notes).toEqual(["nothing to do: a step had no act, and no run of this machine is left. `loop`: loop release by orchestrator-m1. The token orch-000001 is ended"]);
  // A step that started a writer, then the step for its run that ended, which has no act: the end is after the second.
  let left = 1;
  r = rig({ machine: true, live: () => left });
  r.R.lines.push({ health: { ok: true }, acts: [{ act: "start", id: "a", role: "implementer" }] }, { health: { ok: true }, acts: [{ act: "ended", token: "impl-1" }] }, { health: { ok: true }, acts: [] }, { health: { ok: true }, acts: [] });
  const p = drive(r.d);
  await r.sleep(300 * S); r.R.back.push("impl-1");                    // the run returned: a step for it, which ends it
  await r.sleep(60 * S); left = 0; r.event("rev-000001");             // a review of another's: a step for the event, with no act
  expect(await p).toBe(0);
  expect(whys(r.R).map((w) => w.split(" ")[1])).toEqual(["clock", "run", "event"]);
  expect(r.R.notes[0]).toStartWith("nothing to do: a step had no act");
  // With a run left, a step with no act is not the end: the driver goes on until it is stopped.
  r = rig({ machine: true, live: () => 1 });
  r.R.stopAt(CLOCK_MS + 60 * S);
  expect(await drive(r.d)).toBe(0);
  expect(whys(r.R)).toEqual(["0 clock", "1800 clock"]);
  expect(r.R.notes[0]).toStartWith("stopped. ");
  // Not healthy, or held back by a load: not the end.
  for (const line of [{ health: { ok: false, failed: ["fly.status as fly-status: 502"] }, acts: [], given: [{ do: "unhealthy" }] }, { health: { ok: true }, acts: [], stops: ["uptime's first number is 16"] }]) {
    r = rig({ machine: true, live: () => 0 });
    r.R.lines.push(line, { health: { ok: true }, acts: [{ act: "start" }] });
    r.R.stopAt(100 * S);
    expect(await drive(r.d)).toBe(0);
    expect(r.R.notes[r.R.notes.length - 1]).toStartWith("stopped. ");
  }
});

test("a driver with a state file, and a dry one, do not end themselves at a step with nothing to do, and read no fly.status", async () => {
  let asked = 0;
  let r = rig({ yielded: () => { asked++; return true; }, live: () => 0 });
  r.R.stopAt(400 * S);
  expect(await drive(r.d)).toBe(0);
  expect([whys(r.R), asked, r.R.notes[0].split(".")[0]]).toEqual([["0 clock"], 0, "stopped"]);
  r = rig({ dry: true, machine: true, yielded: () => { asked++; return true; }, live: () => 0 });
  r.R.stopAt(400 * S);
  expect(await drive(r.d, "orch-5e5510")).toBe(0);
  expect([whys(r.R), asked, r.R.log]).toEqual([["0 clock"], 0, []]);
});

test("the machine's driver reads fly.status at each renew that was answered; at a yield it makes no step for a reason, one step for the yield and one more when no run is left, then releases `loop` and ends its token", async () => {
  const asks: number[] = [];
  const r = rig({ machine: true, live: () => (r.R.at() < 600 * S ? 1 : 0), yielded: () => { asks.push(r.R.at() / S); return r.R.at() >= 300 * S; } });
  r.R.lines.push({ health: { ok: true }, acts: [{ act: "start", id: "a", role: "implementer" }] });
  const p = drive(r.d);
  await r.sleep(400 * S); r.event("impl-000009");                     // an event after the yield is no reason
  expect(await p).toBe(0);
  expect(asks).toEqual([120, 240, 360]);
  expect(whys(r.R)).toEqual(["0 clock", "360 yield", "600 yield"]);
  expect(r.R.log.slice(-2)).toEqual(["600 release orch-000001 0", "600 revoke orch-000001"]);
  expect(r.R.notes).toEqual(["fly.status has `yield`: no more is started. 1 run of this machine is not ended; the loop ends when none is",
    "yielded: fly.status has `yield`, and no run of this machine is left. `loop`: loop release by orchestrator-m1. The token orch-000001 is ended"]);
});

test("after a yield a run that returned is a step for the yield at the next read, and with no run left at the yield the first such step is the last", async () => {
  // The run is left until a step for the yield is made after it returned: that step ends it.
  let r = rig({ machine: true, yielded: () => true, live: () => (r.R.back.length && r.R.steps.some((s) => s.why === "yield" && s.at >= 200 * S) ? 0 : 1) });
  r.R.lines.push({ health: { ok: true }, acts: [{ act: "start" }] });
  const p = drive(r.d);
  await r.sleep(200 * S); r.R.back.push("impl-1");
  expect(await p).toBe(0);
  expect(whys(r.R)).toEqual(["0 clock", "120 yield", "210 yield"]);
  r = rig({ machine: true, live: () => 0, yielded: () => true });
  r.R.lines.push({ health: { ok: true }, acts: [{ act: "start" }] });
  expect(await drive(r.d)).toBe(0);
  expect(whys(r.R)).toEqual(["0 clock", "120 yield"]);
});

test("fly.status not read at a renew is said once, and once more when it is read again; a renew that was not answered asks no fly.status", async () => {
  const asks: number[] = [];
  const r = rig({ machine: true, live: () => 1, renews: [0, 2, 0, 0, 0], yielded: () => { asks.push(r.R.at() / S); return r.R.at() < 400 * S ? null : false; } });
  r.R.stopAt(700 * S);
  expect(await drive(r.d)).toBe(0);
  // The renew at 240 was not answered (code 2) and is asked again 30 s later.
  expect(asks).toEqual([120, 270, 390, 510, 630]);
  expect(r.R.notes.slice(0, 3)).toEqual(["fly.status was not read at a renew: a yield is not seen until it is", "`loop` was not renewed: cb4 was not reached [000]. It is asked again in 30 s", "fly.status is read again"]);
});

// ---- the program, with stand-ins for what it runs
const tool = resolve(import.meta.dir, "../../tools/cloud-brain/loop.ts"), DIR = resolve(import.meta.dir, "../../tools/cloud-brain");
const RIG = mkdtempSync(join(tmpdir(), "loop-run-test-"));
afterAll(() => rmSync(RIG, { recursive: true, force: true }));
const script = (name: string, text: string) => { const p = join(RIG, name); writeFileSync(p, text); chmodSync(p, 0o755); return p; };
const BRAIN = script("brain.sh", `#!/bin/bash
echo "$*" >> "$RIG/brain.log"
case "$1 $2" in "agent-token revoke") echo "401: revoked";; "agent-token orch") echo "orch-0a0a0a";; esac
`);
const LOCK = script("lock.sh", `#!/bin/bash
echo "$LOCK_TOKEN $*" >> "$RIG/lock.log"
if [ "$1" = take ] && [ -f "$RIG/held" ]; then echo "lock.sh: loop is held by orchestrator-fly since a, until b. Not taken." >&2; exit 1; fi
echo "loop $1 by $3"
`);
const SELF = script("self.sh", `#!/bin/bash
echo "$LOOP_TOKEN $*" >> "$RIG/self.log"
echo '{"at":1,"seq":7,"health":{"ok":true},"acts":[],"given":[],"skipped":[]}'
echo "# the status"
`);
const AS = script("issue-as.sh", `#!/bin/bash
echo "$*" >> "$RIG/as.log"
echo '{"seq":7,"events":[],"more":false}'; echo " [200]" >&2
`);
const log = (name: string) => (existsSync(join(RIG, name + ".log")) ? readFileSync(join(RIG, name + ".log"), "utf8").trim().split("\n") : []);
const until = async (what: () => any, ms = 15000) => { for (const end = Date.now() + ms; Date.now() < end; await Bun.sleep(50)) { const v = what(); if (v) return v; } throw new Error("waited " + ms + " ms"); };
// The state file is there, as on the laptop, unless a case asks for none (the machine on Fly.io). It is not read.
const start = (args: string[], more: Record<string, string> = {}, state = true) => {
  for (const f of ["brain.log", "lock.log", "self.log", "as.log", "held", "state/cb4.json"]) rmSync(join(RIG, f), { force: true });
  mkdirSync(join(RIG, "state"), { recursive: true });
  if (state) writeFileSync(join(RIG, "state/cb4.json"), "{}");
  const { LOOP_TOKEN: _, ...base } = process.env;
  const p = Bun.spawn(["bun", tool, ...args], { env: { ...base, RIG, LOOP_ROOT: RIG, BRAIN_STATE_DIR: join(RIG, "state"), LOOP_BRAIN: "bash " + BRAIN, LOOP_LOCK: LOCK, LOOP_SELF: SELF, ISSUE_AS: AS, LOOP_HOST: "m1", ...more }, stdout: "pipe", stderr: "pipe" });
  return { p, end: async () => ({ out: await new Response(p.stdout).text(), err: await new Response(p.stderr).text(), code: await p.exited }) };
};

test("loop.ts run: the token, the lock as orchestrator-<host>, a step for the clock with that token, and at SIGINT the release, the token ended and exit 0", async () => {
  const r = start(["run"], { LOOP_TOKEN: "orch-ffffff" });
  await until(() => log("self").length);
  r.p.kill("SIGINT");
  const e = await r.end();
  expect(e.code).toBe(0);
  expect(log("brain")).toEqual(["agent-token orch driver:m1", "agent-token revoke orch-0a0a0a"]);
  expect(log("lock")).toEqual(["orch-0a0a0a take loop orchestrator-m1", "orch-0a0a0a release loop orchestrator-m1"]);
  expect(log("self")).toEqual(["orch-0a0a0a step --for clock"]);
  expect(e.out.trim().split("\n")).toEqual(['{"at":1,"seq":7,"health":{"ok":true},"acts":[],"given":[],"skipped":[]}']);
  expect(e.err.trim()).toBe("loop.ts run: stopped. `loop`: loop release by orchestrator-m1. The token orch-0a0a0a is ended");
});

test("loop.ts run beside a loop that holds the lock: exit 1, the holder named, no step", async () => {
  const r = start(["run"]);
  writeFileSync(join(RIG, "held"), "");
  const e = await r.end();
  expect([e.code, e.out, log("self")]).toEqual([1, "", []]);
  expect(e.err.trim()).toBe("loop.ts run: `loop` was not taken: loop is held by orchestrator-fly since a, until b. Not taken.. No step was made; the token orch-0a0a0a is ended");
});

test("loop.ts run --dry: `step --for clock --dry` with the caller's token, no token made, no lock asked; with no LOOP_TOKEN exit 2", async () => {
  const r = start(["run", "--dry"], { LOOP_TOKEN: "orch-5e5510" });
  await until(() => log("self").length);
  r.p.kill("SIGTERM");
  const e = await r.end();
  expect([e.code, e.err, log("brain"), log("lock"), log("self")]).toEqual([0, "", [], [], ["orch-5e5510 step --for clock --dry"]]);
  const none = await start(["run", "--dry"]).end();
  expect([none.code, none.out, log("self")]).toEqual([2, "", []]);
  expect(none.err).toContain("no LOOP_TOKEN");
  const bad = await start(["run", "--wet"], { LOOP_TOKEN: "orch-5e5510" }).end();
  expect([bad.code, bad.err.trim(), log("brain"), log("lock")]).toEqual([2, "loop.ts: run [--dry]", [], []]);
});

// ---- loop.sh: safehouse with the arguments metadev gives it, then the driver
test("loop.sh runs safehouse with the arguments of the main checkout's metadev, METADEV=1 and what metadev exports, then `bun tools/cloud-brain/loop.ts run` with what it was given", async () => {
  const root = join(RIG, "checkout"), bin = join(RIG, "bin");
  mkdirSync(join(root, "tools/cloud-brain"), { recursive: true }); mkdirSync(bin, { recursive: true });
  writeFileSync(join(root, "metadev"), `#!/usr/bin/env zsh
export METADEV=1
export CLAUDE_CONFIG_DIR=~/.config-of-the-test
echo "metadev was run" >> "${RIG}/metadev.log"
ENV_PASS="METADEV,CLAUDE_CONFIG_DIR"
mkdir -p "${RIG}/made by metadev"
ADB_PROFILE="\${0:A:h}/tools/safehouse-adb.sb"

SAFEHOUSE_ARGS=(
    --env-pass="$ENV_PASS"
    --add-dirs-ro=~/.ssh
    --add-dirs=/tmp/a\\ dir
    --append-profile="$ADB_PROFILE"
)
echo "metadev was run" >> "${RIG}/metadev.log"
safehouse "\${SAFEHOUSE_ARGS[@]}" claude
`);
  writeFileSync(join(bin, "safehouse"), `#!/bin/bash\nprintf '%s\\n' "METADEV=$METADEV" "CLAUDE_CONFIG_DIR=$CLAUDE_CONFIG_DIR" "PWD=$PWD" "$@" > "${RIG}/safehouse.log"\n`); chmodSync(join(bin, "safehouse"), 0o755);
  const sh = (args: string[], env: Record<string, string>) => Bun.spawnSync([join(DIR, "loop.sh"), ...args], { env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  const { METADEV: _, CLAUDE_CONFIG_DIR: __, ...base } = process.env;
  const r = Bun.spawnSync([join(DIR, "loop.sh"), "--dry"], { env: { ...base, LOOP_ROOT: root, PATH: bin + ":" + process.env.PATH }, stdout: "pipe", stderr: "pipe" });
  expect([r.exitCode, r.stderr.toString()]).toEqual([0, ""]);
  // zsh leaves the ~ after a = as it is, in metadev as here: safehouse is given `~/.ssh` by both.
  const real = (p: string) => Bun.spawnSync(["zsh", "-c", 'print -r -- ${1:A}', "x", p]).stdout.toString().trim();
  expect(readFileSync(join(RIG, "safehouse.log"), "utf8").trim().split("\n")).toEqual(["METADEV=1", `CLAUDE_CONFIG_DIR=${process.env.HOME}/.config-of-the-test`, "PWD=" + real(root), "--env-pass=METADEV,CLAUDE_CONFIG_DIR", "--add-dirs-ro=~/.ssh", "--add-dirs=/tmp/a dir",
    `--append-profile=${real(root)}/tools/safehouse-adb.sb`, "--enable=all-agents", "bun", "tools/cloud-brain/loop.ts", "run", "--dry"]);
  // --enable=all-agents stands after what metadev gives and before the command: safehouse picks the profile of Claude
  // Code, and the keychain with it, by the name of the command it wraps, and this one is `bun` (loop-sh-sandbox-has-no-keychain).
  // The exports above ENV_PASS= and the lines from it to the ) are run, its mkdir among them; no other line is.
  expect([existsSync(join(RIG, "made by metadev")), existsSync(join(RIG, "metadev.log"))]).toEqual([true, false]);
  // No SAFEHOUSE_ARGS in the file, or no safehouse: exit 2 and nothing run.
  rmSync(join(RIG, "safehouse.log"));
  writeFileSync(join(root, "metadev"), "#!/usr/bin/env zsh\nclaude\n");
  const none = sh([], { LOOP_ROOT: root, PATH: bin + ":" + process.env.PATH });
  expect([none.exitCode, none.stderr.toString().trim(), existsSync(join(RIG, "safehouse.log"))]).toEqual([2, `loop.sh: ${real(root)}/metadev has no SAFEHOUSE_ARGS=( … ) to read; nothing was run`, false]);
});

test("loop.ts run with no state file: after a step with no act it ends itself, exit 0, with `loop` released and its token ended; fly.status is asked of brain.ts as fly-status at a renew only", async () => {
  const e = await start(["run"], {}, false).end();
  expect(e.code).toBe(0);
  expect(log("brain")).toEqual(["agent-token orch driver:m1", "agent-token revoke orch-0a0a0a"]);
  expect(log("lock")).toEqual(["orch-0a0a0a take loop orchestrator-m1", "orch-0a0a0a release loop orchestrator-m1"]);
  expect(log("self")).toEqual(["orch-0a0a0a step --for clock"]);
  expect(e.err.trim()).toBe("loop.ts run: nothing to do: a step had no act, and no run of this machine is left. `loop`: loop release by orchestrator-m1. The token orch-0a0a0a is ended");
});
