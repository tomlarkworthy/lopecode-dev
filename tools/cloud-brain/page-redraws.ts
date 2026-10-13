#!/usr/bin/env bun
// page-redraws.ts [--base NAME|URL] [--owner] [--seconds N] [--entries N] [--shell FILE] [--view LAYOUT] [--at table|end]
//
// Counts what the Brain's page computes and draws again while nothing is changed. It opens the Brain's own
// address in a local headless Chrome, waits for the page's module to join, and from then reads once a second:
// the version of every cell of @tomlarkworthy/cloud-brain (the runtime's count of its computes) and the number
// of times the Services table was put in place again. It reads only. Record: records/page-services-refreshes-in-a-loop.md.
//
//   bun tools/cloud-brain/page-redraws.ts --owner --seconds 120
//   bun tools/cloud-brain/page-redraws.ts --owner --entries 6
//
// --base     cb4 (the default, or BRAIN_BASE), or a whole address.
// --owner    the page is answered as the owner's would be, by this tool and not by the Brain: /auth/session says
//            the owner is signed in, infra.getState is made from the public service.list, inbox.poll holds the
//            lease with no entry, metric.query answers three methods a minute, and every other POST is answered 401 here. No session is held and no call of
//            the owner reaches the Brain. Without it the page is a visitor's.
// --seconds  how long it counts after the page is at rest, 60 by default.
// --entries  with --owner: that many entries of the deployer are handed to the page in one inbox.poll once it is
//            at rest, as a deploy of that many Workers by another session would.
// --view     the layout the page opens with, as the address has it after #view= ; with none, the shell's own.
// --shell    the document is answered from FILE; every other request goes to the Brain. A file that holds the
//            page's module (a whole build, .emitted/cloud-brain.html) is served with its boot list cut to brain-shell
//            and that module, in a layout of the two, and the page's requests for getSource are aborted (`refused`),
//            so the file's module is what runs: `module` is then "document", and "brain" for what the Brain serves.
// --at       table (the default): the table is put in the middle of its pane before the count. end: the pane is
//            scrolled to its end.
//
// stdout: one line of JSON. `settledMs` is when the cells' versions last moved before the count began;
// `computed` is each cell whose version moved during the count with how many times; `draws` is how many times
// the table's node was replaced in that time and `tables` how many times the whole control was made again.
// `moves` is the frames in which the table was at another height on the screen than in the frame before, `far`
// the most pixels of one such move, and `heights` the frames in which the pane's scroll height was another.
// `calls` is what the page sent during the count, by method.
// Exit 0: `failed` is empty (judge, below): with no entry nothing computed and nothing drew during the count; with
// entries no cell was computed again and the table was put in place 6 times at most (3 for one entry).
// Exit 1: `failed` says what did. Exit 64: the arguments. Exit 70: the tool could not run.
import { readFileSync } from "node:fs";
import { chromeFor } from "../lib/playwright-chrome.js";
import { routes, shellDocument, SHELL } from "./verify-run.ts";

export const PAGE = "@tomlarkworthy/cloud-brain";
export const usage = "page-redraws.ts [--base NAME|URL] [--owner] [--seconds N] [--entries N] [--shell FILE] [--view LAYOUT] [--at table|end]";

export function parseArgs(argv: string[], env: Record<string, string | undefined> = {}) {
  const out = { base: env.BRAIN_BASE || "cb4", owner: false, seconds: 60, entries: 0, shell: null as string | null, view: null as string | null, at: "table" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--owner") out.owner = true;
    else if (a === "--base" || a === "--shell" || a === "--view" || a === "--at" || a === "--seconds" || a === "--entries") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} takes a value`);
      if (a === "--seconds" || a === "--entries") {
        if (!/^\d+$/.test(v)) throw new Error(`${a} takes a whole number`);
        (out as any)[a.slice(2)] = Number(v);
      } else (out as any)[a.slice(2)] = v;
    } else throw new Error(`unknown argument ${a}`);
  }
  if (out.at !== "table" && out.at !== "end") throw new Error("--at takes table or end");
  if (out.entries && !out.owner) throw new Error("--entries goes with --owner");
  return { ...out, base: /^https?:\/\//.test(out.base) ? out.base.replace(/\/+$/, "") : `https://${out.base}.endpointservices.workers.dev` };
}

// The cells whose version moved between two reads, with by how much. A cell that is new counts from 0.
export function moved(before: Record<string, number>, after: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, v] of Object.entries(after)) if (v !== (before[name] ?? 0)) out[name] = v - (before[name] ?? 0);
  return out;
}

