// robocoop-5 harness config for the shared driver core (tools/robocoop-eval/driver-core.mjs).
// Seeding and file snapshots go through the rc5_host seam (seedFile/snapshotFiles) — a module path is
// compiled + applied to the live runtime, the same path the agent's write_file takes.

import { createDriver as createCoreDriver } from "../../robocoop-eval/driver-core.mjs";

const harness = {
  defaultLayout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))",
  readyToolId: "read_file",
  extraForceVars: ["rc5_host"],
  forceModulePrefix: "robocoop-5",
  // Applies are SYNCHRONOUS in robocoop-5 (write_file compiles + applies in the tool call).
  settleMs: 800,

  async seedFiles(page, files) {
    await page.evaluate(async (files) => {
      const reg = globalThis.__ojs_runtime;
      let host = null;
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt) continue;
        for (const v of rt._variables) if (v._name === "rc5_host") { host = v._value; break; }
        if (host) break;
      }
      if (!host || typeof host.seedFile !== "function")
        throw new Error("rc5_host.seedFile unavailable");
      for (const [path, content] of Object.entries(files)) {
        const r = await host.seedFile(path, String(content));
        if (r && r.ok === false) throw new Error("seed failed for " + path + ": " + r.msg);
      }
    }, files);
  },

  async collectFiles(page) {
    return page.evaluate(async () => {
      const reg = globalThis.__ojs_runtime;
      let host = null;
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt) continue;
        for (const v of rt._variables) if (v._name === "rc5_host") { host = v._value; break; }
        if (host) break;
      }
      if (!host || typeof host.snapshotFiles !== "function") return {};
      return await host.snapshotFiles(); // /src + /notebook synthesized, scratch included
    });
  },
};

export async function createDriver(opts = {}) {
  return createCoreDriver({ ...opts, harness });
}
