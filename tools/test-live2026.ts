// Offline verification of the LIVE-2026 essay: generated §-headings/refs + asides under trimmed mains
import { chromium } from "playwright";

const file = process.argv[2] ?? "lopebooks/notebooks/@tomlarkworthy_lopecode-live-2026.html";
const url = `file://${process.cwd()}/${file}`;

const browser = await chromium.launch();
const page = await browser.newPage();
const blocked: string[] = [];
await page.route(/^https?:\/\//, (r) => { blocked.push(r.request().url()); r.abort(); });
const errors: string[] = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
page.on("pageerror", (e) => errors.push("PAGEERROR " + String(e).slice(0, 200)));

await page.goto(url);
await page.waitForTimeout(10000);

const result = await page.evaluate(() => {
  const heading = (key: string) => {
    const el = document.getElementById(`sec-${key}`);
    return el ? `${el.tagName}: ${el.textContent}` : null;
  };
  const refLinks = Array.from(document.querySelectorAll('a[title^="§"]')).map(
    (a) => `${a.textContent}→${a.getAttribute("title")}`
  );
  return {
    headings: {
      ship: heading("ship"),
      mappings: heading("mappings"),
      atproto: heading("atproto"),
      limits: heading("limits"),
      questions: heading("questions")
    },
    refCount: refLinks.length,
    refSample: refLinks.slice(0, 6),
    missing: (document.body.innerText.match(/\[missing (section|ref): [^\]]+\]/g) || [])
  };
});
console.log("HEADINGS:", JSON.stringify(result.headings, null, 1));
console.log("REFS:", result.refCount, JSON.stringify(result.refSample));
console.log("MISSING:", JSON.stringify(result.missing));

// click a §-ref: the §13 link in s3p2 should scroll to sec-limits
const scrolled = await page.evaluate(async () => {
  const link = Array.from(document.querySelectorAll('a[title^="§13"]'))[0] as HTMLAnchorElement;
  if (!link) return "no §13 link";
  const target = document.getElementById("sec-limits")!;
  const before = target.getBoundingClientRect().top;
  link.click();
  await new Promise((r) => setTimeout(r, 1200));
  const after = target.getBoundingClientRect().top;
  return { before: Math.round(before), after: Math.round(after), moved: Math.abs(after - before) > 50 };
});
console.log("REF-CLICK:", JSON.stringify(scrolled));

// asides: robocoop-4 and csv-column-chooser must resolve (booted via trimmed mains)
for (const target of ["robocoop-4", "csv-column-chooser", "butter-synth", "module-map"]) {
  const ok = await page.evaluate(async (t) => {
    const a = Array.from(document.querySelectorAll("a")).find((x) =>
      (x.getAttribute("href") || "").includes(t)
    ) as HTMLAnchorElement;
    if (!a) return "no link";
    a.click();
    await new Promise((r) => setTimeout(r, 5000));
    const loading = Array.from(document.querySelectorAll("*")).some((el) =>
      (el.childElementCount === 0) && /loading .*…/.test(el.textContent || "")
    );
    return { hash: location.hash.slice(0, 30) + "…", stillLoading: loading };
  }, target);
  console.log(`ASIDE ${target}:`, JSON.stringify(ok));
  await page.evaluate(() => history.back());
  await page.waitForTimeout(1500);
}

console.log("CONSOLE-ERRORS:", JSON.stringify(errors.slice(0, 8)));
console.log("BLOCKED-URLS:", blocked.length);
await browser.close();
