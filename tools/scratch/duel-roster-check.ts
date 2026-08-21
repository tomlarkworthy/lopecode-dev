// The duel's picker after the roster moved to corepox-shipyard: still two groups,
// still 2208 keys, and its two defaults still resolve.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1280, height: 900}});
const errs: string[] = [];
p.on("console", m => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", e => errs.push(String(e)));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel))");
await p.waitForSelector("optgroup", {state: "attached", timeout: 90000});
console.log(await p.evaluate(() => [...document.querySelectorAll("select")]
  .filter(s => s.querySelector("optgroup"))
  .map(s => `${s.options.length} options in ${s.querySelectorAll("optgroup").length} groups, ` +
            `selected "${s.selectedOptions[0].textContent!.trim()}"`).join("\n")));
await p.waitForTimeout(3000);
console.log("console errors:", errs.slice(0, 5));
await b.close();
