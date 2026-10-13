// brain.ts agent-token, brain.ts token --delegate, and issue-as.sh reading .emitted/cb4-agent-tokens.json.
// Task 1 of plan/cloud-brain-record-names-token-not-agent.md (issue ta-1-agent-token-command): one token for each
// agent, made under a parent token the owner makes once. Both tools are run here as processes against a local
// stand-in for the kernel and the core. The stand-in's rules are written from brain-core.ojs (delegation.create,
// list, revoke; `delegating`; `asSecret`) and are not the core: what cb4 answers is the second part of the task.
//
//   bun test ./tests/tools/agent-token.test.ts
//   BRAIN_TS=/path/to/brain.ts ISSUE_AS_SH=/path/to/issue-as.sh bun test …   # the same cases against other copies
import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, realpathSync, statSync, existsSync, utimesSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const brainTs = process.env.BRAIN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/brain.ts");
const issueAs = process.env.ISSUE_AS_SH || resolve(import.meta.dir, "../../tools/cloud-brain/issue-as.sh");
const realCurl = Bun.which("curl")!;
const NS = "/xrpc/com.lopecode.brain.";
const SESSION = "owner-session-of-the-test";

// The stand-in. A delegation is { id, name, from, scope, caps, until, parent, note, created, secret }.
type D = { id: string; name: string; from: string; scope: string[]; caps: string[]; until: number | null; parent: string | null; note: string; created: number; secret: string };
let server: ReturnType<typeof Bun.serve>;
let rows: D[] = [];
let calls: { method: string; path: string; bearer: string; body: any }[] = [];
// A revoked secret that the kernel still remembers: it answers 200 this many reads more (the kernel holds a row 5 s).
let remembered = new Map<string, number>();
const hex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
const inside = (m: string, scope: string[]) => scope.some((p) => p === m || (/[./]\*$/.test(p) && m.startsWith(p.slice(0, -1))));
const fail = (status: number, error: string, message: string) => Response.json({ error, message }, { status });
const drop = (d: D) => { rows = rows.filter((o) => o !== d && o.parent !== d.id); };

beforeAll(() => {
  server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: async (req) => {
    const url = new URL(req.url), bearer = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
    const body = req.method === "POST" ? await req.json().catch(() => null) : undefined;
    calls.push({ method: req.method, path: url.pathname + url.search, bearer, body });
    if (!url.pathname.startsWith(NS)) return fail(404, "NotFound", "no such path");
    const m = url.pathname.slice(NS.length), held = rows.find((d) => d.secret === bearer) || null, owner = bearer === SESSION;
    if (m.startsWith("delegation.")) {
      if (!owner && !(held && held.caps.includes("delegate"))) return fail(401, "AuthRequired", "the owner's or a member's own session, or a delegation with the cap delegate");
      const parent = owner ? null : held;
      if (m === "delegation.create") {
        const { name, holder, scope, caps = [], until = parent ? parent.until : null, note = "" } = body || {};
        if (typeof name !== "string" || !/^[a-z0-9-]{1,40}$/.test(name)) return fail(400, "InvalidRequest", "name is a-z, 0-9 and -, 1 to 40 characters");
        if (!(holder && holder.secret === true)) return fail(400, "InvalidRequest", "holder is { secret: true } in this stand-in");
        if (!Array.isArray(scope) || !scope.length || scope.some((s: any) => typeof s !== "string" || !s.startsWith("com.lopecode.brain."))) return fail(400, "InvalidRequest", "scope is 1 to 50 method names");
        if (caps.length && parent) return fail(400, "InvalidRequest", "a delegation made under another has no caps");
        if (until !== null && !(Number.isInteger(until) && until > Date.now())) return fail(400, "InvalidRequest", "until is a time in ms after now, or null");
        if (parent) {
          const out = scope.find((s: string) => !inside(s, parent.scope));
          if (out) return fail(403, "Forbidden", `${out} is outside the scope of ${parent.name}, which this is made under`);
          if (parent.until !== null && !(until !== null && until <= parent.until)) return fail(403, "Forbidden", `until is no later than that of ${parent.name}`);
        }
        if (typeof note !== "string" || note.length > 300) return fail(400, "InvalidRequest", "note is text, at most 300 characters");
        if (rows.some((d) => d.name === name)) return fail(400, "InvalidRequest", `a delegation named ${name} exists; revoke it first`);
        const d: D = { id: hex(6), name, from: "owner", scope, caps, until, parent: parent ? parent.id : null, note, created: Date.now(), secret: hex(32) };
        rows.push(d);
        return Response.json({ ...d, holder: { secret: "sha256-of-" + d.id } });
      }
      const shown = ({ secret, ...d }: D) => ({ ...d, holder: { secret: "sha256-of-" + d.id }, spentToday: 0 });
      if (m === "delegation.list") return Response.json({ delegations: rows.filter((d) => (parent ? d.parent === parent.id : true)).map(shown) });
      if (m === "delegation.revoke") {
        const d = rows.find((o) => o.id === (body || {}).id);
        if (!d || (parent && d.parent !== parent.id)) return Response.json({ revoked: false });
        drop(d);
        return Response.json({ revoked: true, id: d.id });
      }
    }
    if (m === "token.revoke") {
      if (!owner) return fail(401, "AuthRequired", "the owner's own session");
      const gone = rows.filter((d) => d.name === (body || {}).name);
      gone.forEach(drop);
      return Response.json({ revoked: gone.length });
    }
    // Any other method, as a token: an unknown secret is 401, one whose scope does not reach it 403.
    const left = remembered.get(bearer) || 0;
    if (left > 0) return remembered.set(bearer, left - 1), Response.json({ remembered: true });
    if (!held) return fail(401, "AuthRequired", "unknown token");
    if (!inside("com.lopecode.brain." + m, held.scope)) return fail(403, "Forbidden", `delegation ${held.name} does not reach com.lopecode.brain.${m}`);
    return Response.json({ ok: true, as: held.name, method: m });
  } });
});
afterAll(() => server.stop(true));

