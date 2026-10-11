// issue-as.sh: a third argument that begins with @ names a file whose bytes are the body.
// Issue issue-as-body-from-a-file: an inline body passes through the caller's shell and the argument list, so an
// apostrophe ended the quoting in zsh (nothing sent) and a body of 1048660 bytes gave "argument list too long".
// The script is run here with the real curl against a local server that keeps the bytes it was sent.
//
//   bun test ./tests/tools/issue-as-body-file.test.ts
//   ISSUE_AS_SH=/path/to/another/issue-as.sh bun test …
import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const root = resolve(import.meta.dir, "../..");
const script = process.env.ISSUE_AS_SH || join(root, "tools/cloud-brain/issue-as.sh");
const realCurl = Bun.which("curl")!;
let server: ReturnType<typeof Bun.serve>;
let got: { path: string; bytes: Buffer; type: string | null }[] = [];
beforeAll(() => {
  server = Bun.serve({ port: 0, hostname: "127.0.0.1", maxRequestBodySize: 8 << 20, fetch: async (req) => {
    got.push({ path: new URL(req.url).pathname, bytes: Buffer.from(await req.arrayBuffer()), type: req.headers.get("content-type") });
    return Response.json({ ok: true });
  } });
});
afterAll(() => server.stop(true));

// issue-as.sh names cb4 itself. A curl first on PATH sends each call to the local server with the real curl and
// every other argument as given (the rig of tool-status-stderr.test.ts).
const rig = () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "issue-as-file-")));
  mkdirSync(join(dir, ".emitted"));
  mkdirSync(join(dir, "bin"));
  copyFileSync(script, join(dir, "issue-as.sh"));
  chmodSync(join(dir, "issue-as.sh"), 0o755);
  writeFileSync(join(dir, ".emitted/cb4-issues-tokens.json"), JSON.stringify({ t: "not-a-token" }));
  writeFileSync(join(dir, "bin/curl"), `#!/bin/bash\nargs=("$@"); n=$((\${#args[@]}-1))\nargs[$n]="http://127.0.0.1:${server.port}/\${args[$n]##*.issue.}"\nexec ${realCurl} "\${args[@]}"\n`);
  chmodSync(join(dir, "bin/curl"), 0o755);
  const call = async (args: string[], more: Record<string, string> = {}, cwd = dir) => {
    got = [];
    const p = Bun.spawn([join(dir, "issue-as.sh"), "t", ...args], { cwd, stdout: "pipe", stderr: "pipe",
      env: { ...process.env, PATH: `${join(dir, "bin")}:${process.env.PATH}`, TZ: "Europe/Berlin", ISSUE_AS_NOW: "2026-10-11T11:06:00", ...more } });
    const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text();
    return { code: await p.exited, out, err, got };
  };
  const file = (name: string, text: string | Buffer) => { writeFileSync(join(dir, name), text); return join(dir, name); };
  return { dir, call, file };
};

test("a body in a file with an apostrophe and newlines is sent byte for byte", async () => {
  const { call, file } = rig();
  const text = JSON.stringify({ key: "k", id: "i", to: "closed", reason: "the owner's word,\nquoted: \"yes\" and `$HOME` and a \\ too" }, null, 2) + "\n";
  expect(text).toContain("'");
  expect(text.split("\n").length).toBeGreaterThan(5);
  const r = await call(["move", "@" + file("body.json", text)]);
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out)).toEqual({ ok: true });
  expect(r.err).toBe(" [200]\n");
  expect(r.got.length).toBe(1);
  expect(r.got[0].path).toBe("/move");
  expect(r.got[0].type).toBe("application/json");
  expect(r.got[0].bytes.equals(Buffer.from(text))).toBe(true);
});

