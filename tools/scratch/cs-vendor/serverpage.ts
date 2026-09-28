import { chromium } from "playwright";
const b = await chromium.launch();
const p = await (await b.newContext({ ignoreHTTPSErrors: true })).newPage();
await p.goto(process.argv[2]!);
console.log("server page Edit button:", await p.locator("#cauldron-edit-button").waitFor({ timeout: 60000 }).then(() => "yes", () => "MISSING"), "| text:", (await p.locator("body").innerText()).slice(0, 60));
await b.close();
