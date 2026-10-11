// issue-as.sh: a write whose reason or body names a time of today ahead of the clock is not sent.
// Issue tracker-write-names-a-time-not-read: events 417 to 421 of cb4's record carry "Checked 11:10" in
// reasons stamped 11:06:01 to 11:06:04, and event 445 "11:08 to 11:20 CEST" stamped 11:12:52.
//
//   bun test ./tests/tools/issue-as-time-check.test.ts
//   ISSUE_AS_SH=/path/to/another/issue-as.sh bun test …
// No call leaves the machine: the script is copied beside a token file of its own, and `curl` is a stand-in.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const script = process.env.ISSUE_AS_SH || resolve(import.meta.dir, "../../tools/cloud-brain/issue-as.sh");

const rig = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "issue-as-")));
  mkdirSync(join(root, ".emitted"));
  mkdirSync(join(root, "bin"));
  copyFileSync(script, join(root, "issue-as.sh"));
  chmodSync(join(root, "issue-as.sh"), 0o755);
  writeFileSync(join(root, ".emitted/cb4-issues-tokens.json"), JSON.stringify({ t: "not-a-token" }));
  // Writes its arguments one a line, then answers as curl does for the tracker: the body on stdout, and the status
  // where the -w it was given puts it.
  writeFileSync(join(root, "bin/curl"), `#!/bin/bash\nprintf '%s\\n' "$@" > "${root}/sent"\nprintf '{"ok":true}'\ncase "$*" in *'%{stderr} [%{http_code}]'*) printf ' [200]\\n' >&2;; *) printf ' [200]\\n';; esac\n`);
  chmodSync(join(root, "bin/curl"), 0o755);
  return (now: string, method: string, body?: unknown, more: Record<string, string> = {}) => {
    const args = [join(root, "issue-as.sh"), "t", method];
    if (body !== undefined) args.push(typeof body === "string" ? body : JSON.stringify(body));
    const p = Bun.spawnSync(args, { env: { ...process.env, PATH: `${join(root, "bin")}:${process.env.PATH}`, TZ: "Europe/Berlin", ISSUE_AS_NOW: now, ...more } });
    const sent = existsSync(join(root, "sent")) ? readFileSync(join(root, "sent"), "utf8") : null;
    return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString(), sent };
  };
};
const at = "2026-10-11T11:06:00";
const move = (reason: string) => ({ key: "k", id: "i", to: "closed", reason });

test("a reason that names a time ahead of the clock is not sent (event 418)", () => {
  const r = rig()(at, "move", move("Not real. Checked 11:10: the count is 20."));
  expect(r.code).toBe(3);
  expect(r.sent).toBe(null);
  expect(r.out).toBe("");
  expect(r.err).toContain("11:10");
  expect(r.err).toContain("11:06");
  expect(r.err).toContain("reason");
  expect(r.err).not.toContain("not-a-token");
});

test("a body with today's date and an end ahead of the clock is not sent, and the start that is past is not named (event 445)", () => {
  const r = rig()("2026-10-11T11:12:52", "comment", { key: "k", id: "i", body: "What the round found, 2026-10-11 11:08 to 11:20 CEST." });
  expect(r.code).toBe(3);
  expect(r.sent).toBe(null);
  expect(r.err).toContain("11:20");
  expect(r.err).not.toContain("11:08");
});

test("a time with seconds, and one a minute or less ahead", () => {
  const send = rig();
  expect(send(at, "move", move("read at 11:07:01")).code).toBe(3);
  expect(send(at, "move", move("read at 11:07:00")).code).toBe(0);
  expect(send("2026-10-11T11:06:30", "move", move("read at 11:07")).code).toBe(0);
});

test("a time of the past is sent, with the body as given", () => {
  const body = JSON.stringify(move("date read 11:05:58 CEST; the move before is stamped 11:06"));
  const r = rig()(at, "move", body);
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out)).toEqual({ ok: true });
  expect(r.err).toBe(" [200]\n");
  expect(r.sent).toContain(body);
  expect(r.sent).toContain("authorization: Bearer not-a-token");
  expect(r.sent).toContain("https://cb4.endpointservices.workers.dev/xrpc/com.lopecode.brain.issue.move");
});

