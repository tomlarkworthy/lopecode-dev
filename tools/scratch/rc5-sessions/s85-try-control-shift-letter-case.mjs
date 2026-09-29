// S85: try_control `keys` sends a Shift+letter chord with the capital letter, as Chromium does.
// rc5-train 20260929-0620-m56 ("Add a keyboard shortcut, Cmd+Shift+L…"): the agent wrote `ev.key === 'l' && ev.shiftKey`,
// which never fires in Chromium (Meta+Shift+L arrives as key "L", code "KeyL"; measured with Playwright 2026-09-29).
// pressKeys sent key "l", so try_control confirmed that dead handler. No model calls.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const { bootNotebook } = await import(pathToFileURL(resolve("tools/robocoop-5/lib/notebook-boot.mjs")).href);
const NB = resolve(process.argv[2] || "lopebooks/notebooks/@tomlarkworthy_robocoop-5.html");
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await sleep(300);
  const tools = () => new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => { try { return String((await tools().get(id).execute(args, {}))?.output ?? ""); } catch (e) { return "THREW " + e; } };
  const counter = (name, test) => `const _${name} = function _${name}(html, invalidation){
  const el = html\`<div tabindex="0">${name}</div>\`;
  el.value = 0;
  const on = e => { if (${test}) { el.value += 1; el.dispatchEvent(new Event("input", {bubbles: true})); } };
  document.addEventListener("keydown", on);
  invalidation.then(() => document.removeEventListener("keydown", on));
  return el;
};`;
  const SRC = `${counter("lower", "e.key === 'l' && e.metaKey && e.shiftKey")}
${counter("folded", "e.key.toLowerCase() === 'l' && e.metaKey && e.shiftKey")}
${counter("plain", "e.key === 'l' && e.metaKey && !e.shiftKey")}
const _report = function _report(lower, folded, plain){return(\`lower=\${lower} folded=\${folded} plain=\${plain}\`)};
export default function define(runtime, observer) {
  const main = runtime.module();
  for (const [n, f] of [["lower", _lower], ["folded", _folded], ["plain", _plain]]) {
    main.variable(observer("viewof " + n)).define("viewof " + n, ["html", "invalidation"], f);
    main.variable(observer(n)).define(n, ["Generators", "viewof " + n], (G, v) => G.input(v));
  }
  main.variable(observer("report")).define("report", ["lower", "folded", "plain"], _report);
  return main;
}`;
  await run("write_file", { file_path: "/src/@probe/chord.js", content: SRC });
  await sleep(500);
  const shift = await run("try_control", { module: "@probe/chord", control: "viewof folded", keys: "Meta+Shift+l" });
  const noShift = await run("try_control", { module: "@probe/chord", control: "viewof plain", keys: "Meta+L" });
  return {
    shift: shift.slice(0, 300), noShift: noShift.slice(0, 300),
    // the case-sensitive handler stays dead; the folded one fires; Meta+L without Shift arrives lower-case
    pass: /→ lower=0 folded=1 plain=0/.test(shift) && /→ lower=0 folded=\d plain=1/.test(noShift)
  };
});
console.log(JSON.stringify(out, null, 1));
await close();
process.exit(out.pass ? 0 : 1);
