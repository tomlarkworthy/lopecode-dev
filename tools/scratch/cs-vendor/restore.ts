// Put html into the notebook's copy, then "Go online, keeping my changes" against url.
import { chromium } from "playwright";
import { readFileSync } from "fs";
const nb = process.argv[2]!, url = process.argv[3]!, html = readFileSync(process.argv[4]!, "utf8");
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const p = await c.newPage();
p.on("dialog", (d) => d.accept());
await p.goto(`file://${nb}`);
await p.waitForFunction(() => [...((window as any).__ojs_runtime?._variables ?? [])].some((v: any) => v._name === "viewof place" && v._value));
await p.evaluate(({ url, html }) => {
  const vs = [...(window as any).__ojs_runtime._variables];
  const doc = vs.find((v: any) => v._name === "viewof doc" && v._module?._scope?.has("codestratePlace"))._value;
  doc.value = html;
  doc.dispatchEvent(new Event("input", { bubbles: true }));
  vs.find((v: any) => v._name === "viewof place")._value.value = { url, online: false, base: null };
}, { url, html });
await p.getByRole("button", { name: "Go online, keeping my changes" }).click();
await p.getByText(/Synced live/).waitFor({ timeout: 60000 });
const f = (await (await p.locator(".codestrate iframe").first().elementHandle())!.contentFrame())!;
console.log("Edit button:", await f.locator("#cauldron-edit-button").waitFor({ timeout: 45000 }).then(() => "yes", () => "MISSING"));
const r = await (await c.request.get(url + "?raw")).text();
console.log("server: title", /<title/i.test(r), "bootconfig", r.includes("json+bootconfig"), "WPM", r.includes("WPMv2-script"), "fragment:", /<code-fragment[^>]*>([\s\S]*?)<\/code-fragment>/i.exec(r)?.[1]);
await b.close();