// A checkout of its own: tools/cloud-brain/ with issue-as.sh, .emitted/ with the state file, and a curl first on
// PATH that sends a call for cb4 to the stand-in with every other argument as given.
const rig = () => {
  rows = []; calls = []; remembered = new Map();
  const root = realpathSync(mkdtempSync(join(tmpdir(), "agent-token-"))), state = join(root, ".emitted");
  mkdirSync(state);
  mkdirSync(join(root, "bin"));
  copyFileSync(issueAs, join(root, "issue-as.sh"));
  chmodSync(join(root, "issue-as.sh"), 0o755);
  writeFileSync(join(state, "cb4.json"), JSON.stringify({ brainUrl: `http://127.0.0.1:${server.port}`, session: SESSION }));
  writeFileSync(join(root, "bin/curl"), `#!/bin/bash\nargs=("$@"); n=$((\${#args[@]}-1))\nargs[$n]="\${args[$n]/#https:\\/\\/cb4.endpointservices.workers.dev/http://127.0.0.1:${server.port}}"\nexec ${realCurl} "\${args[@]}"\n`);
  chmodSync(join(root, "bin/curl"), 0o755);
  const env = { ...process.env, BRAIN_BASE: "cb4", BRAIN_STATE_DIR: state, PATH: `${join(root, "bin")}:${process.env.PATH}` };
  const run = async (cmd: string[]) => {
    // A run that does not end is killed, and its exit code is then not 0 or 1.
    const p = Bun.spawn(cmd, { env, stdout: "pipe", stderr: "pipe", timeout: 20000 });
    const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text();
    return { code: await p.exited, out, err, all: out + err };
  };
  const kept = (f: string) => (existsSync(join(state, f)) ? JSON.parse(readFileSync(join(state, f), "utf8")) : {});
  return {
    state,
    brain: (...args: string[]) => run(["bun", brainTs, ...args]),
    as: (...args: string[]) => run([join(root, "issue-as.sh"), ...args]),
    kept,
    mode: (f: string) => statSync(join(state, f)).mode & 0o777,
    // The parent, as the owner's one command makes it.
    parent: async () => {
      const r = await run(["bun", brainTs, "token", "loop-agents", "issue.*", "--delegate"]);
      return { ...r, secret: kept("cb4-tokens.json")["loop-agents"] as string };
    },
  };
};
const sent = (path: string) => calls.filter((c) => c.path.startsWith(NS + path));

