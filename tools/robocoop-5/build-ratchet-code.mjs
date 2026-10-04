// ratchet-code.html = the robocoop-5 notebook plus the training-only plugins, which no shipped module names.
// Today one plugin: @tomlarkworthy/robocoop-5-spec-lock. Its block in ratchet-code.html is the source of truth;
// everything else in the file is rebuilt from the robocoop-5 canonical.
//   node tools/robocoop-5/build-ratchet-code.mjs            rebuild in place (keeps the plugin block)
//   node tools/robocoop-5/build-ratchet-code.mjs --check    exit 1 if the file is not what a rebuild gives
//   node tools/robocoop-5/build-ratchet-code.mjs --source modules/@tomlarkworthy/robocoop-5-spec-lock.js   first build
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
export const CANONICAL = join(root, "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
export const RATCHET = join(root, "lopebooks/notebooks/ratchet-code.html");
export const PLUGIN = "@tomlarkworthy/robocoop-5-spec-lock";
const open = (id) => `<script id="${id}" \n  type="text/plain"\n  data-mime="application/javascript"\n>\n`;

export function pluginSource(html) {
  const at = html.indexOf(open(PLUGIN));
  if (at < 0) return null;
  const from = at + open(PLUGIN).length;
  return html.slice(from, html.indexOf("\n</script>", from));
}
export function build(notebookHtml, source) {
  if (notebookHtml.includes(`<script id="${PLUGIN}"`)) throw new Error("the notebook already holds " + PLUGIN);
  const boot = notebookHtml.lastIndexOf('<script id="bootconf.json"');
  if (boot < 0) throw new Error("no bootconf.json");
  const mains = /"mains": (\[[^\n]*\]),\n/.exec(notebookHtml.slice(boot));
  const list = JSON.parse(mains[1]);
  const conf = notebookHtml.slice(boot).replace(mains[0], `"mains": ${JSON.stringify([...list, PLUGIN])},\n`);
  return notebookHtml.slice(0, boot) + open(PLUGIN) + source.replace(/\n$/, "") + "\n</script>\n" + conf;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const src = args.includes("--source") ? readFileSync(args[args.indexOf("--source") + 1], "utf8")
    : existsSync(RATCHET) ? pluginSource(readFileSync(RATCHET, "utf8")) : null;
  if (src == null) { console.error("no plugin source: pass --source <file.js> for the first build"); process.exit(2); }
  const out = build(readFileSync(CANONICAL, "utf8"), src);
  if (args.includes("--check")) {
    const same = existsSync(RATCHET) && readFileSync(RATCHET, "utf8") === out;
    console.log(same ? "ratchet-code.html is the canonical plus the plugin" : "ratchet-code.html is STALE: run tools/robocoop-5/build-ratchet-code.mjs");
    process.exit(same ? 0 : 1);
  }
  writeFileSync(RATCHET, out);
  console.log("wrote", RATCHET, (out.length / 1e6).toFixed(2) + " MB");
}
