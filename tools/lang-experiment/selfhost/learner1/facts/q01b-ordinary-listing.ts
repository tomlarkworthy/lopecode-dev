// tutorial-ordinary.tsx with its two Observable JavaScript cells given as outside cells (shop_basket, viewof shop_price)
import { readFileSync } from "node:fs";
import { input } from "../../../../../vendor/observable-stdlib/src/generators/input.js";
const dir = new URL("../../../lite/soundscript/", import.meta.url).pathname;
const slider = () => { const el: any = new EventTarget(); el.value = 3; return el; };
export const cands = [{ name: "tutorial-ordinary.tsx", src: readFileSync(dir + "tutorial-ordinary.tsx", "utf8"), show: ["shopTotal"],
  outside: { shop_basket: [[], () => [{ item: "tea", qty: 2 }, { item: "cake", qty: 1 }]], "viewof shop_price": [[], slider], shop_price: [["viewof shop_price"], (v: any) => input(v)] },
  drive: async (p: any) => { const before = p.value("shopTotal"); const c = p.value("cheaper"); if (typeof c !== "function") return `cheaper ${p.status("cheaper")} ${p.error("cheaper")}`; c(); await p.settle(400); return `shopTotal ${before} -> ${p.value("shopTotal")}`; } }];
export const srcs = cands.map((c) => [c.name, c.src]);
