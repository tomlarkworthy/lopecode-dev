#!/usr/bin/env bun
// brain-info-size.ts FILE…           the size of BRAIN_INFO for each emitted record, and whether it would be refused
// brain-info-size.ts --live [URL]    the size of BRAIN_INFO of each Worker a Brain runs (cb4 with no URL), read only
//
// The deployer binds one JSON variable to each Worker it deploys, BRAIN_INFO (brain-deployer.ojs, the bindings of
// a Worker): its name, hash, the list of its methods and the rule of each. Cloudflare refuses a version whose
// variable is too large, and the apply then answers put-back, under both locks (2026-10-13 00:03 CEST, the tracker,
// issue seen-brain-info-binding-at-its-limit). The size is known from the emitted record, so a record over the
// limit is not written by tab-tests.ts --emit, which needs no lock, and is not sent by brain.ts apply.
// Record: records/brain-info-size-known-before-apply.md.
//
//   bun tools/cloud-brain/brain-info-size.ts <root>/tools/cloud-brain/.emitted/<id>-brain-x-issues.json
//   bun tools/cloud-brain/brain-info-size.ts --live
//
// stdout: a line a record or a Worker: WORKER BYTES of LIMIT, N methods, "M bytes left" or "OVER by M".
// Exit 0: every one fits. Exit 1: one is over the limit. Exit 64: no argument. Exit 70: a file or the Brain was not read.
import { readFileSync } from "node:fs";

// Cloudflare documents "Environment variable size: 5 KB" (developers.cloudflare.com/workers/platform/limits, read
// 2026-10-13) and its refusal says "exceeds the limit of 5.1 kB" (code 10054). On cb4 4966 bytes were taken and
// 5274 were refused. 5120 (5 x 1024) fits both texts and was not tried; 5100 is 20 under it.
export const LIMIT = 5100;

// What the deployer binds, from a record's meta and hash: the fields of the json of BRAIN_INFO in
// brain-deployer.ojs, in its order (tests/tools/brain-info-size.test.ts reads that line and compares the names).
// deployedAt is the deployer's clock; an ISO time is 24 characters.
export const boundInfo = (rec: any) => {
  const m = rec.meta;
  return { name: m.worker, hash: rec.hash, role: m.role, module: m.module || null, methods: m.methods, access: m.access || {}, calls: m.calls || [], paths: m.paths, secrets: m.secrets, resources: m.resources, cloudflare: m.cloudflare || [], deployedAt: "2026-01-01T00:00:00.000Z" };
};

export const bytesOf = (text: string) => new TextEncoder().encode(text).length;

// null for what is not a Worker's emitted record (no meta with a Worker's name): nothing is bound from it.
export const infoSize = (rec: any): number | null => (rec && rec.meta && typeof rec.meta.worker === "string" ? bytesOf(JSON.stringify(boundInfo(rec))) : null);

// Why a record is not written or not sent; null when it fits or is not a Worker's record.
export const infoRefusal = (rec: any, limit = LIMIT): string | null => {
  const size = infoSize(rec);
  if (size === null || size <= limit) return null;
  return `BRAIN_INFO of ${rec.meta.worker} would be ${size} bytes, ${size - limit} over the limit of ${limit} (${(rec.meta.methods || []).length} methods): Cloudflare refuses a variable over 5 KB and the apply would answer put-back. Shorten what the service declares (a method's rule, a path) and emit again; tools/cloud-brain/brain-info-size.ts FILE prints the size`;
};

export const line = (worker: string, size: number, methods: number, limit = LIMIT) =>
  `${worker} ${size} of ${limit}, ${methods} methods, ${size > limit ? `OVER by ${size - limit}` : `${limit - size} bytes left`}`;

async function main(args: string[]) {
  if (!args.length) { console.error("brain-info-size.ts FILE… | --live [URL]"); return 64; }
  let over = false;
  if (args[0] === "--live") {
    const base = (args[1] || "https://cb4.endpointservices.workers.dev").replace(/\/$/, "") + "/xrpc/com.lopecode.brain.";
    const list: any = await (await fetch(base + "service.list")).json();
    for (const { worker } of list.services) {
      const r = await fetch(base + "getInfo?worker=" + encodeURIComponent(worker));
      if (!r.ok) { console.log(`${worker} not read: getInfo answered ${r.status}`); continue; }
      // getInfo answers the variable as the Worker has it: the bytes of the answer are the bytes bound.
      const text = await r.text(), size = bytesOf(text);
      over ||= size > LIMIT;
      console.log(line(worker, size, (JSON.parse(text).methods || []).length));
    }
    return over ? 1 : 0;
  }
  for (const file of args) {
    const rec = JSON.parse(readFileSync(file, "utf8")), size = infoSize(rec);
    if (size === null) { console.log(`${file} is not a Worker's emitted record: not measured`); continue; }
    over ||= size > LIMIT;
    console.log(line(rec.meta.worker, size, (rec.meta.methods || []).length) + ", " + file);
  }
  return over ? 1 : 0;
}

if (import.meta.main) process.exit(await main(process.argv.slice(2)).catch((e) => { console.error("brain-info-size: " + String((e && e.message) || e).split("\n")[0]); return 70; }));
