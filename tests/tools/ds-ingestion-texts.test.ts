// ds-ingestion-tail-to-analytics-engine, review 6248: the texts that said stage 2 ran on no Brain, and the
// sentence of the measurement the dashboard's own test holds.
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
// What cb4 runs of brain-x-dashboard (cloud-brain-dev/deploy after `bun sync.ts`): its seed was deleted on 2026-10-14.
const seed = read("cloud-brain-dev/deploy/@tomlarkworthy/brain-dashboard.js");
const record = "tools/cloud-brain/records/ds-ingestion-tail-to-analytics-engine.md";

test("the dashboard's test holds a sentence its prose has", () => {
  const held = [...seed.matchAll(/expect\(source\.reference\)\.toContain\("(the count [^"]*)"\)/g)].map((m) => m[1]);
  expect(held.length).toBe(1);
  // Once in the test and once in the prose of "The metrics store".
  expect(seed.split(held[0]).length - 1).toBe(2);
  expect(held[0]).toContain("within 4.2%, for the 5 of 20 Workers the script kept");
});

test("no text says stage 2 is on no Brain without saying that cb4 runs it", () => {
  const spec = read("plan/cloud-brain-dashboard-service.md");
  expect(spec).not.toContain("on no Brain that day");
  expect(spec).toContain("deployed on cb4 by that session from 08:41 CEST");
  const cu1 = read("tools/cloud-brain/records/cu-1-deployer-gains-billing-read.md");
  expect(cu1).not.toContain("in the seed and not on a Brain");
  expect(cu1).toContain("in the deployer cb4 runs, `14f0fb7dd89d`");
  const guide = read("tools/cloud-brain/running-a-cloud-brain.md");
  expect(guide).not.toContain("not minted by any deployer");
  for (const text of [spec, cu1, guide]) expect(text).toContain(record);
  expect(seed).not.toContain("on no Brain when written");
  expect(seed).toContain("(The metrics store, below; cb4 runs the function since 2026-10-13 08:41 CEST)");
  expect(seed).toContain("When this was written it ran on no Brain, and this service had written no point to Cloudflare and read none. Since 2026-10-13 08:41 CEST cb4 runs it");
});

test("the record has a section for the round after review 6248", () => {
  expect(read(record)).toContain("## Round 2, 2026-10-13: the test holds the prose's sentence");
});
