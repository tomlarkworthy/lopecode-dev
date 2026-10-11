// issue-as.sh and brain.ts curl: stdout is the answer's body and nothing else; the HTTP status is on stderr.
// Until 2026-10-11 both wrote ` [200]` to stdout after the body, and a read piped to a JSON parser failed
// (issue tool-read-ends-with-status-not-json). Both are run here with the real curl against a local server.
//
//   bun test ./tests/tools/tool-status-stderr.test.ts
//   BRAIN_TS=/path/to/brain.ts ISSUE_AS_SH=/path/to/issue-as.sh bun test …   # the same cases against other copies
import { test, expect, beforeAll, afterAll } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const brainTs = process.env.BRAIN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/brain.ts");
const issueAs = process.env.ISSUE_AS_SH || resolve(import.meta.dir, "../../tools/cloud-brain/issue-as.sh");
const realCurl = Bun.which("curl")!;
// A page of issue.sync with a `]` and a `}` inside a string, and a refusal.
const page = { seq: 602, wait: 5000, events: [{ seq: 1, body: "ends [200] } here" }] };
let server: ReturnType<typeof Bun.serve>;
beforeAll(() => {
  server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) =>
    new URL(req.url).pathname.includes("refused") ? Response.json({ error: "Forbidden" }, { status: 403 }) : Response.json(page) });
});
afterAll(() => server.stop(true));

const run = async (cmd: string[], env: Record<string, string>) => {
  const p = Bun.spawn(cmd, { env: { ...process.env, ...env }, stdout: "pipe", stderr: "pipe" });
  const out = await new Response(p.stdout).text(), err = await new Response(p.stderr).text();
  return { code: await p.exited, out, err };
};

const brain = (path: string) => run(["bun", brainTs, "curl", `http://127.0.0.1:${server.port}${path}`], { BRAIN_BASE: "no-such-brain-for-tests" });

test("brain.ts curl: stdout parses as JSON, the status is on stderr", async () => {
  const r = await brain("/sync");
  expect(JSON.parse(r.out)).toEqual(page);
  expect(r.err).toBe(" [200]\n");
});

test("brain.ts curl: a refusal's status is on stderr too, and its body is JSON", async () => {
  const r = await brain("/refused");
  expect(JSON.parse(r.out)).toEqual({ error: "Forbidden" });
  expect(r.err).toBe(" [403]\n");
});

// issue-as.sh names cb4 itself. A curl first on PATH sends each call to the local server with the real curl
// and every other argument as given, so the -w of the script is the one that runs.
const issueAsRig = () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "issue-as-status-")));
  mkdirSync(join(root, ".emitted"));
  mkdirSync(join(root, "bin"));
  copyFileSync(issueAs, join(root, "issue-as.sh"));
  chmodSync(join(root, "issue-as.sh"), 0o755);
  writeFileSync(join(root, ".emitted/cb4-issues-tokens.json"), JSON.stringify({ t: "not-a-token" }));
  writeFileSync(join(root, "bin/curl"), `#!/bin/bash\nargs=("$@"); n=$((\${#args[@]}-1))\nargs[$n]="http://127.0.0.1:${server.port}/\${args[$n]##*.issue.}"\nexec ${realCurl} "\${args[@]}"\n`);
  chmodSync(join(root, "bin/curl"), 0o755);
  const env = { PATH: `${join(root, "bin")}:${process.env.PATH}` };
  return Object.assign((...args: string[]) => run([join(root, "issue-as.sh"), "t", ...args], env), { env, script: join(root, "issue-as.sh") });
};

test("issue-as.sh: a read's stdout parses as JSON, the status is on stderr", async () => {
  const r = await issueAsRig()("sync?after=0");
  expect(JSON.parse(r.out)).toEqual(page);
  expect(r.err).toBe(" [200]\n");
});

test("issue-as.sh: a write's stdout parses as JSON, the status is on stderr", async () => {
  const r = await issueAsRig()("comment", JSON.stringify({ key: "k", id: "i", body: "no time in it" }));
  expect(JSON.parse(r.out)).toEqual(page);
  expect(r.err).toBe(" [200]\n");
});

test("issue-as.sh: a refusal's status is on stderr, and 2>&1 gives the body then the status", async () => {
  const call = issueAsRig();
  const r = await call("refused");
  expect(JSON.parse(r.out)).toEqual({ error: "Forbidden" });
  expect(r.err).toBe(" [403]\n");
  const both = await run(["bash", "-c", '"$0" t refused 2>&1', call.script], call.env);
  expect(both.out).toBe('{"error":"Forbidden"} [403]\n');
  expect(both.err).toBe("");
});
