// Dump the viewed module's _scope keys + which .sg-atom names actually mounted.
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/grid-container";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 32000));
const frame = page.frames().find((f) => f.url().includes("observableusercontent")) ?? page.mainFrame();
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  const frameEl: any = document.querySelector(".sg-frame");
  const mod = frameEl?.grid ? null : null;
  // find the module that owns `wave`
  const wave = [...rt._variables].find((v: any) => v._name === "wave");
  const m: any = wave?._module;
  return {
    scope: m ? [...m._scope.keys()].filter((k: string) => !k.startsWith("module ")) : null,
    atoms: [...document.querySelectorAll(".sg-atom")].map((a: any) => a.dataset?.name ?? a.getAttribute("data-name") ?? (a.textContent ?? "").trim().slice(0, 30)),
    atomAttrs: [...document.querySelectorAll(".sg-atom")].map((a: any) => a.outerHTML.slice(0, 120)),
  };
}), null, 1));
await browser.close();
