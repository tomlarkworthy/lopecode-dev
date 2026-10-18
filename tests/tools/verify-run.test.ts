// tools/cloud-brain/verify-run.ts: the deployer's run address opened N times in a local headless Chrome.
// Issue dv-1-verify-run-tool, task 1 of plan/cloud-brain-deploy-verdict-from-a-shared-page.md.
//
//   bun test ./tests/tools/verify-run.test.ts          # from the repo root, with the ./
//   VERIFY_RUN_TS=/path/to/another/verify-run.ts bun test …
// The last five tests launch a headless Chrome against a stand-in for the Brain on 127.0.0.1; nothing calls cb4.
import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { testNeedingRunning } from "./needs.ts";

const script = process.env.VERIFY_RUN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/verify-run.ts");
const { judge, parseArgs, runAddress, chromeFor, shellDocument } = await import(script);
const { blockContent, blockSpans } = await import(resolve(import.meta.dir, "../../tools/lib/notebook-blocks.ts"));
const { cut } = await import(resolve(import.meta.dir, "../../tools/cloud-brain/cut.ts"));

const M = "@t/w", SHELL = "@tomlarkworthy/brain-shell", H1 = "a".repeat(64), H2 = "b".repeat(64);
const names = ["test_a", "test_b"];
const pass = (more = {}) => ({ hash: H1, ok: true, names, failed: [], ran: { [M]: 2, [SHELL]: 8 }, otherTestsRan: 8, ms: 200, wall: 1000, heapMB: 40, variables: 1200, ...more });
const fail = (more = {}) => pass({ ok: false, failed: [{ name: "test_b", message: "expected\n  1" }], ...more });

test("a test that passed and failed on one hash is named with its counts, exit 1", () => {
  const out = judge([pass(), pass(), fail(), pass(), fail()], { module: M });
  expect(out.byChance).toEqual([{ hash: "aaaaaaaaaaaa", name: "test_b", passed: 3, failed: 2, message: "expected 1" }]);
  expect([out.runs, out.passed, out.failed, out.none, out.everyTime, out.exit]).toEqual([5, 3, 2, 0, [], 1]);
});

test("a test that failed every time is not by chance, exit 2", () => {
  const out = judge([fail(), fail()], { module: M });
  expect(out.byChance).toEqual([]);
  expect(out.everyTime).toEqual([{ hash: "aaaaaaaaaaaa", name: "test_b", passed: 0, failed: 2, message: "expected 1" }]);
  expect(out.exit).toBe(2);
});

test("a pass on one hash and a fail on another is a deploy between the runs, not chance", () => {
  const out = judge([pass(), fail({ hash: H2 })], { module: M });
  expect(out.byChance).toEqual([]);
  expect(out.hashes).toEqual(["aaaaaaaaaaaa", "bbbbbbbbbbbb"]);
  expect(out.everyTime.map((t: any) => [t.hash, t.name])).toEqual([["bbbbbbbbbbbb", "test_b"]]);
  expect(out.exit).toBe(2);
});

test("every run passed and only the Worker's module, brain-shell and a fixture ran a test, exit 0", () => {
  const out = judge([pass(), pass({ ran: { [M]: 2, [SHELL]: 8, "@test/verify-k3j2x1": 1 }, otherTestsRan: 9 })], { module: M });
  expect([out.otherModules, out.otherTestsRan, out.exit]).toEqual([{}, [8, 9], 0]);
  expect([out.ms, out.wall, out.heapMB, out.variables]).toEqual([200, 1000, 40, 1200]);
});

test("another module that ran a test is named with the most it ran, exit 1", () => {
  const out = judge([pass({ ran: { [M]: 2, [SHELL]: 8, "@tomlarkworthy/svg-lens": 59 } }), pass({ ran: { [M]: 2, "@tomlarkworthy/svg-lens": 60, "(unnamed)": 1 } })], { module: M });
  expect(out.otherModules).toEqual({ "@tomlarkworthy/svg-lens": 60, "(unnamed)": 1 });
  expect([out.byChance, out.exit]).toEqual([[], 1]);
});

test("a run with no verdict is counted apart and judges no test, exit 2", () => {
  const out = judge([pass(), { none: "no verdict: Timeout 150000ms exceeded", wall: 150000 }, { hash: H1, none: "the module is not on the page" }], { module: M });
  expect([out.passed, out.failed, out.none, out.byChance, out.everyTime, out.exit]).toEqual([1, 0, 2, [], [], 2]);
  expect(out.wall).toBe(1000);
});

