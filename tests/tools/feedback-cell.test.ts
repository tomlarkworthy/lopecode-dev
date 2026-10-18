// The cell `feedback` of brain-feedback, computed as cloud-brain-dev/deploy/ has it (its seed was deleted 2026-10-18), with feedbackOn true.
// On a file the cell is null, and every test cell of the module makes an app of its own, so until this file no test
// read what the cell gives the app (issue feedback-cell-copies-held-by-no-test). Here the module is the one sync.ts wrote
// and the cell's inputs are given: the owner's page is stood in for by feedbackOn true, an
// address, the module's own rig for the tracker and for annotate's store, and a localStorage held in a Map.
import { afterAll, beforeAll, expect } from "bun:test";
import { resolve } from "node:path";
import { testNeedingRunning } from "./needs";

const root = resolve(import.meta.dir, "../..");
const { test, module: seed } = testNeedingRunning("feedback-cell.test.ts", "brain-feedback");

const ADDRESS = "https://brain.example";
const DRAFTS = "brain_feedback_drafts " + ADDRESS, AWAY = "brain_feedback_away " + ADDRESS;
const anchor = { module: "@tomlarkworthy/brain-issues", cell: "issuesView", surface: "element", frac: { fx: 0.5, fy: 0.5 } };

// The browser's storage: what a load leaves.
const items = new Map<string, string>();
const storage = { getItem: (k: string) => (items.has(k) ? items.get(k)! : null), setItem: (k: string, v: string) => void items.set(k, String(v)), removeItem: (k: string) => void items.delete(k) };
const had = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
beforeAll(() => void Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true, writable: true }));
afterAll(() => void (had ? Object.defineProperty(globalThis, "localStorage", had) : delete (globalThis as any).localStorage));

const load = async (overrides: Record<string, unknown>) => {
  const { importNotebookModule } = await import(resolve(root, "tools/notebook-import.ts"));
  // htl: the app names it and draws with it only in note(), which nothing here calls.
  return importNotebookModule(seed, { overrides: { htl: {}, ...overrides } });
};
// One load of the page: the cell `feedback` of a new runtime, over the tracker and the store given.
const page = async (rig: any, more: Record<string, unknown> = {}) =>
  (await load({ feedbackOn: true, brainOrigin: ADDRESS, brainClient: rig.client, a2Store: rig.store, feedbackNear: () => "Issues", brainModules: { modules: [{ module: anchor.module, worker: "brain-x-issues" }] }, ...more })).value("feedback");
const newRig = async () => (await (await load({})).value("feedbackRig"))();
const open = async (rig: any, id: string, body: (text: string, where: any) => string) =>
  rig.client.procedure("issue.open", { id, title: id, body: body(id, { anchor }), kind: "feedback", about: "brain", labels: ["annotation"] });

test("off the owner's page the cell is null", async () => {
  const rig = await newRig();
  expect(await page(rig, { feedbackOn: false })).toBe(null);
});

test("a draft kept in this browser for the address is placed by the page's app, and filed about the module's Worker", async () => {
  items.clear();
  const rig = await newRig();
  // Another address's draft is not this page's.
  storage.setItem("brain_feedback_drafts https://other.example", JSON.stringify({ o1: { text: "Elsewhere.", anchor } }));
  await (await page(rig)).sync();
  expect(rig.store.all()).toEqual([]);
  storage.setItem(DRAFTS, JSON.stringify({ n1: { text: "The count is wrong.", anchor, box: { dx: 5, dy: 6, w: 300 } } }));
  const app = await page(rig);
  await app.sync();
  expect(rig.store.all().map((n: any) => [n.draft, n.box, n.issue])).toEqual([["n1", { dx: 5, dy: 6, w: 300 }, undefined]]);
  await app.file(rig.store.all()[0].id);
  const sent = rig.calls.filter((c: any) => c[0] === "issue.open").map((c: any) => [c[1].id, c[1].about, c[1].body.includes('on the element that reads "Issues"')]);
  expect(sent).toEqual([["fb-n1", "brain-x-issues", true]]);
  // Filed: the draft's item goes, the other address's stays.
  expect([...items.keys()]).toEqual(["brain_feedback_drafts https://other.example"]);
});

test("a note put away is kept away by this browser for the address, over a load of the page", async () => {
  items.clear();
  const rig = await newRig(), body = await (await load({})).value("feedbackBody");
  await open(rig, "fb-open", body);
  const first = await page(rig);
  await first.sync();
  expect(rig.store.all().map((n: any) => n.issue)).toEqual(["fb-open"]);
  // The x: annotate removes the cell, and the app's gone() finds it missing.
  rig.store.remove(rig.store.all()[0].id);
  await first.gone();
  expect([[...items.keys()], Object.keys(JSON.parse(items.get(AWAY)!)), typeof JSON.parse(items.get(AWAY)!)["fb-open"]]).toEqual([[AWAY], ["fb-open"], "number"]);
  // A load: no cell is left, and the cell `feedback` is computed in a new runtime.
  rig.reload();
  const loaded = await page(rig);
  await loaded.sync();
  expect([rig.store.all(), [...loaded.hidden]]).toEqual([[], ["fb-open"]]);
  // The control: the same load at another address places the note, as a load did before the copy was kept.
  await (await page(rig, { brainOrigin: "https://other.example" })).sync();
  expect(rig.store.all().map((n: any) => n.issue)).toEqual(["fb-open"]);
});

// pm-1-notes-put-away-are-kept: the cell `feedbackAway` is the list of the page's app, and Show writes the browser's item.
test("the cell feedbackAway is the list of the page's app, and Show takes the id out of this browser's item", async () => {
  items.clear();
  const rig = await newRig(), body = await (await load({})).value("feedbackBody");
  await open(rig, "fb-open", body);
  const inputs = { feedbackOn: true, brainOrigin: ADDRESS, brainClient: rig.client, a2Store: rig.store, feedbackNear: () => "Issues", brainModules: { modules: [] } };
  // The cell asks its app for the list: an app that answers a value of its own is what the cell is.
  expect(await (await load({ ...inputs, feedback: { list: () => "the list" } })).value("feedbackAway")).toBe("the list");
  // Off the owner's page it is a sentence, drawn with htl.
  expect(await (await load({ ...inputs, feedbackOn: false, htl: { html: (s: TemplateStringsArray) => s.join("") } })).value("feedbackAway")).toContain("for the owner, signed in at the Brain's address");
  const first = await page(rig);
  await first.sync();
  rig.store.remove(rig.store.all()[0].id);
  await first.gone();
  // A load: the app of the cell `feedback` lists what the item has, before any ask.
  rig.reload();
  const loaded = await page(rig);
  expect([loaded.putAway().map((r: any) => r.id), Object.keys(JSON.parse(items.get(AWAY)!))]).toEqual([["fb-open"], ["fb-open"]]);
  await loaded.sync();
  expect([rig.store.all(), loaded.putAway()]).toEqual([[], [{ id: "fb-open", title: "fb-open", state: "open" }]]);
  await loaded.show("fb-open");
  expect([rig.store.all().map((n: any) => n.issue), loaded.putAway(), [...items.keys()]]).toEqual([["fb-open"], [], []]);
  // And it stays shown over a load.
  rig.reload();
  await (await page(rig)).sync();
  expect(rig.store.all().map((n: any) => n.issue)).toEqual(["fb-open"]);
});
