#!/usr/bin/env bun
// operator-tab-check.ts FILE [--proof]
// operator-tab-check.ts --base NAME|URL [--shell FILE] [--expect old-shell]
//
// Where the Operator's chat is on a Cloud Brain page, read in a local headless Chrome at 1400 x 900 with no
// session. One line of JSON on stdout. Spec: plan/cloud-brain-i1842.md. Record: records/operator-tab-module.md.
//
// FILE              opens a whole build from disk (.emitted/cloud-brain.html) with the layout its bootconf holds.
//                   Exit 0 when every check of `judgeFile` holds; `failed` names the ones that do not.
// FILE --proof      in the page of FILE: a chat made by a function that is a cell of one module, drawn by a cell
//                   of another, with a fake agent in the model's place. Exit 0 when the fake's reply is in the
//                   node the second module's cell holds.
// --base            opens the Brain's own address (cb4, or a whole address), reads once a second for 45 s at most.
//                   Exit 0 when cloud-brain joined, the pane of brain-operator holds the chat with the page's one
//                   message field, and the section "Operator" of cloud-brain is a link.
// --shell FILE      with --base: the document is answered from FILE (.emitted/shell.html), every other request
//                   goes to the Brain. A FILE that holds cloud-brain is exit 64: the page would write the Worker's
//                   copy over the file's (verify-run.ts, header).
// --expect old-shell  with --base: exit 0 on the other pair, no pane of brain-operator and the chat in the section
//                   "Operator" of cloud-brain: the page module in a shell that has no brain-operator.
// Not a mode: a file without cloud-brain opened from disk. It has no Brain to join the module from.
// Exit 1: a check failed. Exit 64: the arguments. Exit 70: the tool could not run.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromeFor } from "../lib/playwright-chrome.js";
import { findSpan } from "../lib/notebook-blocks.ts";
import { routes } from "./verify-run.ts";

export const VIEW = { width: 1400, height: 900 };
export const PAGE = "@tomlarkworthy/cloud-brain", TAB = "@tomlarkworthy/brain-operator", PAIRING = "@tomlarkworthy/claude-code-pairing";
export const usage = "operator-tab-check.ts FILE [--proof] | --base NAME|URL [--shell FILE] [--expect old-shell]";

export type Read = {
  mains: string[]; hash: string;
  operatorPane: "chat" | "no part" | null; // what the pane of brain-operator holds; null: no such pane
  pageSection: "chat" | "link" | null; // what is under "## Operator" of cloud-brain; null: no such section
  fields: number; fieldsInPane: number; folds: number; // message fields on the page, in the pane; settings folds
  fieldBottom: number | null; paneScroll: number | null; paneHeadings: string[]; sectionFields: number;
  ccWs: number | null; inboxPump: number | null;
};

export function parseArgs(argv: string[]) {
  const out = { file: null as string | null, proof: false, base: null as string | null, shell: null as string | null, expect: null as string | null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--proof") out.proof = true;
    else if (a === "--base" || a === "--shell" || a === "--expect") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} takes a value`);
      (out as any)[a.slice(2)] = v;
    } else if (a.startsWith("--")) throw new Error(`unknown option ${a}`);
    else if (out.file) throw new Error(`one file a call: ${out.file}, then ${a}`);
    else out.file = a;
  }
  if (out.base && out.file) throw new Error("FILE or --base, not both; with --base a file is --shell FILE");
  if (!out.base && !out.file) throw new Error("no FILE and no --base");
  if (!out.base && (out.shell || out.expect)) throw new Error("--shell and --expect go with --base");
  if (out.base && out.proof) throw new Error("--proof goes with FILE");
  if (out.expect && out.expect !== "old-shell") throw new Error("--expect takes old-shell");
  return { ...out, base: out.base && (/^https?:\/\//.test(out.base) ? out.base.replace(/\/+$/, "") : `https://${out.base}.endpointservices.workers.dev`) };
}

// The checks of a whole build opened from disk, by the requirement of the spec each is for. [] is a pass.
export function judgeFile(r: Read, view = VIEW): string[] {
  const bad: string[] = [];
  const check = (ok: boolean, what: string) => { if (!ok) bad.push(what); };
  check(r.operatorPane === "chat" && r.fieldsInPane === 1, "R1: the pane of brain-operator holds one message field");
  check(!r.paneHeadings.some((h) => /^(Cloud Brain|Health|Services|Library|Access|People|Clone)$/.test(h)), "R1: no heading of cloud-brain is in the pane");
  check(r.fieldBottom != null && r.fieldBottom <= view.height && r.paneScroll === 0, `R2: the message field's bottom edge is at most ${view.height} and the pane is not scrolled`);
  check(r.hash.includes(`S50(${TAB})`) && !r.hash.includes(PAIRING) && r.mains.includes(PAIRING), "R3: the layout names brain-operator and not claude-code-pairing, which is a main");
  check((r.ccWs ?? 0) > 0, "R3: cc_ws of claude-code-pairing ran");
  check(r.fields === 1 && r.folds === 1 && r.pageSection === "link" && r.sectionFields === 0, "R4: one message field and one settings fold on the page, a link and no field under Operator of cloud-brain");
  check((r.inboxPump ?? 0) > 0, "R6: inboxPump of cloud-brain ran");
  return bad;
}

