// PATCH at the repair berth. Tom, 2026-08-22: "patch in the space station doesn't
// seem to repair the ship", and before it "after repairing a node on a space
// station, I did not see the nodes look fixed".
//
// The demo hull arrives undamaged, so the gate wounds it the way a battle does --
// on the LIVE component -- and then re-enters the berth, which is what turns a
// wound into `dmg` in the spec the quote is priced from.
//
//   bun tools/corepox-station-repair.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1400, height: 1100}});
const errs: string[] = [];
p.on("pageerror", (e) => errs.push("pageerror: " + e.message));
p.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text().slice(0, 160)); });
await p.goto("file://" + process.cwd() +
  "/lopebooks/notebooks/corepox.html#view=R100(S100(@tomlarkworthy/corepox-duel-encounter))");
await p.waitForTimeout(14000);

let fail = 0;
const ok = (cond: any, label: string, detail = "") => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`);
  if (!cond) fail++;
};
// The station mounts a shipEditor, whose root carries `.qa` and `.board`
// directly; the refit bench wraps one and carries `.editor`. Match the editor.
const board = () => p.evaluate(() => {
  const s = (window as any).__ed().qa.session().player;
  return {hp: s.comps.map((c: any) => `${c.type}@${c.px},${c.py} ${c.hp}/${c.maxHp}`),
          hurt: s.comps.filter((c: any) => c.hp < c.maxHp).length};
});
// A battle wounds the LIVE component; `dmg` only reaches the spec when the editor
// republishes it, which nothing here has done -- so republish through the board's
// own writer rather than hand-authoring a damaged spec.
const wound = (n: number) => p.evaluate((amount) => {
  const ed: any = (window as any).__ed();
  const c = ed.qa.session().player.comps[0];
  c.hp = Math.max(1, c.hp - amount);
  ed.value = ed.board.spec();
  return `${c.type} ${c.hp}/${c.maxHp} dmg=${
    ed.value.components.find((x: any) => x.type === c.type)?.dmg}`;
}, n);
const label = (text: string) => p.locator(`text=${text}`).first();
// The demo root also carries a campaign value and it is the OUTER one -- it only
// moves when the visit ends. The station's own root is nested inside it, so take
// the deepest match.
const scrap = () => p.evaluate(() => {
  const all: any[] = [...document.querySelectorAll("div")].filter((e: any) => e.value?.scrap != null);
  return all.length ? all[all.length - 1].value.scrap : null;
});

// The station is reached the way a run reaches it: the encounter demo's node-kind
// picker, at a `repair` node (ENCOUNTER_RULES.repair -> station, berth "repair").
await p.selectOption("select", "repair");
await p.waitForTimeout(9000);
await p.evaluate(() => {
  (window as any).__ed = () => [...document.querySelectorAll("div")]
    .find((e: any) => e.qa?.session && e.board);
  (window as any).__ed().qa.svg().scrollIntoView({block: "center"});
});
await p.waitForTimeout(500);
console.log("docked", JSON.stringify(await board()));

console.log("wounded", await wound(20));
// Entering the berth rebuilds from the live hull, so the wound becomes spec `dmg`.
await p.locator("text=patch the hull").first().click();
await p.waitForTimeout(600);
const hurtIn = await board();
ok(hurtIn.hurt > 0, "the berth carries the damage in", JSON.stringify(hurtIn.hp));
const patch = p.locator("button", {hasText: "PATCH"}).first();
ok(await patch.count() > 0, "PATCH is offered, priced");
const before = await scrap();
await patch.click();
await p.waitForTimeout(700);
const after = await board(), spent = await scrap();
ok(after.hurt === 0, "PATCH repairs every component", JSON.stringify(after.hp));
ok(before != null && spent != null && spent < before, "PATCH is paid for",
   `${before} -> ${spent}`);
const gone = await p.locator("button", {hasText: "PATCH"}).count();
ok(gone === 0, "the quote is spent -- the berth now reads NO DAMAGE", String(gone));

console.log(errs.length ? "console errors:\n  " + errs.slice(0, 5).join("\n  ") : "0 console errors");
console.log(fail ? `\n${fail} FAILED` : "\nPASS");
await b.close();
process.exit(fail ? 1 : 0);
