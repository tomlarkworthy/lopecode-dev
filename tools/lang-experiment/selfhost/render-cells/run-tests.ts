// Runs an existing test file unchanged with every import of lite/jsx/render.ts resolved to shell.ts.
// Run: BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 bun selfhost/render-cells/run-tests.ts lite/jsx/proof.ts [args]
// RENDER_BREAK=1 links keepsNode as "never": every same-tag child is replaced, not patched (a negative control).
import { plugin } from "bun";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const original = resolve(here, "../../lite/jsx/render.ts");
const shell = resolve(here, "shell.ts");
const broken = process.env.RENDER_BREAK === "1";
let redirected = 0;
plugin({
  name: "render-shell",
  setup(build) {
    build.onResolve({ filter: /render\.ts$/ }, (args) => {
      if (resolve(dirname(args.importer), args.path) !== original) return undefined;
      redirected++;
      return { path: shell };
    });
  },
});
const file = resolve(process.argv[2]);
process.argv.splice(1, 2, file);
process.on("exit", () => console.log(`render: ${redirected} import(s) of render.ts redirected${broken ? ", keepsNode BROKEN" : ""}`));
const sh = await import(shell);
if (broken) sh.useCells({ keepsNode: () => () => false });
await import(file);
