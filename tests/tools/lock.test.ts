// lock.sh take|renew|release|show land|cb4 <who>: the landing lock and the deploy lock are rows cb4 keeps.
// Issue lk-3-lock-sh-over-the-cluster, task 3 of plan/cloud-brain-locks-held-in-the-cluster.md: R3, R5, R6 and the two
// lines of R4 that are the tool's. Before it the lock was a directory of this machine (land-lock-any-session-can-remove).
// Issue bd-2-release-land-enters-docs: a release of land then runs knowledge-docs.ts put --stale (the cases at the end).
//
//   bun test ./tests/tools/lock.test.ts
//   LOCK_SH=/path/to/another/lock.sh bun test …
// Every case has a stand-in for the service (LOCK_BASE) and a state directory with a token file of its own
// (BRAIN_STATE_DIR). No case calls cb4 but the last, a public read of the reviewer's brief. The stand-in answers the
// shapes brain-x-issues answers (records/lk-1-issue-lock-methods.md); it is not the service's code, which its own
// test cells test.
import { test, expect, afterAll } from "bun:test";
import { mkdtempSync, existsSync, readFileSync, readdirSync, realpathSync, writeFileSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = process.env.LOCK_SH || join(root, "tools/cloud-brain/lock.sh");
const TOKENS = { "issues-implementer-2": "secret-impl", "issues-reviewer-2": "secret-rev" };
// A time as lock.sh prints it. The script is run with TZ=UTC, so the text does not depend on the machine's zone.
const at = (ms: number) => new Date(ms).toISOString().slice(0, 19).replace("T", " ") + " UTC";

type Row = { name: string; who: string; actor: string; n: number; taken: number; until: number };
type Fault = { status: number; body: unknown; keep?: boolean };
const servers: { stop: (now?: boolean) => void }[] = [];
afterAll(() => servers.forEach((s) => s.stop(true)));

// issue.lock and issue.locks over one table. `faults` answers the next calls of issue.lock in its place, one each;
// `keep: true` does what the call asked first, so the lock is kept and the answer lost. `always` answers every call.
const standIn = () => {
  const rows = new Map<string, Row>(), history: unknown[] = [], calls: { path: string; body: any; token: string }[] = [];
  const faults: Fault[] = [];
  const state = { always: null as Fault | null };
  const holder = (r?: Row) => (r && r.who ? { who: r.who, taken: r.taken, until: r.until } : null);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const act = (b: any, actor: string) => {
    const now = Date.now(), r = rows.get(b.name);
    const none = (why: string) => (holder(r) ? json({ held: false, holder: holder(r), error: "Held", message: `${b.name} is held by ${r!.who}${why}` }, 409) : json({ held: false, holder: null, error: "NotHeld", message: `${b.name} is not held${why}` }, 409));
    if (b.release) {
      if (!r || !r.who) return none("; nothing released");
      if (r.who !== b.who || r.actor !== actor) return json({ holder: holder(r), error: "Refused", message: "left where it is" }, 403);
      const ended = { held: false, name: r.name, who: r.who, n: r.n, taken: r.taken, ended: now, how: "released" };
      history.unshift(ended);
      rows.set(b.name, { ...r, who: "", actor: "", until: 0 });
      return json(ended);
    }
    const until = now + (b.seconds ?? 600) * 1000;
    if (b.renew) {
      if (!r || r.who !== b.who || r.actor !== actor) return none("; not yours to renew");
      const over = r.until < now ? { over: { who: r.who, until: r.until } } : {};
      r.until = until;
      return json({ held: true, name: r.name, who: r.who, n: r.n, taken: r.taken, until, ...over });
    }
    if (r && r.who && !(r.until < now)) return none("");
    const over = r && r.who ? { over: { who: r.who, until: r.until } } : {};
    const row = { name: b.name, who: b.who, actor, n: (r?.n ?? 0) + 1, taken: now, until };
    rows.set(b.name, row);
    return json({ held: true, name: row.name, who: row.who, n: row.n, taken: row.taken, until: row.until, ...over });
  };
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(req) {
      const path = new URL(req.url).pathname.replace("/xrpc/com.lopecode.brain.", "");
      const token = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
      const body = req.method === "POST" ? await req.json() : null;
      calls.push({ path, body, token });
      if (!Object.values(TOKENS).includes(token) && token !== "secret-agent") return json({ error: "Unauthorized" }, 401);
      const fault = state.always || (path === "issue.lock" ? faults.shift() : undefined);
      if (path === "issue.lock") {
        const answered = fault && !fault.keep ? null : act(body, token);
        return fault ? json(fault.body, fault.status) : answered!;
      }
      if (fault) return json(fault.body, fault.status);
      const now = Date.now(), all = [...rows.values()], of = ({ actor, ...r }: Row) => r;
      return json({ now, locks: all.filter((r) => r.who && !(r.until < now)).map(of), ended: all.filter((r) => r.who && r.until < now).map(of), history });
    },
  });
  servers.push(server);
  return { base: `http://127.0.0.1:${server.port}`, rows, calls, faults, state, locks: () => calls.filter((c) => c.path === "issue.lock").map((c) => c.body), end: (name: string) => (rows.get(name)!.until = Date.now() - 2000) };
};

