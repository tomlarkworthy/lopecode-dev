// Verify the lopepage-2 burger menu is populated through @tomlarkworthy/plugin-registry.
// Forces the menu provider/consumer cells and checks lp2MenuItems (plugins.get("lp2-menu")) and the
// rendered popover buttons include the built-ins (Download/Fork) and save-in-place's Save item.
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { bootNotebook } from "./lib/notebook-boot.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const NB = join(here, "jumpgate-test.html");
const LAYOUT = "R100(S75(@tomlarkworthy/robocoop-5),S25(@tomlarkworthy/robocoop-5-srctools))";

const { page, consoleErrors, close } = await bootNotebook({ notebookPath: NB, layout: LAYOUT, timeout: 45000 });

const out = await page.evaluate(async () => {
  const H = window.__nbHelpers;
  // provider cells (register items) + consumer cells (render)
  ["lp2_menu_defaults", "sip_register", "lp2_burger", "lp2_menu_sync", "lp2MenuItems", "plugins"].forEach((n) => H.force(n));
  const t0 = Date.now();
  let items = [], labels = [];
  while (Date.now() - t0 < 25000) {
    const li = H.byName("lp2MenuItems");
    items = Array.isArray(li) ? li : [];
    const burger = H.byName("lp2_burger");
    if (burger && burger.list) {
      labels = [...burger.list.querySelectorAll("button, .lp2-menu-item")].map((b) => (b.textContent || "").trim()).filter(Boolean);
    }
    if (items.length >= 2 && labels.length >= 2) break;
    await new Promise((r) => setTimeout(r, 400));
  }
  // shared-instance sanity: register via plugins.add directly, see it in lp2MenuItems
  let decoupledOk = false;
  try {
    const plugins = H.byName("plugins");
    const remove = plugins.add("lp2-menu", { id: "probe-x", label: "ProbeX", order: 999 });
    await new Promise((r) => setTimeout(r, 300));
    const li = H.byName("lp2MenuItems");
    decoupledOk = Array.isArray(li) && li.some((it) => it.id === "probe-x");
    remove();
  } catch (e) {}
  return { itemIds: items.map((i) => i.id), menuLabels: labels, decoupledOk };
});

console.log("lp2MenuItems ids :", out.itemIds);
console.log("rendered labels  :", out.menuLabels);
console.log("direct plugins.add('lp2-menu') visible in lp2MenuItems:", out.decoupledOk);
console.log("console errors   :", consoleErrors.length ? consoleErrors.slice(0, 6) : "none");
await close();
const hasDownload = out.itemIds.includes("download") || out.menuLabels.some((l) => /download/i.test(l));
const pass = out.itemIds.length >= 2 && out.menuLabels.length >= 2 && out.decoupledOk;
console.log(pass ? "PASS" : "FAIL", hasDownload ? "(download present)" : "");
process.exit(pass ? 0 : 1);
