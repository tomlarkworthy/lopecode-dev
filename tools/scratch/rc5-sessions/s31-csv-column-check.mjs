// rc5t-expenses-monthly probe (model-free): request_files' result must name the values a 5-line preview hides.
// Pulls @tomlarkworthy/robocoop-5-srctools out of the notebook (argv[2]), takes its columnCheck helper and runs
// it on a CSV with "$1,450.00" amounts, blank amounts and "groceries"/"Groceries". Fails if the helper is
// missing or the note does not name each problem.
import { readFileSync } from "node:fs";
const nb = process.argv[2];
if (!nb) { console.error("usage: node probe.mjs <notebook.html>"); process.exit(2); }
const html = readFileSync(nb, "utf8");
const m = html.match(/<script[^>]*id="@tomlarkworthy\/robocoop-5-srctools"[^>]*>([\s\S]*?)<\/script>/);
if (!m) { console.log("FAIL no robocoop-5-srctools module"); process.exit(1); }
const src = m[1];
const a = src.indexOf("  const columnCheck = "), b = src.indexOf("  const request_files = defineTool");
if (a < 0 || b < a) { console.log("FAIL request_files has no column check: a 5-line preview is all the agent sees of the file"); process.exit(1); }
const columnCheck = new Function(src.slice(a, b) + "\nreturn columnCheck;")();
const csv = ["date,category,amount", "2026-01-01,Rent,1450.00", "2026-01-03,Groceries,52.10", "2026-01-09,groceries,39.59",
  "2026-02-01,Rent,\"$1,450.00\"", "2026-02-19,Dining,", "2026-02-20,Dining,18.00"];
const note = columnCheck(csv, ",");
const checks = {
  currency: /amount:.*"\$1,450\.00"/.test(note),
  blank: /amount:.*1 blank/.test(note),
  typedWarning: /typed: true/.test(note),
  caseSplit: /category:.*"groceries".*"Groceries"|category:.*"Groceries".*"groceries"/.test(note),
  cleanFileQuiet: columnCheck(["city,pop", "Berlin,3677472", "Paris,2102650"], ",") === "",
};
const ok = Object.values(checks).every(Boolean);
console.log((ok ? "PASS " : "FAIL ") + JSON.stringify(checks) + "\n" + note);
process.exit(ok ? 0 : 1);
