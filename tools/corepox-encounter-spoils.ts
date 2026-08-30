// The run layer's end-of-node screen, in a browser. The mission campaign's gate is
// tools/corepox-spoils-check.ts; this is the same popup on the other caller, and the
// thing worth checking is that the campaign is committed by the BUTTON -- a node that
// banks its scrap before the card is chosen would let a player jump away from the
// choice and still be paid.
//
//   bun tools/corepox-encounter-spoils.ts [kind]
import {chromium} from "playwright";

const KINDS = process.argv.slice(2).length ? process.argv.slice(2) : ["race", "duel"];
const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1000}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-duel-encounter))");
await p.waitForSelector("text=refit — spend the hold", {timeout: 60000});

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};
const camp = () => p.evaluate(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-duel-encounter");
  for (const [k, v] of m._scope) if (k === "viewof encounterDemo") return (v as any)._value.value;
});
const popup = () => p.evaluate(() => {
  const el: any = document.querySelector(".cpx-spoils");
  return el ? {cards: el.qa.cards.map((c: any) => ({items: c.items, rarity: c.rarity})),
               picked: el.qa.picked()} : null;
});

for (const kind of KINDS) {
  await p.selectOption("select >> nth=0", kind);
  await p.waitForTimeout(500);
  console.log(`--- ${kind} ---`);
  const before: any = await camp();
  console.log(`${kind}: hold before  ${JSON.stringify(before.parts)}  scrap ${before.scrap}\n`);

  // launch, and let the robot fly it -- a gate that has to fly the ship itself is a
  // gate on the pilot, and corepox-autopilot.ts is already that
  // clicked through the DOM: the notebook's own cell chrome sits over the bench, and a
  // pointer click on the button lands on the chrome instead (silently -- the bench
  // simply stays open, which is what the first version of this gate timed out on)
  await p.evaluate(() => {
    const b: any = [...document.querySelectorAll("button")].find(x => x.textContent!.includes("LAUNCH"));
    b.scrollIntoView({block: "center"}); b.click();
  });
  await p.waitForTimeout(600);
  if (await p.locator("select").count() > 1) await p.selectOption("select >> nth=1", "auto");
  await p.waitForSelector(".cpx-spoils", {timeout: 120000});

  const pop: any = await popup();
  console.log("  offered: " + (pop.cards.length
    ? pop.cards.map((c: any) => c.items.map((i: any) => i.type + (i.n > 1 ? "x" + i.n : "")).join("+") +
        ` (${c.rarity})`).join("   ")
    : "(no cards)"));
  ok(!!pop, "the popup ends the node");
  const verb = await p.locator(".cpx-spoils").innerText();
  console.log("  verb: " + verb.split("\n")[0]);

  // The campaign must NOT have moved yet: the card is part of the spoils.
  const mid: any = await camp();
  ok(JSON.stringify(mid.parts) === JSON.stringify(before.parts) && mid.scrap === before.scrap,
     "nothing is banked before the button", `scrap ${mid.scrap} hold ${JSON.stringify(mid.parts)}`);
  ok(mid.visited.length === before.visited.length, "and the node is not marked visited yet");

  const take = Math.min(1, Math.max(0, pop.cards.length - 1));
  const want = pop.cards[take]?.items?.[0] ?? null;
  await p.evaluate((i) => { const el: any = document.querySelector(".cpx-spoils");
                            el.qa.pick(i); el.qa.take(); }, take);
  await p.waitForTimeout(600);
  const after: any = await camp();
  ok(await p.locator(".cpx-spoils").count() === 0, "the button closes it");
  ok(after.visited.length === before.visited.length + 1, "the node is committed on the way out",
     JSON.stringify(after.visited));
  if (want) {
    const got = (after.parts[want.type] ?? 0) - (before.parts[want.type] ?? 0);
    ok(got === want.n, `the taken card is in the hold (${want.type} x${want.n})`,
       `${JSON.stringify(before.parts)} -> ${JSON.stringify(after.parts)}`);
    const others = pop.cards.filter((_: any, i: number) => i !== take)
      .flatMap((c: any) => c.items).filter((i: any) => i.type !== want.type);
    ok(others.every((i: any) => (after.parts[i.type] ?? 0) === (before.parts[i.type] ?? 0)),
       "the cards not taken are gone", others.map((i: any) => i.type).join(",") || "(none)");
  }
  ok(after.scrap >= before.scrap, "scrap is paid with it", `${before.scrap} -> ${after.scrap}`);
  // back to the picker for the next kind: choosing a node kind rebuilds the encounter
  if (KINDS.indexOf(kind) < KINDS.length - 1) {
    await p.selectOption("select", KINDS[KINDS.indexOf(kind) + 1]);
    await p.waitForTimeout(500);
  }
  console.log("");
}
console.log("\nconsole errors: " + (errs.length ? errs.slice(0, 4).join(" | ") : "none"));
if (errs.length) fail++;
await b.close();
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
