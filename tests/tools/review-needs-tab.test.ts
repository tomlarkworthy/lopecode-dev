import { test, expect } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const tool = resolve(import.meta.dir, "../../tools/cloud-brain/review-needs-tab.sh");
const sh = (cmd: string[], cwd?: string, env = {}) => {
  const r = Bun.spawnSync(cmd, { cwd, env: { ...process.env, ...env } });
  return { code: r.exitCode, out: r.stdout.toString().trim(), err: r.stderr.toString().trim() };
};

// A checkout with one submodule-shaped directory; each commit touches the one file named.
function rig() {
  const root = mkdtempSync(join(tmpdir(), "needs-tab-"));
  const commit = (dir: string, file: string) => {
    mkdirSync(join(dir, file, ".."), { recursive: true });
    writeFileSync(join(dir, file), String(Math.random()));
    sh(["git", "add", file], dir);
    sh(["git", "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", file], dir);
    return sh(["git", "rev-parse", "HEAD"], dir).out;
  };
  sh(["git", "init", "-q", root]);
  const sub = join(root, "lopebooks");
  mkdirSync(sub);
  sh(["git", "init", "-q", sub]);
  const run = (...refs: string[]) => sh([tool, ...refs], undefined, { CHECKOUT: root });
  return { root, sub, commit, run, done: () => rmSync(root, { recursive: true, force: true }) };
}

test("a doc, a test and a shell script need no tab", () => {
  const r = rig();
  const refs = ["knowledge/a.md", "tests/tools/a.test.ts", "tools/cloud-brain/lock.sh"].map((f) => "lopecode-dev@" + r.commit(r.root, f));
  expect(r.run(...refs)).toEqual({ code: 1, out: "", err: "" });
  r.done();
});

test("a seed, a notebook and a module each need one, and the file is named", () => {
  const r = rig();
  const doc = "lopecode-dev@" + r.commit(r.root, "knowledge/a.md");
  for (const f of ["tools/cloud-brain/brain-x.ojs", "plan/specs/a.html", "modules/@t/a.js", "deploy/@t/a.js"]) {
    const got = r.run(doc, "lopecode-dev@" + r.commit(r.root, f));
    expect(got).toEqual({ code: 0, out: "lopecode-dev: " + f, err: "" });
  }
  const nb = r.commit(r.sub, "notebooks/@t_a.html");
  expect(r.run(doc, "lopebooks@" + nb).out).toBe("lopebooks: notebooks/@t_a.html");
  r.done();
});

test("a commit that cannot be read, a ref with no @ and no ref at all exit 2", () => {
  const r = rig();
  r.commit(r.root, "a.md");
  expect(r.run("lopecode-dev@0000000000000000000000000000000000000000").code).toBe(2);
  expect(r.run("nowhere@abc").code).toBe(2);
  expect(r.run("abc").code).toBe(2);
  expect(r.run().code).toBe(2);
  r.done();
});
