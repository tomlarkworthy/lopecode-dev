import { test } from "node:test";
import assert from "node:assert/strict";
import { warmSeeds, stockModuleIdsOf } from "../../tools/robocoop-5/eval/tbs/warm-seeds.mjs";

const html = `<script type="text/plain" id="@tomlarkworthy/robocoop-5" data-mime="application/javascript">x</script>
<script type="text/plain" id="@tomlarkworthy/robocoop-5/lib.js.gz" data-mime="application/gzip" data-encoding="base64">y</script>
<script type="text/plain" id="@tomlarkworthy/view" data-mime="application/javascript">z</script>`;

test("stock ids are the bundle's javascript modules, not their attachments", () => {
  assert.deepEqual([...stockModuleIdsOf(html)].sort(), ["@tomlarkworthy/robocoop-5", "@tomlarkworthy/view"]);
});

test("an agent module under the stock prefix is re-seeded; stock modules and /notebook are not", () => {
  const stock = stockModuleIdsOf(html);
  const snap = { files: {
    "/src/@tomlarkworthy/robocoop-5.js": "stock",
    "/src/@tomlarkworthy/submission.js": "agent, stock prefix",
    "/src/@user/harmonization.js": "agent",
    "/notebook/@tomlarkworthy/submission.js": "export",
    "/scratch/notes.txt": "scratch",
    "/src/builtin.js": "runtime builtins",
    "/src/d/57d79353bac56631@44.js": "hashed observable import",
  } };
  const out = warmSeeds({ "/local/seed.txt": "seed" }, snap, stock);
  assert.deepEqual(Object.keys(out).sort(), ["/local/seed.txt", "/scratch/notes.txt", "/src/@tomlarkworthy/submission.js", "/src/@user/harmonization.js"]);
});
