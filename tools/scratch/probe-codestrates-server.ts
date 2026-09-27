// End to end: local click -> copy to demo.webstrates.net -> click in the live webstrate -> copy back.
import { chromium } from "playwright";
const nb = process.argv[2]!, shots = process.argv[3]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1280, height: 800 } });
const p = await c.newPage();
p.on("pageerror", (e) => console.log("[pageerror]", String(e).slice(0, 200)));
p.on("dialog", (d) => { console.log("[dialog]", d.type(), d.defaultValue()); d.accept(d.defaultValue() || undefined); });
await p.goto(`file://${nb}`);
const frameEl = () => p.locator("iframe").first();
const val = (name: string) => p.evaluate((n) => [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === n && v._module?._scope?.has("codestratePlace"))?._value, name);
const countIn = async (frame: any) => frame.locator("#app").getAttribute("data-count");
// local
const local = await (await frameEl().elementHandle())!.contentFrame();
await local!.locator("#cauldron-edit-button").waitFor({ timeout: 60000 }).then(() => p.waitForTimeout(3000));
await local!.locator("#app button").click();
await p.waitForTimeout(1500);
console.log("local count after click:", await countIn(local), "doc has count:", /data-count="(\d+)"/.exec(await val("doc"))?.[1]);
await p.screenshot({ path: `${shots}/cs-local.png` });
// publish
await p.getByRole("button", { name: /Copy to a Webstrates server/ }).click();
await p.getByText(/Live at|did not answer|Failed/).waitFor({ timeout: 60000 });
console.log("status:", await p.locator("text=/Live at/").first().textContent().catch(() => "?"));
console.log("place:", JSON.stringify(await val("place")));
const liveEl = await frameEl().elementHandle();
console.log("frame src:", await liveEl!.getAttribute("src"));
const live = await liveEl!.contentFrame();
await live!.locator("#cauldron-edit-button").waitFor({ timeout: 60000 }).then(() => p.waitForTimeout(3000));
console.log("live count at load:", await countIn(live));
await live!.locator("#app button").click();
await live!.locator("#app button").click();
await p.waitForTimeout(2500);
console.log("live count after 2 clicks:", await countIn(live), "| notebook doc count (unchanged expected):", /data-count="(\d+)"/.exec(await val("doc"))?.[1]);
await p.screenshot({ path: `${shots}/cs-live.png` });
// server copy via ?raw, as another client would see it
const url = (await val("place")).url;
const raw = await (await c.request.get(url + "?raw")).text();
console.log("server ?raw count:", /data-count="(\d+)"/.exec(raw)?.[1], "bridge in raw:", raw.includes("lopecode-bridge"));
// pull back
await p.getByRole("button", { name: /Copy the webstrate into the notebook/ }).click();
await p.getByText(/Copied into the notebook|did not answer/).waitFor({ timeout: 30000 });
await p.waitForTimeout(3000);
console.log("after pull: place:", JSON.stringify(await val("place")), "doc count:", /data-count="(\d+)"/.exec(await val("doc"))?.[1]);
const back = await (await frameEl().elementHandle())!.contentFrame();
await back!.locator("#cauldron-edit-button").waitFor({ timeout: 60000 }).then(() => p.waitForTimeout(3000)).catch(() => console.log("no Edit button after pull"));
console.log("WPM script tags in local frame:", await back!.locator("script#WPMv2-script").count());
console.log("local frame count after pull:", await countIn(back), "src attr:", await (await frameEl().elementHandle())!.getAttribute("src"));
await p.screenshot({ path: `${shots}/cs-back.png` });
await b.close();
