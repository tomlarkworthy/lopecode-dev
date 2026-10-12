// cloud-brain-dev: the Read hook that fetches brain/ from the Brain, the launcher agent.sh, and put.sh's refusals.
// Issue light-reviewer-in-use (the owner, 2026-10-11: "we hook reads to file names to the cluster, so that becomes
// the source of truth of a virtual file system. Then the skill spawns a super light claude").
//
//   bun test ./tests/tools/light-agent.test.ts
// No call leaves the machine: the Brain is a server of this process, and `claude` is a stand-in on PATH.
import { expect, afterAll } from "bun:test";
import { symlinkSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync, readFileSync, existsSync, chmodSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

import { testNeeding } from "./needs.ts";

const dev = process.env.CLOUD_BRAIN_DEV || resolve(import.meta.dir, "../../cloud-brain-dev");
// In a checkout whose cloud-brain-dev is empty (a plain `git worktree add`) every test here is skipped, with one line.
const test = testNeeding("light-agent.test.ts", [join(dev, "agent.sh"), join(dev, "put.sh")]);
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
const rig = (hold = false) => {
  const dir = root();
  mkdirSync(join(dir, "bin"));
  mkdirSync(join(dir, "checkout/tools/cloud-brain"), { recursive: true });
  copyFileSync(join(dev, "agent.sh"), join(dir, "agent.sh"));
  chmodSync(join(dir, "agent.sh"), 0o755);
  const lines = [
    { type: "system", subtype: "init", tools: ["Read", "Bash"], permissionMode: "default" },
    { type: "assistant", message: { usage: { input_tokens: 2, cache_creation_input_tokens: 10, cache_read_input_tokens: 100, output_tokens: 5 } } },
    { type: "result", session_id: "s-1", result: "done", total_cost_usd: 0.5, num_turns: 3, duration_ms: 1200, usage: { input_tokens: 4, cache_creation_input_tokens: 20, cache_read_input_tokens: 300, output_tokens: 9 } },
  ];
  writeFileSync(join(dir, "bin/claude"), `#!/bin/bash\nprintf '%s\\n' "$@" > "${dir}/sent"\nS=$(printf '%s\\n' "$2" | sed -n 's/^scratch: //p'); [ -n "$S" ] && [ -d "$S" ] && [ -z "$(ls -A "$S")" ] && touch "${dir}/scratch-was-there"\n${hold ? `while [ ! -e "${dir}/go" ]; do sleep 0.02; done\n` : ""}cat <<'EOF'\n${lines.map((l) => JSON.stringify(l)).join("\n")}\nEOF\n`);
  chmodSync(join(dir, "bin/claude"), 0o755);
  return Object.assign(async (args: string[], env: Record<string, string> = {}) => {
    const r = await run([join(dir, "agent.sh"), ...args], { PATH: `${join(dir, "bin")}:${process.env.PATH}`, CHECKOUT: join(dir, "checkout"), TAB: "", MODEL: "", ADVISOR: "", READS: "", DRY: "", ...env });
    return { ...r, scratchWasThere: existsSync(join(dir, "scratch-was-there")), sent: existsSync(join(dir, "sent")) ? readFileSync(join(dir, "sent"), "utf8").split("\n") : null, checkout: join(dir, "checkout") };
  }, { dir });
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
  expect(JSON.parse(r.out)).toEqual({ session: "s-1", result: "done", usd: 0.5, usage: { input: 4, cacheWrite: 20, cacheRead: 300, output: 9 }, context: 117, turns: 3, ms: 1200, legs: 1, toolset: ["Read", "Bash"], mode: "default" });
});

