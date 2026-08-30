// /local-disk end to end. The native picker cannot be driven headlessly, so the handle is
// synthetic — everything downstream of showDirectoryPicker() is the real code path.
// AGENT=1 adds a final stage: a real model turn that must actually explore the mount.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const HERE = "/Users/tom.larkworthy/dev/lopecode-dev/tools/scratch/claude-emu";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
if (process.env.AGENT) {
  const key = readFileSync(HERE + "/or-key.txt", "utf8").trim();
  await p.addInitScript((k) => { try { localStorage.setItem("openrouter_key", k); } catch {} }, key);
  p.on("response", (r) => { if (/chat\/completions/.test(r.url())) console.log("[upstream]", r.status(), r.url().slice(0, 60)); });
}
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(4000);

// A fake FileSystemDirectoryHandle over an in-memory tree, including one binary file,
// one oversized file and a node_modules dir that must NOT be walked.
const mount = await p.evaluate(async () => {
  const enc = new TextEncoder();
  const mk = (name, bytes) => ({ kind: "file", name,
    getFile: async () => ({ size: bytes.length, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }),
    createWritable: async function () { const self = this; return { write: async (c) => { self.__written = c; }, close: async () => {} }; } });
  const dir = (name, entries) => ({ kind: "directory", name, __entries: entries,
    entries: async function* () { for (const e of entries) yield [e.name, e]; },
    getDirectoryHandle: async (n, o) => { let d = entries.find((e) => e.name === n && e.kind === "directory"); if (!d && o && o.create) { d = dir(n, []); entries.push(d); } return d; },
    getFileHandle: async (n, o) => { let f = entries.find((e) => e.name === n && e.kind === "file"); if (!f && o && o.create) { f = mk(n, new Uint8Array()); entries.push(f); } return f; } });
  const tree = dir("my-project", [
    mk("README.md", enc.encode("# my project\nhello from the local disk\n")),
    mk("logo.png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0xff, 0xfe])),
    mk("huge.txt", enc.encode("x".repeat(600 * 1024))),
    dir("src", [mk("index.js", enc.encode("export const answer = 42;\n"))]),
    dir("node_modules", [mk("junk.js", enc.encode("nope"))]),
  ]);
  window.__TESTTREE = tree;
  return await window.__mountLocalDisk(tree);
});
console.log("mount:", JSON.stringify(mount));
console.log("listing:", JSON.stringify(await p.evaluate(() => window.__RC5FS.list().filter((x) => x.startsWith("/local-disk")))));
console.log("read README:", JSON.stringify(await p.evaluate(() => window.__RC5FS.readSync("/local-disk/README.md"))));
console.log("node_modules walked:", await p.evaluate(() => window.__RC5FS.list().some((x) => x.includes("node_modules"))));

// Write-back: through the host bridge, then check the fake handle received the bytes.
const wrote = await p.evaluate(async () => {
  window.__RC5FS.writeSync("/local-disk/src/new-file.txt", "written by the agent\n");
  await new Promise((r) => setTimeout(r, 300));
  const src = window.__TESTTREE.__entries.find((e) => e.name === "src");
  const f = src.__entries.find((e) => e.name === "new-file.txt");
  const readme = window.__TESTTREE.__entries.find((e) => e.name === "README.md");
  window.__RC5FS.writeSync("/local-disk/README.md", "# overwritten\n");
  await new Promise((r) => setTimeout(r, 300));
  return { created: f ? f.__written : null, overwrote: readme.__written, info: window.__localDiskInfo() };
});
console.log("write-back:", JSON.stringify(wrote));

console.log("mount status line:", await p.evaluate(() => document.querySelector("#cb-mount-status").textContent));

// The half that matters: what the SESSION sees. Restart the way the mount button does.
await p.evaluate(() => window.__autostart());
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 90000 }).catch(() => {});
await sleep(8000);
const inside = await p.evaluate(async () => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const fs = w.__REG && w.__REG.fs;
  const out = {};
  try { out.readdir = fs.readdirSync("/local-disk"); } catch (e) { out.readdir = "ERR " + e.message; }
  try { out.readdirSrc = fs.readdirSync("/local-disk/src"); } catch (e) { out.readdirSrc = "ERR " + e.message; }
  try { out.read = fs.readFileSync("/local-disk/README.md", "utf8"); } catch (e) { out.read = "ERR " + e.message; }
  // The route cli.js's Write tool actually uses: temp file then rename.
  try {
    fs.writeFileSync("/tmp/stage.txt", "from the cli side\n");
    fs.renameSync("/tmp/stage.txt", "/local-disk/src/from-cli.txt");
    out.wroteViaRename = true;
  } catch (e) { out.wroteViaRename = "ERR " + e.message; }
  out.claudeMdMentionsMount = /local-disk/.test(String(w.__vol.toJSON()["/home/user/project/CLAUDE.md"] || ""));
  // The route the Glob and Grep TOOLS take: cli.js spawns a vendored `rg`. Without the
  // in-process ripgrep the agent cannot enumerate a mount at all.
  const cp = w.__REG && w.__REG.child_process;
  const rg = (args) => new Promise((res) => cp.execFile("/vendor/ripgrep/rg", args, { cwd: "/home/user/project" },
    (e, stdout) => res(String(stdout || "").split("\n").filter(Boolean))));
  out.globAll = await rg(["--files", "--glob", "**/*", "--sort=modified", "--no-ignore", "--hidden", "/local-disk"]);
  out.globJs = await rg(["--files", "--glob", "**/*.js", "--no-ignore", "--hidden", "/local-disk"]);
  out.grep = await rg(["--hidden", "--max-columns", "500", "-l", "answer", "/local-disk"]);
  out.grepContent = await rg(["--hidden", "-n", "overwritten", "/local-disk"]);
  return out;
});
console.log("inside session:", JSON.stringify(inside, null, 1));
await sleep(600);
console.log("landed on the fake disk:", await p.evaluate(() => {
  const src = window.__TESTTREE.__entries.find((e) => e.name === "src");
  const f = src.__entries.find((e) => e.name === "from-cli.txt");
  return f ? f.__written : "NOT WRITTEN";
}));
// The user-visible half: a model that has to find the files itself.
if (process.env.AGENT) {
  await p.click("#cb-term");
  await p.keyboard.type("List every file under /local-disk using the Glob tool, then reply DONE", { delay: 8 });
  await p.keyboard.press("Enter");
  const t0 = Date.now();
  let buf = "";
  while (Date.now() - t0 < 180000) {
    await sleep(2000);
    buf = await p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
    if ((buf.match(/DONE/g) || []).length >= 2) break; // 1st is the echoed prompt
  }
  console.log("---- agent turn ----\n" + buf.split("\n").slice(-40).join("\n"));
  console.log("glob tool used:", /Glob|Search\(/.test(buf), "| errored:", /Error searching files|ENOENT|No files found/.test(buf));
}
await b.close(); process.exit(0);