test("a failure that is not a test cell (the hash check) is compared the same way", () => {
  const hashCheck = { name: "the Worker reports the hash that was loaded", message: "loaded aaaa, running bbbb" };
  const out = judge([pass(), pass({ ok: false, failed: [hashCheck] })], { module: M });
  expect(out.everyTime).toEqual([{ hash: "aaaaaaaaaaaa", ...hashCheck, passed: 0, failed: 1 }]);
  expect(out.exit).toBe(2);
});

// Issue ac-1-local-tools-mark-a-cut. The message in the count by test was cut at 200 with no mark.
test("a failed test's message in the count by test: 200 characters as it is, 201 cut with the mark, whole as it is", () => {
  const at = "expected\n  " + "m".repeat(191), over = at + "X"; // 200 and 201 once each run of white space is one space
  const of = (message: string, more = {}) => judge([fail({ failed: [{ name: "test_b", message }] })], { module: M, ...more }).everyTime[0].message;
  expect(of(at)).toBe("expected " + "m".repeat(191));
  expect(of(over)).toBe("expected " + "m".repeat(191) + "… (cut: 200 of 201 characters; --whole prints all)");
  expect(of(over)).toBe(cut("expected " + "m".repeat(191) + "X", 200));
  expect(of(over, { whole: true })).toBe("expected " + "m".repeat(191) + "X");
  expect(of(over, { whole: false })).toBe(of(over));
});

test("the arguments: one Worker, --times, --shell, --base as a name or an address", () => {
  expect(parseArgs(["brain-x-logs"])).toEqual({ worker: "brain-x-logs", times: 1, shell: null, base: "https://cb4.endpointservices.workers.dev", timeout: 150, whole: false });
  expect(parseArgs(["--times", "20", "brain-x-logs", "--shell=a/verify.html"], { BRAIN_BASE: "cb9" })).toEqual({ worker: "brain-x-logs", times: 20, shell: "a/verify.html", base: "https://cb9.endpointservices.workers.dev", timeout: 150, whole: false });
  expect(parseArgs(["w", "--base", "http://127.0.0.1:8123/", "--timeout=9"]).base).toBe("http://127.0.0.1:8123");
  expect(() => parseArgs([])).toThrow("no Worker named");
  expect(() => parseArgs(["a", "b"])).toThrow("one Worker a call: a, then b");
  expect(() => parseArgs(["a", "--times", "0"])).toThrow("--times takes a whole number above 0");
  expect(() => parseArgs(["a", "--times=two"])).toThrow("--times takes a whole number above 0");
  expect(() => parseArgs(["a", "--shell"])).toThrow("--shell takes a value");
  expect(() => parseArgs(["a", "--time", "3"])).toThrow("unknown option --time");
  // --whole takes no value: what follows it is still the Worker.
  expect(parseArgs(["--whole", "brain-x-logs", "--times", "2"])).toMatchObject({ worker: "brain-x-logs", times: 2, whole: true });
  expect(() => parseArgs(["a", "--whole=1"])).toThrow("--whole takes no value");
});

// When this fails the deployer opens another address than the tool does: change runAddress with it.
// Since dv-3-deployer-opens-verify-html the deployer's page is "/" or "/static/shell/verify.html" (verifyPage); the
// tool opens "/" and --shell answers that document with the built verify file, so the part after the page is what is held.
// What cb4's deployer runs, as sync.ts writes it: its seed was deleted 2026-10-18 (sr-brain-deployer).
const deployer = testNeedingRunning("verify-run.test.ts", "brain-deployer");
deployer.test("the address is the one the deployer writes", () => {
  expect(runAddress("https://cb.sub.workers.dev", "@t/a", "brain-x-a")).toBe("https://cb.sub.workers.dev/#view=C100(S100(@t/a,@tomlarkworthy/brain-shell))&verify=brain-x-a");
  const seed = readFileSync(deployer.module, "utf8");
  expect(seed).toContain("const url = `${urlOf(\"brain\")}${await verifyPage()}#view=C100(S100(${module},@tomlarkworthy/brain-shell))&verify=${logical}`;");
  expect(seed).toContain('if (r && r.status === 200) return "/static/" + VERIFY_PAGE;\n    } catch {}\n    return "/";');
});

