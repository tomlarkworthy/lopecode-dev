// robocoop-4 harness config for the shared driver core (tools/robocoop-eval/driver-core.mjs).
// Seeding and file snapshots go through the rc4_workspace seam (the just-bash virtual fs): seeded files
// land in the workspace and jbFileSync applies module files to the live runtime on its watch loop.
//
// The historical tool-surface arms (structured runtime API, nobash) were removed after the nobash
// experiment concluded: the no-bash surface is now a first-class agent — robocoop-5 — with its own
// harness at tools/robocoop-5/eval. The arm results live on in results/strategy/*.json.

import { createDriver as createCoreDriver } from "../../../robocoop-eval/driver-core.mjs";

const harness = (opts) => ({
  defaultLayout: "R100(S75(@tomlarkworthy/robocoop-4),S25(@tomlarkworthy/robocoop-4-hostbridge))",
  // For historical/foreign builds that predate the Claude-shaped file tools (the bash-only BEFORE
  // build in the A/B): don't wait for read_file to register before sending — that build has no such
  // tool, so the default gate would time out. Outcome criteria still apply.
  readyToolId: opts.legacyNoToolGate ? null : "read_file",
  extraForceVars: ["rc4_workspace"],
  forceModulePrefix: "robocoop-4",
  // Sync is REALTIME (jbFileSync watch loop, ~600ms poll): a module file the agent wrote during the
  // turn is applied to the live runtime a beat later — wait a couple of poll cycles.
  settleMs: 2000,

  async seedFiles(page, files) {
    await page.evaluate(async (files) => {
      const reg = globalThis.__ojs_runtime;
      let ws = null;
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt) continue;
        for (const v of rt._variables) if (v._name === "rc4_workspace") { ws = v._value; break; }
        if (ws) break;
      }
      if (!ws || !ws.fs || typeof ws.fs.writeFile !== "function")
        throw new Error("rc4_workspace.fs.writeFile unavailable");
      for (const [path, content] of Object.entries(files)) {
        const dir = path.slice(0, path.lastIndexOf("/"));
        if (dir && ws.fs.mkdir) { try { await ws.fs.mkdir(dir, { recursive: true }); } catch {} }
        await ws.fs.writeFile(path, String(content));
      }
    }, files);
  },

  async collectFiles(page) {
    return page.evaluate(async () => {
      const reg = globalThis.__ojs_runtime;
      let ws = null;
      for (const m of reg.mains.values()) {
        const rt = m && m._runtime;
        if (!rt) continue;
        for (const v of rt._variables) if (v._name === "rc4_workspace") { ws = v._value; break; }
        if (ws) break;
      }
      if (!ws || typeof ws.snapshot !== "function") return {};
      const snap = await ws.snapshot();
      const out = {};
      if (snap && typeof snap === "object") {
        for (const [path, contents] of Object.entries(snap)) {
          // /content is the raw block mirror (megabytes of attachment/library bytes) — for the agent
          // to read during the run, never needed for grading. Skip it so snapshots stay small.
          if (path.startsWith("/content/")) continue;
          if (typeof contents === "string") out[path] = contents;
        }
      }
      return out;
    });
  },
});

export async function createDriver(opts = {}) {
  return createCoreDriver({ ...opts, harness: harness(opts) });
}
