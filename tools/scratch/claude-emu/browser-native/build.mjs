// Bundle the shim sources for the browser. Code-splitting (splitting:true)
// puts shared modules (registry, events, fs-core) into shared chunks so there
// is exactly ONE registry instance and ONE memfs volume across all entries.
import { build } from "esbuild";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "src");
const entryPoints = readdirSync(srcDir).filter((f) => f.endsWith(".mjs")).map((f) => join(srcDir, f));

// Map node:* (used by memfs's deps) to our own shim sources during bundling,
// so there is one implementation of each builtin and no unresolved import.
const NODE_ALIAS = {
  "node:path": "path.mjs", "node:buffer": "buffer.mjs", "node:stream": "stream.mjs",
  "node:events": "events.mjs", "node:util": "util.mjs", "node:os": "os.mjs",
  "node:fs": "fs.mjs", "node:crypto": "crypto.mjs", "node:url": "url.mjs",
  "node:assert": "extras.mjs", "node:process": "process.mjs",
};
const aliasPlugin = {
  name: "node-alias",
  setup(b) {
    b.onResolve({ filter: /^node:/ }, (args) => {
      const target = NODE_ALIAS[args.path];
      if (target) return { path: join(srcDir, target) };
      return { path: args.path, external: true };
    });
  },
};

const result = await build({
  entryPoints,
  outdir: join(here, "dist"),
  bundle: true,
  splitting: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  sourcemap: false,
  metafile: true,
  logLevel: "info",
  plugins: [aliasPlugin],
  define: { "process.env.NODE_ENV": '"production"' },
});

let total = 0;
for (const [f, o] of Object.entries(result.metafile.outputs)) total += o.bytes;
console.log(`\nbundled ${entryPoints.length} entries, total dist = ${(total / 1024).toFixed(1)} KB`);