test("the Chrome: CHROME, then the build Playwright names, then the newest complete one", () => {
  const cache = realpathSync(mkdtempSync(join(tmpdir(), "verify-run-chrome-")));
  const shell = (n: number, complete = true) => {
    const dir = join(cache, `chromium_headless_shell-${n}`, "chrome-headless-shell-mac-arm64");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "chrome-headless-shell"), "");
    if (complete) writeFileSync(join(cache, `chromium_headless_shell-${n}`, "INSTALLATION_COMPLETE"), "");
    return join(dir, "chrome-headless-shell");
  };
  const own = join(cache, "chromium-1200", "chrome-mac-arm64", "Chrome.app", "Contents", "MacOS", "Chrome");
  expect(() => chromeFor(own)).toThrow("no complete chromium_headless_shell in " + cache);
  shell(1200, false); // a directory left by a download that did not finish
  const b1169 = shell(1169), b1234 = shell(1234);
  mkdirSync(join(cache, "chromium-1234"));
  expect(chromeFor(own)).toBe(b1234);
  expect(chromeFor(own.replace("chromium-1200", "chromium-1169"))).toBe(b1169);
  expect(chromeFor(own, { CHROME: "/somewhere/chrome" })).toBe("/somewhere/chrome");
  expect(() => chromeFor("/usr/bin/chrome")).toThrow("no Playwright cache in /usr/bin/chrome");
});

// Issue verify-run-shell-runs-deployed. A whole build as --shell booted the page's module, whose `assembled` cell
// wrote the Worker's source over the file's copy of the module while its tests ran (0 of 20 on n9e1c1256).
const block = (id: string, text: string, more = "") => `<script id="${id}" ${more}\n  type="text/plain"\n>\n${text}\n</script>`;
const BUILD_CONF = { mains: ["@a/lopepage", SHELL, M, "@t/page"], hash: "#view=C100(S70(@t/page))", headless: true };
// Its boot script makes a runtime from the boot list: every main but brain-shell and the Worker's module has 3 tests.
const build = (more = "") => ["<!doctype html><html><head>", block("bootconf.json", JSON.stringify(BUILD_CONF, null, 2)), block(SHELL, "S"), block(M, "W", more), block("@t/page", "P"), `<script>
  const mains = JSON.parse(document.getElementById("bootconf.json").textContent).mains, mods = new Map(mains.map((k) => [k, {}])), vars = new Set();
  mods.set("@t/w", mods.get("@t/w") || {});
  const add = (name, mod) => vars.add({ _name: name, _module: mods.get(mod), _version: 1, _value: "ok" });
  for (const m of mains) if (m !== "@t/w" && m !== "${SHELL}") for (let i = 0; i < 3; i++) add("test_" + i, m);
  add("test_a", "@t/w"); add("test_b", "@t/w");
  window.__ojs_runtime = { mains: mods, _variables: vars };
  // As cloud-brain's loadService: the page asks what the Worker runs and, when answered, writes it over its copy
  // of the module, before the verdict. (Review 1250: the cut keeps cloud-brain a main when it is the module.)
  fetch("/xrpc/com.lopecode.brain.getSource?worker=brain-x-w").then((r) => r.ok && r.json()).then((s) => s && s.text && add("test_written_over", "@t/w"), () => null)
    .then(() => fetch("/next")).then((r) => r.json()).then((v) => setTimeout(() => (window.__brainVerdict = v), 20));
</scr` + `ipt></head></html>`].join("\n");

test("--shell: a file that holds the module is served with the boot list cut to brain-shell and the module", () => {
  const html = build(), { body, mains } = shellDocument(html, M);
  expect(mains).toEqual([SHELL, M]);
  expect(JSON.parse(blockContent(body, "bootconf.json")!)).toEqual({ ...BUILD_CONF, mains: [SHELL, M] });
  expect(blockSpans(body).map((b: any) => b.id)).toEqual(blockSpans(html).map((b: any) => b.id));
  expect(blockContent(body, M)).toBe(blockContent(html, M));
  // A file without the module (verify.html) is served as it is: brain-shell joins what the Worker runs.
  expect(shellDocument(html, "@t/not-in-the-file")).toEqual({ body: html, mains: null });
});

