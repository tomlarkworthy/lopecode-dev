#!/usr/bin/env bun
// brain-info-size.ts FILE…           the size of BRAIN_INFO for each emitted record, and whether it would be refused
// brain-info-size.ts --live [URL]    the size of BRAIN_INFO of each Worker a Brain runs (cb4 with no URL), read only
// brain-info-size.ts --deployer [URL] the fields the deployer a Brain runs binds as BRAIN_INFO, and whether the copy
//                                     this checkout computes by binds the same, read only
//
// The deployer binds one JSON variable to each Worker it deploys, BRAIN_INFO (brain-deployer.ojs, the bindings of
// a Worker). Cloudflare refuses a version whose variable is too large, and the apply then answers put-back, under
// both locks (2026-10-13 00:03 CEST, the tracker, issue seen-brain-info-binding-at-its-limit). The size is known
// from the emitted record, so a record over the limit is not written by tab-tests.ts --emit, which needs no lock,
// and is not sent by brain.ts apply. Record: records/brain-info-size-known-before-apply.md.
//
// What is bound is the deployer's to say, and the deployer that runs is not always the seed's: until
// deployer-binds-no-method-list (2026-10-13) it bound the list of a Worker's methods and the rule of each, the seed
// since binds neither, and the loop does not deploy the deployer. So the size is computed with the expression of the
// deployer that runs: the line of BRAIN_INFO in cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js, which
// sync.ts wrote from cb4 (worktree.sh does at a worktree's making and at each --rebase). BRAIN_DEPLOYER_JS names
// another file. When that file is not there, or has no such line, the size is the one with the methods and their
// rules: the larger, so a copy that is behind refuses a record that would fit and passes none that would not.
// `bun sync.ts https://cb4.endpointservices.workers.dev` in cloud-brain-dev reads the file again; --deployer says
// whether it is behind. Record: records/deployer-binds-no-method-list.md.
//
//   bun tools/cloud-brain/brain-info-size.ts <root>/tools/cloud-brain/.emitted/<id>-brain-x-issues.json
//   bun tools/cloud-brain/brain-info-size.ts --live
//   bun tools/cloud-brain/brain-info-size.ts --deployer
//
// stdout: a line a record or a Worker: WORKER BYTES of LIMIT, N methods, "M bytes left" or "OVER by M".
// --deployer: one line of what cb4's deployer binds, one of what this checkout computes by.
// Exit 0: every one fits. Exit 1: one is over the limit. Exit 64: no argument. Exit 70: a file or the Brain was not read.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Cloudflare documents "Environment variable size: 5 KB" (developers.cloudflare.com/workers/platform/limits, read
// 2026-10-13) and its refusal says "exceeds the limit of 5.1 kB" (code 10054). On cb4 4966 bytes were taken and
// 5274 were refused. 5120 (5 x 1024) fits both texts and was not tried; 5100 is 20 under it.
export const LIMIT = 5100;

type Binds = (m: any, w: any) => any;
export type Deployer = { binds: Binds; fields: string[]; from: string; read: boolean };

// What every deployer bound until deployer-binds-no-method-list: the line of the seed at lopecode-dev 938b1b59
// (tests/tools/brain-info-size.test.ts reads that line at that commit and compares the JSON). Computed by when the
// deployer that runs was not read.
const WITH_METHODS: Binds = (m, w) => ({ name: m.worker, hash: w.hash, role: m.role, module: m.module || null, methods: m.methods, access: m.access || {}, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, cloudflare: m.cloudflare || [], deployedAt: new Date().toISOString() });
const SAMPLE = { worker: "brain-x-w", role: "recipe", methods: [], paths: [], secrets: [], resources: [] };

// The expression a deployer binds as BRAIN_INFO for a Worker, from the deployer's text (its seed, or the module a
// Brain runs): the json of the binding in bindingsFor, as a function of a record's meta and { hash }. null when the
// text has no such line or the line does not run on a meta. A member's Worker has a binding of its own, on one line,
// which this does not read.
export const bindsOf = (text: string): Binds | null => {
  const at = text.indexOf('name: "BRAIN_INFO",\n      json: {');
  if (at < 0) return null;
  const from = text.indexOf("{", text.indexOf("json:", at));
  try {
    const binds = new Function("m", "w", "return (" + text.slice(from, text.indexOf("\n", from)) + ")") as Binds;
    return typeof binds(SAMPLE, { hash: "" }).name === "string" ? binds : null;
  } catch { return null; }
};

export const DEPLOYED = resolve(import.meta.dir, "../../cloud-brain-dev/deploy/@tomlarkworthy/brain-deployer.js");
const fieldsOf = (binds: Binds) => Object.keys(binds(SAMPLE, { hash: "" }));
// The deployer the size is computed by. `from` is said in a refusal, so that its reader knows which.
export const deployerFrom = (file = process.env.BRAIN_DEPLOYER_JS || DEPLOYED): Deployer => {
  let binds: Binds | null = null, why = "has no line of BRAIN_INFO that runs";
  try { binds = bindsOf(readFileSync(file, "utf8")); } catch { why = "was not read"; }
  return binds
    ? { binds, fields: fieldsOf(binds), from: `as the deployer of ${file} binds it`, read: true }
    : { binds: WITH_METHODS, fields: fieldsOf(WITH_METHODS), from: `with the methods and their rules, as a deployer before 2026-10-13 binds it: ${file} ${why}`, read: false };
};
const withMethods = (d: Deployer) => d.fields.includes("methods") || d.fields.includes("access");