// LOCK_DOCS=0: a release of land runs no docs step, so no case here calls a Brain. The cases of the step set a stub.
const fresh = (env: Record<string, string | undefined> = {}) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-lock-")));
  writeFileSync(join(dir, "cb4-issues-tokens.json"), JSON.stringify(TOKENS));
  const svc = standIn();
  const full = { ...process.env, TZ: "UTC", LOCK_TOKEN: undefined, BRAIN_STATE_DIR: dir, LOCK_BASE: svc.base, LOCK: script, LOCK_DOCS: "0", ...env };
  // The stand-in is in this process, so a command is awaited, never run with spawnSync.
  const sh = async (cmd: string, more: Record<string, string | undefined> = {}) => {
    const p = Bun.spawn(["bash", "-c", cmd], { env: { ...full, ...more }, stdout: "pipe", stderr: "pipe" });
    const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
    return { code, out: out.trim(), err: err.trim() };
  };
  const lock = (...a: string[]) => sh(`bash "$LOCK" ${a.join(" ")}`);
  return { dir, sh, lock, svc, env: full };
};
// A program in the place of knowledge-docs.ts: it writes its arguments and its BRAIN_BASE to a file, then does as `then` says.
const stub = (then = `echo '{"put":2,"entered":2}'`) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "bm-lock-docs-")));
  const program = join(dir, "docs.sh"), seen = join(dir, "seen");
  writeFileSync(program, `#!/bin/bash\nprintf '%s|%s\\n' "$*" "\${BRAIN_BASE-unset}" >> "${seen}"\n${then}\n`);
  chmodSync(program, 0o755);
  return { program, calls: () => (existsSync(seen) ? readFileSync(seen, "utf8").trim().split("\n") : []) };
};
const closedPort = () => {
  const s = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: () => new Response("") });
  const base = `http://127.0.0.1:${s.port}`;
  s.stop(true);
  return base;
};

test("R1, R3: a take is a call to the service as the token, sends no seconds, and makes nothing on this machine", async () => {
  const { dir, lock, svc } = fresh();
  const took = await lock("take", "land", "writer-a");
  expect(took.code).toBe(0);
  expect(svc.calls).toEqual([{ path: "issue.lock", body: { name: "land", who: "writer-a" }, token: "secret-impl" }]);
  const row = svc.rows.get("land")!;
  expect(took.out).toContain(`land taken by writer-a at ${at(row.taken)}`);
  expect(took.out).toContain(`until ${at(row.until)}`);
  const shown = await lock("show", "land");
  expect(shown.code).toBe(0);
  expect(shown.out).toContain(`land is held by writer-a since ${at(row.taken)}`);
  expect(shown.out).toContain(`until ${at(row.until)}`);
  expect(readdirSync(dir)).toEqual(["cb4-issues-tokens.json"]);
  expect((await lock("release", "land", "writer-a")).code).toBe(0);
  expect(readdirSync(dir)).toEqual(["cb4-issues-tokens.json"]);
});