// What a count says. []: the page did what is asked of it. With no entry nothing is computed and nothing drawn. With
// entries no cell is computed again, and the table is put in place for two reads of what runs at most, however many
// the entries were: 3 times a read (serviceList of cloudflare-iac draws what the tab holds, "reading…" and the answer).
export const DRAWS_A_READ = 3;
export function judge(r: { settledMs: number | null; entries: number; computed: Record<string, number>; draws: number; tables: number }): string[] {
  const bad: string[] = [], names = Object.keys(r.computed);
  if (r.settledMs == null) return ["the page did not come to rest"];
  if (names.length) bad.push(`${names.length} cell${names.length === 1 ? " was" : "s were"} computed again: ${names.map((n) => `${n} ${r.computed[n]}`).join(", ")}`);
  if (r.tables) bad.push(`the control of Services was made again ${r.tables} time${r.tables === 1 ? "" : "s"}`);
  const most = DRAWS_A_READ * Math.min(r.entries, 2);
  if (r.draws > most) bad.push(`the table was put in place ${r.draws} times, and ${most} at most ${r.entries ? `for ${r.entries} entr${r.entries === 1 ? "y" : "ies"}` : "with nothing changed"}`);
  return bad;
}

// In the page: the versions of the page module's cells, and the count the observer below keeps.
const read = (PAGE: string) => {
  const rt = (window as any).__ojs_runtime, mod = rt && rt.mains && rt.mains.get(PAGE);
  if (!mod) return null;
  const w = window as any, versions: Record<string, number> = {};
  let n = 0;
  for (const v of rt._variables) if (v._module === mod) versions[v._name || "anonymous " + n++] = (versions[v._name] || 0) + v._version;
  const view = [...rt._variables].find((v: any) => v._module === mod && v._name === "viewof services");
  const root = view && view._value && view._value.nodeType === 1 ? view._value : null;
  const seen = (w.__redraws = w.__redraws || { draws: 0, tables: 0, root: null });
  if (root && seen.root !== root) {
    seen.root = root;
    seen.tables++;
    new MutationObserver((list) => (seen.draws += list.filter((m) => m.addedNodes.length).length)).observe(root.firstElementChild, { childList: true });
  }
  // Where the table is on the screen, read at every frame from the first read that finds it in view.
  if (root && w.__redrawsWatch && !seen.watching) {
    seen.watching = true;
    seen.moves = 0;
    seen.far = 0;
    // The pane is the scroll container (knowledge/scrolling-a-lopepage-notebook.md). where: "table" puts the table in
    // the middle of it, "end" scrolls it to its end, where a pane that is shorter for a frame is scrolled back.
    const pane = root.closest(".lp2-pane") || document.scrollingElement;
    if (w.__redrawsWatch === "end") pane.scrollTop = pane.scrollHeight;
    else root.scrollIntoView({ block: "center" });
    let top: number | null = null, high: number | null = null;
    const frame = () => {
      const at = seen.root.isConnected ? Math.round(seen.root.getBoundingClientRect().top) : null;
      if (top != null && at != null && at !== top) (seen.moves++, (seen.far = Math.max(seen.far, Math.abs(at - top))));
      if (at != null) top = at;
      if (high != null && pane.scrollHeight !== high) seen.heights++;
      high = pane.scrollHeight;
      requestAnimationFrame(frame);
    };
    seen.heights = 0;
    requestAnimationFrame(frame);
  }
  return { versions, draws: seen.draws, tables: seen.tables, moves: seen.moves || 0, far: seen.far || 0, heights: seen.heights || 0, rows: root ? root.querySelectorAll("tbody tr").length : 0, mains: rt.mains.size };
};

