// End to end for @tomlarkworthy/foc-annotations, signed out: annotations are injected through the
// outbox the composer itself uses, so nothing is posted to atproto.
import { chromium } from "playwright";
const [url, shotDir = "tools/scratch"] = process.argv.slice(2);
const VIEW = "S100(@tomlarkworthy/foc-chat,@tomlarkworthy/foc-wiki,@tomlarkworthy/foc-demos,@tomlarkworthy/foc-projects,@tomlarkworthy/foc-people)";
const out = {};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
const val = (page, name) => page.evaluate((n) => {
  for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return true;
  return false;
}, name);
const waitVar = (page, name, t = 120000) => page.waitForFunction((n) => {
  if (!window.__ojs_runtime) return false;
  for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return true;
  return false;
}, name, { timeout: t, polling: 300 });
const step = async (name, fn) => {
  try { out[name] = await fn(); } catch (e) { out[name] = { error: String(e).slice(0, 300) }; }
  console.log(name, JSON.stringify(out[name]));
};

await p.goto(url + "#view=" + VIEW + "&open=@tomlarkworthy/foc-projects", { waitUntil: "load" });
await step("boot", async () => {
  await waitVar(p, "focAnnLayer");
  await p.waitForFunction(() => document.querySelectorAll('.lp2-pane[data-module="@tomlarkworthy/foc-projects"] .foc-card p').length > 0, null, { timeout: 120000 });
  return p.evaluate(() => {
    const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
    return {
      layer: get("focAnnLayer").status,
      feed: get("focAnnFeed"),
      a2Chip: !!document.querySelector("[data-a2-chip]"),
      a2Layer: get("a2Layer") !== undefined,
      a2Menu: get("a2MenuItem") !== undefined,
      highlightApi: !!(window.CSS && CSS.highlights)
    };
  });
});

const APP = await p.evaluate(() => {
  const el = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/foc-projects"] .foc-card p');
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let n; while ((n = w.nextNode()) && n.nodeValue.trim().length < 25);
  return n ? n.nodeValue.slice(4, 24) : null;
});
await step("appSelect", async () => {
  await p.evaluate((exact) => {
    const el = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/foc-projects"] .foc-card p');
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode()) && n.nodeValue.indexOf(exact) < 0);
    const i = n.nodeValue.indexOf(exact);
    const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + exact.length);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }, APP);
  await p.waitForTimeout(500);
  return p.evaluate(() => {
    const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
    const chip = document.querySelector(".foc-ann-chip");
    const d = get("focAnnLayer").describe();
    return { chip: chip && chip.style.display, anchor: d && d.anchor };
  });
});
await step("appPopover", async () => {
  const box = await p.locator(".foc-ann-chip").boundingBox();
  await p.mouse.move(box.x + 5, box.y + 5);
  await p.mouse.down(); await p.mouse.up();
  await p.waitForTimeout(400);
  await p.screenshot({ path: shotDir + "/foc-ann-popover.png" });
  return p.evaluate(() => {
    const pop = document.querySelector(".foc-ann-pop");
    return pop ? { label: pop.querySelector(".foc-ann-label").textContent, link: pop.querySelector(".foc-ann-label").title.slice(0, 160), sub: pop.querySelector(".foc-ann-sub").textContent, composer: (pop.querySelector(".fc-composer") || {}).textContent } : null;
  });
});
await p.keyboard.press("Escape");