test("a body over ARG_MAX is sent from a file, and is refused by the system as an argument", async () => {
  const { call, file } = rig();
  const argMax = Number(Bun.spawnSync(["getconf", "ARG_MAX"]).stdout.toString());
  expect(argMax).toBeGreaterThan(0);
  const text = JSON.stringify({ key: "k", id: "i", name: "big.txt", mimeType: "text/plain", text: "it's\n".repeat(Math.ceil((argMax + 4096) / 5)) }, null, 1);
  expect(Buffer.byteLength(text)).toBeGreaterThan(argMax);
  const r = await call(["attach", "@" + file("big.json", text)]);
  expect(r.code).toBe(0);
  expect(r.got.length).toBe(1);
  expect(r.got[0].bytes.length).toBe(Buffer.byteLength(text));
  expect(r.got[0].bytes.equals(Buffer.from(text))).toBe(true);
  // The inline form of the same body: the call is never made.
  let inline: unknown = null;
  try { inline = await call(["attach", text]); } catch (e) { inline = e; }
  expect(got.length).toBe(0);
  expect(inline instanceof Error || (inline as { code: number }).code !== 0).toBe(true);
});

test("the time check reads the file: a time ahead of the clock is not sent", async () => {
  const { call, file } = rig();
  const at = file("ahead.json", JSON.stringify({ key: "k", id: "i", to: "closed", reason: "Checked 11:10: the owner's count is 20." }, null, 2));
  const r = await call(["move", "@" + at]);
  expect(r.code).toBe(3);
  expect(r.got.length).toBe(0);
  expect(r.out).toBe("");
  expect(r.err).toContain("11:10");
  expect(r.err).toContain("reason");
  const sent = await call(["move", "@" + at], { ISSUE_AS_TIME_AHEAD: "1" });
  expect(sent.code).toBe(0);
  expect(sent.got.length).toBe(1);
});

test("a file that is not there: nothing is sent, and the message names it", async () => {
  const { call, dir } = rig();
  const r = await call(["comment", "@" + join(dir, "no-such.json")]);
  expect(r.code).toBe(4);
  expect(r.got.length).toBe(0);
  expect(r.out).toBe("");
  expect(r.err).toContain("no-such.json");
  expect(r.err).toContain("nothing was sent");
  expect(r.err).not.toContain("not-a-token");
  // An empty file is no body: without this the call would go out as a read.
  writeFileSync(join(dir, "empty.json"), "");
  const e = await call(["comment", "@" + join(dir, "empty.json")]);
  expect(e.code).toBe(4);
  expect(e.got.length).toBe(0);
});

test("a path is the caller's: relative to where the call is made, and `-` is a file's name, never stdin", async () => {
  const { call, file, dir } = rig();
  const text = '{"key":"k","id":"i","body":"it\'s relative"}';
  file("rel.json", text);
  const r = await call(["comment", "@rel.json"], {}, dir);
  expect(r.code).toBe(0);
  expect(r.got[0].bytes.toString()).toBe(text);
  const none = await call(["comment", "@-"], {}, dir);
  expect(none.code).toBe(4);
  expect(none.got.length).toBe(0);
  file("-", text);
  const dash = await call(["comment", "@-"], {}, dir);
  expect(dash.code).toBe(0);
  expect(dash.got[0].bytes.toString()).toBe(text);
});

test("the inline form is as before", async () => {
  const { call } = rig();
  const text = JSON.stringify({ key: "k", id: "i", body: "it's inline, with an @ in it: a@b" });
  const r = await call(["comment", text]);
  expect(r.code).toBe(0);
  expect(r.got[0].bytes.toString()).toBe(text);
  expect(r.got[0].path).toBe("/comment");
});

test("the implementer's brief says when a body goes in a file, under the write calls", () => {
  const brief = readFileSync(join(root, ".claude/skills/brain-maintenance/agents/implementer.md"), "utf8");
  const part = brief.slice(brief.indexOf("## The tracker's write calls"), brief.indexOf("## What a reviewer will check"));
  expect(part.length).toBeGreaterThan(100);
  expect(part).toMatch(/apostrophe/);
  expect(part).toMatch(/ia \w+ @\S+/);
});
