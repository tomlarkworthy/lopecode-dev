import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { callsAnswer, DRAWS_A_READ, judge, moved, parseArgs } from "../../tools/cloud-brain/page-redraws.ts";

const rest = { settledMs: 2000, entries: 0, computed: {}, draws: 0, tables: 0 };

describe("page-redraws", () => {
  test("the arguments", () => {
    expect(parseArgs([])).toEqual({ base: "https://cb4.endpointservices.workers.dev", owner: false, seconds: 60, entries: 0, shell: null, view: null, at: "table" });
    expect(parseArgs([], { BRAIN_BASE: "cb9" }).base).toBe("https://cb9.endpointservices.workers.dev");
    expect(parseArgs(["--owner", "--entries", "6", "--seconds", "45", "--base", "https://b.example/", "--shell", "s.html", "--view", "C100(S100(a))", "--at", "end"])).toEqual({ base: "https://b.example", owner: true, seconds: 45, entries: 6, shell: "s.html", view: "C100(S100(a))", at: "end" });
    for (const bad of [["--entries", "6"], ["--seconds"], ["--seconds", "ten"], ["--seconds", "--owner"], ["--at", "top"], ["a.html"], ["--times", "2"]]) expect(() => parseArgs(bad)).toThrow();
  });

  test("the cells that were computed between two reads", () => {
    expect(moved({ a: 1, b: 2 }, { a: 1, b: 2 })).toEqual({});
    expect(moved({ a: 1, b: 2 }, { a: 1, b: 5, c: 2 })).toEqual({ b: 3, c: 2 });
  });

  test("a page at rest computes nothing and draws nothing", () => {
    expect(judge(rest)).toEqual([]);
    expect(judge({ ...rest, settledMs: null })).toEqual(["the page did not come to rest"]);
    expect(judge({ ...rest, computed: { panel: 2 } })).toEqual(["1 cell was computed again: panel 2"]);
    expect(judge({ ...rest, draws: 1, tables: 1 })).toEqual(["the control of Services was made again 1 time", "the table was put in place 1 times, and 0 at most with nothing changed"]);
  });

  test("entries of the deployer are two reads at most, and compute no cell", () => {
    expect(DRAWS_A_READ).toBe(3);
    expect(judge({ ...rest, entries: 1, draws: 3 })).toEqual([]);
    expect(judge({ ...rest, entries: 1, draws: 6 })).toEqual(["the table was put in place 6 times, and 3 at most for 1 entry"]);
    expect(judge({ ...rest, entries: 6, draws: 6 })).toEqual([]);
    // What cb4 served on 2026-10-13 before the change: a read an entry, and the panels of Health drawn again for each.
    expect(judge({ ...rest, entries: 6, draws: 18, computed: { panelDrawing: 6, panel: 6, workerLink: 6 } })).toEqual(["3 cells were computed again: panelDrawing 6, panel 6, workerLink 6", "the table was put in place 18 times, and 6 at most for 6 entries"]);
  });

  test("the page on changing a Worker names the tool and its record", () => {
    const doc = readFileSync(resolve(import.meta.dir, "../../knowledge/changing-and-deploying-a-cloud-brain-worker.md"), "utf8");
    expect(doc).toContain("bun tools/cloud-brain/page-redraws.ts --owner [--entries N] [--shell FILE]");
    expect(doc).toContain("tools/cloud-brain/records/page-services-refreshes-in-a-loop.md");
  });

  test("the answer the panels of Health are given has a row a minute for each of three methods", () => {
    const a = callsAnswer(60000 * 10 + 1, 60000 * 13);
    expect(a.series.map((r) => r.t)).toEqual([660000, 660000, 660000, 720000, 720000, 720000]);
    expect([...new Set(a.series.map((r) => r.method))]).toEqual(["issue.list", "inbox.poll", "getInfo"]);
  });
});