test("token NAME <method…> --delegate: delegation.create with the owner's session and the cap delegate, the secret kept and not printed", async () => {
  const r = rig(), made = await r.parent();
  expect(made.code).toBe(0);
  const [c] = sent("delegation.create");
  expect(c.bearer).toBe(SESSION);
  expect(c.body).toEqual({ name: "loop-agents", holder: { secret: true }, scope: ["com.lopecode.brain.issue.*"], caps: ["delegate"] });
  expect(sent("token.create")).toEqual([]);
  expect(made.secret).toBe(rows[0].secret);
  expect(made.all).toContain("loop-agents");
  expect(made.all).not.toContain(made.secret);
  expect(r.mode("cb4-tokens.json")).toBe(0o600);
});

test("token NAME <method…> with no --delegate is token.create as before", async () => {
  const r = rig();
  await r.brain("token", "plain", "quota.get");
  expect(sent("delegation.create")).toEqual([]);
  expect(sent("token.create")[0].body).toEqual({ name: "plain", methods: ["quota.get"] });
});

test("agent-token <role> [what for]: a child of the parent for issue.*, 48 hours, named <role>-<6 hex>; stdout is the name", async () => {
  const r = rig(), parent = await r.parent(), before = Date.now();
  const made = await r.brain("agent-token", "impl", "ta-1-agent-token-command");
  expect(made.code).toBe(0);
  const name = made.out.trim();
  expect(name).toMatch(/^impl-[0-9a-f]{6}$/);
  const c = sent("delegation.create")[1];
  expect(c.bearer).toBe(parent.secret);
  expect(c.body.name).toBe(name);
  expect(c.body.holder).toEqual({ secret: true });
  expect(c.body.scope).toEqual(["com.lopecode.brain.issue.*"]);
  expect(c.body.note).toBe("impl; ta-1-agent-token-command");
  expect(c.body.caps ?? []).toEqual([]);
  expect(c.body.until).toBeGreaterThanOrEqual(before + 48 * 3600e3);
  expect(c.body.until).toBeLessThanOrEqual(Date.now() + 48 * 3600e3);
  const child = rows.find((d) => d.name === name)!;
  expect(child.parent).toBe(rows[0].id);
  expect(r.kept("cb4-agent-tokens.json")).toEqual({ [name]: child.secret });
  expect(r.mode("cb4-agent-tokens.json")).toBe(0o600);
  expect(made.all).not.toContain(child.secret);
  expect(made.all).not.toContain(parent.secret);
});

test("agent-token: a role that is not one of the eight, or no parent kept, stops before anything is sent", async () => {
  const r = rig();
  const none = await r.brain("agent-token", "impl", "x");
  expect(none.code).toBe(1);
  expect(none.all).toContain("token loop-agents 'issue.*' --delegate");
  expect(calls).toEqual([]);
  await r.parent();
  calls = [];
  for (const role of ["implementer", "IMPL", "impl-1", ""]) {
    const bad = await r.brain("agent-token", ...(role ? [role] : []));
    expect(bad.code).toBe(1);
    expect(bad.all).toContain("orch impl rev spec over dig appr out");
  }
  expect(calls).toEqual([]);
  expect(r.kept("cb4-agent-tokens.json")).toEqual({});
});

test("agent-token: every role makes a name with its prefix, and a note with no second argument is the role", async () => {
  const r = rig();
  await r.parent();
  for (const role of ["orch", "impl", "rev", "spec", "over", "dig", "appr", "out"]) {
    const made = await r.brain("agent-token", role);
    expect(made.out.trim()).toMatch(new RegExp(`^${role}-[0-9a-f]{6}$`));
    expect(rows.at(-1)!.note).toBe(role);
  }
  expect(Object.keys(r.kept("cb4-agent-tokens.json")).length).toBe(8);
});

