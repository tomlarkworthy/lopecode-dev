// fly-4-loop-files: the loop's own files for the worker machine on Fly.io (plan/cloud-brain-worker-machine-on-fly.md,
// T4 as amended by part 6 of plan/cloud-brain-orchestrator-as-steps.md; tools/cloud-brain/records/fly-4-loop-files.md).
// Here: the tool that writes the machine's token file, brain.ts with no state file (BRAIN_URL), and the texts.
// The driver's two ends on the machine are in loop-run.test.ts, the step with no state file in loop-step.test.ts,
// `agent-token --parent` in agent-token.test.ts, and run.sh in fly-run-sh.test.ts.
//
//   bun test --timeout=30000 ./tests/tools/fly-4-loop-files.test.ts
import { test, expect, afterAll } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { machineTokens, NAMES } from "../../tools/cloud-brain/fly/token-file.ts";

const root = resolve(import.meta.dir, "../..");
const read = (f: string) => readFileSync(join(root, f), "utf8"), flat = (s: string) => s.replace(/\s+/g, " ");
const tool = join(root, "tools/cloud-brain/fly/token-file.ts"), brainTs = join(root, "tools/cloud-brain/brain.ts");
const dirs: string[] = [];
afterAll(() => { for (const d of dirs) rmSync(d, { recursive: true, force: true }); });
const state = (tokens?: any) => { const d = mkdtempSync(join(tmpdir(), "fly-4-")); dirs.push(d); if (tokens !== undefined) writeFileSync(join(d, "cb4-tokens.json"), typeof tokens === "string" ? tokens : JSON.stringify(tokens)); return d; };
const run = (cmd: string[], env: Record<string, string>) => { const { BRAIN_URL: _, ...base } = process.env; const p = Bun.spawnSync(cmd, { env: { ...base, ...env }, stdout: "pipe", stderr: "pipe" }); return { code: p.exitCode, out: p.stdout.toString(), err: p.stderr.toString() }; };
const KEPT = { "loop-agents": "v-loop-agents", "loop-knowledge": "v-loop-knowledge", "loop-docs": "v-loop-docs", "loop-fly": "v-loop-fly",
  "fly-agents": "v-fly-agents", "fly-knowledge": "v-fly-knowledge", "fly-docs": "v-fly-docs", "fly-status": "v-fly-status" };
const MACHINE = { "loop-agents": "v-fly-agents", "loop-knowledge": "v-fly-knowledge", "loop-docs": "v-fly-docs", "fly-status": "v-fly-status" };

test("token-file.ts: the machine's file has the three names the briefs read over the values of the fly- tokens, and fly-status; mode 600; no value is printed and none of the laptop's own is in it", () => {
  const d = state(KEPT);
  const r = run(["bun", tool], { BRAIN_STATE_DIR: d });
  const out = join(d, "fly-machine-tokens.json");
  expect([r.code, r.err]).toEqual([0, ""]);
  expect(r.out.trim()).toBe(`wrote ${out} (mode 600): loop-agents from fly-agents, loop-knowledge from fly-knowledge, loop-docs from fly-docs, fly-status`);
  expect(JSON.parse(readFileSync(out, "utf8"))).toEqual(MACHINE);
  expect(statSync(out).mode & 0o777).toBe(0o600);
  expect(readdirSync(d).sort()).toEqual(["cb4-tokens.json", "fly-machine-tokens.json"]);
  for (const v of Object.values(KEPT)) expect(r.out + r.err).not.toContain(v);
  for (const v of ["v-loop-agents", "v-loop-knowledge", "v-loop-docs", "v-loop-fly"]) expect(readFileSync(out, "utf8")).not.toContain(v);
});

test("token-file.ts --base64 --out FILE: one line whose decoding is the file, which is what the app's secret holds; a file that was there is written over with mode 600", () => {
  const d = state(KEPT), out = join(d, "secret.b64");
  writeFileSync(out, "old", { mode: 0o644 });
  const r = run(["bun", tool, "--base64", "--out", out], { BRAIN_STATE_DIR: d });
  expect(r.code).toBe(0);
  expect(r.out.trim()).toBe(`wrote ${out} (mode 600, base64 on one line: the value of the app's secret BRAIN_TOKENS): loop-agents from fly-agents, loop-knowledge from fly-knowledge, loop-docs from fly-docs, fly-status`);
  const text = readFileSync(out, "utf8");
  expect(/^[A-Za-z0-9+/=]+\n$/.test(text)).toBe(true);
  expect(JSON.parse(Buffer.from(text.trim(), "base64").toString())).toEqual(MACHINE);
  expect(statSync(out).mode & 0o777).toBe(0o600);
  expect(existsSync(join(d, "fly-machine-tokens.json"))).toBe(false);
});

