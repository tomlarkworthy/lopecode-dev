// The docs name the dashboard service and the select and panels that draw a dashboard, and say of them what their
// cells do (dsv-5-page-section). Before that task no doc named either. The sentences are held to the seed's text,
// not to what a reader understands by them. The cells were a section of cloud-brain.ojs until fb-a2g3jyhecp, which
// moved them to the top of brain-dashboard.ojs: the first two tests hold where they are. That seed was deleted on
// 2026-10-14: the cells are read from what cb4 runs (cloud-brain-dev/deploy after `bun sync.ts`), by the acorn
// extractor of lope-push-ws.js (runningGroups of needs.ts).
//
//   bun test ./tests/tools/dsv-5-docs-name-the-dashboard-service.test.ts
import { expect } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { running, runningGroups, testNeedingRunning } from "./needs.ts";

const root = resolve(import.meta.dir, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");
const page = read("tools/cloud-brain/cloud-brain.ojs");
const { test, module } = testNeedingRunning("dsv-5-docs-name-the-dashboard-service.test.ts", "brain-dashboard");
const { groups, imports } = module ? await runningGroups("brain-dashboard") : { groups: [], imports: [] };
// A cell by its name, as `name = ` (the form these tests had over the seed): the bodies of its variables.
const cell = (start: string) => groups.find((g) => g.name + " = " === start)?.text || "";
const docs = readFileSync(running("cloud-brain-docs"), "utf8").split("\n");
const line = (has: string) => docs.find((l) => l.includes(has)) || "";
const knowledge = read("knowledge/working-with-cloud-brain-remote-lopecode-cluster.md");

const section = ["dashboardList", "dashboardOf", "dashboardHash", "dashboardPick", "viewof dashboardName", "dashboardGet", "dashboardDef", "panelQuery", "dashboardQueries", "dashboardRead", "dashboardData", "dashboardGroupLimit", "panelNeeds", "barsChart", "groupTable", "panelBody", "dashboardNote", "dashboardView"];
const tests = ["test_a_dashboard_is_read_with_one_metric_query_for_each_distinct_metric_by_and_filter", "test_the_address_names_the_dashboard_and_keeps_its_other_pairs", "test_the_select_opens_on_the_address_and_writes_a_choice_to_it", "test_bars_and_a_table_draw_any_metric_and_a_panel_says_what_it_cannot_draw"];

test("the select and the panels are the first cells of the service's module after its title, before its methods", () => {
  expect(groups[0].name === null && groups[0].text.includes("return (md`# brain-dashboard")).toBe(true);
  expect(groups[1].name).toBe("viewof dashboardName");
  expect(groups[2].name).toBe("dashboardView");
  expect(groups.findIndex((g) => g.name === null && g.text.includes("return (md`## Methods"))).toBe(4);
  // The 18 cells and the 4 tests, each once.
  for (const name of [...section, ...tests]) expect([name, groups.filter((g) => g.name === name).length]).toEqual([name, 1]);
});

test("the page's module has none of them, and no heading Dashboards", () => {
  const starts = page.split("\n// %%\n").map((c) => c.replace(/^(\/\/.*\n)+/, ""));
  for (const name of [...section, ...tests]) expect([name, starts.filter((c) => c.startsWith(name + " = ")).length]).toEqual([name, 0]);
  expect(page.indexOf("md`## Dashboards")).toBe(-1);
  // What the cells read of the page is imported from it, and the page imports nothing of the service's module.
  const imported = /import \{([^}]*)\} from "@tomlarkworthy\/cloud-brain"$/.exec(imports.find((i) => i.endsWith('"@tomlarkworthy/cloud-brain"')) || "");
  expect(imported![1].split(",").map((n) => n.trim())).toEqual(["session", "client", "timeRange", "spanName", "dashboard", "chartBase", "requestsChart", "healthStrip", "methodTable"]);
  expect(page).not.toContain('from "@tomlarkworthy/brain-dashboard"');
});

test("the docs name the service in the modules table and the section in the owner's table", () => {
  expect(line('| ${mod("brain-dashboard")} |')).toContain("metric.query");
  expect(line("| See a dashboard. |")).toContain('The select at the top of ${mod("brain-dashboard")}');
  expect(line("| See a dashboard. |")).toContain('under **Health** in ${mod("cloud-brain")}');
  expect(docs.join("\n")).not.toContain("Dashboards section of the page");
});

test("the docs say what asks and what does not, as the cells name their inputs", () => {
  const said = line('The select and the panels at the top of ${mod("brain-dashboard")} draw one dashboard');
  expect(said).toContain('over the span chosen under Health in ${mod("cloud-brain")}');
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
  expect(services).toContain("getSource?worker=brain-x-dashboard");
  expect(services).toContain("the select at the top of its module draws the one it names");
  expect(services).not.toContain("the page's section Dashboards");
});