test("R3: lock.sh has no mkdir and no rmdir", () => {
  expect(readFileSync(script, "utf8").split("\n").filter((l) => /mkdir|rmdir/.test(l))).toEqual([]);
});

test("R5, the slip of 2026-10-11 15:25: a session that failed to take the lock does not release it", async () => {
  const { sh, lock } = fresh();
  expect((await lock("take", "land", "a")).code).toBe(0);
  const slip = await sh(`bash "$LOCK" take land b && echo landed; bash "$LOCK" release land b`);
  expect(slip.out).not.toContain("landed");
  expect(slip.code).toBe(1);
  expect(slip.err).toContain("land is held by a since");
  expect(slip.err).toContain("not by b. Left where it is.");
  const shown = await lock("show", "land");
  expect(shown.code).toBe(0);
  expect(shown.out).toContain("held by a ");
});

test("a second take is refused and names the holder and until when; the holder's own second take too, with no renew sent", async () => {
  const { lock, svc } = fresh();
  await lock("take", "land", "writer-a");
  const until = at(svc.rows.get("land")!.until);
  const r = await lock("take", "land", "writer-b");
  expect(r.code).toBe(1);
  expect(r.err).toContain("land is held by writer-a since");
  expect(r.err).toContain(`until ${until}. Not taken.`);
  const again = await lock("take", "land", "writer-a");
  expect(again.code).toBe(1);
  expect(again.err).toContain("land is held under your own name since");
  expect(again.err).not.toContain("renew");
  expect(svc.locks().filter((b) => b.renew)).toEqual([]);
});

test("the holder releases, the name is in neither list, and the next writer takes with n one above", async () => {
  const { lock, svc } = fresh();
  await lock("take", "land", "writer-a");
  const released = await lock("release", "land", "writer-a");
  expect(released.code).toBe(0);
  expect(released.out).toContain("land released by writer-a at ");
  const shown = await lock("show", "land");
  expect(shown.code).toBe(1);
  expect(shown.out).toBe("land is not held");
  expect(shown.err).toBe("");
  const next = await lock("take", "land", "writer-b");
  expect(next.code).toBe(0);
  expect(next.out).not.toContain("took over");
  expect(svc.rows.get("land")!.n).toBe(2);
});

test("a release with no lock is refused, exit 1", async () => {
  const { lock } = fresh();
  const r = await lock("release", "land", "writer-a");
  expect(r.code).toBe(1);
  expect(r.err).toContain("land is not held; nothing released");
});

test("land and cb4 are two locks", async () => {
  const { lock, svc } = fresh();
  expect((await lock("take", "land", "writer-a")).code).toBe(0);
  expect((await lock("take", "cb4", "writer-a")).code).toBe(0);
  expect((await lock("release", "cb4", "writer-b")).code).toBe(1);
  expect((await lock("release", "cb4", "writer-a")).code).toBe(0);
  expect((await lock("show", "cb4")).code).toBe(1);
  expect((await lock("show", "land")).code).toBe(0);
  expect(svc.rows.get("land")!.who).toBe("writer-a");
});

test("take --wait asks with a take until the holder releases", async () => {
  const { lock, svc, env } = fresh();
  await lock("take", "land", "writer-a");
  const p = Bun.spawn(["bash", script, "take", "land", "writer-b", "--wait", "0.2"], { env, stdout: "ignore", stderr: "pipe" });
  await Bun.sleep(1500);
  expect(p.exitCode).toBe(null);
  expect((await lock("release", "land", "writer-a")).code).toBe(0);
  expect(await p.exited).toBe(0);
  // the holder is named once, not at every asking
  expect((await new Response(p.stderr).text()).trim()).toMatch(/^lock\.sh: land is held by writer-a since [^\n]*; asking again every 0\.2 s$/);
  expect((await lock("show", "land")).out).toContain("writer-b");
  expect(svc.locks().filter((b) => b.who === "writer-b").length).toBeGreaterThan(1);
  expect(svc.calls.filter((c) => c.path === "issue.locks" && c.token === "secret-impl").length).toBe(1);
}, 20000);

