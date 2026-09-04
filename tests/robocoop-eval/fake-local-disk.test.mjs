import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { installFakeLocalDisk } from "../../tools/robocoop-eval/fake-local-disk.mjs";

const TEXT = "hello fake disk\nline two\n";

async function makeRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "fake-local-disk-"));
  await fs.mkdir(path.join(root, "sub"), { recursive: true });
  await fs.writeFile(path.join(root, "sub", "hello.txt"), TEXT, "utf8");
  const bin = Buffer.alloc(3072);
  for (let i = 0; i < bin.length; i++) bin[i] = (i * 7 + 13) % 256;
  await fs.writeFile(path.join(root, "blob.bin"), bin);
  return { root, bin };
}

test("fake local disk proxies a real host directory into the page", async (t) => {
  const { root, bin } = await makeRoot();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  t.after(async () => {
    await browser.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  const info = await installFakeLocalDisk(context, { root });
  assert.equal(info.name, path.basename(root));

  const page = await context.newPage();
  await page.goto("about:blank");

  const outBytes = [0, 1, 2, 250, 251, 252, 255, 128];

  const r = await page.evaluate(async ({ outBytes }) => {
    const toB64 = (bytes) => {
      let s = "";
      const u8 = new Uint8Array(bytes);
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const catchName = async (fn) => {
      try { await fn(); return "NO_THROW"; } catch (e) { return e.name; }
    };
    const out = {};

    const dir = await window.showDirectoryPicker();
    out.pickerKind = dir.kind;
    out.pickerName = dir.name;
    out.sameEntry = await dir.isSameEntry(window.__lopeFakeLocalDisk.root);
    out.permission = await dir.queryPermission();
    out.requested = await dir.requestPermission();

    out.entries = [];
    for await (const [name, handle] of dir.entries()) out.entries.push([name, handle.kind]);
    out.entries.sort((a, b) => (a[0] < b[0] ? -1 : 1));
    out.keys = [];
    for await (const k of dir.keys()) out.keys.push(k);
    out.keys.sort();
    out.valueKinds = [];
    for await (const v of dir.values()) out.valueKinds.push(v.kind);
    out.valueKinds.sort();
    out.iterCount = 0;
    for await (const pair of dir) out.iterCount += pair.length === 2 ? 1 : 0;

    const sub = await dir.getDirectoryHandle("sub");
    const txt = await sub.getFileHandle("hello.txt");
    const f = await txt.getFile();
    out.text = await f.text();
    out.textType = f.type;
    out.textLastModified = typeof f.lastModified === "number" && f.lastModified > 0;
    out.resolve = await dir.resolve(txt);
    out.resolveOutside = await sub.resolve(dir);

    const blob = await dir.getFileHandle("blob.bin");
    const blobFile = await blob.getFile();
    out.binB64 = toB64(await blobFile.arrayBuffer());
    out.binType = blobFile.type;

    const results = await dir.getDirectoryHandle("results", { create: true });
    const outJson = await results.getFileHandle("out.json", { create: true });
    const w = await outJson.createWritable();
    await w.write('{"ok":');
    await w.write("true}");
    await w.close();
    out.jsonType = (await outJson.getFile()).type;

    const binHandle = await results.getFileHandle("out.bin", { create: true });
    const bw = await binHandle.createWritable();
    await bw.write(new Uint8Array(outBytes));
    await bw.close();
    out.binRoundTripB64 = toB64(await (await binHandle.getFile()).arrayBuffer());

    await dir.removeEntry("blob.bin");
    out.afterRemove = await catchName(() => dir.getFileHandle("blob.bin"));

    out.escape = await catchName(() => dir.getDirectoryHandle(".."));
    out.escapeFile = await catchName(() => dir.getFileHandle("../evil.txt", { create: true }));
    out.missing = await catchName(() => dir.getFileHandle("missing"));
    out.mismatchFile = await catchName(() => dir.getFileHandle("sub"));
    out.mismatchDir = await catchName(() => dir.getDirectoryHandle("results/out.json"));

    return out;
  }, { outBytes });

  assert.equal(r.pickerKind, "directory");
  assert.equal(r.pickerName, path.basename(root));
  assert.equal(r.sameEntry, true);
  assert.equal(r.permission, "granted");
  assert.equal(r.requested, "granted");

  assert.deepEqual(r.entries, [["blob.bin", "file"], ["sub", "directory"]]);
  assert.deepEqual(r.keys, ["blob.bin", "sub"]);
  assert.deepEqual(r.valueKinds, ["directory", "file"]);
  assert.equal(r.iterCount, 2);

  assert.equal(r.text, TEXT);
  assert.equal(r.textType, "text/plain");
  assert.equal(r.textLastModified, true);
  assert.deepEqual(r.resolve, ["sub", "hello.txt"]);
  assert.equal(r.resolveOutside, null);

  assert.equal(r.binB64, bin.toString("base64"));
  assert.equal(r.binType, "application/octet-stream");

  const wrote = await fs.readFile(path.join(root, "results", "out.json"));
  assert.equal(wrote.toString("utf8"), '{"ok":true}');
  assert.equal(r.jsonType, "application/json");

  const wroteBin = await fs.readFile(path.join(root, "results", "out.bin"));
  assert.deepEqual(Array.from(wroteBin), outBytes);
  assert.equal(r.binRoundTripB64, Buffer.from(outBytes).toString("base64"));

  await assert.rejects(fs.stat(path.join(root, "blob.bin")));
  assert.equal(r.afterRemove, "NotFoundError");

  assert.equal(r.escape, "NotAllowedError");
  assert.equal(r.escapeFile, "NotAllowedError");
  assert.equal(r.missing, "NotFoundError");
  assert.equal(r.mismatchFile, "TypeMismatchError");
  assert.equal(r.mismatchDir, "TypeMismatchError");
});

test("picker survives a fresh navigation; keepExistingData, seek, truncate, abort", async (t) => {
  const { root } = await makeRoot();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  t.after(async () => {
    await browser.close();
    await fs.rm(root, { recursive: true, force: true });
  });

  await installFakeLocalDisk(context, { root, name: "sandbox" });
  const page = await context.newPage();
  await page.goto("about:blank");
  await page.goto("about:blank#again"); // init script re-runs on every navigation

  const r = await page.evaluate(async () => {
    const dir = await window.showDirectoryPicker();
    const h = await dir.getFileHandle("edit.txt", { create: true });

    let w = await h.createWritable();
    await w.write("0123456789");
    await w.close();

    w = await h.createWritable({ keepExistingData: true });
    await w.seek(2);
    await w.write("XY");
    await w.write({ type: "write", data: "Z", position: 9 });
    await w.write({ type: "truncate", size: 12 });
    await w.close();
    const after = await (await h.getFile()).text();

    w = await h.createWritable();
    await w.write("discard me");
    await w.abort();

    return {
      rootName: dir.name,
      after,
      afterAbort: await (await h.getFile()).text(),
      tail: [after.charCodeAt(10), after.charCodeAt(11)],
    };
  });

  assert.equal(r.rootName, "sandbox");
  assert.equal(r.after.length, 12);
  assert.equal(r.after.slice(0, 10), "01XY45678Z");
  assert.deepEqual(r.tail, [0, 0]); // truncate zero-fills
  assert.equal(r.afterAbort, r.after);
  assert.equal(await fs.readFile(path.join(root, "edit.txt"), "utf8"), r.after);
});
