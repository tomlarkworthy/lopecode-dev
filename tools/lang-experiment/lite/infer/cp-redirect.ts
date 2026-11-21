// bun --preload: lite/complete.test.ts's import of ./complete.ts resolves to cp-index.ts, so its cases run on the cells
import { plugin } from "bun";
import { join } from "node:path";
const TARGET = join(import.meta.dir, "..", "complete.ts"), TO = join(import.meta.dir, "cp-index.ts");
plugin({
  name: "cp-redirect",
  setup(build) {
    build.onResolve({ filter: /^\.\/complete\.ts$/ }, (args) => {
      if (!args.importer.endsWith("complete.test.ts") || join(args.importer, "..", args.path) !== TARGET) return undefined;
      console.error("cp-redirect: ./complete.ts -> infer/cp-index.ts");
      return { path: TO };
    });
  },
});
