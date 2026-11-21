// Runs an existing test file unchanged with every import of prelude.runtime.ts resolved to shell.ts (shell.ts's
// own import of it, for snapshot, equals and the capabilities, and this file's (Bun gives it no importer), to compare exports, are left alone).
// Run: bun selfhost/sched-store/run-tests.ts <lite/stdlib/runtime.test.ts | lite/browser/delivery.test.ts> [args]
// Negative controls (the tests must fail): STORE_BREAK=1 keeps the writes of a top-level call that threw;
// STORE_BREAK=2 lets a write or read made outside an action through.
import { plugin } from "bun";
import { dirname, resolve } from "node:path";

const here = dirname(new URL(import.meta.url).pathname);
const original = resolve(here, "../../prelude.runtime.ts");
const shell = resolve(here, "shell.ts");
const stepFile = resolve(here, "step.ss.ts");
const breakFile = ({ "1": "break.ts", "2": "break-owner.ts" } as Record<string, string>)[process.env.STORE_BREAK ?? ""];
const broken = breakFile !== undefined;
let redirected = 0;
const importers = new Set<string>();
plugin({
  name: "store-shell",
  setup(build) {
    build.onResolve({ filter: /step\.ss\.ts$/ }, (args) =>
      broken && args.importer === shell && resolve(dirname(args.importer), args.path) === stepFile ? { path: resolve(here, breakFile!) } : undefined);
    build.onResolve({ filter: /prelude\.runtime\.ts$/ }, (args) => {
      if (args.importer === shell || args.importer === "" || args.importer === import.meta.path || resolve(dirname(args.importer), args.path) !== original) return undefined;
      redirected++;
      importers.add(args.importer.replace(resolve(here, "../..") + "/", ""));
      return { path: shell };
    });
  },
});
const file = resolve(process.argv[2]);
process.argv.splice(1, 2, file);
const O = await import(original), Sh = await import(shell);
const ko = Object.keys(O).sort().join(","), ks = Object.keys(Sh).filter((k) => !["stepsRun", "storesHeld"].includes(k)).sort().join(",");
if (ko !== ks) throw new Error(`exports differ:\n  original ${ko}\n  shell    ${ks}`);
process.on("exit", () => console.log(`store: ${redirected} imports of prelude.runtime.ts redirected (${[...importers].join(", ")}), ${Sh.stepsRun()} steps run, ${Sh.storesHeld()} stores held at exit; the original's rt.commits ${O.rt.commits}${broken ? `, step BROKEN (${breakFile})` : ""}`));
await import(file);
