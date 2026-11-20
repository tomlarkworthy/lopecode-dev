// Runs an existing test file unchanged with every import of lite/browser/cells.ts resolved to shell.ts.
// Run: bun selfhost/sched/run-tests.ts <lite/stdlib/runtime.test.ts | lite/browser/delivery.test.ts> [args]
// SCHED_BREAK=1 drops every third listener call (a negative control: the tests must fail).
import { plugin } from "bun";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const original = resolve(here, "../../lite/browser/cells.ts");
const shell = resolve(here, "shell.ts");
const stepFile = resolve(here, "step.ss.ts");
const broken = process.env.SCHED_BREAK === "1";
let redirected = 0;
plugin({
  name: "sched-shell",
  setup(build) {
    build.onResolve({ filter: /step\.ss\.ts$/ }, (args) =>
      broken && args.importer === shell && resolve(dirname(args.importer), args.path) === stepFile ? { path: resolve(here, "break.ts") } : undefined);
    build.onResolve({ filter: /cells\.ts$/ }, (args) => {
      if (resolve(dirname(args.importer), args.path) !== original) return undefined;
      redirected++;
      return { path: shell };
    });
  },
});
const file = resolve(process.argv[2]);
process.argv.splice(1, 2, file);
let Sh: { stepsRun(): number } | null = null;
process.on("exit", () => console.log(`sched: ${redirected} imports of cells.ts redirected, ${Sh?.stepsRun() ?? 0} steps run${broken ? ", step BROKEN" : ""}`));
const test = import(file);
import(shell).then((m) => (Sh = m));
await test;
