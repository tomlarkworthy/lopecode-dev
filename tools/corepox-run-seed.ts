// A run should not open on the same galaxy every time. Tom, 2026-08-23: "we should
// get a random seed every corepox-app galaxy explore map".
//
// Two claims, and the second is the one that is easy to get wrong: the seed differs
// between loads, AND the landing screen's route preview is still the board LAUNCH
// opens. The preview used to call `genRun()` bare, which took the module default of
// 41 -- correct only while the map's default was also 41.
//
//   bun tools/corepox-run-seed.ts
import {chromium} from "playwright";

const b = await chromium.launch();
let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};
const errs: string[] = [];

// One page load: the seed the map is on, the seed the landing screen advertises, and
// the node ids of both graphs. Ids come from `genRun`, so two runs on one seed have
// the same ids and two runs on different seeds almost never do.
const load = async () => {
  const p = await b.newPage({viewport: {width: 1400, height: 1000}});
  p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
  await p.goto("file://" + process.cwd() +
    "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-app))");
  await p.waitForTimeout(15000);
  const landing = await p.evaluate(() =>
    (document.querySelector(".cx-where") as any)?.textContent?.trim() ?? null);

  // LAUNCH mounts the real map. Its header prints the seed it is on -- that is the
  // check that matters: the landing graph is the board, not a picture of one.
  await p.click(".cx-launch");
  await p.waitForTimeout(4000);
  const map = await p.evaluate(() =>
    [...document.querySelectorAll("span")]
      .map((e: any) => e.textContent?.trim() ?? "")
      .find((t: string) => /^RUN \d+$/.test(t)) ?? null);

  await p.close();
  return {landing, map};
};

const a = await load();
const z = await load();
console.log("load 1", JSON.stringify(a));
console.log("load 2", JSON.stringify(z));

const seedOf = (s: string | null) => {
  const m = /RUN\s+(\d+)/.exec(s ?? "");
  return m ? +m[1] : null;
};
ok(seedOf(a.landing) != null, "the landing screen names its run", String(a.landing));
ok(seedOf(a.landing) !== 41 || seedOf(z.landing) !== 41,
   "and it is not pinned at 41", `${seedOf(a.landing)} / ${seedOf(z.landing)}`);
ok(seedOf(a.landing) !== seedOf(z.landing),
   "two loads explore two galaxies", `${seedOf(a.landing)} vs ${seedOf(z.landing)}`);
ok(seedOf(a.map) != null && seedOf(a.map) === seedOf(a.landing),
   "LAUNCH opens the galaxy the landing previewed", `${a.landing} -> ${a.map}`);
ok(seedOf(z.map) != null && seedOf(z.map) === seedOf(z.landing),
   "and again on the second load", `${z.landing} -> ${z.map}`);

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 5).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
