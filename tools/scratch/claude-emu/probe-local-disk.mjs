// /local-disk end to end. The native picker cannot be driven headlessly, so the handle is
// synthetic — everything downstream of showDirectoryPicker() is the real code path.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
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
  return out;
});
console.log("inside session:", JSON.stringify(inside, null, 1));
await sleep(600);
console.log("landed on the fake disk:", await p.evaluate(() => {
  const src = window.__TESTTREE.__entries.find((e) => e.name === "src");
  const f = src.__entries.find((e) => e.name === "from-cli.txt");
  return f ? f.__written : "NOT WRITTEN";
}));
await b.close(); process.exit(0);
