// Does the saved file work when opened fresh, and is it safe to publish?
// A live tab is not evidence of either: cells restored from change history never reach
// disk, and a prerender snapshot bakes whatever was on screen — which has shipped local
// paths, a session id and a command log before now.
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
const NB = process.argv[2] || "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";

// Scanned against the FILE, not the DOM: the prerender is deleted at boot, so anything
// baked into it is invisible to a page query and still public in the repo.
const LEAKS = [
  [/sk-or-v1-[A-Za-z0-9]{10}/, "OpenRouter key"],
  [/sk-ant-(?:api|oat)\d{2}-[A-Za-z0-9_-]{10}/, "Anthropic credential"],
  [/ghp_[A-Za-z0-9]{10}|AKIA[0-9A-Z]{12}|xoxb-\d/, "third-party token"],
];
// Reported, not blocked — judged not sensitive for this corpus: a cc= token only
// authorises a loopback port on the machine that exported the file, and the paths carry a
// username already published under @tomlarkworthy.
const NOTES = [
  [/cc=LOPE-\d{3,}-[A-Z0-9]{4}/, "pairing token"],
  [/\/Users\/[a-z][\w.-]+\//i, "local absolute path"],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl/, "session transcript id"],
];
const src = readFileSync(NB, "utf8");
const scan = (rules) => rules.filter(([re]) => re.test(src)).map(([re, what]) => ({ what, sample: String(src.match(re)[0]).slice(0, 40) }));
const leaks = scan(LEAKS);
const notes = scan(NOTES);

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1400, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e.message).slice(0, 120)));
await p.goto("file://" + NB, { waitUntil: "load", timeout: 90000 });
await p.waitForTimeout(15000);
const r = await p.evaluate(() => ({
  title: document.title,
  intro: /What I Like Doing/.test(document.body.innerText),
  note: /can you read this Claude/.test(document.body.innerText),
  errorNodes: document.querySelectorAll(".observablehq--error").length,
  errorText: [...document.querySelectorAll(".observablehq--error")].slice(0, 3).map((n) => n.textContent.slice(0, 90)),
  terminal: !!document.getElementById("cb-term"),
}));
const prerenderKB = (() => {
  const i = src.indexOf('<div id="lope-prerender">');
  if (i < 0) return 0;
  const j = src.indexOf('<script id="lope-prerender-cleanup"', i);
  return j < 0 ? -1 : Math.round((j - i) / 1024);
})();
console.log(JSON.stringify({ ...r, prerenderKB, leaks, notes, pageErrors: errs.slice(0, 3) }, null, 1));
await b.close();
process.exit(leaks.length ? 1 : 0);
