// brain.ts shell posts two files with the recovery key: the page of a deploy's test run (infra.shell?name=verify),
// then the shell (infra.shell). Issue dv-3-deployer-opens-verify-html, task 3 of
// plan/cloud-brain-deploy-verdict-from-a-shared-page.md: "a new shell is never left beside an old verify file".
// The deployer is a local stand-in; no Brain is called.
//
//   bun test ./tests/tools/brain-shell-posts-both.test.ts
//   BRAIN_TS=/path/to/another/brain.ts bun test …
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";

const script = process.env.BRAIN_TS || resolve(import.meta.dir, "../../tools/cloud-brain/brain.ts");

// answer(name): what the stand-in answers a post, where name is the request's ?name= or null.
const rig = (files: Record<string, string>, answer: (name: string | null) => Response) => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "brain-shell-")));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  const posts: any[] = [];
  const server = Bun.serve({ port: 0, hostname: "127.0.0.1", fetch: async (req) => {
    const url = new URL(req.url);
    posts.push({ method: req.method, path: url.pathname, query: url.search, key: req.headers.get("authorization"), type: req.headers.get("content-type"), body: await req.text() });
    return answer(url.searchParams.get("name"));
  } });
  writeFileSync(join(dir, "t.json"), JSON.stringify({ recoveryKey: "key-for-the-test", deployerScript: "t-deployer", subdomain: "none", deployerUrl: `http://127.0.0.1:${server.port}` }));
  const run = async (...args: string[]) => {
    const p = Bun.spawn(["bun", script, "shell", ...args], { env: { ...process.env, BRAIN_BASE: "t", BRAIN_STATE_DIR: dir }, stdout: "pipe", stderr: "pipe" });
    const out = (await new Response(p.stdout).text()) + (await new Response(p.stderr).text());
    return { out, code: await p.exited };
  };
  return { dir, run, posts, stop: () => server.stop(true) };
};
// A deployer with task 3, and one from before it, which reads no name.
const takesName = (name: string | null) => Response.json({ path: name === "verify" ? "shell/verify.html" : "shell/index.html" });
const before = () => Response.json({ path: "shell/index.html" });
const INFRA = "/xrpc/com.lopecode.brain.infra.shell";
const sent = (posts: any[]) => posts.map((p) => [p.method, p.path, p.query, p.body]);

test("shell posts the verify page and then the shell, each as the body, with the recovery key", async () => {
  const r = rig({ "shell.html": "<html>shell</html>", "verify.html": "<html>verify</html>" }, takesName);
  try {
    const { out, code } = await r.run();
    expect(sent(r.posts)).toEqual([["POST", INFRA, "?name=verify", "<html>verify</html>"], ["POST", INFRA, "", "<html>shell</html>"]]);
    expect(r.posts.map((p) => [p.key, p.type])).toEqual([["Bearer key-for-the-test", "text/html; charset=utf-8"], ["Bearer key-for-the-test", "text/html; charset=utf-8"]]);
    expect(out).toContain("shell/verify.html");
    expect(code).toBe(0);
  } finally { r.stop(); }
});

test("shell SHELL VERIFY posts the two files named", async () => {
  const r = rig({ "a.html": "<html>a</html>", "b.html": "<html>b</html>" }, takesName);
  try {
    const { code } = await r.run(join(r.dir, "a.html"), join(r.dir, "b.html"));
    expect(sent(r.posts)).toEqual([["POST", INFRA, "?name=verify", "<html>b</html>"], ["POST", INFRA, "", "<html>a</html>"]]);
    expect(code).toBe(0);
  } finally { r.stop(); }
});

for (const [have, absent] of [["shell.html", "verify.html"], ["verify.html", "shell.html"]])
  test(`with no ${absent} nothing is sent and the exit is 1`, async () => {
    const r = rig({ [have]: "<html>one</html>" }, takesName);
    try {
      const { out, code } = await r.run();
      expect(r.posts).toEqual([]);
      expect(out).toContain(join(r.dir, absent) + " is not there, and nothing was sent");
      expect(code).toBe(1);
    } finally { r.stop(); }
  });

test("the verify page refused: the shell is not sent", async () => {
  const r = rig({ "shell.html": "<html>shell</html>", "verify.html": "<html>verify</html>" }, () => Response.json({ error: "NotReady", message: "the core is not deployed" }, { status: 503 }));
  try {
    const { out, code } = await r.run();
    expect(sent(r.posts)).toEqual([["POST", INFRA, "?name=verify", "<html>verify</html>"]]);
    expect(out).toContain("shell/verify.html was not put (503), and the shell was not sent");
    expect(code).toBe(1);
  } finally { r.stop(); }
});

test("a deployer from before the name: the shell is the last one put, and the exit is 1 with what to do", async () => {
  const r = rig({ "shell.html": "<html>shell</html>", "verify.html": "<html>verify</html>" }, before);
  try {
    const { out, code } = await r.run();
    // That deployer puts each body as shell/index.html: the shell is sent second, so it is what is left there.
    expect(r.posts.at(-1).body).toBe("<html>shell</html>");
    expect(r.posts.length).toBe(2);
    expect(out).toContain("This deployer does not take ?name=verify");
    expect(out).toContain("brain.ts install-deployer, then brain.ts shell again");
    expect(code).toBe(1);
  } finally { r.stop(); }
});