test("token-file.ts: a token of the four that is not kept, a value that is no text, no file, a file that is not JSON: exit 1 with the names and nothing written; other arguments: exit 2", () => {
  const { "fly-docs": _, ...three } = KEPT;
  for (const [tokens, said] of [
    [three, "not kept in FILE: fly-docs. "],
    [{ ...KEPT, "fly-agents": "", "fly-status": 7 }, "not kept in FILE: fly-agents, fly-status. "],
    [{}, "not kept in FILE: fly-agents, fly-knowledge, fly-docs, fly-status. "],
    [[], "not kept in FILE: fly-agents, fly-knowledge, fly-docs, fly-status. "],
    ["not json", "FILE is not JSON. Nothing was written"],
    [undefined, "no FILE. Nothing was written"],
  ] as const) {
    const d = state(tokens as any), r = run(["bun", tool], { BRAIN_STATE_DIR: d });
    expect([r.code, r.out]).toEqual([1, ""]);
    expect(r.err).toContain("token-file.ts: " + said.replace("FILE", join(d, "cb4-tokens.json")));
    expect(r.err).toContain("Nothing was written");
    expect(readdirSync(d).filter((f) => f !== "cb4-tokens.json")).toEqual([]);
  }
  const d = state(KEPT);
  for (const bad of [["--out"], ["--print"], ["--out", "a", "b"]]) {
    const r = run(["bun", tool, ...bad], { BRAIN_STATE_DIR: d });
    expect([bad.join(" "), r.code, r.err.trim()]).toEqual([bad.join(" "), 2, "token-file.ts: token-file.ts [--out FILE] [--base64]"]);
  }
  expect(readdirSync(d)).toEqual(["cb4-tokens.json"]);
});

test("machineTokens: own properties only, and the four names in the order the tool prints", () => {
  expect(NAMES.map(([to]) => to)).toEqual(["loop-agents", "loop-knowledge", "loop-docs", "fly-status"]);
  expect(machineTokens(KEPT)).toEqual({ missing: [], file: MACHINE });
  expect(machineTokens(Object.create(KEPT)).missing).toEqual(["fly-agents", "fly-knowledge", "fly-docs", "fly-status"]);
  expect(machineTokens(null).missing.length).toBe(4);
});

// brain.ts builds the Brain's address from `subdomain` of the state file. The machine has no such file.
test("brain.ts with no state file: BRAIN_URL is the address of a call that names a path, for curl --as and for agent-token; with none, or one that is not https://HOST, exit 1 and nothing is sent", async () => {
  const asked: { path: string; auth: string | null }[] = [];
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch(req) { asked.push({ path: new URL(req.url).pathname, auth: req.headers.get("authorization") }); return Response.json({ delegations: [], yield: null }); } });
  const d = state({ "fly-status": "v-fly-status", "loop-agents": "v-fly-agents" }), url = `http://127.0.0.1:${server.port}`;
  const env = { BRAIN_BASE: "cb4", BRAIN_STATE_DIR: d };
  const call = (more: Record<string, string>, ...a: string[]) => { const p = Bun.spawn(["bun", brainTs, ...a], { env: { ...process.env, ...env, BRAIN_URL: "", ...more }, stdout: "pipe", stderr: "pipe" }); return Promise.all([p.exited, new Response(p.stdout).text(), new Response(p.stderr).text()]); };
  try {
    let [code, out, err] = await call({ BRAIN_URL: url }, "curl", "/xrpc/com.lopecode.brain.fly.status", "--as", "fly-status");
    expect([code, JSON.parse(out).yield, err.trim()]).toEqual([0, null, "[200]"]);
    [code, out] = await call({ BRAIN_URL: url }, "agent-token", "list");
    expect([code, out]).toEqual([0, ""]);
    expect(asked).toEqual([{ path: "/xrpc/com.lopecode.brain.fly.status", auth: "Bearer v-fly-status" }, { path: "/xrpc/com.lopecode.brain.delegation.list", auth: "Bearer v-fly-agents" }]);
    for (const [bad, said] of [["", "BRAIN_URL is not set"], ["http://example.com", "BRAIN_URL is not https://HOST"], [url + "/path", "BRAIN_URL is not https://HOST"], ["https://user:pw@example.com", "BRAIN_URL is not https://HOST"]]) {
      [code, out, err] = await call({ BRAIN_URL: bad }, "curl", "/xrpc/com.lopecode.brain.fly.status", "--as", "fly-status");
      expect([bad, code, out.trim(), err]).toEqual([bad, 1, `no address for cb4: ${join(d, "cb4.json")} has no subdomain, and ${said}`, ""]);
    }
    expect(asked.length).toBe(2);
  } finally { server.stop(true); }
});

test("brain.ts with a state file: its subdomain is the address and BRAIN_URL is not read", () => {
  const text = read("tools/cloud-brain/brain.ts"), b = text.slice(text.indexOf("const B = () => {"), text.indexOf("// One call of a method with a session"));
  expect(b.indexOf("if (st.subdomain) return")).toBeGreaterThan(0);
  expect(b.indexOf("if (st.subdomain) return")).toBeLessThan(b.indexOf("process.env.BRAIN_URL"));
});

