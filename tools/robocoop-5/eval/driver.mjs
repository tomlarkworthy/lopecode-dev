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

  // Attachments come from the notebook's OWN inventory cell (@tomlarkworthy/fileattachments
  // `all_module_files`) rather than a reimplementation of the FileAttachment-map probe. Its `module`
  // field falls back to "main" for modules the runtime cannot name, so the owning module id is
  // re-derived here from runtime.mains + the `module <id>` variables (the CLAUDE.md pattern).
  async collectAttachments(page) {
    return page.evaluate(async ({ maxTextBytes }) => {
      const reg = globalThis.__ojs_runtime;
      const allVars = () => {
        const out = []; const seen = new Set();
        for (const m of reg.mains.values()) {
          const rt = m && m._runtime;
          if (!rt || seen.has(rt)) continue;
          seen.add(rt);
          for (const v of rt._variables) out.push(v);
        }
        return out;
      };
      const vars = allVars();
      const v = vars.find((x) => x._name === "all_module_files");
      if (!v) return [];
      // Force it: a fresh attachment only lands in the inventory once the cell recomputes.
      let files = [];
      try {
        if (v._module && typeof v._module.value === "function") files = await v._module.value("all_module_files");
      } catch { files = v._value; }
      if (!Array.isArray(files)) return [];

      const idOf = new Map();
      for (const x of vars) {
        if (typeof x._name === "string" && x._name.startsWith("module ") && x._value && x._value._scope)
          idOf.set(x._value, x._name.slice(7));
      }
      if (reg.mains) for (const [name, mod] of reg.mains) idOf.set(mod, name);

      const out = [];
      for (const f of files) {
        const rec = {
          module: idOf.get(f._module) || f.module || "?",
          name: f.name,
          mimeType: f.mimeType ?? null,
          size: f.size ?? 0,
          text: null,
        };
        // GZIP IS A STORAGE ENCODING, NOT A DIFFERENT ANSWER. Every JS attachment in the corpus is
        // stored compressed, so a criterion searching an attachment's text must see through it — a
        // 2026-08-30 mimo-v2.5 run stored a legitimate `paintbox.umd.js.gz` and lost
        // attachment_contains against binary. `size` stays the STORED size, so a criterion that means
        // to require compression (minBytes, nameMatches \.gz$) still measures what it did before.
        if (rec.size > 0 && rec.size <= maxTextBytes) {
          try {
            const res = await fetch(f.url);
            const gz = /gzip/i.test(rec.mimeType || "") || /\.gz$/i.test(rec.name || "");
            rec.text = gz
              ? await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text()
              : await res.text();
            rec.gzipped = gz;
          } catch { rec.text = null; }
        }
        out.push(rec);
      }
      return out;
    }, { maxTextBytes: 262144 });
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
