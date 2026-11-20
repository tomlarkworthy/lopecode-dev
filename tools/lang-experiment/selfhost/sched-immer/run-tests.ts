// ../sched/run-tests.ts redirecting cells.ts to this folder's shell.ts. Variant from SCHED_VARIANT.
// Run: SCHED_VARIANT=immer-bucket-freeze bun selfhost/sched-immer/run-tests.ts lite/stdlib/runtime.test.ts
import { plugin } from "bun";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const original = resolve(here, "../../lite/browser/cells.ts");
const shell = resolve(here, "shell.ts");
let redirected = 0;
plugin({
  name: "sched-immer-shell",
  setup(build) {
    build.onResolve({ filter: /cells\.ts$/ }, (args) => {
      if (resolve(dirname(args.importer), args.path) !== original) return undefined;
      redirected++;
      return { path: shell };
    });
  },
});
const file = resolve(process.argv[2]);
process.argv.splice(1, 2, file);
let Sh: { stepsRun(): number; variant: string } | null = null;
process.on("exit", () => console.log(`sched-immer ${Sh?.variant}: ${redirected} imports of cells.ts redirected, ${Sh?.stepsRun() ?? 0} steps run`));
const test = import(file);
import(shell).then((m) => (Sh = m));
await test;
