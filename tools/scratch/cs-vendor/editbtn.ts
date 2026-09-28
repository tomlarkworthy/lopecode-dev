// Cycle modes and report whether Cauldron's Edit button appears each time.
import { chromium } from "playwright";
const nb = process.argv[2]!, url = process.argv[3]!, out = process.argv[4]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const p = await c.newPage();
p.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 160)));
p.on("console", (m) => { if (m.type() === "error" && !/@import|ERR_/.test(m.text())) console.log("  [console]", m.text().slice(0, 160)); });
p.on("dialog", (d) => d.accept(url));
const frameOf = async () => (await (await p.locator("iframe").first().elementHandle())!.contentFrame())!;
const check = async (label: string) => {
  const t0 = Date.now();
  const f = await frameOf();
  const ok = await f.locator("#cauldron-edit-button").waitFor({ timeout: 30000 }).then(() => true, () => false);
  const info = await f.evaluate(() => ({ wpm: document.documentElement.getAttribute("transient-wpm2-bootloader"), editEls: document.querySelectorAll("#cauldron-edit-button").length, body: document.body?.innerText.slice(0, 60) })).catch((e) => String(e).slice(0, 80));
  console.log(label, ok ? "EDIT OK" : "EDIT MISSING", Date.now() - t0 + "ms", JSON.stringify(info));
  if (!ok) await p.screenshot({ path: `${out}/editbtn-${label}.png` });
};
await p.goto(`file://${nb}`);
await check("1-notebook-start");
await p.getByRole("button", { name: /Sync with a webstrate/ }).click();
await p.getByText(/Synced live with/).waitFor({ timeout: 60000 });
await check("2-synced");
for (const [i, where] of [["3", "notebook"], ["4", "sync"], ["5", "notebook"], ["6", "sync"]]) {
  await p.locator("select").first().selectOption(where);
  if (where === "sync") await p.getByText(/Synced live with/).waitFor({ timeout: 60000 }).catch(() => console.log("  no live status"));
  await check(`${i}-${where}`);
}
await b.close();