test("agent-token: eight made at once are all kept", async () => {
  const r = rig();
  await r.parent();
  const made = await Promise.all(Array.from({ length: 8 }, (_, i) => r.brain("agent-token", "impl", "at-once-" + i)));
  const names = made.map((m) => m.out.trim()).sort();
  expect(made.map((m) => m.code)).toEqual(Array(8).fill(0));
  expect(Object.keys(r.kept("cb4-agent-tokens.json")).sort()).toEqual(names);
  expect(existsSync(join(r.state, "cb4-agent-tokens.json.lock"))).toBe(false);
}, 30000);

test("agent-token: a refusal of the core is exit 1, with its message and nothing kept", async () => {
  const r = rig();
  await r.parent();
  // The parent ends in an hour, so a child of 48 hours is refused 403.
  rows[0].until = Date.now() + 3600e3;
  const made = await r.brain("agent-token", "impl", "x");
  expect(made.code).toBe(1);
  expect(made.all).toContain("403");
  expect(made.all).toContain("until is no later than that of loop-agents");
  expect(r.kept("cb4-agent-tokens.json")).toEqual({});
});

test("issue-as.sh: a name of the agent tokens file is sent with its secret; a role's name still is; neither is exit 2 and nothing sent", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "rev", "an-issue")).out.trim(), secret = r.kept("cb4-agent-tokens.json")[name];
  writeFileSync(join(r.state, "cb4-issues-tokens.json"), JSON.stringify({ "issues-reviewer-2": "a-role-token" }));
  calls = [];
  const read = await r.as(name, "get?id=an-issue");
  expect(JSON.parse(read.out)).toEqual({ ok: true, as: name, method: "issue.get" });
  expect(read.err).toBe(" [200]\n");
  expect(calls[0].bearer).toBe(secret);
  const write = await r.as(name, "comment", JSON.stringify({ key: "k", id: "i", body: "no time in it" }));
  expect(write.err).toBe(" [200]\n");
  expect(calls[1]).toMatchObject({ method: "POST", bearer: secret, path: NS + "issue.comment" });
  const role = await r.as("issues-reviewer-2", "get?id=an-issue");
  expect(role.err).toBe(" [401]\n");
  expect(calls[2].bearer).toBe("a-role-token");
  calls = [];
  for (const no of ["impl-000000", "__class__", "loop-agents"]) {
    const miss = await r.as(no, "get?id=an-issue");
    expect(miss.code).toBe(2);
    expect(miss.out).toBe("");
    expect(miss.err).toContain(`no token named ${no}`);
  }
  expect(calls).toEqual([]);
  expect(read.all + write.all + role.all).not.toContain(secret);
});

test("issue-as.sh: with no agent tokens file a role's name is sent and another is exit 2", async () => {
  const r = rig();
  writeFileSync(join(r.state, "cb4-issues-tokens.json"), JSON.stringify({ t: "a-role-token" }));
  expect((await r.as("t", "policy")).err).toBe(" [401]\n");
  expect(calls[0].bearer).toBe("a-role-token");
  expect((await r.as("impl-000000", "policy")).code).toBe(2);
  expect(calls.length).toBe(1);
});

test("brain.ts curl --as takes a name of the agent tokens file", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "out", "a", "session", "outside")).out.trim();
  expect(rows.at(-1)!.note).toBe("out; a session outside");
  calls = [];
  const got = await r.brain("curl", NS + "issue.policy", "--as", name);
  expect(JSON.parse(got.out)).toEqual({ ok: true, as: name, method: "issue.policy" });
  expect(calls[0].bearer).toBe(r.kept("cb4-agent-tokens.json")[name]);
});

