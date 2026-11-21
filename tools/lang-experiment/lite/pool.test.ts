// Unit tests for the decision cells of pool.ss.ts, each called with plain values. Each control links a mutant of one
// cell and must fail at least one of the same checks. Run: bun lite/pool.test.ts
import * as poolCells from "./pool.ss.ts";
import type { PoolState, PoolEvent } from "./pool.ss.ts";
import { link, type Linked } from "./link.ts";

type S = Linked<typeof poolCells>;
const eq = (a: unknown, b: unknown) => Bun.deepEquals(a, b, true);

function checks(S: S): [string, boolean][] {
  const out: [string, boolean][] = [];
  const ok = (name: string, cond: boolean) => out.push([name, cond]);
  const run = (st: PoolState, qid: number, key = "k", hasCode = true, dead: number[] = []) => S.poolStep(st, { t: "run", qid, key, hasCode, dead });
  const ev = (st: PoolState, e: PoolEvent) => S.poolStep(st, e);
  const posted = (st: PoolState, slot: number, id: number, resend = false) => ev(st, { t: "posted", slot, id, resend, dead: [] });
  const msg = (st: PoolState, slot: number, id: number, error: string | null = null, missing = false, dead: number[] = []) => ev(st, { t: "message", slot, id, error, missing, dead });

  const p0 = S.newPool(2);
  ok("newPool: two free slots, nothing queued", eq(p0.slots.map((s) => s.busy), [false, false]) && p0.queue.length === 0 && p0.next === 0);
  const a = run(p0, 1);
  ok("run on a free pool: a post with code to slot 0, id 0", eq(a.effects, [{ fx: "post", slot: 0, id: 0, qid: 1, withCode: true, resend: false }]));
  ok("run: slot 0 is busy and was given id 0", a.state.slots[0]!.busy && a.state.slots[0]!.current === 0 && a.state.waiting.get(0) === 1);
  const b = posted(a.state, 0, 0);
  ok("posted: the slot has the island's code", eq(b.state.slots[0]!.has, ["k"]) && b.effects.length === 0);
  const c = run(b.state, 2);
  ok("slot choice: the first free slot, slot 1, with code", eq(c.effects, [{ fx: "post", slot: 1, id: 1, qid: 2, withCode: true, resend: false }]));
  const d = run(posted(c.state, 1, 1).state, 3);
  ok("no free slot: the job is queued", d.effects.length === 0 && eq(d.state.queue, [3]));
  const e = run(d.state, 4);
  ok("queue order: jobs wait in the order run", eq(e.state.queue, [3, 4]));
  const f = msg(e.state, 0, 0);
  ok("answer: the job resolves, then the first queued job goes to the freed slot without code",
    eq(f.effects, [{ fx: "resolve", qid: 1 }, { fx: "post", slot: 0, id: 2, qid: 3, withCode: false, resend: false }]));
  ok("answer: answered counts the resolve", eq(S.answeredOf(f.state), [1, 0]));
  const g = msg(posted(f.state, 0, 2).state, 1, 1, null, false, [4]);
  ok("a dead owner's queued job is rejected as superseded, nothing posted", eq(g.effects, [{ fx: "resolve", qid: 2 }, { fx: "reject", qid: 4, why: { k: "superseded" } }]) && g.state.queue.length === 0);
  ok("takeLive: drops the front dead jobs up to the first live one", eq(S.takeLive([5, 6, 7, 8], [5, 6, 8]), { dropped: [5, 6], qid: 7, rest: [8] }));

  // missing: a resend with code, once
  const h = msg(g.state, 0, 2, null, true);
  ok("missing with code: posted again with code on the same slot and id, no pump", eq(h.effects, [{ fx: "post", slot: 0, id: 2, qid: 3, withCode: true, resend: true }]));
  ok("missing: the slot no longer has the island", eq(h.state.slots[0]!.has, []) && h.state.slots[0]!.busy);
  const i = msg(posted(h.state, 0, 2, true).state, 0, 2, null, true);
  ok("missing after the resend: rejected, not sent a third time", eq(i.effects, [{ fx: "reject", qid: 3, why: { k: "message", msg: "island k was not sent" } }]));
  ok("missing after the resend: the slot is free and answered is unchanged", !i.state.slots[0]!.busy && eq(S.answeredOf(i.state), [1, 1]));
  const j = msg(run(S.newPool(1), 9, "x", false).state, 0, 0, null, true);
  ok("missing without code: rejected at once", eq(j.effects, [{ fx: "reject", qid: 9, why: { k: "message", msg: "island x was not sent" } }]));

  // failures
  const k = run(S.newPool(1), 1);
  const k2 = run(k.state, 2);
  const l = ev(k2.state, { t: "postFailed", slot: 0, id: 0, resend: false, dead: [] });
  ok("a post that throws: rejected with the thrown error, the next job posted", eq(l.effects, [{ fx: "reject", qid: 1, why: { k: "thrown" } }, { fx: "post", slot: 0, id: 1, qid: 2, withCode: true, resend: false }]));
  const m0 = msg(posted(k.state, 0, 0).state, 0, 0, null, true);
  const m = ev(m0.state, { t: "postFailed", slot: 0, id: 0, resend: true, dead: [] });
  ok("a resend whose post throws: rejected with the thrown error, the slot free", eq(m.effects, [{ fx: "reject", qid: 1, why: { k: "thrown" } }]) && !m.state.slots[0]!.busy && m.state.waiting.size === 0);
  const n = msg(posted(k.state, 0, 0).state, 0, 0, "boom");
  ok("an error answer: rejected with its message, answered unchanged", eq(n.effects, [{ fx: "reject", qid: 1, why: { k: "message", msg: "boom" } }]) && eq(S.answeredOf(n.state), [0]));
  const o = ev(posted(k.state, 0, 0).state, { t: "workerError", slot: 0, message: null, dead: [] });
  ok("a worker error: the slot's job rejected, no message given", eq(o.effects, [{ fx: "reject", qid: 1, why: { k: "message", msg: "worker failed: no message" } }]) && !o.state.slots[0]!.busy);
  const q = ev(S.newPool(1), { t: "workerError", slot: 0, message: "oops", dead: [] });
  ok("a worker error on an idle slot: no effect", q.effects.length === 0 && !q.state.slots[0]!.busy);
  const r = msg(posted(k.state, 0, 0).state, 0, 1000);
  ok("an answer with an unknown id: nothing changes", r.effects.length === 0 && r.state.slots[0]!.busy);
  return out;
}

