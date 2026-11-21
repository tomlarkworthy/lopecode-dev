// bun lite/browser/workers.test.ts — the worker pool against Bun's real Worker.
import { EXEC, pagePool, type Job } from "./workers.ts";

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`pass ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? ": " + detail : ""}`); }
};
const job = (key: string, x = 1, extra: Record<string, unknown> = {}): Job => ({
  key, js: "const f = (x) => x + 1;", names: ["f"], order: [{ name: "f", params: ["x"] }], values: { x, ...extra }, outputs: ["f"],
});
const within = <T>(p: Promise<T>, ms = 3000) =>
  Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`no answer in ${ms}ms`)), ms))]);
const settle = async <T>(p: Promise<T>) => { try { return { value: await within(p) }; } catch (e) { return { error: e as Error }; } };

const pool = pagePool();
const live = { dead: false };

// D1: past 16 islands the worker drops its cache; an island seen earlier must still run.
{
  for (let i = 1; i <= 18; i++) await within(pool.run(job("k" + i, i), live));
  const r = await settle(pool.run(job("k1", 41), live));
  ok("D1 an early island runs again after 18 others", r.value?.f === 42, r.error?.message ?? JSON.stringify(r.value));
}

// D1, worker side: EXEC asked for an island it dropped, without code, says so by a flag.
{
  const run = new Function(`return ${EXEC}`)();
  for (let i = 1; i <= 18; i++) run(job("e" + i));
  let err: any = null;
  try { run({ ...job("e1"), js: undefined }); } catch (e) { err = e; }
  ok("D1 EXEC marks a dropped island as missing", err?.missing === true, String(err?.message));
}

// D2: a job whose values cannot be cloned rejects, and frees its slot.
{
  const bad = await Promise.all(Array.from({ length: pool.size + 1 }, () => settle(pool.run(job("c", 1, { fn: () => 1 }), live))));
  ok("D2 an uncloneable job rejects", bad.every((r) => r.error && !/no answer/.test(r.error.message)), bad.map((r) => r.error?.message).join(" | "));
  const good = await Promise.all(Array.from({ length: pool.size }, (_, i) => settle(pool.run(job("c", i), live))));
  ok("D2 normal jobs after it resolve on every slot", good.every((r, i) => r.value?.f === i + 1), good.map((r) => r.error?.message ?? r.value?.f).join(","));
}

// D3: a dead owner's queued jobs reject with a SupersededError; its in-flight ones resolve.
{
  const old = { dead: false };
  const slow: Job = { key: "slow", js: "const f = (x) => { const t = Date.now(); while (Date.now() - t < 150); return x; };", names: ["f"], order: [{ name: "f", params: ["x"] }], values: { x: 7 }, outputs: ["f"] };
  const inflight = Array.from({ length: pool.size }, () => pool.run(slow, old));
  const queued = pool.run(job("q", 1), old);
  old.dead = true;
  const fresh = pool.run(job("q", 2), live);
  const [a, q, f] = await Promise.all([settle(Promise.all(inflight)), settle(queued), settle(fresh)]);
  ok("D3 in-flight jobs of a superseded owner resolve", Array.isArray(a.value) && a.value.every((v: any) => v.f === 7), a.error?.message);
  ok("D3 a queued job of a superseded owner rejects with SupersededError", q.error?.name === "SupersededError", `${q.error?.name}: ${q.error?.message}`);
  ok("D3 the current owner's job behind it resolves", f.value?.f === 3, f.error?.message);
}

// D1: the resend on a miss happens once, and only with code; a job that never had code rejects.
// Last, because a pool that loops on it keeps a slot busy.
{
  const r = await settle(pool.run({ ...job("never-sent"), js: undefined }, live));
  ok("D1 a job without code for an unknown island rejects", /was not sent/.test(r.error?.message ?? ""), r.error?.message ?? JSON.stringify(r.value));
}

console.log(`${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
