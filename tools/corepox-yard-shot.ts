// The shipyard's "start from" picker, and what it loads. Checks the corpus is
// actually browsable there and that a hex-id design arrives whole.
import {chromium} from "playwright";
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1100, height: 900}});
const errs: string[] = [];
p.on("console", m => m.type() === "error" && errs.push(m.text()));
p.on("pageerror", e => errs.push(String(e)));
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-shipyard))");
await p.waitForSelector("optgroup", {state: "attached", timeout: 90000});
console.log(await p.evaluate(() => {
  const s = document.querySelector("select") as HTMLSelectElement;
  return [...s.querySelectorAll("optgroup")].map(g =>
    `${(g as HTMLOptGroupElement).label} -> ${g.children.length} options, first "${g.children[0].textContent!.trim()}"`)
    .join("\n") + `\ntotal options ${s.options.length}`;
}));
await p.screenshot({path: "tools/screenshots/yard-picker.png"});
// Ranks, not ids: the ids are 32-hex and typing one in by hand is how you end up
// testing a design that does not exist.
const keys: string[] = await p.evaluate((ranks) => {
  const s = document.querySelector("select") as HTMLSelectElement;
  const corpus = [...s.querySelectorAll("optgroup")][1].children;
  return ranks.map((r: number) => (corpus[r] as HTMLOptionElement).value);
}, process.argv.slice(2).map(Number));
for (const key of keys) {
  await p.selectOption("select", key);
  await p.waitForTimeout(700);
  console.log(key, await p.evaluate(() => {
    const root: any = [...document.querySelectorAll("*")].find((e: any) => e.editor);
    const sh = root.editor.qa.ship();
    return `${sh.comps.length} parts, ${sh.conns.length} wires, ` +
      `${sh.conns.filter((k: any) => sh.at(k.from[0], k.from[1]) && sh.at(k.to[0], k.to[1])).length} resolve`;
  }));
  // The view's own root, not the page: the board sits below the fold and a
  // full-page shot is 90% cell source.
  await p.evaluate(() => {
    const r: any = [...document.querySelectorAll("*")].find((e: any) => e.editor);
    r.setAttribute("data-yard", "1");
  });
  await p.locator("[data-yard]").screenshot({path: `tools/screenshots/yard-${key.slice(0, 8)}.png`});
}
console.log("console errors:", errs.slice(0, 5));
await b.close();