test("a call that names no lock, no holder or a holder with a space is a usage error, and nothing is sent", async () => {
  const { dir, lock, svc } = fresh();
  for (const a of [["take", "land"], ["take", "other", "writer-a"], ["release", "land"], ["renew", "land"], ["take", "land", "'two words'"], ["steal", "land", "writer-a"], ["take", "land", "writer-a", "now"], []])
    expect((await lock(...a)).code).toBe(2);
  expect(svc.calls).toEqual([]);
  expect(readdirSync(dir)).toEqual(["cb4-issues-tokens.json"]);
});

test("R4: a lock past its until is not held: show exits 1 and says whose it was, the next take says it took over", async () => {
  const { lock, svc } = fresh();
  await lock("take", "land", "a");
  svc.end("land");
  const until = at(svc.rows.get("land")!.until);
  const shown = await lock("show", "land");
  expect(shown.code).toBe(1);
  expect(shown.out).toBe("");
  expect(shown.err).toContain(`land is not held; a's lock ended at ${until}`);
  const took = await lock("take", "land", "b");
  expect(took.code).toBe(0);
  expect(took.out).toContain(`took over a's lock, which ended at ${until}`);
  expect(svc.rows.get("land")!.n).toBe(2);
  // a's renew is then a 409: exit 1, and b's lock stays. So is a's release (403).
  const renew = await lock("renew", "land", "a");
  expect(renew.code).toBe(1);
  expect(renew.err).toContain("land is held by b since");
  expect(renew.err).toContain("not yours to renew. Nothing taken.");
  const release = await lock("release", "land", "a");
  expect(release.code).toBe(1);
  expect(release.err).toContain("land is held by b since");
  expect(svc.rows.get("land")!.who).toBe("b");
});

test("renew sends renew: true: more time for the holder, and never a take of a free name", async () => {
  const { lock, svc } = fresh();
  const free = await lock("renew", "land", "a");
  expect(free.code).toBe(1);
  expect(free.err).toContain("land is not held; not yours to renew. Nothing taken.");
  expect(svc.rows.has("land")).toBe(false);
  await lock("take", "land", "a");
  const was = svc.rows.get("land")!.until;
  await Bun.sleep(20);
  const r = await lock("renew", "land", "a");
  expect(r.code).toBe(0);
  expect(r.out).toContain("land renewed by a, until ");
  expect(r.out).not.toContain("ended");
  expect(svc.rows.get("land")!.until).toBeGreaterThan(was);
  expect(svc.rows.get("land")!.n).toBe(1);
  expect(svc.locks().at(-1)).toEqual({ name: "land", who: "a", renew: true });
  // past its until and taken by nobody since: renewed, and it says so
  svc.end("land");
  const until = at(svc.rows.get("land")!.until);
  const late = await lock("renew", "land", "a");
  expect(late.code).toBe(0);
  expect(late.out).toContain(`renewed after it had ended at ${until}; nobody held it between`);
  expect(svc.rows.get("land")!.n).toBe(1);
  // released, then free: a renew takes nothing
  await lock("release", "land", "a");
  expect((await lock("renew", "land", "a")).code).toBe(1);
  expect(svc.rows.get("land")!.who).toBe("");
});