// ---- the texts: what an agent of the loop reads of a loop with no state file
const S = ".claude/skills/brain-maintenance/";
test("SKILL.md step 1 has the second form of the health step, and what a loop with no state file leaves to the laptop's", () => {
  const skill = read(S + "SKILL.md"), one = skill.slice(skill.indexOf("\n1. **Health.**"), skill.indexOf("\n2. **Count your running agents."));
  const form = flat(one.slice(one.indexOf("**With no state file**")));
  expect(one.indexOf("**With no state file**")).toBeGreaterThan(0);
  for (const said of ["has no `cb4.json`", "`brain.ts redistil` and `brain.ts state` read that file and are not run there",
    "bun tools/cloud-brain/brain.ts curl /xrpc/com.lopecode.brain.fly.status --as fly-status` answers 200", "both `lock.sh show`", "Anything but 200 is not healthy",
    "it does not see a Worker put back", "an issue labeled `laptop`: nothing is started on it", "a digest (`digest-<day>`), an overseer, and an approver",
    "a review that needs a tab (step 4, `TAB=1`): no reviewer is started, and the issue is labeled `laptop`", "takes an issue labeled `laptop` as any other", "`fly-4b-first-run`"]) expect(form).toContain(said);
});

test("the label `laptop` is in the orchestrator's triage and on the writer's page, which the brief's table sends a change with a deploy to", () => {
  const orch = read(S + "agents/orchestrator.md"), triage = flat(orch.slice(orch.indexOf("\n## Triage\n"), orch.indexOf("\n## The `decompose` row")));
  for (const said of ["Add the label `laptop` when the body already says that a Worker changes", "`loop-library`, `loop-bluesky`, `loop-roles`, `loop-deploys`, `loop-papers` or `loop-dashboard`", "is not `needs-owner`"]) expect(triage).toContain(said);
  const page = read(S + "agents/implementer/ready-to-land.md"), stop = flat(page.slice(page.indexOf("**With no state file, a change that needs `brain.ts apply` stops here**"), page.indexOf("- **Emit** with the same tool")));
  expect(page.indexOf("**With no state file, a change that needs `brain.ts apply` stops here**")).toBeGreaterThan(0);
  expect(page.indexOf("**With no state file, a change that needs `brain.ts apply` stops here**")).toBeLessThan(page.indexOf("- **Emit** with the same tool"));
  for (const said of ["you emit nothing, take no lock and push nothing", `ia label '{"key":"impl/<id>/laptop","id":"<id>","add":["laptop"],"remove":[]}'`, "with no submit and no wait", "No writer had stopped this way when this was written"]) expect(stop).toContain(said);
  expect(page.split("\n")[1]).toContain("with no state file, the stop before it");
  const brief = read(S + "agents/implementer.md");
  expect(brief).toContain("| `ready-to-land.md` | Step 9: the rebase, the record, the emit | Your change has a deploy;");
  expect(brief.length).toBeLessThanOrEqual(20000);
});

test("the Fly spec says what was built and where the program differs, the header of loop.ts has the machine's step and the driver's two ends, and the knowledge page has BRAIN_URL", () => {
  const fly = read("plan/cloud-brain-worker-machine-on-fly.md"), built = flat(fly.slice(fly.indexOf("**As built (`fly-4-loop-files`, 2026-10-13).**"), fly.indexOf("**What the machine's loop does not do.**")));
  for (const said of ["has no `cb4.json`", "Off is the driver's on the machine alone", "`step --for yield`", "is put by the writer", "An approver is not started there either", "`BRAIN_URL`", "`orch; driver:<host>`", "No driver had run on any machine when this was written"]) expect(built).toContain(said);
  const loop = read("tools/cloud-brain/loop.ts"), header = flat(loop.slice(0, loop.indexOf("\nimport ")).replace(/^\/\/ ?/gm, ""));
  for (const said of ["step [--dry] [--for clock|event|run|yield]", "With no state file (no cb4.json under BRAIN_STATE_DIR", "the act `laptop`, the label `laptop` with the key orch/<id>/laptop-<seq of the submit>",
    "--for yield is the machine's driver's after `fly.down`", "7. with no state file", "The driver of a checkout with a state file does neither: it is stopped with Ctrl-C"]) expect(header).toContain(said);
  const calling = read("knowledge/calling-a-cloud-brain-from-this-checkout.md"), none = flat(calling.slice(calling.indexOf("\n## With no state file\n")));
  expect(calling.indexOf("\n## With no state file\n")).toBeGreaterThan(0);
  for (const said of ["There `brain.ts` takes the Brain's address from `BRAIN_URL`", "no address for cb4: <state>/cb4.json has no subdomain, and BRAIN_URL is not set", "`agent-token --parent NAME`"]) expect(none).toContain(said);
  expect(flat(calling)).toContain("With no state file: the page's last section, or ask Tom.");
  expect(calling).not.toContain("If the state file is missing, there is no access");
  expect(read("tools/cloud-brain/brain.ts")).toContain("agent-token --parent fly-agents list");
});
