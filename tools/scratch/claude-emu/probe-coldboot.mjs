import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/claude-code-browser.html";
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
console.log(JSON.stringify({ ...r, pageErrors: errs.slice(0, 3) }, null, 1));
await b.close();