test("LOCK_TOKEN names the token of the call; a release or a renew under another token says which token it used, and no token is printed", async () => {
  const { dir, sh, svc } = fresh();
  writeFileSync(join(dir, "cb4-agent-tokens.json"), JSON.stringify({ "rev-3fa2c1": "secret-agent" }));
  const took = await sh(`bash "$LOCK" take land overseer-m1`);
  expect(took.code).toBe(0);
  const release = await sh(`LOCK_TOKEN=issues-reviewer-2 bash "$LOCK" release land overseer-m1`);
  expect(release.code).toBe(1);
  expect(release.err).toContain("land is held under your name by another token; this call used issues-reviewer-2. Left where it is.");
  const renew = await sh(`LOCK_TOKEN=issues-reviewer-2 bash "$LOCK" renew land overseer-m1`);
  expect(renew.code).toBe(1);
  expect(renew.err).toContain("land is held under your name by another token; this call used issues-reviewer-2; not yours to renew.");
  expect(svc.calls.slice(-2).map((c) => c.token)).toEqual(["secret-rev", "secret-rev"]);
  // a name of the second file, read after the roles' file
  const shown = await sh(`LOCK_TOKEN=rev-3fa2c1 bash "$LOCK" show land`);
  expect(shown.code).toBe(0);
  expect(svc.calls.at(-1)!.token).toBe("secret-agent");
  // a name in neither file: exit 2 before any call
  const n = svc.calls.length;
  const none = await sh(`LOCK_TOKEN=nobody bash "$LOCK" show land`);
  expect(none.code).toBe(2);
  expect(none.err).toContain("no token named nobody is kept");
  expect(svc.calls.length).toBe(n);
  for (const r of [took, release, renew, shown, none]) expect(r.out + r.err).not.toMatch(/secret-/);
  expect(svc.rows.get("land")!.who).toBe("overseer-m1");
});

test("R6: with the cluster not reached take, renew, release and show exit 2 and make nothing; a refusal with no holder is exit 2", async () => {
  const closed = fresh({ LOCK_BASE: closedPort() });
  const t = Date.now();
  for (const a of [["take", "land", "a"], ["show", "land"], ["renew", "land", "a"], ["release", "land", "a"]]) {
    const r = await closed.lock(...a);
    expect(r.code).toBe(2);
    expect(r.err).toContain("[000]");
  }
  expect(Date.now() - t).toBeLessThan(30000);
  expect(readdirSync(closed.dir)).toEqual(["cb4-issues-tokens.json"]);

  // no token file: exit 2, and the stand-in got no call
  const bare = fresh();
  const empty = realpathSync(mkdtempSync(join(tmpdir(), "bm-lock-empty-")));
  for (const cmd of ["take land a", "show land", "release land a"]) expect((await bare.sh(`bash "$LOCK" ${cmd}`, { BRAIN_STATE_DIR: empty })).code).toBe(2);
  expect(bare.svc.calls).toEqual([]);
  expect(readdirSync(empty)).toEqual([]);

  // a 500, and a 403 that names no holder
  const { lock, svc } = fresh();
  svc.faults.push({ status: 500, body: { error: "InternalServerError" } });
  const five = await lock("take", "land", "a");
  expect(five.code).toBe(2);
  expect(five.err).toContain("[500]");
  expect(svc.rows.has("land")).toBe(false);
  svc.state.always = { status: 403, body: { error: "Forbidden", message: "the rule refuses this caller" } };
  for (const a of [["take", "land", "a"], ["release", "land", "a"], ["renew", "land", "a"], ["show", "land"]]) {
    const r = await lock(...a);
    expect(r.code).toBe(2);
    expect(r.err).toContain("[403]");
    expect(r.err).toContain("the rule refuses this caller");
  }
  // take --wait ends at once on it: asked again it answers the same
  const before = svc.calls.length, started = Date.now();
  expect((await lock("take", "land", "a", "--wait", "5")).code).toBe(2);
  expect(svc.calls.length).toBe(before + 1);
  expect(Date.now() - started).toBeLessThan(4000);
  // a 200 that is not the service's answer is not read as "nobody holds it", nor as a lock
  svc.state.always = { status: 200, body: { hello: "a page" } };
  expect((await lock("show", "land")).code).toBe(2);
  expect((await lock("take", "land", "a")).code).toBe(2);
}, 60000);

