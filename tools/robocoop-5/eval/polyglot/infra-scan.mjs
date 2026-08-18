#!/usr/bin/env node
// Which rows of an agent-arm result JSON are INFRA-polluted rather than genuine failures?
//
// Infra (re-rollable, one clean re-roll each):
//   - the watchdog fired: run-agent's hard deadline recycled the browser ("hard deadline: turn exceeded")
//   - a network/transport fault that killed the attempt before it could work: a runError matching
//     fetch/network/empty turn/did not initialize AND fewer than 3 steps on that attempt
// Genuine (kept regardless of direction):
//   - `session.send timed out` at a normal step count — the agent was working and ran out of clock
//   - any failure whose attempt produced a real solution file
// Zero model calls.
//
//   node infra-scan.mjs results/corrected-agent-full.json

import { readFileSync } from "node:fs";

// Transport faults: the runner's own isInfra set, plus the Playwright-side equivalents (a browser or
// page that died takes the attempt with it and is the same class of event as a dropped fetch).
const NET = /fetch|network|empty turn|did not initialize|browser has been closed|Target page|browser\.newContext|page\.evaluate|Protocol error/i;
const WATCHDOG = /hard deadline/i;

export function classify(rec) {
  const reasons = [];
  for (const a of [1, 2]) {
    const err = rec[`runError${a}`];
    if (!err) continue;
    const steps = rec[`steps${a}`] ?? 0;
    if (WATCHDOG.test(String(err))) reasons.push(`attempt${a}: watchdog kill (${String(err).slice(0, 60)})`);
    else if (NET.test(String(err)) && steps < 3) reasons.push(`attempt${a}: network fault at ${steps} steps (${String(err).slice(0, 60)})`);
    else reasons.push(`attempt${a}: GENUINE runError at ${steps} steps (${String(err).slice(0, 80)})`);
  }
  const infra = reasons.some((r) => /watchdog kill|network fault/.test(r));
  return { infra, reasons };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const doc = JSON.parse(readFileSync(process.argv[2], "utf8"));
  const polluted = [];
  for (const rec of doc.results || []) {
    const { infra, reasons } = classify(rec);
    if (!reasons.length) continue;
    console.log(`${rec.slug.padEnd(24)} pass2=${String(rec.pass2).padEnd(5)} steps=${rec.steps1}+${rec.steps2}  ${infra ? "INFRA" : "genuine"}`);
    for (const r of reasons) console.log("    " + r);
    if (infra && !rec.pass2) polluted.push(rec.slug);
  }
  console.log(`\nfailed rows needing a clean re-roll (${polluted.length}): ${polluted.join(",") || "-"}`);
}
