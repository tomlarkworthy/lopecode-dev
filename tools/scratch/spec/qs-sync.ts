import { $ } from "bun";
const pairs: [string, string][] = [
  ["robocoop-5", "@tomlarkworthy_robocoop-5"], ["robocoop-5-engine", "@tomlarkworthy_robocoop-5"],
  ["robocoop-5-srctools", "@tomlarkworthy_robocoop-5"], ["robocoop-5-sessions", "@tomlarkworthy_robocoop-5"],
  ["file-sync", "@tomlarkworthy_file-sync"], ["annotate", "@tomlarkworthy_annotate"],
  ["js-toolchain", "@tomlarkworthy_notebook-kit"], ["pyodide", "@tomlarkworthy_pyodide"],
  ["switchboard", "@tomlarkworthy_robocoop-5"],
];
for (const [m, nb] of pairs) {
  const extra = m === "switchboard" ? ["--insert-ok"] : [];
  const r = await $`bun tools/channel/sync-module.ts --module ${"@tomlarkworthy/" + m} --source ${"lopebooks/notebooks/" + nb + ".html"} --target lopecode/notebooks/quick_start.html ${extra}`.nothrow().quiet();
  const lines = (r.stdout.toString() + r.stderr.toString()).trim().split("\n");
  console.log(m, "::", r.exitCode, lines.slice(-2).join(" | ").slice(0, 160));
}