test("R6: take --wait asks again while the cluster is not reached, and a take whose answer was lost is found by one renew", async () => {
  const { lock, svc } = fresh();
  // the first take is refused unheard, the second is kept and its answer lost, the third is a 409 naming the caller
  svc.faults.push({ status: 502, body: {} }, { status: 500, body: {}, keep: true });
  const r = await lock("take", "land", "a", "--wait", "0.2");
  expect(r.code).toBe(0);
  expect(svc.locks()).toEqual([{ name: "land", who: "a" }, { name: "land", who: "a" }, { name: "land", who: "a" }, { name: "land", who: "a", renew: true }]);
  expect(r.out).toContain("an attempt of this run got no answer and had taken land; renewed");
  expect(r.out).toContain("land taken by a at ");
  expect(r.err).toContain("cb4 was not reached [502]; asking again every 0.2 s");
  expect(svc.rows.get("land")!.n).toBe(1);

  // the renew is for the caller's own name after its own lost attempt only: behind another holder it waits, and sends none
  const other = fresh();
  await other.lock("take", "land", "b");
  other.svc.faults.push({ status: 500, body: {} });
  const p = Bun.spawn(["bash", script, "take", "land", "a", "--wait", "0.2"], { env: other.env, stdout: "ignore", stderr: "ignore" });
  await Bun.sleep(1500);
  expect(p.exitCode).toBe(null);
  expect(other.svc.locks().filter((b) => b.renew)).toEqual([]);
  expect((await other.lock("release", "land", "b")).code).toBe(0);
  expect(await p.exited).toBe(0);
  expect(other.svc.locks().filter((b) => b.renew)).toEqual([]);
}, 30000);

test("a plain take asks once: a lost answer is exit 2, and the renew the brief gives then says the lock is the caller's", async () => {
  const { lock, svc } = fresh();
  svc.faults.push({ status: 500, body: {}, keep: true });
  const lost = await lock("take", "land", "a");
  expect(lost.code).toBe(2);
  expect(lost.err).toContain("lock.sh renew land a");
  expect(svc.locks().length).toBe(1);
  expect(svc.rows.get("land")!.who).toBe("a");
  expect((await lock("renew", "land", "a")).code).toBe(0);
  // without the renew, the take again is the 409 that names the caller: exit 1
  expect((await lock("take", "land", "a")).code).toBe(1);
});

// The briefs name the tool and no local lock. rules.md is the owner's: its two sentences are his answer A (event 1535 of lk-4-rules-md-two-sentences).
test("R3: the briefs name lock.sh for both locks, and no directory, mkdir, rmdir or rm -r of either", () => {
  const read = (f: string) => readFileSync(join(root, f), "utf8");
  const skill = ".claude/skills/brain-maintenance/";
  const named = [skill + "agents/implementer.md", skill + "agents/overseer.md", skill + "SKILL.md", skill + "rules.md", "knowledge/changing-and-deploying-a-cloud-brain-worker.md"];
  for (const f of [...named, skill + "agents/spec.md"]) {
    const text = read(f);
    if (named.includes(f)) {
      expect(text.includes("lock.sh take"), f + " names lock.sh take").toBe(true);
      expect(text.includes("lock.sh release"), f + " names lock.sh release").toBe(true);
    }
    const bad = text.split("\n").filter((line) => /(land|cb4)\.lock/.test(line) || (/lock/i.test(line) && (line.match(/`[^`]*`/g) || []).some((span) => /^`(mkdir|rmdir|rm -r)\b/.test(span))));
    expect(bad, f).toEqual([]);
  }
  // the two role names carry the machine, so one orchestrator a machine is one holder
  expect(read(skill + "SKILL.md")).toContain("lock.sh take land orchestrator-$(hostname -s)");
  expect(read(skill + "agents/overseer.md")).toContain("lock.sh take land overseer-$(hostname -s)");
  // the token of the call is the one the overseer's prompt names (ta-3-orchestrator-steps)
  expect(read(skill + "agents/overseer.md")).toContain("LOCK_TOKEN=<token> ");
  // step 10 of the writer's brief: the pull, the renew before the merge and the push
  const writer = read(skill + "agents/implementer.md");
  for (const phrase of ["pull --ff-only", "lock.sh renew land <id>", "lock.sh take land <id>", "lock.sh take cb4 <id>"]) expect(writer.includes(phrase), phrase).toBe(true);
});

