// The cross_check and attest ledgers across a page reboot. driver-core opens a fresh browser context
// per turn, so `globalThis.__rc5CrossChecks` and `globalThis.__rc5Attest` die with the turn:
// LEDGER_COLLECT reads them off the live page before the context closes (driver-core setup.collect)
// and ledgerRestoreSource puts them back on the next page (setup.init, which driver-core runs AFTER
// seedFiles and the mount).
//
// Own module so the verification script drives the SHIPPED strings, not a copy of them.

// Page JS read off the LIVE page after each turn (driver-core setup.collect) — the cross_check ledger
// and the apply counters it is judged against, the attest ledger, the df17 fetch_text log and the
// core/blocked table the bundle computes for every module it knows about. Installed on EVERY turn,
// walk mode or not. The fetch log is NOT restored onto the next page: it is a record of what was
// read, not state the guard reads.
export const LEDGER_COLLECT = `(() => {
  const led = globalThis.__rc5CrossChecks;
  const rows = led && typeof led.entries === "function" ? [...led.entries()] : [];
  const att = globalThis.__rc5Attest;
  const arows = att && typeof att.entries === "function" ? [...att.entries()] : [];
  let core = null;
  try { core = typeof globalThis.__rc5CoreAll === "function" ? globalThis.__rc5CoreAll() : null; }
  catch (e) { core = { __error: String(e && e.message || e) }; }
  const fetches = Array.isArray(globalThis.__rc5Fetches) ? globalThis.__rc5Fetches.slice(-200) : [];
  let memo = [], memoStats = null;
  try { memo = typeof globalThis.__rc5MemoCollect === "function" ? globalThis.__rc5MemoCollect() : []; }
  catch (e) { memo = []; }
  try { memoStats = typeof globalThis.__rc5MemoStats === "function" ? globalThis.__rc5MemoStats() : null; }
  catch (e) { memoStats = null; }
  return {
    memo,
    memoStats,
    applyCount: globalThis.__rc5ApplyCount || {},
    minItems: globalThis.__rc5MinItems ?? null,
    maxSteps: globalThis.__rc5MaxSteps ?? null,
    minTurnMs: globalThis.__rc5MinTurnMs ?? null,
    restored: globalThis.__rc5LedgerRestored ?? null,
    attestRestored: globalThis.__rc5AttestRestored ?? null,
    entries: rows.map(([name, e]) => Object.assign({ name }, e)),
    attest: arows.map(([cell, list]) => ({ cell, list: Array.isArray(list) ? list : [] })),
    fetches,
    core,
  };
})()`;

// Page JS appended to setup.init — driver-core runs init AFTER seedFiles and the mount, so
// __rc5ApplyCount already carries THIS page's counters for the agent's re-applied /src modules.
// Without this every turn boots an empty ledger and the agent has to redo checks it already made:
// arms xc/xd (df10-df12) paid two vetoes a run for a page reboot, which is a harness defect, not the
// design. Counters are rewritten to the current ones for every module this page re-seeded; a module
// absent from this page's counters keeps the count it was registered with, so a real edit still
// invalidates the check.
// Attestations are NOT re-counted the way cross-checks are: their freshness is a hash of each cell's
// own definition text, which the next page recomputes from the re-applied source. A reboot that
// re-applies the same module therefore leaves them fresh, and a real edit still invalidates them —
// which is the reason df16 hashes definitions instead of reading the apply counter.
// df28: the boot memo rides the same object. It is handed over as PLAIN DATA on __rc5MemoIn, with
// everything that needs the runtime behind an `__ojs_runtime` guard, so the SAME string works in
// both placements: evaluated before the page boots (context.addInitScript) the memo is already there
// when applyModuleSrc defines the agent's cells, and a hit means the slow cell never runs;
// evaluated at setup.init (after seedFiles, which is where driver-core runs it) __rc5MemoRestore()
// stubs whatever has not produced a value yet — in a walk the /local-disk mount lands after the seed
// and dirties every data cell, and that recompute is what the retro stub supersedes. The pre-boot
// placement is the one that pays: see the note in run-agent.mjs's setup.
export function ledgerRestoreSource(collected) {
  const entries = collected?.entries || [];
  const attest = (collected?.attest || []).filter((r) => r && r.cell && Array.isArray(r.list) && r.list.length);
  const memo = (collected?.memo || []).filter((r) => r && typeof r.key === "string" && typeof r.json === "string");
  if (!entries.length && !attest.length && !memo.length) return "";
  return `(() => {
  const prevMemo = ${JSON.stringify(memo)};
  if (prevMemo.length && !globalThis.__rc5MemoIn) globalThis.__rc5MemoIn = prevMemo;
  if (!globalThis.__ojs_runtime) return; // installed before the notebook booted: the memo data is all there is to do
  const prevAttest = ${JSON.stringify(attest)};
  if (prevAttest.length) {
    const am = globalThis.__rc5Attest = globalThis.__rc5Attest || new Map();
    for (const row of prevAttest) am.set(String(row.cell), row.list);
    globalThis.__rc5AttestRestored = prevAttest.length;
  }
  const prev = ${JSON.stringify(entries)};
  const cur = globalThis.__rc5ApplyCount = globalThis.__rc5ApplyCount || {};
  const led = globalThis.__rc5CrossChecks = globalThis.__rc5CrossChecks || new Map();
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  for (const row of prev) {
    const e = Object.assign({}, row);
    const name = e.name;
    delete e.name;
    const counts = Object.assign({}, e.counts || (e.module ? { [e.module]: e.applyCount } : {}));
    for (const k of Object.keys(counts)) if (has(cur, k)) counts[k] = cur[k];
    e.counts = counts;
    if (e.module) e.applyCount = has(cur, e.module) ? cur[e.module] : e.applyCount;
    led.set(String(name), e);
  }
  globalThis.__rc5LedgerRestored = prev.length;
  try { if (typeof globalThis.__rc5MemoRestore === "function") globalThis.__rc5MemoRestore(); } catch (e) {}
})()`;
}