// An answer of metric.query for core.calls that the panels of Health can draw: a call a minute of three methods.
export function callsAnswer(since: number, until: number) {
  const series = [];
  for (let t = Math.ceil(since / 60000) * 60000; t < until; t += 60000)
    for (const [worker, method, status] of [["brain-x-issues", "issue.list", 200], ["brain-x-inbox", "inbox.poll", 200], ["brain-core", "getInfo", 404]] as const) series.push({ t, worker, method, status, n: 3, sum: 120, max: 60 });
  return { since, until, step: 60000, groups: 3, sampled: 1, series };
}

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2), process.env); } catch (e: any) { console.error(`${e.message}\n${usage}`); process.exit(64); }
  const { base, owner, seconds, entries, shell, view, at } = args;
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env, { headless: true }) });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
    const errors: string[] = [], sent: Record<string, number> = {};
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    // A file that holds the page's module is served as verify-run.ts serves one: its boot list cut to brain-shell and
    // that module, and no answer to getSource, so the file's module is what runs and is not written over.
    const doc = shell ? shellDocument(readFileSync(shell, "utf8"), PAGE) : null;
    const refusals = await routes(page, base, doc && doc.body, !!(doc && doc.mains));
    const layout = view || (doc && doc.mains ? `C100(S100(${PAGE},${SHELL}))` : null);
    let hand = 0, handed = 0;
    const json = (route: any, body: unknown, status = 200) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
    await page.route((url: URL) => url.origin === base && (url.pathname === "/auth/session" || url.pathname.startsWith("/xrpc/")), async (route: any) => {
      const request = route.request(), url = new URL(request.url()), method = url.pathname.replace("/xrpc/com.lopecode.brain.", "");
      sent[method] = (sent[method] || 0) + 1;
      if (!owner) return route.fallback();
      if (url.pathname === "/auth/session") return json(route, { signedIn: true, owner: true, did: "did:plc:page-redraws", handle: "page-redraws.test", ownerSet: true });
      if (method === "infra.getState") {
        const list = await fetch(base + "/xrpc/com.lopecode.brain.service.list").then((r) => r.json());
        return json(route, { workers: list.services.map((s: any) => ({ worker: s.worker, hash: s.hash, fails: 0 })), kernel: {}, pending: [], approved: [] });
      }
      if (method === "inbox.poll") {
        const now = hand;
        hand = 0;
        handed += now;
        return json(route, { held: true, waiting: now, wait: 30000, entries: Array.from({ length: now }, (_, i) => ({ id: `page-redraws-${handed - now + i}`, source: "deployer", from: "worker:brain-deployer", body: { text: "deployed" } })) });
      }
      if (method === "inbox.done" || method === "lease.take") return json(route, { ok: true });
      if (method === "metric.query") return json(route, callsAnswer(Number(url.searchParams.get("since")), Number(url.searchParams.get("until"))));
      if (request.method() !== "GET") return json(route, { error: "AuthRequired", message: "page-redraws.ts answers no procedure" }, 401);
      return route.fallback();
    });
    const t0 = Date.now();
    await page.goto(base + "/" + (layout ? "#view=" + layout : ""), { waitUntil: "load" });
    await page.waitForFunction((m) => (window as any).__ojs_runtime?.mains?.get(m), PAGE, { timeout: 120000 });
    // At rest: no cell of the module computed for 20 s. The owner's page runs every joined module's tests first.
    let last = (await page.evaluate(read, PAGE))!, still = Date.now(), settledMs: number | null = null;
    while (Date.now() - t0 < 600000) {
      await page.waitForTimeout(1000);
      const now = (await page.evaluate(read, PAGE))!;
      if (Object.keys(moved(last.versions, now.versions)).length || now.draws !== last.draws) still = Date.now();
      last = now;
      if (Date.now() - still >= 20000) { settledMs = still - t0; break; }
    }
    await page.evaluate((where) => void ((window as any).__redrawsWatch = where), at);
    await page.evaluate(read, PAGE);
    await page.waitForTimeout(2000);
    const start = (await page.evaluate(read, PAGE))!, sentAtRest = { ...sent };
    hand = entries;
    await page.waitForTimeout(seconds * 1000);
    const end = (await page.evaluate(read, PAGE))!;
    const computed = moved(start.versions, end.versions), calls = moved(sentAtRest, sent);
    const counted = { settledMs, entries, computed, draws: end.draws - start.draws, tables: end.tables - start.tables };
    const failed = judge(counted);
    console.log(JSON.stringify({ base, owner, shell, module: doc && doc.mains ? "document" : "brain", refused: refusals.refused, view: layout, seconds, handed, ok: !failed.length, failed, ...counted, atRest: { tables: start.tables, rows: start.rows, mains: start.mains }, where: at, moves: end.moves - start.moves, far: end.far, heights: end.heights - start.heights, calls, ...(errors.length ? { errors: errors.slice(0, 5) } : {}), browser: browser.version(), at: new Date().toISOString() }));
    process.exit(failed.length ? 1 : 0);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) await main().catch((e) => { console.error("page-redraws: " + String((e && e.message) || e).split("\n")[0]); process.exit(70); });
