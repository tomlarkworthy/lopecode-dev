// brain-x-fly (until 2026-10-14 tools/cloud-brain/brain-fly.ojs; since then changed as a patch in cloud-brain-dev), task 3 of plan/cloud-brain-worker-machine-on-fly.md, issue
// fly-3-brain-fly-service. The service's own tests are its test_* cells. This holds what a cell cannot read: that the
// machine body of the panel's set-up form is tools/cloud-brain/fly/machine.json, which a notebook cannot import, and
// that the path a caller gives fly.get and fly.post stays under the app. The cells are read from what cb4 runs, as
// cloud-brain-dev/deploy has it after `bun sync.ts`, never retyped: the seed was deleted on 2026-10-14, behind what ran.
import { expect, beforeAll } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { importNotebookModule } from "../../tools/notebook-import.ts";
import { testNeeding } from "./needs.ts";

const ROOT = resolve(import.meta.dir, "../..");
const module = resolve(ROOT, "cloud-brain-dev/deploy/@tomlarkworthy/brain-fly.js");
const test = testNeeding("fly-service.test.ts", [module], "git submodule update --init cloud-brain-dev, then bun sync.ts https://cb4.endpointservices.workers.dev there");

let fly: any;
beforeAll(async () => {
  if (module) fly = await importNotebookModule(module);
});

test("the machine body of the set-up form is fly/machine.json, and the image body is its config whole", async () => {
  const bodies = await fly.value("flyBodies");
  const file = JSON.parse(readFileSync(resolve(ROOT, "tools/cloud-brain/fly/machine.json"), "utf8"));
  expect(bodies.machine.body).toEqual(file);
  expect(Object.keys(bodies)).toEqual(["volume", "machine", "image"]);
  // An update of a machine is its whole config (Fly.io has no partial one): the image body's is the file's too, and nothing else is sent.
  expect(bodies.image.body).toEqual({ config: file.config });
  expect([bodies.image.path, bodies.image.method]).toEqual(["machines/<machine id>", "POST"]);
  for (const b of Object.values<any>(bodies)) expect(["POST", "PUT", "DELETE"]).toContain(b.method);
});

test("a path stays under /v1/apps/APP/, by the address the service would fetch", async () => {
  const flyPath = await fly.value("flyPath");
  const root = "https://api.machines.dev/v1/apps/cloudbrain/";
  for (const [path, to] of [["", root], ["machines", root + "machines"], ["machines/853145b4217618/start", root + "machines/853145b4217618/start"], ["machines?include_deleted=true", root + "machines?include_deleted=true"], ["volumes#x", root + "volumes"]])
    expect(flyPath("cloudbrain", path)).toBe(to);
  for (const path of ["..", "../", "../../other", "machines/..", "machines/../..", "%2e%2e/x", "%2E%2e", ".%2e/x", "..%2fx", "a%2F..%2F..", "/machines", "//evil.example", "https://evil.example/", "a\\..\\b", "%", "%zz", null, undefined, 3])
    expect([path, flyPath("cloudbrain", path as any)]).toEqual([path, null]);
});

test("the ids of work are the queue's without the three labels, in its order", async () => {
  const flyWork = await fly.value("flyWork"), d = await fly.value("flyDefaults");
  expect(d.not).toEqual(["needs-owner", "laptop", "digest"]);
  expect(flyWork([{ id: "b", labels: [] }, { id: "x", labels: ["laptop"] }, { id: "a", labels: ["major"] }, { id: "y", labels: ["digest"] }, { id: "z", labels: ["owner", "needs-owner"] }])).toEqual(["b", "a"]);
});
