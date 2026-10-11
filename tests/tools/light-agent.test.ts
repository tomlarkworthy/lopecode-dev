// cloud-brain-dev: the Read hook that fetches brain/ from the Brain, the launcher agent.sh, and put.sh's refusals.
// Issue light-reviewer-in-use (the owner, 2026-10-11: "we hook reads to file names to the cluster, so that becomes
// the source of truth of a virtual file system. Then the skill spawns a super light claude").
//
//   bun test ./tests/tools/light-agent.test.ts
// No call leaves the machine: the Brain is a server of this process, and `claude` is a stand-in on PATH.
import { test, expect, afterAll } from "bun:test";
import { symlinkSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const dev = process.env.CLOUD_BRAIN_DEV || resolve(import.meta.dir, "../../cloud-brain-dev");
const files: Record<string, string> = { "roles/x.md": "one" };
let asked: string[] = [];
const brain = Bun.serve({
  port: 0,
  fetch(req) {
    const path = new URL(req.url).pathname;
    asked.push(path);
    const rel = path.replace("/static/cloud-brain-dev/", "");
    return rel in files ? new Response(files[rel]) : new Response("no", { status: 404 });
  },
});
afterAll(() => brain.stop(true));

const run = async (args: string[], env: Record<string, string> = {}, stdin = "") => {
  const p = Bun.spawn(args, { env: { ...process.env, ...env }, stdin: new Blob([stdin]), stdout: "pipe", stderr: "pipe" });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  return { code, out, err };
};
const root = () => realpathSync(mkdtempSync(join(tmpdir(), "light-agent-")));
const hook = (dir: string, file: string, base = `http://127.0.0.1:${brain.port}`) =>
  run([join(dev, ".claude/hooks/brain-read.sh")], { CLAUDE_PROJECT_DIR: dir, BRAIN: base }, JSON.stringify({ tool_name: "Read", tool_input: { file_path: file } }));

test("a Read under brain/ fetches the Brain's copy, each time", async () => {
  const dir = root();
  files["roles/x.md"] = "one";
  expect((await hook(dir, join(dir, "brain/roles/x.md"))).code).toBe(0);
  expect(readFileSync(join(dir, "brain/roles/x.md"), "utf8")).toBe("one");
  files["roles/x.md"] = "two";
  expect((await hook(dir, "brain/roles/x.md")).code).toBe(0);
  expect(readFileSync(join(dir, "brain/roles/x.md"), "utf8")).toBe("two");
});

test("a path the Brain does not have is refused, and the copy on disk goes", async () => {
  const dir = root();
  mkdirSync(join(dir, "brain"));
  writeFileSync(join(dir, "brain/gone.md"), "yesterday");
  const r = await hook(dir, join(dir, "brain/gone.md"));
  expect([r.code, existsSync(join(dir, "brain/gone.md")), /is not a file of/.test(r.err), /brain\/index\.md/.test(r.err)]).toEqual([2, false, true, true]);
});

test("a Brain that does not answer is refused as that, not as a missing file", async () => {
  const dir = root();
  mkdirSync(join(dir, "brain"));
  writeFileSync(join(dir, "brain/x.md"), "yesterday");
  const r = await hook(dir, join(dir, "brain/x.md"), "http://127.0.0.1:1");
  expect([r.code, existsSync(join(dir, "brain/x.md")), /was not read/.test(r.err), /is not a file of/.test(r.err)]).toEqual([2, false, true, false]);
});

test("a path outside brain/ is not fetched, also one that leaves it by ..", async () => {
  const dir = root();
  asked = [];
  for (const file of [join(dir, "README.md"), "/etc/hosts", dir + "/brain/../../x", dir + "/brain/../README.md"]) expect((await hook(dir, file)).code).toBe(0);
  expect(asked).toEqual([]);
});

// Review 1055, finding 4: three spellings of one file each read the old copy with no request.
test("every spelling of a path under brain/ is fetched", async () => {
  const dir = root();
  files["roles/x.md"] = "new";
  const base = dir.split("/").pop();
  for (const file of [`${dir}/./brain/roles/x.md`, `${dir}//brain/roles/x.md`, `${dir}/../${base}/brain/roles/x.md`, "./brain/roles/x.md", `${dir}/brain/roles/../roles/x.md`]) {
    mkdirSync(join(dir, "brain/roles"), { recursive: true });
    writeFileSync(join(dir, "brain/roles/x.md"), "old");
    asked = [];
    const r = await hook(dir, file);
    expect([file.replace(dir, ""), r.code, asked, readFileSync(join(dir, "brain/roles/x.md"), "utf8")]).toEqual([file.replace(dir, ""), 0, ["/static/cloud-brain-dev/roles/x.md"], "new"]);
  }
});

// Review 1059, finding 2: a path through a symlink read the old copy with no request.
test("a path under brain/ reached through a symlink is fetched", async () => {
  const dir = root();
  const link = join(root(), "link");
  symlinkSync(dir, link);
  mkdirSync(join(dir, "brain/roles"), { recursive: true });
  symlinkSync(join(dir, "brain"), join(dir, "b2"));
  files["roles/x.md"] = "new";
  // the file through a linked root; the project directory given as the link; brain through a link; /var for /private/var
  const cases: [string, string][] = [[dir, `${link}/brain/roles/x.md`], [link, `${dir}/brain/roles/x.md`], [dir, `${dir}/b2/roles/x.md`]];
  if (dir.startsWith("/private/")) cases.push([dir, `${dir.slice("/private".length)}/brain/roles/x.md`]);
  for (const [project, file] of cases) {
    writeFileSync(join(dir, "brain/roles/x.md"), "old");
    asked = [];
    const r = await hook(project, file);
    expect([r.code, asked, readFileSync(join(dir, "brain/roles/x.md"), "utf8")]).toEqual([0, ["/static/cloud-brain-dev/roles/x.md"], "new"]);
  }
});

// agent.sh with a `claude` that writes its arguments down and answers two lines of stream-json.
const rig = () => {
  const dir = root();
  mkdirSync(join(dir, "bin"));
  mkdirSync(join(dir, "checkout/tools/cloud-brain"), { recursive: true });
  copyFileSync(join(dev, "agent.sh"), join(dir, "agent.sh"));
  chmodSync(join(dir, "agent.sh"), 0o755);
  const lines = [
    { type: "assistant", message: { usage: { input_tokens: 2, cache_creation_input_tokens: 10, cache_read_input_tokens: 100, output_tokens: 5 } } },
    { type: "result", session_id: "s-1", result: "done", total_cost_usd: 0.5, num_turns: 3, duration_ms: 1200, usage: { input_tokens: 4, cache_creation_input_tokens: 20, cache_read_input_tokens: 300, output_tokens: 9 } },
  ];
  writeFileSync(join(dir, "bin/claude"), `#!/bin/bash\nprintf '%s\\n' "$@" > "${dir}/sent"\nS=$(printf '%s\\n' "$2" | sed -n 's/^scratch: //p'); [ -n "$S" ] && [ -d "$S" ] && [ -z "$(ls -A "$S")" ] && touch "${dir}/scratch-was-there"\ncat <<'EOF'\n${lines.map((l) => JSON.stringify(l)).join("\n")}\nEOF\n`);
  chmodSync(join(dir, "bin/claude"), 0o755);
  return async (args: string[], env: Record<string, string> = {}) => {
    const r = await run([join(dir, "agent.sh"), ...args], { PATH: `${join(dir, "bin")}:${process.env.PATH}`, CHECKOUT: join(dir, "checkout"), TAB: "", MODEL: "", ...env });
    return { ...r, scratchWasThere: existsSync(join(dir, "scratch-was-there")), sent: existsSync(join(dir, "sent")) ? readFileSync(join(dir, "sent"), "utf8").split("\n") : null, checkout: join(dir, "checkout") };
  };
};

test("agent.sh ROLE task: a prompt of four lines, four tools, no MCP server, and one JSON line back", async () => {
  const r = await rig()(["reviewer", "review issue x"]);
  expect(r.code).toBe(0);
  const s = r.sent!;
  expect([s[1], s[2], s[4]]).toEqual(["role: reviewer", `checkout: ${r.checkout}`, "task: review issue x"]);
  // Review 1055, finding 3: the brief names a scratchpad and the prompt gave none.
  const scratch = s[3].replace("scratch: ", "");
  // Review 1059, finding 3: nothing removed it. It is there and empty while claude runs, and gone after.
  expect([s[3].startsWith("scratch: /"), r.scratchWasThere, existsSync(scratch)]).toEqual([true, true, false]);
  expect([s.includes("--strict-mcp-config"), s.includes("--mcp-config"), s[s.indexOf("--tools") + 1], s[s.indexOf("--allowedTools") + 1], s[s.indexOf("--add-dir") + 1], s[s.indexOf("--model") + 1]])
    .toEqual([true, false, "Bash,Read,Grep,Glob", "Bash,Read,Grep,Glob", r.checkout, "opus"]);
  expect(JSON.parse(r.out)).toEqual({ session: "s-1", result: "done", usd: 0.5, usage: { input: 4, cacheWrite: 20, cacheRead: 300, output: 9 }, context: 117, turns: 3, ms: 1200 });
});

test("TAB=1 adds the checkout's channel server and allows its tools", async () => {
  const r = await rig()(["reviewer", "t"], { TAB: "1" });
  const s = r.sent!;
  const mcp = JSON.parse(s[s.indexOf("--mcp-config") + 1]);
  expect([Object.keys(mcp.mcpServers), mcp.mcpServers.lopecode.args[1].includes(r.checkout), s[s.indexOf("--allowedTools") + 1]])
    .toEqual([["lopecode"], true, "Bash,Read,Grep,Glob,mcp__lopecode"]);
});

test("--resume SESSION message sends the message alone to that session", async () => {
  const r = await rig()(["--resume", "s-1", "round 2"]);
  const s = r.sent!;
  expect([r.code, s[1], s[s.indexOf("--resume") + 1], s.some((l) => l.startsWith("role:"))]).toEqual([0, "round 2", "s-1", false]);
});

test("agent.sh refuses a missing task, a missing message and a checkout that is not one, before claude is started", async () => {
  const a = rig();
  const got = [await a(["reviewer"]), await a(["--resume", "s-1"]), await a(["reviewer", "t"], { CHECKOUT: tmpdir() })];
  expect(got.map((r) => [r.code, r.sent])).toEqual([[1, null], [1, null], [1, null]]);
  expect(got[2].err).toContain("is not a lopecode-dev checkout");
});

test("put.sh refuses no path, a path with .., an absolute one and one written with brain/, before any call", async () => {
  const dir = root();
  mkdirSync(join(dir, "bin"));
  for (const tool of ["bun", "curl"]) {
    writeFileSync(join(dir, `bin/${tool}`), `#!/bin/bash\necho called >> "${dir}/called"\n`);
    chmodSync(join(dir, `bin/${tool}`), 0o755);
  }
  const codes: number[] = [];
  for (const args of [[], ["a/../b"], ["/etc/x"], ["brain/roles/x.md"], ["--delete"], ["--get", "../x"]])
    codes.push((await run([join(dev, "put.sh"), ...args], { PATH: `${join(dir, "bin")}:${process.env.PATH}` })).code);
  expect([codes, existsSync(join(dir, "called"))]).toEqual([[1, 1, 1, 1, 1, 1], false]);
});

// put.sh past its refusals, with stand-ins: `curl` answers what the Brain has now, `bun` (brain.ts) writes down each call.
const putRig = () => {
  const dir = root();
  mkdirSync(join(dir, "bin"));
  mkdirSync(join(dir, "dev/brain/roles"), { recursive: true });
  copyFileSync(join(dev, "put.sh"), join(dir, "dev/put.sh"));
  chmodSync(join(dir, "dev/put.sh"), 0o755);
  writeFileSync(join(dir, "dev/brain/roles/x.md"), "edited");
  writeFileSync(join(dir, "bin/curl"), `#!/bin/bash\nwhile [ $# -gt 0 ]; do [ "$1" = "-o" ] && cp "${dir}/now" "$2"; shift; done\nprintf 200\n`);
  writeFileSync(join(dir, "bin/bun"), `#!/bin/bash\nprintf '%s\\n' "$3" >> "${dir}/calls"\ncase "$3" in *static.list*) cat "${dir}/list" ;; *static.get*) cat "${dir}/kept" ;; *) printf '{}' ;; esac\n`);
  for (const tool of ["curl", "bun"]) chmodSync(join(dir, `bin/${tool}`), 0o755);
  writeFileSync(join(dir, "list"), JSON.stringify({ files: [{ path: "cloud-brain-dev-history/roles/x.md/b", size: 1, savedAt: 0 }, { path: "cloud-brain-dev-history/roles/x.md/a", size: 1, savedAt: 0 }] }));
  return {
    dir,
    put: (...args: string[]) => run([join(dir, "dev/put.sh"), ...args], { PATH: `${join(dir, "bin")}:${process.env.PATH}`, CHECKOUT: dir }),
    calls: () => (existsSync(join(dir, "calls")) ? readFileSync(join(dir, "calls"), "utf8").trim().split("\n") : []),
  };
};

// Review 1055, finding 6: two puts in one second gave the kept copy one name, and the second wrote over the first.
test("put.sh keeps the copy before under its time and its content, so two puts in a second keep two", async () => {
  const r = putRig();
  const kept: string[] = [];
  for (const now of ["first", "second"]) {
    writeFileSync(join(r.dir, "now"), now);
    expect((await r.put("roles/x.md")).code).toBe(0);
    kept.push(r.calls().filter((c) => c.includes("put?path=cloud-brain-dev-history/")).pop()!);
  }
  const name = /put\?path=cloud-brain-dev-history\/roles\/x\.md\/\d{4}-\d\d-\d\dT\d\d-\d\d-\d\dZ-([0-9a-f]{8})$/;
  const sha = (s: string) => new Bun.CryptoHasher("sha256").update(s).digest("hex").slice(0, 8);
  expect(kept.map((k) => name.exec(k)?.[1])).toEqual([sha("first"), sha("second")]);
  expect(r.calls().filter((c) => c.includes("put?path=cloud-brain-dev/roles/x.md&public=true")).length).toBe(2);
  expect(r.calls().filter((c) => c.includes("put?path=cloud-brain-dev/index.md")).length).toBe(2);
});

// Review 1055, finding 2: a kept copy could not be read back by any written step.
test("put.sh --history lists the kept copies, --restore makes one the file on disk and puts nothing", async () => {
  const r = putRig();
  expect((await r.put("--history", "roles/x.md")).out).toBe("a\nb\n");
  writeFileSync(join(r.dir, "kept"), "as it was");
  const got = await r.put("--restore", "roles/x.md", "a");
  expect([got.code, readFileSync(join(r.dir, "dev/brain/roles/x.md"), "utf8"), r.calls().some((c) => c.includes("put?"))]).toEqual([0, "as it was", false]);
  writeFileSync(join(r.dir, "kept"), JSON.stringify({ error: "NotFound" }));
  const none = await r.put("--restore", "roles/x.md", "zz");
  expect([none.code, readFileSync(join(r.dir, "dev/brain/roles/x.md"), "utf8")]).toEqual([1, "as it was"]);
  expect((await r.put("--restore", "roles/x.md", "../a")).code).toBe(1);
});
