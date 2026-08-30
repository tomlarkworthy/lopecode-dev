// The end-of-mission popup, in a browser ("Shipyard Concepts" turn 11).
//
// What this gate is for: a mission used to PRINT its spoils and hand over nothing,
// so "you won an Explosive" was a line of text and the next mission started from
// its own authored inventory. The thing worth checking is therefore not that a
// popup appears -- it is that a card TAKEN at mission 5 is in the rail at mission 6,
// and that the two cards not taken are gone for good.
//
// It ends missions through `qa.end(verdict)` rather than playing them, because
// tools/corepox-qa-campaign.ts already plays all twelve by clicking and duplicating
// that here would make this gate fail for reasons that have nothing to do with
// spoils. The offer, the carry and the buttons are the same code a real win runs.
//
//   bun tools/corepox-spoils-check.ts
import {chromium} from "playwright";

const b = await chromium.launch();
const p = await b.newPage({viewport: {width: 1500, height: 1100}});
const errs: string[] = [];
p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("pageerror: " + e.message));
await p.goto("file://" + process.cwd() + "/lopebooks/notebooks/corepox.html" +
  "#view=R100(S100(@tomlarkworthy/corepox-game))");
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});

const qa = () => p.evaluateHandle(() => {
  const m = (window as any).__ojs_runtime.mains.get("@tomlarkworthy/corepox-game");
  for (const [k, v] of m._scope) if (k === "viewof game") return (v as any)._value.qa;
});
const call = async (fn: (q: any, arg: any) => any, arg: any = null) =>
  p.evaluate(([q, f, a]: any) => new Function("q", "a", "return (" + f + ")(q, a)")(q, a),
             [await qa(), fn.toString(), arg] as any);
const skipIntro = async () => {
  for (let i = 0; i < 8 && await p.locator(".cpx-cutscene").count(); i++) {
    await p.click(".cpx-cutscene"); await p.waitForTimeout(90);
  }
};
await skipIntro();

let fail = 0;
const ok = (c: any, label: string, detail = "") => {
  console.log(`${c ? "  ok  " : "FAIL  "}${label}${detail ? "   " + detail : ""}`); if (!c) fail++;
};

// ---- a win offers a choice -------------------------------------------------
console.log("a cleared mission offers cards, and only one of them is taken\n");
await call((q) => q.select(0)); await p.waitForTimeout(250); await skipIntro();
const mission0 = await call((q) => q.mission());
await call((q) => q.end("win")); await p.waitForTimeout(200);

ok(await p.locator(".cpx-spoils").count() === 1, "the popup is on screen", mission0);
const cards: any[] = await call((q) => (q.spoils()?.cards ?? []).map((c: any) =>
  ({items: c.items, rarity: c.rarity})));
console.log("  offered: " + cards.map(c =>
  c.items.map((i: any) => i.type + (i.n > 1 ? "x" + i.n : "")).join("+") +
  ` (${c.rarity})`).join("   "));
ok(cards.length >= 3, "at least three cards", `${cards.length}`);
ok(new Set(cards.flatMap(c => c.items.map((i: any) => i.type))).size ===
   cards.flatMap(c => c.items).length, "no type is offered twice");
ok(await call((q) => q.spoils().picked()) === 0, "the first card starts selected");

// ---- taking one carries it into the next mission ---------------------------
console.log("\nwhat is taken is spendable at the NEXT mission");
const take = 1;
const want = cards[take].items[0];
await call((q, a) => { q.spoils().pick(a); q.spoils().take(); }, take);
await p.waitForTimeout(400); await skipIntro();
const carried: any[] = await call((q) => q.carried());
ok(carried.some(c => c.type === want.type && c.n === want.n),
   `the taken card is banked (${want.type} x${want.n})`, JSON.stringify(carried));
ok(!carried.some(c => cards.filter((_, i) => i !== take)
     .some(o => o.items.some((it: any) => it.type === c.type))),
   "the cards not taken are gone", JSON.stringify(carried));
ok(await p.locator(".cpx-spoils").count() === 0, "the popup closes behind the choice");
const now = await call((q) => q.mission());
ok(now !== mission0, "and it advanced to the next mission", `${mission0} -> ${now}`);
const stock: any[] = await call((q) => q.stock());
ok(stock.some(i => i.type === want.type),
   `the rail offers it here (${want.type})`, JSON.stringify(stock.map(i => i.type + "x" + i.n)));

// ---- a mission pays once ---------------------------------------------------
console.log("\na cleared mission does not pay twice");
await call((q) => q.select(0)); await p.waitForTimeout(250); await skipIntro();
await call((q) => q.end("win")); await p.waitForTimeout(200);
ok(await p.locator(".cpx-spoils").count() === 1, "the popup still reports the win");
ok((await call((q) => q.spoils()?.cards ?? [])).length === 0, "and offers no cards the second time");
await call((q) => q.spoils().pass()); await p.waitForTimeout(300); await skipIntro();

// ---- a loss ----------------------------------------------------------------
console.log("\na loss uses the same frame and offers nothing");
await call((q) => q.select(2)); await p.waitForTimeout(250); await skipIntro();
const lost = await call((q) => q.mission());
await call((q) => q.end("loss")); await p.waitForTimeout(200);
ok(await p.locator(".cpx-spoils").count() === 1, "the popup is on screen", lost);
ok((await call((q) => q.spoils()?.cards ?? [])).length === 0, "no cards on a loss");
const bank = await call((q) => q.carried());
await call((q) => q.spoils().take()); await p.waitForTimeout(400); await skipIntro();
ok(await call((q) => q.mission()) === lost, "and its button retries the same mission");
ok(JSON.stringify(await call((q) => q.carried())) === JSON.stringify(bank),
   "a loss banks nothing");

// ---- the offer belongs to the mission --------------------------------------
// Across a RELOAD, because a win -- taken or passed -- consumes that mission's one
// payment, so the same page can never be asked twice.
console.log("\nthe alternates belong to the mission, not to the clock");
await p.reload();
await p.waitForFunction(() => /\b1\/\d+\b/.test(document.body.innerText), {timeout: 60000});
await skipIntro();
await call((q) => q.select(0)); await p.waitForTimeout(300); await skipIntro();
await call((q) => q.end("win")); await p.waitForTimeout(250);
const fresh: any[] = await call((q) => (q.spoils()?.cards ?? []).map((c: any) => c.items));
ok(JSON.stringify(fresh) === JSON.stringify(cards.map(c => c.items)),
   "a fresh run offers the same three cards",
   fresh.map((i: any) => i[0].type).join(",") + "  vs  " + cards.map(c => c.items[0].type).join(","));

console.log("\nconsole errors: " + (errs.length ? errs.slice(0, 4).join(" | ") : "none"));
if (errs.length) fail++;
await b.close();
console.log(fail ? `\nFAIL: ${fail}` : "\nPASS");
process.exit(fail ? 1 : 0);