test("a time beside another day's date is sent, the date before it or after it", () => {
  const send = rig();
  expect(send(at, "comment", { key: "k", id: "i", body: "git log reads 2026-10-10 23:45:37 for ff27978f and 2026-10-10 18:06:56 for 25f99967." }).code).toBe(0);
  expect(send(at, "comment", { key: "k", id: "i", body: "oversight.md counts recurrences at 20:47, 21:08, 23:46 on 2026-10-10 and here." }).code).toBe(0);
});

test("the nearest date decides: today's estimate is refused in a text that also names yesterday", () => {
  const r = rig()(at, "comment", { key: "k", id: "i", body: "The edit of 2026-10-10 23:45:37 did not hold. Found by the fresh review at 11:35 on 2026-10-11." });
  expect(r.code).toBe(3);
  expect(r.err).toContain("11:35");
  expect(r.err).not.toContain("23:45");
});

test("another day's time with no date is refused, and the refusal says to write the date", () => {
  const r = rig()(at, "move", move("the loop was stopped at 21:25"));
  expect(r.code).toBe(3);
  expect(r.err).toContain("YYYY-MM-DD");
});

test("a time marked Z or UTC is compared with the clock in UTC", () => {
  const send = rig();
  // 11:06 CEST is 09:06 UTC.
  expect(send(at, "move", move("at 2026-10-11T09:05:00Z")).code).toBe(0);
  expect(send(at, "move", move("at 2026-10-11T09:10:00.000Z")).code).toBe(3);
  expect(send(at, "move", move("at 09:10 UTC")).code).toBe(3);
  expect(send(at, "move", move("at 10:10 UTC")).code).toBe(3);
  expect(send(at, "move", move("stamped 2026-10-11T11:05:00+02:00")).code).toBe(0);
});

test("what is not a time of day is sent", () => {
  const send = rig();
  for (const reason of ["http://127.0.0.1:47814/x.json", "a ratio of 3:2", "24:10 and 12:75", "v1.12:30", "commit 12:3456", "sha256:11:59:59:59", "2026-10-10 23:4x"])
    expect([reason, send(at, "move", move(reason)).code]).toEqual([reason, 0]);
});

test("only reason and body are read", () => {
  const r = rig()(at, "open", { key: "k/23:59", id: "i", title: "the 23:59 run", body: "no time here" });
  expect(r.code).toBe(0);
});

test("ISSUE_AS_TIME_AHEAD=1 sends a time that is rightly ahead, or quoted", () => {
  const send = rig();
  const body = move("the lease ends at 11:36");
  const refused = send(at, "move", body);
  expect(refused.code).toBe(3);
  expect(refused.err).toContain("ISSUE_AS_TIME_AHEAD=1");
  expect(send(at, "move", body, { ISSUE_AS_TIME_AHEAD: "1" }).code).toBe(0);
});

test("a check that cannot run sends: the clock given is not a time", () => {
  const r = rig()("not a time", "move", move("Checked 23:59"));
  expect(r.code).toBe(0);
  expect(r.sent).toContain("Checked 23:59");
});

test("a read, and a body that is not JSON, go out as before", () => {
  const send = rig();
  const get = send(at, "get?id=x");
  expect(get.code).toBe(0);
  expect(get.sent).not.toContain("POST");
  const bad = send(at, "move", "{reason: 23:59");
  expect(bad.code).toBe(0);
  expect(bad.sent).toContain("{reason: 23:59");
});

test("a name that is no kept token still stops with 2", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "issue-as-")));
  mkdirSync(join(root, ".emitted"));
  copyFileSync(script, join(root, "issue-as.sh"));
  chmodSync(join(root, "issue-as.sh"), 0o755);
  writeFileSync(join(root, ".emitted/cb4-issues-tokens.json"), "{}");
  const p = Bun.spawnSync([join(root, "issue-as.sh"), "t", "get?id=x"], { env: { ...process.env, TZ: "Europe/Berlin" } });
  expect(p.exitCode).toBe(2);
});