// The review of fewer-review-rounds waited for the landing lock in the background: the stream had two result lines,
// the launcher printed the first ("Still held by another landing") and the run went on to pass the issue.
test("a run of two legs is reported at its end: the last result, usage summed", async () => {
  const dir = root();
  mkdirSync(join(dir, "bin"));
  mkdirSync(join(dir, "checkout/tools/cloud-brain"), { recursive: true });
  copyFileSync(join(dev, "agent.sh"), join(dir, "agent.sh"));
  chmodSync(join(dir, "agent.sh"), 0o755);
  const u = (i: number, cw: number, cr: number, o: number) => ({ input_tokens: i, cache_creation_input_tokens: cw, cache_read_input_tokens: cr, output_tokens: o });
  const lines = [
    { type: "assistant", message: { usage: u(1, 1, 1, 1) } },
    { type: "result", session_id: "s-2", result: "WAITING", total_cost_usd: 0.4, num_turns: 2, duration_ms: 1000, usage: u(4, 20, 300, 9) },
    { type: "assistant", message: { usage: u(2, 10, 100, 5) } },
    { type: "result", session_id: "s-2", result: "DONE", total_cost_usd: 0.5, num_turns: 1, duration_ms: 200, usage: u(1, 2, 30, 4) },
  ];
  writeFileSync(join(dir, "bin/claude"), `#!/bin/bash\ncat <<'EOF'\n${lines.map((l) => JSON.stringify(l)).join("\n")}\nEOF\n`);
  chmodSync(join(dir, "bin/claude"), 0o755);
  const r = await run([join(dir, "agent.sh"), "reviewer", "t"], { PATH: `${join(dir, "bin")}:${process.env.PATH}`, CHECKOUT: join(dir, "checkout"), TAB: "", MODEL: "", ADVISOR: "", READS: "", DRY: "" });
  expect(r.code).toBe(0);
  expect(JSON.parse(r.out)).toEqual({ session: "s-2", result: "DONE", usd: 0.5, usage: { input: 5, cacheWrite: 22, cacheRead: 330, output: 13 }, context: 117, turns: 3, ms: 1200, legs: 2, toolset: null, mode: null });
});

// Issue ps-2-summarizer-role, R7 of plan/cloud-brain-paper-summarizer-persona.md: an agent that reads text from outside.
// What these flags do in a real start is in the record (records/ps-2-summarizer-role.md): --allowedTools "Read" grants
// a Read of any path, and a user's defaultMode "auto" lets a file outside the directory be read.
test("READS=DIR: the one tool Read, no --allowedTools, DIR in the checkout's place, the default permission mode; DIR is neither made nor removed", async () => {
  const dir = root();
  writeFileSync(join(dir, "paper.txt"), "text");
  const r = await rig()(["paper-summarizer", "summarize x"], { READS: dir });
  const s = r.sent!;
  expect(r.code).toBe(0);
  expect([s[1], s[2], s[3]]).toEqual(["role: paper-summarizer", `scratch: ${dir}`, "task: summarize x"]);
  expect([s[s.indexOf("--tools") + 1], s.includes("--allowedTools"), s[s.indexOf("--add-dir") + 1], s[s.indexOf("--permission-mode") + 1], s.includes("--mcp-config"), s.includes("--strict-mcp-config")])
    .toEqual(["Read", false, dir, "default", false, true]);
  // No line of the prompt and no argument names the checkout.
  expect([s.some((l) => l.startsWith("checkout:")), s.some((l) => l.includes(r.checkout)), JSON.parse(s[s.indexOf("--settings") + 1])]).toEqual([false, false, { advisorModel: "" }]);
  expect([existsSync(dir), existsSync(join(dir, "paper.txt")), r.scratchWasThere]).toEqual([true, true, false]);
  expect(JSON.parse(r.out)).toMatchObject({ session: "s-1", toolset: ["Read", "Bash"], mode: "default" });
});

test("READS=DIR on --resume: the same flags; READS needs no checkout; a READS that is no directory and READS with TAB are refused before claude", async () => {
  const dir = root();
  const s = (await rig()(["--resume", "s-1", "again"], { READS: dir })).sent!;
  expect([s[1], s[s.indexOf("--resume") + 1], s[s.indexOf("--tools") + 1], s.includes("--allowedTools"), s[s.indexOf("--add-dir") + 1], s[s.indexOf("--permission-mode") + 1]]).toEqual(["again", "s-1", "Read", false, dir, "default"]);
  const none = await rig()(["paper-summarizer", "t"], { READS: dir, CHECKOUT: tmpdir() });
  expect([none.code, none.sent![none.sent!.indexOf("--add-dir") + 1]]).toEqual([0, dir]);
  const got = [await rig()(["paper-summarizer", "t"], { READS: join(dir, "not-there") }), await rig()(["paper-summarizer", "t"], { READS: dir, TAB: "1" }), await rig()(["paper-summarizer"], { READS: dir })];
  expect(got.map((r) => [r.code, r.sent])).toEqual([[1, null], [1, null], [1, null]]);
  expect([got[0].err.includes("is not a directory"), got[1].err.includes("READS and TAB are not given together")]).toEqual([true, true]);
});

