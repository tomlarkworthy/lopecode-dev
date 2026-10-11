// Writes verifycheck-1.json (its test passes), -2.json (its test fails) and -3.json (passes again): a scratch
// service for the live check that the deployer puts back a version whose test fails. Not part of the Brain.
//   bun tools/scratch/cloud-brain-experiments/verify-page/mk-verifycheck.ts
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
const record = (n: number, test: string) => {
  const text = `
const _brainverifycheck_verifycheck_service = function _verifycheck_service(cloudflare,Response) {return (cloudflare.Service(
  "verifycheck",
  async () => Response.json({ version: ${n} }),
  { methods: { "com.lopecode.brain.verifycheck.say": { type: "query", who: "owner" } } }
));};
const _brainverifycheck_test_verifycheck = function _test_verifycheck() {${test}};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  $def("_brainverifycheck_verifycheck_service", "verifycheck_service", ["cloudflare","Response"], _brainverifycheck_verifycheck_service);  
  $def("_brainverifycheck_test_verifycheck", "test_verifycheck", [], _brainverifycheck_test_verifycheck);  
  main.define("module @tomlarkworthy/cloudflare-iac", async () => runtime.module((await import("/@tomlarkworthy/cloudflare-iac.js?v=4")).default));  
  main.define("cloudflare", ["module @tomlarkworthy/cloudflare-iac", "@variable"], (_, v) => v.import("cloudflare", _));
  return main;
}
`;
  writeFileSync(resolve(import.meta.dir, `../../../cloud-brain/.emitted/verifycheck-${n}.json`), JSON.stringify({ name: "verifycheck", hash: "scratch", meta: { worker: "brain-x-verifycheck", secrets: [] }, source: { module: "@tomlarkworthy/brain-verifycheck", text } }));
};
record(1, `return "version 1 passes";`);
record(2, `throw new Error("version 2 is broken on purpose");`);
record(3, `return "version 3 passes";`);
console.log("written");