// What the deployer binds, from a record's meta and hash. deployedAt is the deployer's clock; an ISO time is 24 characters.
export const boundInfo = (rec: any, deployer: Deployer = deployerFrom()) => ({ ...deployer.binds(rec.meta, { hash: rec.hash }), deployedAt: "2026-01-01T00:00:00.000Z" });

export const bytesOf = (text: string) => new TextEncoder().encode(text).length;

// null for what is not a Worker's emitted record (no meta with a Worker's name): nothing is bound from it.
export const infoSize = (rec: any, deployer: Deployer = deployerFrom()): number | null => (rec && rec.meta && typeof rec.meta.worker === "string" ? bytesOf(JSON.stringify(boundInfo(rec, deployer))) : null);

// Why a record is not written or not sent; null when it fits or is not a Worker's record.
export const infoRefusal = (rec: any, limit = LIMIT, deployer: Deployer = deployerFrom()): string | null => {
  const size = infoSize(rec, deployer);
  if (size === null || size <= limit) return null;
  const mend = withMethods(deployer) ? "Shorten what the service declares (a method's rule, a path) and emit again" : "Shorten what the service declares (a path, a secret's name) and emit again";
  return `BRAIN_INFO of ${rec.meta.worker} would be ${size} bytes, ${size - limit} over the limit of ${limit} (${(rec.meta.methods || []).length} methods): Cloudflare refuses a variable over 5 KB and the apply would answer put-back. ${mend}; tools/cloud-brain/brain-info-size.ts FILE prints the size. Computed ${deployer.from}${deployer.read ? "" : "; bun sync.ts in cloud-brain-dev reads what the Brain runs"}`;
};

export const line = (worker: string, size: number, methods: number, limit = LIMIT) =>
  `${worker} ${size} of ${limit}, ${methods} methods, ${size > limit ? `OVER by ${size - limit}` : `${limit - size} bytes left`}`;

async function main(args: string[]) {
  if (!args.length) { console.error("brain-info-size.ts FILE… | --live [URL] | --deployer [URL]"); return 64; }
  let over = false;
  const kernel = (args[1] || "https://cb4.endpointservices.workers.dev").replace(/\/$/, ""), X = "/xrpc/com.lopecode.brain.";
  if (args[0] === "--deployer") {
    // The deployer answers its own source at its own address (sync.ts reads it there too); the kernel's getSource does not.
    const r = await fetch(kernel.replace(/^(https:\/\/[^/.]+)/, "$1-deployer") + X + "getSource?worker=brain-deployer");
    if (!r.ok) throw new Error(`the deployer answered ${r.status} to getSource`);
    const src: any = await r.json(), binds = bindsOf(String(src.text || ""));
    if (!binds) throw new Error("the deployer's source has no line of BRAIN_INFO that runs");
    const runs = fieldsOf(binds), local = deployerFrom();
    const said = (fields: string[]) => `${fields.join(", ")} (${fields.includes("methods") || fields.includes("access") ? "with the methods or their rules: a method adds to the variable" : "neither the methods nor their rules: a method adds nothing to the variable"})`;
    console.log(`brain-deployer ${String(src.hash).slice(0, 12)} binds ${said(runs)}`);
    console.log(runs.join() === local.fields.join() ? `this checkout computes the size by the same fields, ${local.from}` : `this checkout computes the size by other fields, ${said(local.fields)}, ${local.from}`);
    return 0;
  }
  if (args[0] === "--live") {
    const base = kernel + X;
    const list: any = await (await fetch(base + "service.list")).json();
    // The count is the core's, which the deployer registered: a Worker's own variable need not have its methods.
    for (const { worker, methods } of list.services) {
      const r = await fetch(base + "getInfo?worker=" + encodeURIComponent(worker));
      if (!r.ok) { console.log(`${worker} not read: getInfo answered ${r.status}`); continue; }
      // getInfo answers the variable as the Worker has it: the bytes of the answer are the bytes bound.
      const size = bytesOf(await r.text());
      over ||= size > LIMIT;
      console.log(line(worker, size, Object.keys(methods || {}).length));
    }
    return over ? 1 : 0;
  }
  const deployer = deployerFrom();
  for (const file of args) {
    const rec = JSON.parse(readFileSync(file, "utf8")), size = infoSize(rec, deployer);
    if (size === null) { console.log(`${file} is not a Worker's emitted record: not measured`); continue; }
    over ||= size > LIMIT;
    console.log(line(rec.meta.worker, size, (rec.meta.methods || []).length) + ", " + file);
  }
  console.log(`computed ${deployer.from}`);
  return over ? 1 : 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)).catch((e) => { console.error("brain-info-size: " + String((e && e.message) || e).split("\n")[0]); return 70; }));