test("DRY=1 prints the arguments and starts nothing: today's for a reviewer, and with READS no --allowedTools and no checkout", async () => {
  const a = rig();
  const plain = await a(["reviewer", "x"], { DRY: "1" });
  expect([plain.code, plain.sent]).toEqual([0, null]);
  const p = plain.out.trimEnd().split("\n");
  expect(p.slice(0, 2).concat(p.slice(4))).toEqual(["-p", "role: reviewer", "task: x", "--model", "opus", "--settings", '{"advisorModel":""}', "--strict-mcp-config", "--tools", "Bash,Read,Grep,Glob",
    "--allowedTools", "Bash,Read,Grep,Glob", "--add-dir", plain.checkout, "--output-format", "stream-json", "--verbose"]);
  expect([p[2], p[3].startsWith("scratch: /")]).toEqual([`checkout: ${plain.checkout}`, true]);
  const dir = root();
  const reads = await a(["paper-summarizer", "x"], { DRY: "1", READS: dir });
  expect([reads.code, reads.sent]).toEqual([0, null]);
  expect(reads.out.trimEnd().split("\n")).toEqual(["-p", "role: paper-summarizer", `scratch: ${dir}`, "task: x", "--model", "opus", "--settings", '{"advisorModel":""}', "--strict-mcp-config",
    "--tools", "Read", "--add-dir", dir, "--permission-mode", "default", "--output-format", "stream-json", "--verbose"]);
  // Any other value of DRY starts the agent.
  expect((await a(["reviewer", "x"], { DRY: "0" })).sent).not.toBe(null);
});

// The owner, 2026-10-11: "ok lets disable the advisor for review". The setting is the one that removed it in a real start.
test("no advisor unless ADVISOR=1: the run's settings empty advisorModel", async () => {
  const off = (await rig()(["reviewer", "t"])).sent!;
  expect(JSON.parse(off[off.indexOf("--settings") + 1])).toEqual({ advisorModel: "" });
  const resumed = (await rig()(["--resume", "s-1", "more"])).sent!;
  expect(JSON.parse(resumed[resumed.indexOf("--settings") + 1])).toEqual({ advisorModel: "" });
  const on = (await rig()(["reviewer", "t"], { ADVISOR: "1" })).sent!;
  expect(on.includes("--settings")).toBe(false);
  expect([on[1], on[on.indexOf("--model") + 1]]).toEqual(["role: reviewer", "opus"]);
  // Review 1892, finding 3: ADVISOR=0 left the advisor on.
  for (const v of ["0", "false", "off", " "]) {
    const s = (await rig()(["reviewer", "t"], { ADVISOR: v })).sent!;
    expect(JSON.parse(s[s.indexOf("--settings") + 1])).toEqual({ advisorModel: "" });
  }
});

// Issue agent-sh-read-whole-before-run: three light reviewers printed their JSON line and then ended exit 2 on
// "unexpected EOF while looking for matching", with the scratch directory left, after agent.sh was written over
// during the run. `claude` here waits for the file `go`, so the write is made while agent.sh runs.
// Not skipped since wt-1-land-the-agent-sh-block (2026-10-12), when the block came into the pointer: an agent.sh
// with no block fails here. Until then it ran only on a file that had one, or with AGENT_SH_WRITTEN_OVER=1.
const agentSh = existsSync(join(dev, "agent.sh")) ? readFileSync(join(dev, "agent.sh"), "utf8") : "";
test("agent.sh written over while claude runs: exit 0, the JSON line, no scratch directory left", async () => {
  const lines = agentSh.split("\n");
  const over: Record<string, string> = {
    longer: [lines[0], "# a line that was not there when the run began", ...lines.slice(1)].join("\n"),
    "two bytes longer": [lines[0], "#", ...lines.slice(1)].join("\n"),
    shorter: [lines[0], ...lines.slice(2)].join("\n"),
    "as long": agentSh.replace("# agent.sh ROLE", "# AGENT.SH ROLE"),
    empty: "",
  };
  expect([over.longer.length > agentSh.length, over.shorter.length < agentSh.length, over["as long"].length, over["as long"] === agentSh]).toEqual([true, true, agentSh.length, false]);
  const got: unknown[] = [];
  for (const args of [["reviewer", "t"], ["--resume", "s-1", "more"]]) for (const [how, text] of Object.entries(over)) {
    const a = rig(true);
    const running = a(args);
    while (!existsSync(join(a.dir, "sent"))) await Bun.sleep(5);
    writeFileSync(join(a.dir, "agent.sh"), text);
    writeFileSync(join(a.dir, "go"), "");
    const r = await running;
    const scratch = r.sent!.find((l) => l.startsWith("scratch: "))?.replace("scratch: ", "");
    let result = null;
    try { result = JSON.parse(r.out).result; } catch {}
    got.push([args[0], how, r.code, result, r.err, scratch ? existsSync(scratch) : null]);
  }
  expect(got).toEqual(["reviewer", "--resume"].flatMap((form) => Object.keys(over).map((how) => [form, how, 0, "done", "", form === "reviewer" ? false : null])));
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