test("agent-token list: the parent's children with name, note, made and until, and no secret or hash", async () => {
  const r = rig(), parent = await r.parent();
  const a = (await r.brain("agent-token", "impl", "one")).out.trim(), b = (await r.brain("agent-token", "rev", "two")).out.trim();
  // A token the owner made beside the parent is not a child of it and is not listed.
  await r.brain("token", "other-parent", "issue.*", "--delegate");
  calls = [];
  const list = await r.brain("agent-token", "list");
  expect(list.code).toBe(0);
  expect(sent("delegation.list")[0].bearer).toBe(parent.secret);
  const lines = list.out.trim().split("\n").map((l) => JSON.parse(l));
  expect(lines.map((l) => [l.name, l.note, l.kept])).toEqual([[a, "impl; one", true], [b, "rev; two", true]]);
  for (const l of lines) {
    expect(Object.keys(l).sort()).toEqual(["kept", "made", "name", "note", "until"]);
    expect(Date.parse(l.until) - Date.parse(l.made)).toBeGreaterThan(47.9 * 3600e3);
  }
  for (const d of rows) { expect(list.all).not.toContain(d.secret); expect(list.all).not.toContain("sha256-of-"); }
});

test("agent-token revoke NAME: delegation.revoke by the parent, one read with the child's secret answers 401, the entry goes, and issue-as.sh is exit 2", async () => {
  const r = rig(), parent = await r.parent();
  const name = (await r.brain("agent-token", "impl", "done")).out.trim(), other = (await r.brain("agent-token", "impl", "kept")).out.trim();
  const secret = r.kept("cb4-agent-tokens.json")[name], id = rows.find((d) => d.name === name)!.id;
  expect((await r.as(name, "get?id=x")).err).toBe(" [200]\n");
  calls = [];
  const gone = await r.brain("agent-token", "revoke", name);
  expect(gone.code).toBe(0);
  expect(gone.out).toMatch(/^401: .* on read 1 of issue\.policy, \d+ ms after the revoke\. /);
  expect(sent("delegation.revoke")).toMatchObject([{ bearer: parent.secret, body: { id } }]);
  expect(sent("issue.policy")).toMatchObject([{ bearer: secret, method: "GET" }]);
  expect(Object.keys(r.kept("cb4-agent-tokens.json"))).toEqual([other]);
  expect(r.mode("cb4-agent-tokens.json")).toBe(0o600);
  expect(gone.all).not.toContain(secret);
  calls = [];
  const after = await r.as(name, "get?id=x");
  expect(after.code).toBe(2);
  expect(calls).toEqual([]);
  expect((await r.as(other, "get?id=x")).err).toBe(" [200]\n");
});

test("agent-token revoke: a secret the kernel still remembers is read again until it answers 401", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "impl", "x")).out.trim();
  remembered.set(r.kept("cb4-agent-tokens.json")[name], 2);
  calls = [];
  const gone = await r.brain("agent-token", "revoke", name);
  expect(gone.code).toBe(0);
  expect(sent("issue.policy").length).toBe(3);
  // The line says on which read the 401 came and how long after the revoke: what a record of a run on a Brain quotes.
  expect(gone.out).toMatch(/^401: .* on read 3 of issue\.policy, \d+ ms after the revoke\. /);
  expect(Number(gone.out.match(/, (\d+) ms after/)![1])).toBeGreaterThanOrEqual(2000);
  expect(r.kept("cb4-agent-tokens.json")).toEqual({});
}, 20000);

test("agent-token revoke: a secret that still answers is exit 1 with the entry kept", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "impl", "x")).out.trim(), secret = r.kept("cb4-agent-tokens.json")[name];
  remembered.set(secret, 1000);
  const gone = await r.brain("agent-token", "revoke", name);
  expect(gone.code).toBe(1);
  expect(gone.all).toContain("200");
  expect(gone.all).not.toContain("401:");
  expect(r.kept("cb4-agent-tokens.json")).toEqual({ [name]: secret });
}, 30000);

test("agent-token revoke: a child that has gone already (ended, or revoked elsewhere) loses its entry; a name nobody has is exit 1", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "impl", "x")).out.trim();
  rows = rows.filter((d) => d.name !== name);
  calls = [];
  const gone = await r.brain("agent-token", "revoke", name);
  expect(gone.code).toBe(0);
  expect(sent("delegation.revoke")).toEqual([]);
  // The line does not say "is revoked" or "after the revoke" of a revoke that was not sent.
  expect(gone.out).toMatch(/^401: .* was no row under loop-agents any more, so no revoke was sent; its value is refused, on read 1 of issue\.policy, \d+ ms after the first read was sent\. /);
  expect(gone.out).not.toContain("is revoked");
  expect(gone.out).not.toContain("after the revoke");
  expect(r.kept("cb4-agent-tokens.json")).toEqual({});
  const none = await r.brain("agent-token", "revoke", "impl-000000");
  expect(none.code).toBe(1);
  // The parent is not a child of itself: its name is not revoked by this command.
  const self = await r.brain("agent-token", "revoke", "loop-agents");
  expect(self.code).toBe(1);
  expect(rows.map((d) => d.name)).toEqual(["loop-agents"]);
});