test("a run whose module was not the file's, when the file holds it: exit 3 whatever the runs count", () => {
  const out = judge([pass({ from: "document" }), pass({ from: "brain" }), fail({ from: "brain" })], { module: M, expect: "document" });
  expect([out.from, out.notTheFiles, out.byChance.length, out.exit]).toEqual([["document", "brain"], 2, 1, 3]);
  expect(judge([pass({ from: "document" })], { module: M, expect: "document" })).toMatchObject({ from: ["document"], notTheFiles: 0, exit: 0 });
  // With no file that holds the module there is nothing to expect: the Worker's module is the one to run.
  const joined = judge([pass({ from: "brain" })], { module: M });
  expect([joined.from, "notTheFiles" in joined, joined.exit]).toEqual([["brain"], false, 0]);
});

// A stand-in for the Brain: the kernel's DID document, the deployer's module list, a page at / that leaves a
// verdict and a runtime of the shape brain-shell's page has, and /next, which says how each run in turn ends.
const page = (ran: Record<string, number>) => `<!doctype html><script>
  const ran = ${JSON.stringify(ran)}, mods = new Map(Object.keys(ran).map((k) => [k, {}])), vars = new Set();
  mods.set("@t/w", {}); mods.set("@t/imported-only", {});
  const add = (name, mod, done) => vars.add({ _name: name, _module: mods.get(mod), _version: done ? 1 : 0, _value: done ? "ok" : undefined });
  for (const [mod, n] of Object.entries(ran)) for (let i = 0; i < n; i++) add("test_" + i, mod, true);
  add("test_a", "@t/w", true); add("test_b", "@t/w", true); add("not_a_test", "@t/w", true);
  add("test_never_computed", "@t/imported-only", false);
  window.__ojs_runtime = { mains: mods, _variables: vars };
  fetch("/"); // not a document: it goes to the Brain also when a file stands in for the document
  fetch("/next").then((r) => r.json()).then((v) => setTimeout(() => (window.__brainVerdict = v), 20));
</script>`;
const SERVED = page({ [SHELL]: 8, "@tomlarkworthy/svg-lens": 60 });
const SHORT = page({ [SHELL]: 8, "@test/verify-abc123": 1 });

const rig = (ends: boolean[], { message = "Expected one line", more = "" } = {}) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "verify-run-")));
  writeFileSync(join(dir, "verify.html"), SHORT + more);
  let call = 0;
  const asked: string[] = [];
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: (req) => {
    const url = new URL(req.url);
    asked.push(url.pathname);
    if (url.pathname === "/.well-known/did.json") return Response.json({ service: [{ id: "#deployer", serviceEndpoint: url.origin + "/deployer" }] });
    if (url.pathname === "/deployer/xrpc/com.lopecode.brain.infra.getModules") return Response.json({ modules: [{ module: "@t/other", worker: "brain-x-other", hash: H2 }, { module: M, worker: "brain-x-w", hash: H1 }] });
    if (url.pathname === "/xrpc/com.lopecode.brain.getSource") return Response.json({ worker: "brain-x-w", module: M, hash: H1, text: "what the Worker runs" });
    if (url.pathname === "/next") {
      const ok = ends[call++ % ends.length];
      return Response.json({ worker: "brain-x-w", module: M, hash: H1, ok, tests: 2, failed: ok ? [] : [{ name: "test_b", message }], otherTestsRan: 9, ms: 5 });
    }
    if (url.pathname === "/") return new Response(SERVED, { headers: { "content-type": "text/html" } });
    return new Response("not found", { status: 404 });
  } });
  const run = async (...args: string[]) => {
    const p = Bun.spawn(["bun", script, ...args, "--base", `http://127.0.0.1:${server.port}`, "--timeout", "20"], { env: { ...process.env }, stdout: "pipe", stderr: "pipe" });
    const [out, err] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text()]);
    const lines = out.trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    return { code: await p.exited, err, start: lines[0], runs: lines.slice(1, -1), summary: lines[lines.length - 1] };
  };
  return { run, asked, shell: join(dir, "verify.html"), base: `http://127.0.0.1:${server.port}`, stop: () => server.stop(true) };
};