test("take --wait with seconds that sleep would refuse is a usage error, at once, lock held or not", async () => {
  const { lock, svc } = fresh();
  for (const bad of ["abc", "0", "0.0", "-1", "1s", ""]) {
    expect((await lock("take", "land", "writer-b", "--wait", bad)).code).toBe(bad === "" ? 0 : 2);
    if (bad === "") await lock("release", "land", "writer-b");
  }
  await lock("take", "land", "writer-a");
  const n = svc.calls.length, t = Date.now();
  expect((await lock("take", "land", "writer-b", "--wait", "abc")).code).toBe(2);
  expect((await lock("take", "land", "writer-b", "--wait", "0")).code).toBe(2);
  expect(Date.now() - t).toBeLessThan(2000);
  expect(svc.calls.length).toBe(n);
  expect((await lock("show", "land")).out).toContain("writer-a");
});

test("take --wait leaves with exit 2 when sleep refuses the seconds the check let through", async () => {
  const { lock } = fresh();
  await lock("take", "land", "writer-a");
  for (const bad of ["2147483648", "99999999999999999999", "$'abc\\n5'", "$'5\\nabc'"]) {
    const t = Date.now();
    expect((await lock("take", "land", "writer-b", "--wait", bad)).code).toBe(2);
    expect(Date.now() - t).toBeLessThan(2000);
  }
  expect((await lock("show", "land")).out).toContain("writer-a");
});

// The docs step of `release land`: plan/cloud-brain-brain-docs-entered-by-hand.md, R5 and "Which Brain".
test("a release of land runs the docs tool with put --stale, and prints its last line with the Brain's name", async () => {
  const docs = stub(`echo "no scope in frontmatter, entered private: x"; echo '{"put":2,"entered":2}'`);
  const { lock, svc } = fresh({ LOCK_DOCS: docs.program, BRAIN_BASE: undefined });
  await lock("take", "land", "writer-a");
  expect(docs.calls()).toEqual([]);
  const r = await lock("release", "land", "writer-a");
  expect(r.code).toBe(0);
  expect(svc.rows.get("land")!.who).toBe("");
  // No BRAIN_BASE in the caller's environment, as an agent's shell has none: the tool is given cb4.
  expect(docs.calls()).toEqual(["put --stale --limit=30|cb4"]);
  const lines = r.out.split("\n");
  expect(lines[0]).toContain("land released by writer-a");
  expect(lines.slice(1)).toEqual([`docs (cb4): {"put":2,"entered":2}`]);
});

test("a BRAIN_BASE the caller set is kept, and is the name in the line", async () => {
  const docs = stub();
  const { lock } = fresh({ LOCK_DOCS: docs.program, BRAIN_BASE: "cbx" });
  await lock("take", "land", "writer-a");
  const r = await lock("release", "land", "writer-a");
  expect(docs.calls()).toEqual(["put --stale --limit=30|cbx"]);
  expect(r.out).toContain(`docs (cbx): {"put":2,"entered":2}`);
  expect(r.out).not.toContain("cb4");
});