test("token revoke of the parent ends its children: a child's secret is then refused", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "impl", "x")).out.trim();
  await r.brain("token", "revoke", "loop-agents");
  expect(r.kept("cb4-tokens.json")).toEqual({});
  expect((await r.as(name, "get?id=x")).err).toBe(" [401]\n");
});

// Review 1420: the branch for a lock left behind went round with no sleep and no end when the lock could not be
// removed, after the child was made. A lock is an empty directory; a file in it is what makes rmdir fail.
const staleLock = (state: string, withFile: boolean) => {
  const lock = join(state, "cb4-agent-tokens.json.lock"), then = new Date(Date.now() - 60000);
  mkdirSync(lock);
  if (withFile) writeFileSync(join(lock, "x"), "");
  utimesSync(lock, then, then);
  return lock;
};

test("agent-token: a lock left behind that cannot be removed is exit 1, and the child that was made is revoked and not kept", async () => {
  const r = rig(), parent = await r.parent();
  const lock = staleLock(r.state, true);
  calls = [];
  const began = Date.now(), made = await r.brain("agent-token", "impl", "stuck");
  expect(made.code).toBe(1);
  expect(Date.now() - began).toBeLessThan(15000);
  expect(made.out).toContain("could not be kept");
  expect(made.out).toContain(lock);
  const [create] = sent("delegation.create");
  expect(sent("delegation.revoke")).toMatchObject([{ bearer: parent.secret }]);
  expect(rows.map((d) => d.name)).toEqual(["loop-agents"]);
  expect(made.out).toContain(create.body.name);
  expect(r.kept("cb4-agent-tokens.json")).toEqual({});
  expect(existsSync(lock)).toBe(true);
}, 30000);

test("agent-token: a lock left behind that can be removed is taken, and the child is kept", async () => {
  const r = rig();
  await r.parent();
  const lock = staleLock(r.state, false);
  const began = Date.now(), made = await r.brain("agent-token", "impl", "left");
  expect(made.code).toBe(0);
  expect(Date.now() - began).toBeLessThan(5000);
  expect(Object.keys(r.kept("cb4-agent-tokens.json"))).toEqual([made.out.trim()]);
  expect(existsSync(lock)).toBe(false);
}, 30000);

test("brain.ts curl --as a name that is not kept names both ways to make one", async () => {
  const r = rig();
  const got = await r.brain("curl", NS + "issue.policy", "--as", "impl-000000");
  expect(got.code).toBe(1);
  expect(got.out).toContain('no token "impl-000000" is kept');
  expect(got.out).toContain("agent-token <role>");
  expect(calls).toEqual([]);
});

// Review 1456: the same lock met by a revoke ended in a stack trace, after the revoke was sent.
test("agent-token revoke: a lock that cannot be removed is exit 1 with one line and the entry kept; again with the lock gone removes it", async () => {
  const r = rig();
  await r.parent();
  const name = (await r.brain("agent-token", "impl", "x")).out.trim(), secret = r.kept("cb4-agent-tokens.json")[name];
  const lock = staleLock(r.state, true);
  calls = [];
  const stuck = await r.brain("agent-token", "revoke", name);
  expect(stuck.code).toBe(1);
  expect(sent("delegation.revoke").length).toBe(1);
  expect(stuck.out).toContain(`agent-token revoke ${name}`);
  expect(stuck.out).toContain(lock);
  expect(stuck.out.trim().split("\n").length).toBe(1);
  expect(stuck.err).toBe("");
  expect(r.kept("cb4-agent-tokens.json")).toEqual({ [name]: secret });
  rmSync(lock, { recursive: true });
  calls = [];
  const again = await r.brain("agent-token", "revoke", name);
  expect(again.code).toBe(0);
  expect(sent("delegation.revoke")).toEqual([]);
  expect(r.kept("cb4-agent-tokens.json")).toEqual({});
}, 30000);