test("in a browser: the second of three runs fails, so the test is named as failing by chance, exit 1", async () => {
  const r = rig([true, false, true]);
  try {
    const { code, err, start, runs, summary } = await r.run("brain-x-w", "--times", "3", "--shell", r.shell);
    expect(err).toBe("");
    expect(start).toMatchObject({ worker: "brain-x-w", module: M, deployed: "aaaaaaaaaaaa", address: `${r.base}/#view=C100(S100(@t/w,@tomlarkworthy/brain-shell))&verify=brain-x-w`, shell: r.shell, times: 3 });
    expect(runs.map((x: any) => [x.run, x.ok, x.tests, x.failed])).toEqual([[1, true, 2, []], [2, false, 2, ["test_b: Expected one line"]], [3, true, 2, []]]);
    expect(runs[0].ran).toEqual({ [SHELL]: 8, "@test/verify-abc123": 1, [M]: 2 });
    expect(runs[0].variables).toBe(13);
    expect(summary).toMatchObject({ worker: "brain-x-w", runs: 3, passed: 2, failed: 1, none: 0, hashes: ["aaaaaaaaaaaa"], byChance: [{ hash: "aaaaaaaaaaaa", name: "test_b", passed: 2, failed: 1, message: "Expected one line" }], everyTime: [], otherModules: {}, exit: 1 });
    expect(code).toBe(1);
    // The file stood in for the document alone: the page's own request still reached the Brain.
    expect(r.asked.filter((p) => p === "/").length).toBe(3);
    expect(r.asked.filter((p) => p === "/next").length).toBe(3);
  } finally { r.stop(); }
}, 60000);

test("in a browser: the document as served has another module's tests, exit 1 with every run passed", async () => {
  const r = rig([true]);
  try {
    const { code, summary } = await r.run("brain-x-w", "--times", "2");
    expect(summary).toMatchObject({ runs: 2, passed: 2, failed: 0, byChance: [], otherModules: { "@tomlarkworthy/svg-lens": 60 }, exit: 1 });
    expect(code).toBe(1);
    expect(r.asked.filter((p) => p === "/").length).toBe(4);
  } finally { r.stop(); }
}, 60000);

test("in a browser: every run passes on the short document, exit 0", async () => {
  const r = rig([true]);
  try {
    const { code, summary } = await r.run("brain-x-w", "--times", "2", "--shell", r.shell);
    expect(summary).toMatchObject({ runs: 2, passed: 2, failed: 0, none: 0, byChance: [], everyTime: [], otherModules: {}, exit: 0 });
    expect(code).toBe(0);
  } finally { r.stop(); }
}, 60000);

test("in a browser: every run fails, exit 2 and not by chance", async () => {
  const r = rig([false]);
  try {
    const { code, summary } = await r.run("brain-x-w", "--times", "2", "--shell", r.shell);
    expect(summary).toMatchObject({ passed: 0, failed: 2, byChance: [], everyTime: [{ name: "test_b", passed: 0, failed: 2 }], exit: 2 });
    expect(code).toBe(2);
  } finally { r.stop(); }
}, 60000);

test("in a browser: a whole build as --shell boots the module and brain-shell, not the page's module, exit 0", async () => {
  const r = rig([true]);
  try {
    const file = join(realpathSync(mkdtempSync(join(tmpdir(), "verify-run-build-"))), "cloud-brain.html");
    writeFileSync(file, build());
    const { code, err, start, runs, summary } = await r.run("brain-x-w", "--times", "2", "--shell", file);
    expect(err).toBe("");
    expect(start.mains).toEqual([SHELL, M]);
    expect(runs.map((x: any) => [x.ok, x.tests, x.from, x.ran])).toEqual([[true, 2, "document", { [M]: 2 }], [true, 2, "document", { [M]: 2 }]]);
    expect(summary).toMatchObject({ runs: 2, passed: 2, failed: 0, from: ["document"], notTheFiles: 0, otherModules: {}, exit: 0 });
    expect(code).toBe(0);
    // The page asked what the Worker runs, once a run, and was not answered: its copy of the module was not written over.
    expect(runs.map((x: any) => x.refused)).toEqual([1, 1]);
    expect(r.asked.includes("/xrpc/com.lopecode.brain.getSource")).toBe(false);
    // The module's block is another's text on the page (a join's): the runs are not of the file's module.
    writeFileSync(file, build("data-brain"));
    const other = await r.run("brain-x-w", "--times", "2", "--shell", file);
    expect(other.summary).toMatchObject({ passed: 2, from: ["brain"], notTheFiles: 2, exit: 3 });
    expect(other.code).toBe(3);
    // The short document holds no copy: served as it is, and the page has no block of the module.
    const short = await r.run("brain-x-w", "--shell", r.shell);
    expect([short.start.mains, short.runs[0].from, short.summary.from, "notTheFiles" in short.summary]).toEqual([null, null, [null], false]);
  } finally { r.stop(); }
}, 60000);