let fail = 0;
const real = checks(link(poolCells));
for (const [name, cond] of real) { console.log(`${cond ? "pass" : "FAIL"} ${name}`); if (!cond) fail++; }
// controls: each mutant must fail at least one check
const mutants: [string, Partial<Record<keyof typeof poolCells, unknown>>][] = [
  ["takeLive keeps dead jobs", { takeLive: () => (queue: readonly number[]) => ({ dropped: [], qid: queue[0] ?? null, rest: queue.slice(1) }) }],
  ["settleSlot does not count answers", { settleSlot: (withSlot: any) => (st: any, slot: number, id: number, qid: number) => ({ ...st, waiting: new Map([...st.waiting].filter(([x]: [number]) => x !== id)), jobs: new Map([...st.jobs].filter(([x]: [number]) => x !== qid)), slots: withSlot(st.slots, slot, (s: any) => ({ ...s, busy: false })) }) }],
  ["addKey forgets the key", { addKey: () => (has: readonly string[]) => has }],
];
for (const [name, over] of mutants) {
  const failed = checks(link({ ...poolCells, ...over } as typeof poolCells)).filter(([, c]) => !c).length;
  console.log(`${failed ? "pass" : "FAIL"} control (${name}): ${failed} of ${real.length} checks fail`);
  if (!failed) fail++;
}
console.log(`${real.length + mutants.length - fail} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