// ---- agent-token --parent NAME (fly-4-loop-files): the children of another kept parent, the machine's on Fly.io
test("agent-token --parent NAME: list and revoke are of that parent's children, whose values this checkout does not keep; with no flag they are of loop-agents as before", async () => {
  const r = rig(), parent = await r.parent();
  await r.brain("token", "fly-agents", "issue.*", "--delegate");
  const fly = r.kept("cb4-tokens.json")["fly-agents"] as string;
  const own = (await r.brain("agent-token", "impl", "of the laptop")).out.trim();
  // A token the machine made: a child of fly-agents, its value in the machine's file and not in this one.
  const made = await r.brain("agent-token", "--parent", "fly-agents", "orch", "driver:m1");
  const theirs = made.out.trim();
  expect([made.code, /^orch-[0-9a-f]{6}$/.test(theirs)]).toEqual([0, true]);
  expect(sent("delegation.create").at(-1)!.bearer).toBe(fly);
  expect(made.err).toContain("under fly-agents for issue.*");
  const file = r.kept("cb4-agent-tokens.json");
  delete file[theirs];
  writeFileSync(join(r.state, "cb4-agent-tokens.json"), JSON.stringify(file));
  calls = [];
  const names = async (...a: string[]) => { const l = await r.brain(...a); return [l.code, l.out.trim().split("\n").filter(Boolean).map((x) => { const d = JSON.parse(x); return `${d.name} ${d.note} kept=${d.kept}`; })]; };
  expect(await names("agent-token", "--parent", "fly-agents", "list")).toEqual([0, [`${theirs} orch; driver:m1 kept=false`]]);
  expect(await names("agent-token", "list", "--parent", "fly-agents")).toEqual([0, [`${theirs} orch; driver:m1 kept=false`]]);
  expect(await names("agent-token", "list")).toEqual([0, [`${own} impl; of the laptop kept=true`]]);
  expect(sent("delegation.list").map((c) => c.bearer)).toEqual([fly, fly, parent.secret]);
  // Without the flag the machine's token is none of loop-agents: exit 1, and no revoke is sent.
  calls = [];
  const not = await r.brain("agent-token", "revoke", theirs);
  expect([not.code, not.out.trim(), sent("delegation.revoke")]).toEqual([1, `no token "${theirs}" was made under loop-agents or is kept here`, []]);
  const id = rows.find((d) => d.name === theirs)!.id;
  const gone = await r.brain("agent-token", "--parent", "fly-agents", "revoke", theirs);
  expect([gone.code, gone.out.trim()]).toEqual([0, `revoked "${theirs}". Its value is not kept here, so no read was sent with it`]);
  expect(sent("delegation.revoke")).toMatchObject([{ bearer: fly, body: { id } }]);
  expect(rows.map((d) => d.name).sort()).toEqual(["fly-agents", "loop-agents", own].sort());
  for (const d of [fly, parent.secret]) expect(gone.all + made.all).not.toContain(d);
});

test("agent-token --parent: a parent that is not kept, no name after the flag, or a name that is none: exit 1, and nothing is sent", async () => {
  const r = rig();
  await r.parent();
  calls = [];
  const none = await r.brain("agent-token", "--parent", "fly-agents", "list");
  expect([none.code, none.out.trim()]).toEqual([1, `no token "fly-agents" is kept. The owner makes it once: token fly-agents 'issue.*' --delegate`]);
  for (const bad of [["agent-token", "list", "--parent"], ["agent-token", "--parent", "Not_A_Name", "list"], ["agent-token", "--parent", "fly-agents"]]) {
    const b = await r.brain(...bad);
    expect([bad.join(" "), b.code, b.out.startsWith("agent-token [--parent NAME] <role> [what for] | ")]).toEqual([bad.join(" "), 1, true]);
  }
  expect(calls).toEqual([]);
});
