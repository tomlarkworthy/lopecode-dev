// The docs name the dashboard service and the page's section Dashboards, and say of the section what its cells do
// (dsv-5-page-section). Before that task no doc named either. The sentences are held to the seed's text, not to
// what a reader understands by them.
//
//   bun test ./tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts
import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const page = read("tools/cloud-brain/cloud-brain.ojs");
const cells = page.split("\n// %%\n");
const cell = (start: string) => cells.map((c) => c.replace(/^(\/\/.*\n)+/, "")).find((c) => c.startsWith(start)) || "";
const docs = read("tools/cloud-brain/cloud-brain-docs.ojs").split("\n");
const line = (has: string) => docs.find((l) => l.includes(has)) || "";
const knowledge = read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");

test("the page has the section, between Health and Operator", () => {
  const at = (heading: string) => page.indexOf("md`## " + heading);
  expect(at("Dashboards")).toBeGreaterThan(at("Health"));
  expect(at("Dashboards")).toBeLessThan(at("Operator"));
  expect(at("Health")).toBeGreaterThan(-1);
});

test("the docs name the service in the modules table and the section in the owner's table", () => {
  expect(line('| ${mod("brain-dashboard")} |')).toContain("metric.query");
  expect(line("| See a dashboard. |")).toContain('**Dashboards** in ${mod("cloud-brain")}');
});

test("the docs say what asks and what does not, as the cells name their inputs", () => {
  const said = line("The Dashboards section of the page, under Health");
  expect(said).toContain("dashboard=NAME");
  expect(said).toContain("one \\`metric.query\\` for each distinct metric, \\`by\\` and filter");
  // One query a distinct key, read over timeRange for the owner; the data names no width, the view does.
  expect(cell("dashboardQueries = ")).toContain("new Map(");
  const data = cell("dashboardData = ");
  for (const name of ["session.owner", "client", "dashboardDef", "timeRange"]) expect(data).toContain(name);
  expect(data).not.toContain("width");
  expect(cell("dashboardView = ")).toContain("width");
  expect(said).toContain("A resize draws again and does not ask.");
  // The dashboard is not read again for a Refresh: its cell does not name the range.
  expect(cell("dashboardDef = ")).not.toContain("timeRange");
  // The address is written with navigate and read as the pair dashboard=.
  expect(cell("viewof dashboardName = ")).toContain("go: navigate");
  expect(cell("dashboardOf = ")).toContain('"dashboard="');
});

test("the knowledge page lists dashboard among the services, with its read and the pair of the address", () => {
  const services = knowledge.slice(knowledge.indexOf("- **Services**"), knowledge.indexOf("- **Database**"));
  expect(services).toContain("dashboard (");
  expect(services).toContain("metric.query?metric=");
  expect(services).toContain("dashboard=NAME");
  expect(services).toContain("tools/cloud-brain/brain-dashboard.ojs");
});