// The checks at the Brain's address. joinedMs: when cloud-brain was first in mains, null when never.
export function judgeBase(r: Read, joinedMs: number | null, expect: string | null): string[] {
  const bad: string[] = [];
  if (typeof joinedMs !== "number") bad.push("cloud-brain did not join the page");
  if (expect === "old-shell") {
    if (r.operatorPane !== null) bad.push("old shell: there is a pane of brain-operator");
    if (r.pageSection !== "chat" || r.fields !== 1) bad.push("old shell: the section Operator of cloud-brain holds the chat with one message field");
  } else {
    if (r.operatorPane !== "chat" || r.fields !== 1 || r.fieldsInPane !== 1) bad.push("the pane of brain-operator holds the chat with the page's one message field");
    if (r.pageSection !== "link") bad.push("the section Operator of cloud-brain is a link");
  }
  return bad;
}

// In the page. Every node is looked for through shadow roots as well.
const read = ({ PAGE, TAB, PAIRING }: { PAGE: string; TAB: string; PAIRING: string }) => {
  const rt = (window as any).__ojs_runtime;
  if (!rt || !rt.mains) return null;
  const all = (root: any, sel: string): any[] => [...root.querySelectorAll(sel), ...[...root.querySelectorAll("*")].filter((e: any) => e.shadowRoot).flatMap((e: any) => all(e.shadowRoot, sel))];
  const up = (n: any) => n.parentNode || n.host || null;
  const within = (n: any, test: (e: any) => boolean) => { for (let e = n; e; e = up(e)) if (e.nodeType === 1 && test(e)) return e; return null; };
  const paneOf = (n: any) => within(n, (e) => e.classList.contains("lp2-pane"));
  const version = (module: string, name: string) => {
    const m = rt.mains.get(module);
    const v = m && [...rt._variables].find((x: any) => x._module === m && x._name === name);
    return v ? v._version : null;
  };
  const view = all(document, "[data-operator]").find((e: any) => e.isConnected && paneOf(e)) || null;
  const pane = view && paneOf(view);
  const section = all(document, "[data-operator-section]").find((e: any) => e.isConnected && paneOf(e)) || null;
  const isField = (t: any) => /^Message robocoop-5/.test(t.placeholder || "");
  const fields = all(document, "textarea").filter((t: any) => isField(t) && paneOf(t));
  const inPane = fields.filter((t: any) => paneOf(t) === pane);
  let paneScroll = null as number | null;
  if (inPane[0]) { paneScroll = 0; for (let e = up(inPane[0]); e; e = up(e)) if (e.nodeType === 1) paneScroll = Math.max(paneScroll, e.scrollTop || 0); }
  return {
    mains: [...rt.mains.keys()], hash: location.hash,
    operatorPane: view ? view.dataset.operator : null,
    pageSection: section ? section.dataset.operatorSection : null,
    fields: fields.length, fieldsInPane: inPane.length,
    folds: all(document, "summary").filter((s: any) => /settings/.test(s.textContent) && /endpoint/.test(s.textContent) && paneOf(s)).length,
    fieldBottom: inPane[0] ? Math.round(inPane[0].getBoundingClientRect().bottom) : null, paneScroll,
    paneHeadings: pane ? all(pane, "h1,h2,h3").filter((h: any) => h.getBoundingClientRect().height > 0).map((h: any) => h.textContent.trim()) : [],
    sectionFields: section ? all(section, "textarea").filter(isField).length : 0,
    ccWs: version(PAIRING, "cc_ws"), inboxPump: version(PAGE, "inboxPump"),
  };
};

