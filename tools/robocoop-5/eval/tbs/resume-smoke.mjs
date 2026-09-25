// The df17 walk-snapshot round trip, with no browser and no model: build a snap-<turn>/ directory of
// the shape walkTurn writes, then read it back the way run-agent's --resume does and check the three
// things --resume restores are byte-identical to what the original turn had.
//
// It drives the SHIPPED helpers — copyTree and readSeedDir from tasks.mjs, ledgerRestoreSource from
// ledger.mjs — not copies of them. What it cannot cover without a model: that the driver then boots a
// page from those seeds (attest-persist.mjs covers the ledger half of that against a real page).
//
//   node resume-smoke.mjs

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyTree, readSeedDir, moduleSeeds } from "./tasks.mjs";
import { ledgerRestoreSource } from "./ledger.mjs";

const checks = [];
const check = (name, ok, detail) => { checks.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "\n       " + String(detail).replace(/\n/g, "\n       ") : ""}`); };

const tmp = mkdtempSync(join(tmpdir(), "rc5-resume-"));
const root = join(tmp, "task-root");          // the mounted working directory of the original run
const traj = join(tmp, "traj");               // the original run's trajectory directory
const fresh = join(tmp, "task-root-2");       // the resumed run's task root, after the wipe

// ---- the original turn: /src modules the agent left behind, and a materialised cache
const files = {
  "/src/@user/analysis.js": "const _a = function a(){ return 1; };\n",
  "/src/@user/deep/nested.js": "const _b = function b(){ return 2; };\n",
};
mkdirSync(join(root, "cache", "periods"), { recursive: true });
writeFileSync(join(root, "cache", "periods", "target-1.json"), JSON.stringify({ period: 0.55 }));
writeFileSync(join(root, "cache", "periods", "target-2.json"), JSON.stringify({ period: 0.31 }));
writeFileSync(join(root, "cache", "scores.csv"), "id,score\n1,0.9\n");
mkdirSync(join(root, "results"), { recursive: true });
writeFileSync(join(root, "results", "out.csv"), "id\n1\n");   // NOT under cache/: must not be copied

const collected = {
  applyCount: { "@user/analysis": 3 },
  entries: [{ name: "AB", module: "@user/analysis", a: "pA", b: "pB", independent: true, agree: true, items: 40, fraction: 1, counts: { "@user/analysis": 3 } }],
  attest: [{ cell: "@user/analysis:est", list: [{ kind: "reference", module: "@user/analysis", cell: "est", evidence: "refEst", cellHash: "abc.12", evidenceHash: "def.34", rows: 6, at: 1 }] }],
  fetches: [{ url: "https://en.wikipedia.org/api/rest_v1/page/summary/RR_Lyrae_variable", via: "direct", at: 1, chars: 900 }],
  core: { "@user/analysis": { given: ["load"], knowledge: ["lore"], core: ["est"], blocked: {}, deliverables: ["out"], blocking: [] } },
};
const question = "Continue where you left off.\n\nREVIEWER NOTE: re-derive the boundaries from the cited numbers.";
const note = "Research turn: read the domain, write a knowledge cell, attest the rule.\n";

// ---- what walkTurn writes (the same calls, in the same order)
const turn = 3;
const snapDir = join(traj, `snap-${turn}`);
const dumpSrc = (base) => {
  mkdirSync(base, { recursive: true });
  for (const [path, text] of Object.entries(files)) {
    const dest = join(base, path);
    mkdirSync(join(dest, ".."), { recursive: true });
    writeFileSync(dest, text);
  }
};
dumpSrc(join(traj, `src-${turn}`));
dumpSrc(snapDir);
const snapCache = copyTree(join(root, "cache"), join(snapDir, "cache"));
writeFileSync(join(snapDir, "ledger.json"), JSON.stringify(collected, null, 1));
writeFileSync(join(snapDir, "question.txt"), question);
writeFileSync(join(snapDir, "note.txt"), note);

check("the snapshot copied every cache file and nothing outside cache/", snapCache === 3
  && existsSync(join(snapDir, "cache", "periods", "target-2.json"))
  && !existsSync(join(snapDir, "results")), `${snapCache} files`);
check("the snapshot carries src/, ledger.json, question.txt and note.txt",
  existsSync(join(snapDir, "src", "@user", "analysis.js")) && existsSync(join(snapDir, "ledger.json"))
  && existsSync(join(snapDir, "question.txt")) && existsSync(join(snapDir, "note.txt")));

// ---- what --resume reads back: --seed-dir + --cache-from + the ledger + the first note
const seeds = readSeedDir(snapDir);
const srcSeeds = moduleSeeds(seeds);
check("--resume seeds the same /src files, byte for byte",
  JSON.stringify(srcSeeds) === JSON.stringify(files), JSON.stringify(Object.keys(srcSeeds)));
check("the snapshot's other files are read but NOT seeded as modules",
  Object.keys(seeds).some((k) => k.startsWith("/cache/")) && Object.keys(seeds).includes("/ledger.json")
    && Object.keys(srcSeeds).length === 2 && !Object.keys(srcSeeds).some((k) => /cache|ledger|question|note/.test(k)),
  Object.keys(seeds).join(", "));

const cacheFiles = copyTree(join(snapDir, "cache"), join(fresh, "cache"));
check("--cache-from copies the cache into a wiped task root", cacheFiles === 3
  && readFileSync(join(fresh, "cache", "periods", "target-1.json"), "utf8") === JSON.stringify({ period: 0.55 }),
  `${cacheFiles} files`);
check("--cache-from on a directory with no cache/ is a no-op, not an error",
  copyTree(join(tmp, "nothing-here", "cache"), join(fresh, "cache")) === 0);

const restored = JSON.parse(readFileSync(join(snapDir, "ledger.json"), "utf8"));
check("the restored ledger object equals the one collected off the page",
  JSON.stringify(restored) === JSON.stringify(collected));
check("the restore SOURCE built from the snapshot is the one built from the live collection",
  ledgerRestoreSource(restored) === ledgerRestoreSource(collected) && ledgerRestoreSource(restored).includes("__rc5AttestRestored"));
check("the fetch log rides along in the snapshot but is not restored onto the page",
  restored.fetches.length === 1 && !ledgerRestoreSource(restored).includes("__rc5Fetches"));
check("the first REVIEWER NOTE comes back from note.txt", readFileSync(join(snapDir, "note.txt"), "utf8") === note);

const failed = checks.filter((c) => !c.ok).length;
console.log(`\n${failed ? "FAIL" : "PASS"} resume-smoke: ${checks.length - failed}/${checks.length} assertions  (${tmp})`);
process.exit(failed ? 1 : 0);
