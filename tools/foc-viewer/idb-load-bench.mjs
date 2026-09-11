// How long does it take to get the whole message corpus out of IndexedDB, and
// what does holding it cost?
//
// The foc-viewer redesign (plan/foc-viewer.md) turns foc-data's single-value
// cache into a row per record, then loads the text into memory so search can
// scan it with String.includes. Everything about the scan was measured; the
// load was not. This measures it in real Chromium against the real records.
//
//   python3 -c '...'                       # build /tmp/msgs.json from
//                                          # tools/backfill-all.jsonl
//   node tools/foc-viewer/idb-load-bench.mjs
//
// Two things it exists to settle:
//   1. whether a bulk load is fast enough to do at boot;
//   2. whether an index on the collection beats a prefix range over the at-uri
//      key, which already encodes the collection.
//
// Heap comes from CDP Runtime.getHeapUsage after a forced collection.
// performance.memory is quantised and does not move when the page drops a
// 50 MB array — an earlier version of this script reported 322 MB for every
// state because of that.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";

const DID = "did:plc:4gcxakknd6hxtnhf33miwsob";
const records = JSON.parse(readFileSync("/tmp/msgs.json", "utf8"));
console.log(`${records.length} records, ${(readFileSync("/tmp/msgs.json").length / 1e6).toFixed(1)} MB JSON`);

writeFileSync("/tmp/idb-bench.html", "<!doctype html><meta charset=utf-8><title>idb bench</title>");
const browser = await chromium.launch();
const page = await browser.newPage();
// IndexedDB is denied on an opaque origin, so navigate before touching it.
await page.goto("file:///tmp/idb-bench.html");
// d3 is an Observable builtin, so d3.group is free at the call site — worth
// knowing whether it costs anything against a hand-rolled pass.
await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/d3-array@3/dist/d3-array.min.js" });
const cdp = await page.context().newCDPSession(page);
const heapMB = async () => {
  await cdp.send("HeapProfiler.collectGarbage");
  return Math.round((await cdp.send("Runtime.getHeapUsage")).usedSize / 1e6);
};

