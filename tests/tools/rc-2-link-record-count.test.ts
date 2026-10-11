// records/link-issues-with-a-common-cause.md gave 14 `linked` events by 11:53 on 2026-10-11, 11 the overseer's.
// The tracker has 15 and 12 (seen-link-record-count-off-by-one). Reads the record alone: events are not changed.
//
//   bun test ./tests/tools/rc-2-link-record-count.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const record = readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain/records/link-issues-with-a-common-cause.md"), "utf8");
const lines = record.split("\n");

test("the record gives the tracker's count on one line, once", () => {
  expect(lines.filter((l) => l.includes("15 `linked` events, 12")).length).toBe(1);
  expect(record).not.toContain("14 `linked` events");
});

test("the command is beside the count: the two reads, the filter and the cut", () => {
  const at = lines.findIndex((l) => l.includes("15 `linked` events, 12"));
  expect(at).toBeGreaterThan(-1);
  const near = lines.slice(at, at + 12).join("\n");
  expect(near).toContain('"sync?after=$a&limit=500"');
  expect(near).toContain('.type == "linked"');
  expect(near).toContain(".at <= 1791712380000");
  expect(near).toContain("secret:issues-overseer-1");
});

test("the 14 links of Not tried are kept, with the event that makes them 14 of 15", () => {
  expect(record).toContain("The 14 links on cb4");
  expect(record).toContain("event 515");
});