// Issue ac-1-local-tools-mark-a-cut. The four texts the tool cut with no mark: a failed test's message at 160 in a
// run's line and at 200 in the count by test, a page error at 160, and why a run had no verdict at 200.
test("in a browser: a failed test's message and a page error over their bounds are cut and say so; --whole prints each whole", async () => {
  const message = "f".repeat(200) + "X", error = "p".repeat(153) + "X"; // a page error is printed as "Error: " and its message: 161
  const r = rig([false], { message, more: `<script>throw new Error(${JSON.stringify(error)});</scr` + `ipt>` });
  try {
    const short = await r.run("brain-x-w", "--shell", r.shell);
    expect(short.runs[0].failed).toEqual(["test_b: " + "f".repeat(160) + "… (cut: 160 of 201 characters; --whole prints all)"]);
    expect(short.runs[0].errors).toEqual(["Error: " + "p".repeat(153) + "… (cut: 160 of 161 characters; --whole prints all)"]);
    expect(short.summary.everyTime[0].message).toBe("f".repeat(200) + "… (cut: 200 of 201 characters; --whole prints all)");
    const whole = await r.run("brain-x-w", "--shell", r.shell, "--whole");
    expect([whole.runs[0].failed, whole.runs[0].errors, whole.summary.everyTime[0].message]).toEqual([["test_b: " + message], ["Error: " + error], message]);
    expect([short.code, whole.code]).toEqual([2, 2]);
  } finally { r.stop(); }
}, 60000);

test("in a browser: a failed test's message of 161 characters is cut in a run's line and whole in the count by test", async () => {
  const message = "f".repeat(160) + "X";
  const r = rig([false], { message });
  try {
    const { runs, summary } = await r.run("brain-x-w", "--shell", r.shell);
    expect(runs[0].failed).toEqual(["test_b: " + "f".repeat(160) + "… (cut: 160 of 161 characters; --whole prints all)"]);
    expect(summary.everyTime[0].message).toBe(message);
  } finally { r.stop(); }
}, 60000);

test("in a browser: why a run had no verdict, one over 200, is cut and says so; --whole prints it whole", async () => {
  // What Playwright puts before the page's message, as the tool printed it on 2026-10-12. With another, the --whole text below names it.
  const before = "forFunction: Error: ", thrown = "v".repeat(200 - before.length) + "X";
  const r = rig([true], { more: `<script>Object.defineProperty(window, "__brainVerdict", { get() { throw new Error(${JSON.stringify(thrown)}); }, set() {} });</scr` + `ipt>` });
  try {
    const whole = await r.run("brain-x-w", "--shell", r.shell, "--whole");
    expect(whole.runs[0].none).toBe("no verdict: " + before + thrown);
    const short = await r.run("brain-x-w", "--shell", r.shell);
    expect(short.runs[0].none).toBe("no verdict: " + before + "v".repeat(200 - before.length) + "… (cut: 200 of 201 characters; --whole prints all)");
    expect([short.summary.none, short.code, whole.code]).toEqual([1, 2, 2]);
  } finally { r.stop(); }
}, 60000);

test("a Worker the deployer does not name, and no Worker: an error, no run", async () => {
  const r = rig([true]);
  try {
    const unknown = await r.run("brain-x-nope");
    expect(unknown.err).toContain(`the deployer of ${r.base} has no module of brain-x-nope`);
    expect(unknown.code).toBe(70);
    expect(r.asked.includes("/")).toBe(false);
    const p = Bun.spawnSync(["bun", script, "--times", "2"]);
    expect(p.stderr.toString()).toContain("no Worker named\nverify-run.ts WORKER [--times N] [--shell FILE]");
    expect(p.exitCode).toBe(64);
    const noFile = await r.run("brain-x-w", "--shell", "/nowhere/verify.html");
    expect([noFile.code, noFile.err.startsWith("verify-run: ENOENT")]).toEqual([70, true]);
  } finally { r.stop(); }
}, 60000);
