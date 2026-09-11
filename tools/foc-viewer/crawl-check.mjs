// Does the rewritten foc-data walk actually finish, resume, and stay off the
// boot path?  Drives the real notebook in Chromium against the real PDS.
//
//   node tools/foc-viewer/crawl-check.mjs            # full run (~5 min)
//   node tools/foc-viewer/crawl-check.mjs --resume   # phase 2 only
//
// Phase 1 boots with an empty profile, lets the crawl run for KILL_AFTER_MS,
// then closes the context mid-walk — the case a reader closing the tab
// produces.  Phase 2 reopens the same profile and checks the second walk starts
// from the persisted cursor instead of the head of the repo.
//
// file:// is one shared storage origin, so the profile directory is what
// isolates this from a real browsing session.
import { chromium } from "playwright";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const NB = "file://" + process.cwd() + "/lopebooks/notebooks/Feeling_of_Computing.html";
const HASH = "#view=S100(@tomlarkworthy/foc-chat)";
const KILL_AFTER_MS = 45_000;
const PROFILE = process.env.FOC_PROFILE || mkdtempSync(join(tmpdir(), "foc-crawl-"));
console.log("profile", PROFILE);

const open = async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, { args: ["--allow-file-access-from-files"] });
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(NB + HASH);
  return { ctx, page };
};

const state = (page) => page.evaluate(() => {
  const rt = window.__ojs_runtime;
  const marks = window.__focTiming || [];
  return { marks: marks.map((m) => ({ what: m.what, t: m.t, ...m })), polls: window.__focPolls || 0 };
});

const waitFor = async (page, what, timeout) => {
  const t0 = Date.now();
  for (;;) {
    const s = await state(page);
    const hit = s.marks.find((m) => m.what === what);
    if (hit) return hit;
    if (Date.now() - t0 > timeout) throw new Error(`timeout waiting for mark ${what}`);
    await page.waitForTimeout(500);
  }
};

const live = (page) => page.evaluate(() => window.__focProgress || null);

const archive = (page) => page.evaluate(async () => {
  const mods = [...window.__ojs_runtime._modules.values()];
  for (const m of mods) {
    const v = [...m._scope.values()].find((x) => x._name === "archive");
    if (v && v._value) {
      const a = await v._value;
      return { messages: a.messages.length, reactions: a.reactions.length, source: a.source, error: a.error, progress: a.progress };
    }
  }
  return null;
});

if (!process.env.FOC_RESUME && !process.env.FOC_FINISH && !process.env.FOC_WARM) {
  const t0 = Date.now();
  const { ctx, page } = await open();
  const start = await waitFor(page, "archive-start", 120_000);
  const idb = await waitFor(page, "idb-load", 120_000);
  console.log(`cold boot: archive-start at +${start.t - t0} ms, idb-load ${idb.ms} ms (${idb.messages} rows cached)`);
  await waitFor(page, "walk-tail", 180_000);
  for (let i = 0; i < KILL_AFTER_MS / 5000; i++) {
    await page.waitForTimeout(5000);
    const a = await archive(page);
    console.log(`  +${(i + 1) * 5}s  archive=${a && a.messages} src=${a && a.source}  walk=${JSON.stringify(await live(page))}`);
  }
  const mid = await archive(page);
  console.log("mid-walk:", JSON.stringify(mid));
  const cur = await page.evaluate(async () => {
    const db = await new Promise((r) => { const q = indexedDB.open("foc-viewer", 2); q.onsuccess = () => r(q.result); });
    return await new Promise((r) => { const q = db.transaction("meta").objectStore("meta").get("walk"); q.onsuccess = () => r(q.result); });
  });
  console.log("persisted watermark:", JSON.stringify(cur));
  await ctx.close();
  console.log("closed mid-walk; re-run with FOC_RESUME=1 FOC_PROFILE=" + PROFILE);
}

if (process.env.FOC_WARM) {
  // The returning-reader case: a complete local copy, so the head segment is the
  // only work. Counts listRecords requests off the wire rather than trusting the
  // page's own tally.
  const { ctx, page } = await open();
  let reqs = 0;
  page.on("request", (r) => { if (r.url().includes("com.atproto.repo.listRecords")) reqs++; });
  await page.reload();
  await page.waitForTimeout(30000);
  console.log("warm boot:", JSON.stringify(await live(page)));
  console.log("listRecords requests in 30 s:", reqs);
  console.log("archive:", JSON.stringify(await archive(page)));
  console.log("walk:", JSON.stringify(await page.evaluate(() => new Promise((r) => {
    const q = indexedDB.open("foc-viewer", 2);
    q.onsuccess = () => { const g = q.result.transaction("meta").objectStore("meta").get("walk"); g.onsuccess = () => r(g.result); };
  }))));
  await ctx.close();
}

if (process.env.FOC_FINISH) {
  // Run one profile all the way to `complete`, then check what search sees.
  const { ctx, page } = await open();
  const t0 = Date.now();
  for (;;) {
    await page.waitForTimeout(15000);
    const p = await live(page);
    console.log(`+${((Date.now() - t0) / 1000).toFixed(0)}s ${JSON.stringify(p)}`);
    if (p && p.complete) break;
    if (Date.now() - t0 > 1_800_000) { console.log("gave up"); break; }
  }
  const summary = await page.evaluate(async () => {
    const mods = [...window.__ojs_runtime._modules.values()];
    const get = async (name) => {
      for (const m of mods) {
        const v = [...m._scope.values()].find((x) => x._name === name);
        if (v && v._value !== undefined) return await v._value;
      }
      return null;
    };
    const a = await get("archive");
    const search = await get("search");
    const si = await get("searchIndex");
    const t1 = performance.now();
    const hits = search("end user programming");
    const qms = Math.round(performance.now() - t1);
    const walk = await new Promise((r) => {
      const q = indexedDB.open("foc-viewer", 2);
      q.onsuccess = () => { const g = q.result.transaction("meta").objectStore("meta").get("walk"); g.onsuccess = () => r(g.result); };
    });
    return { messages: a.messages.length, reactions: a.reactions.length, searchRows: si.rows.length, hits: hits.length, queryMs: qms, walk };
  });
  console.log(JSON.stringify(summary, null, 1));
  await ctx.close();
}

if (process.env.FOC_RESUME) {
  const { ctx, page } = await open();
  const idb = await waitFor(page, "idb-load", 120_000);
  console.log(`warm boot: idb-load ${idb.ms} ms, ${idb.messages} messages + ${idb.reactions} reactions already local`);
  const tail = await waitFor(page, "walk-tail", 60_000);
  console.log("resumed walk cursor:", tail.cursor);
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(5000);
    console.log(`  +${(i + 1) * 5}s`, JSON.stringify(await archive(page)));
  }
  const s = await state(page);
  console.log("marks:", s.marks.map((m) => m.what).join(" "));
  await ctx.close();
}