const out = await page.evaluate(async ({ recs, DID }) => {
  const log = [];
  const open = (n, up) => new Promise((res, rej) => {
    const r = indexedDB.open(n, 1);
    r.onupgradeneeded = (e) => up(e.target.result);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const done = (tx) => new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  const getAll = (db, store, ...a) => new Promise((res, rej) => {
    const r = db.transaction(store, "readonly").objectStore(store).getAll(...a);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });

  await new Promise((r) => { const d = indexedDB.deleteDatabase("bench"); d.onsuccess = d.onerror = r; });
  const db = await open("bench", (d) => {
    // `records` mirrors @tomlarkworthy/atproto's store: out-of-line key, the
    // at-uri. `records2` is the same data with a keyPath and a collection
    // index, to compare the two ways of scoping to one collection.
    d.createObjectStore("records");
    d.createObjectStore("records2", { keyPath: "uri" }).createIndex("collection", "collection");
    d.createObjectStore("search", { keyPath: "rkey" });
  });

  let t = performance.now();
  for (let i = 0; i < recs.length; i += 2000) {
    const tx = db.transaction(["records", "records2", "search"], "readwrite");
    const [a, b, s] = ["records", "records2", "search"].map((n) => tx.objectStore(n));
    for (const r of recs.slice(i, i + 2000)) {
      const uri = `at://${DID}/social.colibri.message/${r.rkey}`;
      a.put({ pds: "x", record: r.value }, uri);
      b.put({ uri, collection: "social.colibri.message", record: r.value });
      s.put({ rkey: r.rkey, text: (r.value.text ?? "").toLowerCase() });
    }
    await done(tx);
  }
  log.push(["write all rows (batched 2000)", performance.now() - t, recs.length]);

  const pre = `at://${DID}/social.colibri.message/`;
  t = performance.now();
  const byRange = await getAll(db, "records", IDBKeyRange.bound(pre, pre + "￿"));
  log.push(["prefix key range on the at-uri", performance.now() - t, byRange.length]);

  t = performance.now();
  const byIndex = await new Promise((res, rej) => {
    const r = db.transaction("records2", "readonly").objectStore("records2")
      .index("collection").getAll(IDBKeyRange.only("social.colibri.message"));
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  log.push(["index('collection').getAll", performance.now() - t, byIndex.length]);

  t = performance.now();
  const proj = await getAll(db, "search");
  log.push(["getAll('search') — {rkey,text} only", performance.now() - t, proj.length]);

  t = performance.now();
  const page1 = [];
  await new Promise((res) => {
    const c = db.transaction("records", "readonly").objectStore("records").openCursor(null, "prev");
    c.onsuccess = (e) => { const cur = e.target.result; if (!cur || page1.length >= 100) return res(); page1.push(cur.value); cur.continue(); };
  });
  log.push(["newest 100 (cursor 'prev')", performance.now() - t, page1.length]);

  // Grouping at load time is the alternative to a channel index: one pass over
  // what the bulk read already returned.
  t = performance.now();
  const byChannel = new Map(), repliesByParent = new Map(), byRkey = new Map();
  for (const v of byRange) {
    const r = v.record;
    byRkey.set(r, v);
    const k = r.parent ? "r" : "t";
    const m = r.parent ? repliesByParent : byChannel;
    const key = r.parent ?? r.channel;
    let a = m.get(key); if (!a) m.set(key, a = []); a.push(v);
  }
  log.push(["group by channel + parent, hand loop", performance.now() - t, byChannel.size + " channels, " + repliesByParent.size + " threads"]);

  if (window.d3) {
    const tops = byRange.filter((v) => !v.record.parent);
    const reps = byRange.filter((v) => v.record.parent);
    d3.group(tops, (v) => v.record.channel);
    t = performance.now();
    const g1 = d3.group(tops, (v) => v.record.channel);
    const g2 = d3.group(reps, (v) => v.record.parent);
    log.push(["d3.group (two passes + two filters)", performance.now() - t, g1.size + " channels, " + g2.size + " threads"]);
  }

  // searchIndex recomputes on every archive yield, so the build cost is paid
  // per poll, not once. This is what replaces the inverted index.
  const build = () => byRange.map((v) => {
    const text = v.record.text ?? "";
    const m = text.match(/^@([^:\n]+): ?/);
    return { rkey: v.uri, hay: ((m ? m[1] : "") + "\n" + (v.record.channel ?? "") + "\n" + (m ? text.slice(m[0].length) : text)).toLowerCase() };
  });
  build();
  t = performance.now();
  const rows = build();
  log.push(["build {rkey, hay} projection", performance.now() - t, rows.length]);

  // Worst case for the query path: a term that matches almost everything, so
  // the sort-then-slice dominates rather than the scan.
  const full = (q, limit = 60) => {
    const t0 = performance.now();
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const out = [];
    for (const row of rows) { let ok = true; for (const x of terms) if (!row.hay.includes(x)) { ok = false; break; } if (ok) out.push(row); }
    out.sort((a, b) => (a.rkey < b.rkey ? 1 : a.rkey > b.rkey ? -1 : 0));
    return [performance.now() - t0, out.length, out.slice(0, limit).length];
  };
  full("a");
  for (const q of ["a", "the", "observable"]) {
    const [ms, n] = full(q);
    log.push([`search() incl. sort+slice ${JSON.stringify(q)}`, ms, n + " matched"]);
  }

  const scan = (q) => { const t0 = performance.now(); let n = 0; for (const r of rows) if (r.hay.includes(q)) n++; return [performance.now() - t0, n]; };
  scan("observable");
  for (const q of ["observable", "end user programming", "zzqqxx"]) {
    const [ms, n] = scan(q);
    log.push([`includes() scan ${JSON.stringify(q)}`, ms, n]);
  }

  window.__full = byRange;
  window.__proj = proj;
  return { log, chars: proj.reduce((a, r) => a + r.text.length, 0) };
}, { recs: records, DID });

console.log();
for (const [what, ms, n] of out.log) console.log(`  ${what.padEnd(38)} ${ms.toFixed(0).padStart(6)} ms   (${n})`);
console.log(`\n  searchable text: ${(out.chars / 1e6).toFixed(1)} M chars`);
console.log("\n  JS heap (CDP, after a forced collection):");
console.log(`    full records + search projection   ${await heapMB()} MB`);
await page.evaluate(() => { window.__full = null; });
console.log(`    search projection only             ${await heapMB()} MB`);
await page.evaluate(() => { window.__proj = null; });
console.log(`    neither                            ${await heapMB()} MB`);
await browser.close();
