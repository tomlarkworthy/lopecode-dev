import { chromium } from "playwright";
const nb = process.argv[2]!, url = process.argv[3]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const p = await c.newPage();
await p.goto(`file://${nb}`);
await p.waitForFunction(() => [...((window as any).__ojs_runtime?._variables ?? [])].some((v: any) => v._name === "viewof place" && v._value));
await p.evaluate((url) => {
  const v = [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "viewof place")._value;
  v.value = { where: "sync", url };
}, url);
await p.getByText(/Synced live with/).waitFor({ timeout: 60000 });
const f = (await (await p.locator("iframe").first().elementHandle())!.contentFrame())!;
await f.locator("#cauldron-edit-button").waitFor({ timeout: 60000 });
console.log(await f.evaluate(() => {
  const el = document.getElementById("WPMv2-script")!;
  const m = (window as any).__codestrateVendorUrls;
  return { src: el.getAttribute("src"), mapSize: m?.size, has: m?.has(el.getAttribute("src")), keys: [...(m?.values() ?? [])].filter((k: string) => /WPM/.test(k)), sameMap: document.defaultView === window };
}));
console.log(await p.evaluate(() => {
  const ser = [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "serializeCodestrate")._value;
  const doc = (document.querySelector(".codestrate iframe") as HTMLIFrameElement).contentDocument!;
  const out = ser(doc);
  const cell = [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === "doc" && v._module?._scope?.has("codestratePlace"))._value;
  const tag = (h: string) => /<script[^>]*WPMv2-script[^>]*>/.exec(h)?.[0];
  const originals = (doc.defaultView as any)?.__codestrateVendorUrls;
  const root = doc.documentElement.cloneNode(true) as Element;
  const hits = [...root.querySelectorAll("[src^='blob:'], [href^='blob:']")].map((e) => [e.tagName, e.getAttribute("src"), originals?.has(e.getAttribute("src"))]);
  return { serialized: tag(out), size: originals?.size, hits, serSrc: ser.toString().slice(0, 400) };
}));
await b.close();
