// Join a real codestrate, switch to "this notebook", press Overwrite: which ops go out?
import { chromium } from "playwright";
const nb = process.argv[2]!, url = process.argv[3]!;
const b = await chromium.launch();
const c = await b.newContext({ ignoreHTTPSErrors: true });
const p = await c.newPage();
const sent: string[] = [];
p.on("websocket", (ws) => ws.on("framesent", (f) => { const s = String(f.payload); if (s.includes('"a":"op"')) sent.push(s); }));
p.on("dialog", (d) => d.accept(url));
const val = (n: string) => p.evaluate((n) => [...(window as any).__ojs_runtime._variables].find((v: any) => v._name === n && v._module?._scope?.has("codestratePlace"))?._value, n);
await p.goto(`file://${nb}`);
await p.getByRole("button", { name: /Sync with a webstrate/ }).click();
await p.getByText(/Synced live with/).waitFor({ timeout: 60000 });
await p.waitForTimeout(8000);
const cell = String(await val("doc"));
console.log("cell after sync: has bootconfig", cell.includes("json+bootconfig"), "__wid", cell.includes("__wid"), "len", cell.length);
await p.locator("select").first().selectOption("notebook");
await p.waitForTimeout(8000);
sent.length = 0;
await p.getByRole("button", { name: /Overwrite the webstrate/ }).click();
await p.getByText(/Synced live with/).waitFor({ timeout: 60000 });
await p.waitForTimeout(5000);
for (const s of sent) { const o = JSON.parse(s); console.log("OP", JSON.stringify(o.op.map((x: any) => [x.p, Object.keys(x).filter((k) => k !== "p")[0], JSON.stringify(x.li ?? x.ld ?? x.si ?? x.sd ?? x.oi ?? "").slice(0, 50)])).slice(0, 1500)); }
const raw = await (await c.request.get(url + "?raw")).text();
console.log("server has bootconfig:", raw.includes("json+bootconfig"), "WPM:", raw.includes("WPMv2-script"), "fragment:", /CODE-FRAGMENT/i.test(raw));
await b.close();
