// probe (20260928-0040-w9): a cell whose element shows markup as literal TEXT must not be reported as
// "✓ all cells compute". In run rc5t-analog-clock-r3 the agent built the clock hands as strings and
// interpolated them into htl.html`<svg>…${hand(...)}…</svg>`; htl inserts a string as a text node, so the
// face rendered with no hands and write_file said "✓ all 4 cells compute", values "clock=<line x1=…".
// PASS: the string-built module's write result carries the literal-markup warning and names the cell;
//       the same clock built from htl.svg fragments gets no warning.
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { readFileSync } from "node:fs";
import { bootNotebook } from "../../robocoop-5/lib/notebook-boot.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const NB = process.argv[2] ? resolve(process.argv[2]) : join(here, "notebook.html");
const bad = readFileSync(join(here, "fixtures/s27-svg-as-text.js"), "utf8");
// run rc5t-analog-clock-r1 (base): ticks and numerals as htl.html`<line …>` inside <svg> — HTML elements, not drawn
const ns = readFileSync(join(here, "fixtures/s27-html-in-svg.js"), "utf8");
const good = (await import(join(here, "../../robocoop-5/eval/rc5t/analog-clock.mjs"))).default.oracle[0].args.content;
const { page, close } = await bootNotebook({ notebookPath: NB, layout: "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))" });
const out = await page.evaluate(async ({ bad, good, ns }) => {
  const H = window.__nbHelpers;
  ["toolsView", "hostSetup"].forEach(n => H.force(n)); await new Promise(r => setTimeout(r, 1500));
  const t0 = Date.now();
  while (Date.now() - t0 < 25000 && !(H.byName("toolsView")?.value?.length >= 10)) await new Promise(r => setTimeout(r, 300));
  const byId = new Map(H.byName("toolsView").value.map(t => [t.id, t]));
  const run = async (id, args) => String((await byId.get(id).execute(args, { sessionState: {} }))?.output ?? "");
  const b = await run("write_file", { file_path: "/src/@probe/clock-bad.js", content: bad });
  const g = await run("write_file", { file_path: "/src/@probe/clock-good.js", content: good });
  const n = await run("write_file", { file_path: "/src/@probe/clock-ns.js", content: ns });
  // false positives: every Element value on the page, through the same check (a copy; the tool's is private)
  const flagged = [];
  let els = 0;
  for (const v of window.__ojs_runtime._variables) {
    const x = v._value;
    if (!(x instanceof Node) || /@probe/.test(v._module?._name || "")) continue;
    els++;
    const w = document.createTreeWalker(x, 4);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      if (n.parentElement && n.parentElement.closest("code,pre,textarea,script,style,kbd,samp,[contenteditable],.cm-editor")) continue;
      const m = /<\/?[a-zA-Z][\w:-]*(\s+[\w:-]+\s*=\s*["'][^"'<>]*["'])+\s*\/?>/.exec(n.data);
      if (m) { flagged.push(v._name + ": " + m[0].slice(0, 40)); break; }
    }
  }
  return { bad: b, good: g, ns: n, els, flagged };
}, { bad, good, ns });
const warnBad = /literal (markup|TEXT)/i.test(out.bad) && /clock/.test(out.bad.match(/⚠[^·]*literal[^·]*/i)?.[0] || "");
const warnGood = /literal (markup|TEXT)|inside <svg>/i.test(out.good);
const warnNs = /HTML <(line|text)> inside <svg>/.test(out.ns);
console.log("ns  :", (out.ns.match(/⚠[^·]*inside <svg>[^·]*/) || [out.ns.slice(0, 300)])[0].slice(0, 400));
console.log("bad :", out.bad.slice(0, 700));
console.log("good:", out.good.slice(0, 300));
console.log("false-positive scan:", out.flagged.length, "of", out.els, "element values flagged", out.flagged.slice(0, 10));
const ok = warnBad && warnNs && !warnGood && out.flagged.length === 0;
console.log(ok ? "PASS" : `FAIL (warning on string-built: ${warnBad}, on htl.html-in-svg: ${warnNs}, on htl.svg-built: ${warnGood}, page false positives: ${out.flagged.length})`);
await close();
process.exit(ok ? 0 : 1);
