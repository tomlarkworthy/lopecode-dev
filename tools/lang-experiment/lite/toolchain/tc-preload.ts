// bun --preload ./toolchain/tc-preload.ts toolchain/<test>.ts: the test file's own imports of the toolchain files
// resolve to tc-shim.ts; every other importer (core.ts, stdlib, ts-cells.ts, tc-index.ts) keeps the shipped files.
import { plugin } from "bun";
import { join } from "node:path";
const SHIM = join(import.meta.dir, "tc-shim.ts");
const TESTS = /\/lite\/(toolchain\/[\w-]+\.test\.ts|browser\/erase\.test\.ts)$/;
export const redirected: string[] = [];
plugin({
  name: "tc-redirect",
  setup(build) {
    build.onResolve({ filter: /(ss-toolchain|comment-types|module-js|erase)\.ts$/ }, (args) => {
      if (!TESTS.test(args.importer)) return undefined;
      redirected.push(`${args.importer} ${args.path}`);
      if (process.env.TC_SHOW) console.error(`tc-preload: ${args.importer} imports ${args.path} -> tc-shim.ts`);
      return { path: SHIM };
    });
  },
});