test("a docs tool that fails leaves the release at exit 0 with the lock gone, and the line says why", async () => {
  const cases: [string, string][] = [
    [`echo 'no token "loop-docs" is kept. The owner makes it once: …' >&2; exit 2`, `docs (cb4): not entered (no token "loop-docs" is kept. The owner makes it once: …)`],
    // An uncaught throw as bun prints it: the source lines, then the message.
    [`printf '27 | if (!BASE) throw\\n          ^\\nerror: knowledge.list: 403 refused\\n      at tool.ts:27:22\\n\\nBun v1.4.0\\n' >&2; exit 1`, "docs (cb4): not entered (knowledge.list: 403 refused)"],
    ["exit 1", "docs (cb4): not entered (exit 1, and it printed nothing)"],
  ];
  for (const [then, line] of cases) {
    const docs = stub(then);
    const { lock, svc } = fresh({ LOCK_DOCS: docs.program, BRAIN_BASE: undefined });
    await lock("take", "land", "writer-a");
    const r = await lock("release", "land", "writer-a");
    expect(r.code).toBe(0);
    expect(svc.rows.get("land")!.who).toBe("");
    expect(docs.calls().length).toBe(1);
    expect(r.out.split("\n").slice(1)).toEqual([line]);
    expect((await lock("take", "land", "writer-b")).code).toBe(0);
  }
  // A program that is not there: the same.
  const { lock, svc } = fresh({ LOCK_DOCS: "/nowhere/docs.sh", BRAIN_BASE: undefined });
  await lock("take", "land", "writer-a");
  const r = await lock("release", "land", "writer-a");
  expect(r.code).toBe(0);
  expect(svc.rows.get("land")!.who).toBe("");
  expect(r.out).toContain("docs (cb4): not entered (");
}, 20000);

test("the step is for a release of land that happened: not LOCK_DOCS=0, not cb4, not a take, a renew or a show, not a release refused or not reached", async () => {
  const docs = stub();
  const off = fresh({ LOCK_DOCS: "0" });
  await off.lock("take", "land", "writer-a");
  const quiet = await off.lock("release", "land", "writer-a");
  expect(quiet.code).toBe(0);
  expect(quiet.out).not.toContain("docs");
  const { lock, svc } = fresh({ LOCK_DOCS: docs.program });
  expect((await lock("take", "cb4", "writer-a")).code).toBe(0);
  const cb4 = await lock("release", "cb4", "writer-a");
  expect(cb4.code).toBe(0);
  expect(cb4.out).not.toContain("docs");
  expect((await lock("release", "land", "writer-a")).code).toBe(1);
  expect((await lock("take", "land", "writer-a")).code).toBe(0);
  expect((await lock("renew", "land", "writer-a")).code).toBe(0);
  expect((await lock("show", "land")).code).toBe(0);
  const other = await lock("release", "land", "writer-b");
  expect(other.code).toBe(1);
  expect(other.out).not.toContain("docs");
  svc.faults.push({ status: 500, body: {} });
  expect((await lock("release", "land", "writer-a")).code).toBe(2);
  expect(docs.calls()).toEqual([]);
  expect((await lock("release", "land", "writer-a")).code).toBe(0);
  expect(docs.calls().length).toBe(1);
}, 20000);

// R3's read of the Brain's copy of the reviewer's brief (put by task 2; tests/tools/reviewer-brief-waits-on-show.test.ts
// has the rest). With cb4 not answering it is skipped, and says so.
test("R3: the reviewer's brief on the Brain names neither lock directory and waits on lock.sh show land", async () => {
  const url = "https://cb4.endpointservices.workers.dev/static/cloud-brain-dev/roles/reviewer.md";
  let text: string;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (r.status !== 200) throw new Error("status " + r.status);
    text = await r.text();
  } catch (e) {
    console.log(`skipped: ${url} did not answer (${String((e as Error).message || e)}); the brief was not read`);
    return;
  }
  const count = (re: RegExp) => text.split("\n").filter((l) => re.test(l)).length;
  expect(count(/land\.lock|cb4\.lock/)).toBe(0);
  expect(count(/lock\.sh show land/)).toBe(1);
}, 15000);
