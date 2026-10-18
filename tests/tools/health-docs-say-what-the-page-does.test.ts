// The docs line on Health says where the note is drawn and what asks for the calls again, as the page's seed has
// them. Round 1 of ds-2-span-and-refresh-controls wrote "under the charts" and "at no other time"; the note is
// drawn before the panels, and `calls` also names assembled, session and client (review 1202).
//
//   bun test ./tests/tools/health-docs-say-what-the-page-does.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { running } from "./needs";

const seed = (name: string) => readFileSync(resolve(import.meta.dir, "../../tools/cloud-brain", name), "utf8");
const cells = seed("cloud-brain.ojs").split("\n// %%\n");
const cell = (start: string) => cells.map((c) => c.replace(/^(\/\/.*\n)+/, "")).find((c) => c.startsWith(start)) || "";
const health = readFileSync(running("cloud-brain-docs"), "utf8").split("\n").find((l) => l.includes("The Health section of the page")) || "";

test("the cells the docs line is about are found in the seed", () => {
  expect(cell("dashboard = ")).toContain("${note ?");
  expect(cell("calls = ")).toContain("callsRead(");
  // Since dsv-6-health-through-the-service the calls are one metric.query of core.calls, and no logs.query.
  expect(cell("callsRead = ")).toContain('client.query("metric.query", { metric: "core.calls"');
  expect(cell("callsRead = ")).not.toContain("logs.query");
  expect(health).toContain("with one \\`metric.query\\` of the metric \\`core.calls\\`");
  expect(health).not.toContain("with one \\`logs.query\\`");
});

test("the docs say what the note says of an answer, as callsNote writes it", () => {
  const note = cell("callsNote = ");
  for (const said of ["groups is the limit of one answer", "from a sample of the lines", "Answered from the service's memory."]) expect(note).toContain(said);
  expect(health).toContain("when Cloudflare made it from a sample of the lines, and when it came from the service's memory");
});

test("the docs say the note is where dashboard draws it: before the grid of panels", () => {
  const d = cell("dashboard = ");
  expect(d.indexOf("${note ?")).toBeLessThan(d.indexOf("display:grid"));
  expect(health).toContain("The line above the charts");
  expect(health).not.toContain("under the charts");
});

test("the docs do not say only the two controls ask again: calls names assembled, session and client", () => {
  const c = cell("calls = ");
  for (const name of ["assembled", "session", "client", "timeRange"]) expect(c).toContain(name);
  expect(health).not.toContain("at no other time");
  expect(health).toContain("signs in or assembles its Workers' modules again");
});