// Inject an app-anchored root through the outbox.
const inject = (page, rkey, d, note) => page.evaluate(({ rkey, d, note }) => {
  const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
  const C = get("focAnnCodec"), ch = get("focAnnChannel");
  const lead = C.lead(d.anchor, d.ctx);
  const rec = { rkey, cid: "bafyprobe" + rkey, did: "did:plc:probeprobeprobeprobe", value: {
    $type: "social.colibri.message", text: lead.text + "\n" + note, facets: lead.facets,
    channel: ch.rkey, createdAt: new Date().toISOString() } };
  (window.__focOutbox = window.__focOutbox || []).push(rec);
  window.__focWake();
  return { text: rec.value.text, decoded: JSON.stringify(C.decode(rec)) === JSON.stringify(d.anchor), linkLen: lead.facets[0].features[0].uri.length };
}, { rkey, d, note });
await step("appInject", async () => {
  const d = out.appSelect.anchor;
  const r = await inject(p, "3zzzzzzprobe1", { anchor: d, ctx: {} }, "probe note on a project card");
  await p.evaluate(() => getSelection().removeAllRanges());
  await p.waitForFunction(() => {
    for (const v of window.__ojs_runtime._variables) if (v._name === "focAnnLayer" && v._value) return v._value.marks().some((m) => m.rkeys.includes("3zzzzzzprobe1"));
    return false;
  }, null, { timeout: 30000, polling: 300 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: shotDir + "/foc-ann-app-mark.png" });
  return { ...r, marks: await p.evaluate(() => { for (const v of window.__ojs_runtime._variables) if (v._name === "focAnnLayer" && v._value) return v._value.marks(); }), highlights: await p.evaluate(() => CSS.highlights.get("foc-ann") ? CSS.highlights.get("foc-ann").size : 0) };
});
await step("badgeToThread", async () => {
  await p.locator(".foc-ann-badge").first().click();
  await p.waitForTimeout(1500);
  await p.waitForFunction(() => !!document.querySelector('.foc-chat .fc-msg[data-rkey="3zzzzzzprobe1"] .fc-text a.foc-link'), null, { timeout: 30000 });
  await p.screenshot({ path: shotDir + "/foc-ann-thread.png" });
  return p.evaluate(() => ({ hash: decodeURIComponent(location.hash).replace(/view=[^&]*&?/, ""), link: document.querySelector('.foc-chat .fc-msg[data-rkey="3zzzzzzprobe1"] .fc-text').textContent.slice(0, 120) }));
});
await step("linkBackToTarget", async () => {
  await p.locator('.foc-chat .fc-msg[data-rkey="3zzzzzzprobe1"] .fc-text a.foc-link').first().click();
  const flashed = await p.waitForFunction(() => CSS.highlights.has("foc-ann-flash"), null, { timeout: 15000 }).then(() => true, () => false);
  return p.evaluate((flashed) => ({ flashed, hash: decodeURIComponent(location.hash).replace(/view=[^&]*&?/, ""), pages: 1 }), flashed);
});