// In the page. Module A holds the function, module B the cell that calls it. No model is called.
const proof = async () => {
  const rt = (window as any).__ojs_runtime;
  const rc5 = rt.mains.get("@tomlarkworthy/robocoop-5");
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const A = rt.module(), B = rt.module(), sent: string[] = [];
  const agent = () => {
    const messages: any[] = [];
    return { messages, async send(input: string) { sent.push(input); messages.push({ role: "user", content: input }, { role: "assistant", content: "re: " + input }); } };
  };
  A.variable().import("robocoop5", rc5);
  A.variable().import("createSessionController", rc5);
  A.variable().define("part", ["robocoop5", "createSessionController"], (robocoop5: any, createSessionController: any) => ({
    chat: ({ invalidation }: any) => robocoop5({ group: "operator-proof", height: 300, controller: createSessionController({ runtime: rt }), agent, invalidation }),
  }));
  B.variable().import("part", A);
  const node: any = await new Promise((res, rej) =>
    B.variable({ fulfilled: res, rejected: rej }).define("view", ["part", "invalidation"], (part: any, invalidation: any) => part.chat({ invalidation })));
  const box = document.createElement("div");
  box.style.cssText = "position:fixed;left:0;top:0;width:500px;z-index:99999";
  box.append(node);
  document.body.append(box);
  const field = node.querySelector("textarea"), button = [...node.querySelectorAll("button")].find((b: any) => b.textContent === "Send") as any;
  if (!field || !button) return { ok: false, why: "no message field or no Send button", field: !!field, button: !!button };
  field.value = "hello from module B";
  field.dispatchEvent(new Event("input", { bubbles: true }));
  button.click();
  // The transcript is in a shadow root (rc5_unsnapshotted), which textContent does not read.
  const deep = (n: any): string => (n.shadowRoot ? deep(n.shadowRoot) : "") + [...n.childNodes].map((c: any) => (c.nodeType === 3 ? c.data : c.nodeType === 1 ? deep(c) : "")).join("");
  const shown = () => /re: hello from module B/.test(deep(node));
  for (let i = 0; i < 250 && !shown(); i++) await sleep(20);
  const view = [...rt._variables].find((v: any) => v._module === B && v._name === "view");
  const out = {
    ok: sent.length === 1 && shown(),
    sent, replyShown: shown(), messages: node.active.session.messages.map((m: any) => m.role),
    group: node.dataset.rc5Group, viewIsNode: view._value === node, madeIn: "A", drawnIn: "B", modulesDiffer: A !== B,
    fieldPlaceholder: field.placeholder.slice(0, 20), height: Math.round(node.getBoundingClientRect().height),
  };
  box.remove();
  return out;
};

async function main() {
  let args;
  try { args = parseArgs(process.argv.slice(2)); } catch (e: any) { console.error(`${e.message}\n${usage}`); process.exit(64); }
  const { file, base, shell, expect } = args;
  let body: string | null = null;
  if (shell) {
    body = readFileSync(shell, "utf8");
    if (findSpan(body, PAGE)) { console.error(`${shell} holds ${PAGE}: at the Brain's address the page writes the Worker's copy over it. Give a shell (.emitted/shell.html).`); process.exit(64); }
  }
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true, executablePath: chromeFor(chromium.executablePath(), process.env, { headless: true }) });
  try {
    const page = await (await browser.newContext({ viewport: VIEW })).newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
    if (base) await routes(page, base, body, false);
    const address = base ? base + "/" : pathToFileURL(resolve(file!)).href, t0 = Date.now();
    await page.goto(address, { waitUntil: "load" });
    if (args.proof) {
      await page.waitForFunction(() => (window as any).__ojs_runtime?.mains?.get("@tomlarkworthy/robocoop-5"), null, { timeout: 60000 });
      const got = await page.evaluate(proof);
      console.log(JSON.stringify({ proof: got, browser: browser.version(), at: new Date().toISOString() }));
      process.exit(got.ok ? 0 : 1);
    }
    // Once a second for 45 s at most, then once more 3 s after the first pass: what is judged is a page at rest.
    let last: Read | null = null, joinedMs: number | null = null, reads = 0, failed = ["nothing was read"];
    const judge = (r: Read) => (base ? judgeBase(r, joinedMs, expect) : judgeFile(r));
    const once = async () => {
      const r = (await page.evaluate(read, { PAGE, TAB, PAIRING })) as Read | null;
      if (!r) return;
      reads++;
      if (joinedMs == null && r.mains.includes(PAGE)) joinedMs = Date.now() - t0;
      last = r;
      failed = judge(r);
    };
    while (Date.now() - t0 < 45000) {
      await once();
      if (!failed.length) { await page.waitForTimeout(3000); await once(); break; }
      await page.waitForTimeout(1000);
    }
    const { mains, ...rest } = (last || {}) as any;
    console.log(JSON.stringify({ address, shell, expect, ok: !failed.length, failed, joinedMs, reads, ms: Date.now() - t0, ...rest, operatorInMains: !!mains?.includes(TAB), pairingInMains: !!mains?.includes(PAIRING), ...(errors.length ? { errors: errors.slice(0, 3) } : {}), browser: browser.version(), at: new Date().toISOString() }));
    process.exit(failed.length ? 1 : 0);
  } finally {
    await browser.close();
  }
}

if (import.meta.main) await main().catch((e) => { console.error("operator-tab-check: " + String((e && e.message) || e).split("\n")[0]); process.exit(70); });