// A span inside a chat message. Targets are injected through the outbox so the test does not wait
// on the crawl: a native post with a multi-byte prefix, a facet and a line break before the span,
// and a bridged post whose "@Name: " byline is stripped from the display.
const hiRanges = (page) => page.evaluate(() => {
  const h = CSS.highlights.get("foc-ann");
  return h ? [...h].map((r) => ({ text: r.toString(), before: (r.startContainer.nodeValue || "").slice(Math.max(0, r.startOffset - 8), r.startOffset) })) : [];
});
await step("msgSelect", async () => {
  const targets = await p.evaluate(() => {
    const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
    const ch = get("focAnnChannel");
    const enc = new TextEncoder();
    const t1 = "Ünïcödé 🚀 first line\nsecond line: the phrase told apart appears twice, told apart here";
    const at = t1.indexOf("first line");
    const recs = [
      { rkey: "3zzzzzztarget1", cid: "bafytarget1", did: "did:plc:probeprobeprobeprobe", value: { $type: "social.colibri.message", text: t1, channel: ch.rkey, createdAt: new Date().toISOString(),
        facets: [{ index: { byteStart: enc.encode(t1.slice(0, at)).length, byteEnd: enc.encode(t1.slice(0, at + 10)).length }, features: [{ $type: "social.colibri.richtext.facet#italic" }] }] } },
      { rkey: "3zzzzzztarget2", cid: "bafytarget2", value: { $type: "social.colibri.message", text: "@Jason Morris: 🚀 bridged text with a quotable phrase in it", channel: ch.rkey, createdAt: new Date().toISOString() } }
    ];
    (window.__focOutbox = window.__focOutbox || []).push(...recs);
    window.__focWake();
    get("focWriteHash")({ open: "@tomlarkworthy/foc-chat", foc: ch.rkey, msg: null });
    return recs.map((r) => r.rkey);
  });
  await p.waitForFunction(() => document.querySelectorAll('.foc-chat .fc-main .fc-msg[data-rkey^="3zzzzzztarget"] .fc-text').length >= 2, null, { timeout: 60000, polling: 300 });
  await p.waitForTimeout(500);
  const pick = async (rkey, exact, nth) => {
    await p.evaluate(({ rkey, exact, nth }) => {
      const el = document.querySelector('.foc-chat .fc-main .fc-msg[data-rkey="' + rkey + '"] .fc-text');
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let n, seen = 0, hit = null;
      while (!hit && (n = w.nextNode())) {
        let i = -1;
        while ((i = n.nodeValue.indexOf(exact, i + 1)) >= 0) { if (seen++ === nth) { hit = [n, i]; break; } }
      }
      const r = document.createRange(); r.setStart(hit[0], hit[1]); r.setEnd(hit[0], hit[1] + exact.length);
      const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }, { rkey, exact, nth });
    await p.waitForTimeout(400);
    return p.evaluate((rkey) => {
      const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
      const d = get("focAnnLayer").describe();
      const rec = get("byRkey").get(rkey);
      const enc = new TextEncoder(), dec = new TextDecoder();
      const spanText = d && d.anchor.span ? dec.decode(enc.encode(rec.value.text).slice(d.anchor.span.byteStart, d.anchor.span.byteEnd)) : null;
      return { chip: document.querySelector(".foc-ann-chip").style.display, d, spanText, spanMatchesExact: !!d && spanText === d.anchor.quote.exact };
    }, rkey);
  };
  const native = await pick("3zzzzzztarget1", "told apart", 1);
  const bridged = await pick("3zzzzzztarget2", "quotable phrase", 0);
  return { targets, native, bridged, d: native.d };
});
await step("msgInject", async () => {
  const d = out.msgSelect.d;
  const r = await inject(p, "3zzzzzzprobe2", d, "probe note on a message span");
  await p.evaluate(() => getSelection().removeAllRanges());
  await p.waitForFunction(() => {
    for (const v of window.__ojs_runtime._variables) if (v._name === "focAnnLayer" && v._value) return v._value.marks().some((m) => m.rkeys.includes("3zzzzzzprobe2") && m.range);
    return false;
  }, null, { timeout: 30000, polling: 300 });
  await p.waitForTimeout(400);
  await p.screenshot({ path: shotDir + "/foc-ann-msg-mark.png" });
  return { ...r, ranges: await hiRanges(p) };
});
await step("msgEdited", async () => {
  // Same rkey, new cid, text shifted: the byte span is stale and the quote has to find it.
  await p.evaluate(() => {
    const get = (n) => { for (const v of window.__ojs_runtime._variables) if (v._name === n && v._value !== undefined) return v._value; };
    const old = get("byRkey").get("3zzzzzztarget1");
    const rec = { ...old, cid: "bafytarget1edited", value: { ...old.value, text: "EDITED: " + old.value.text, facets: [], edited: true } };
    window.__focOutbox.push(rec);
    window.__focWake();
  });
  await p.waitForFunction(() => {
    const t = document.querySelector('.foc-chat .fc-main .fc-msg[data-rkey="3zzzzzztarget1"] .fc-text');
    return t && t.textContent.startsWith("EDITED");
  }, null, { timeout: 30000, polling: 300 });
  await p.waitForTimeout(800);
  return { ranges: await hiRanges(p) };
});
await step("freshTabLink", async () => {
  const href = await p.evaluate((d) => { for (const v of window.__ojs_runtime._variables) if (v._name === "focAnnCodec" && v._value) return v._value.link(d.anchor, d.ctx); }, { anchor: out.appSelect.anchor, ctx: {} });
  const q = await ctx.newPage();
  q.on("pageerror", (e) => errs.push("tab2: " + String(e).slice(0, 200)));
  // Timeline from the first script: when anchor= leaves the hash, when the flash registers,
  // and whether the projects pane is on screen at that moment.
  await q.addInitScript(() => {
    const t0 = Date.now();
    const trace = (window.__annTrace = []);
    let lastHash = null, lastFlash = false, lastPane = false;
    setInterval(() => {
      const h = location.hash.indexOf("anchor=") >= 0;
      const f = !!(window.CSS && CSS.highlights && CSS.highlights.has("foc-ann-flash"));
      const pane = document.querySelector('.lp2-pane[data-module="@tomlarkworthy/foc-projects"]');
      const pr = pane ? pane.getBoundingClientRect() : null;
      const ps = !!(pr && pr.width > 0 && pr.height > 0 && pane.querySelector(".foc-card"));
      if (h !== lastHash || f !== lastFlash || ps !== lastPane) {
        trace.push({ ms: Date.now() - t0, anchorInHash: h, flash: f, projectsShown: ps, layer: !!(window.__ojs_runtime && [...window.__ojs_runtime._variables].some((v) => v._name === "focAnnLayer" && v._value)) });
        lastHash = h; lastFlash = f; lastPane = ps;
      }
    }, 25);
  });
  await q.goto(url + "#" + href.split("#")[1], { waitUntil: "load" });
  await waitVar(q, "focAnnLayer");
  const flashed = await q.waitForFunction(() => CSS.highlights.has("foc-ann-flash"), null, { timeout: 60000, polling: 200 }).then(() => true, () => false);
  const res = await q.evaluate((flashed) => ({ flashed, hashHasAnchor: location.hash.indexOf("anchor=") >= 0, open: new URLSearchParams(location.hash.slice(1)).get("open"), trace: window.__annTrace }), flashed);
  await q.close();
  return res;
});
out.errCells = await p.evaluate(() => [...document.querySelectorAll(".observablehq--error")].map((e) => e.textContent.slice(0, 160)));
out.pageErrors = errs;
console.log("errCells", JSON.stringify(out.errCells));
console.log("pageErrors", JSON.stringify(errs));
await b.close();
