// Drive the pinned demo editor: retype the `title` cell's source and hit apply.
// Runtime-only — compile_and_update redefines variables in the live runtime, it does not
// write to the Observable document.
import { chromium } from "playwright";
const url = process.argv[2];
const NEW_TITLE = process.env.NEW_TITLE ?? "EDIT PROBE OK";
const b = await chromium.launch({ headless: !process.env.HEADED, args: ["--disable-web-security"] });
const p = await (await b.newContext()).newPage();
const console_: string[] = [];
p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console_.push(`[${m.type()}] ${m.text().slice(0, 400)}`); });
p.on("pageerror", (e) => console_.push(`[pageerror] ${String(e).slice(0, 400)}`));
await p.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });

const frame = await (async () => {
  for (let i = 0; i < 120; i++) {
    const f = p.frames().find((f) => /observableusercontent/.test(f.url()));
    if (f) { try { if (await f.evaluate(() => document.querySelectorAll(".observablehq").length > 0)) return f; } catch {} }
    await p.waitForTimeout(1000);
  }
  throw new Error("no notebook frame");
})();
for (let s = 0; s < 12; s++) { await frame.evaluate((k) => window.scrollTo(0, k * 1400), s).catch(() => {}); await p.waitForTimeout(600); }
await frame.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
let prev = -1;
for (let i = 0; i < 40; i++) {
  const n = await frame.evaluate(() => document.querySelectorAll(".cm-editor").length);
  if (n === prev && n > 0) break; prev = n; await p.waitForTimeout(1000);
}

const titleBefore = async () => frame.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((x: any) => x._name === "title" && x._value !== undefined);
  return v ? String(v._value?.textContent ?? v._value).slice(0, 120) : "(no title variable)";
});
console.log("title BEFORE:", await titleBefore());

// The pinned demo editor is the host of `cellEditor(title_variable, {pinned:true})`.
const located = await frame.evaluate(() => {
  const rt = (window as any).__ojs_runtime;
  const v = [...rt._variables].find((x: any) => /cellEditor\s*\(\s*title_variable/.test(String(x._definition)));
  const host = v?._value;
  if (!host) return { ok: false, why: "no pinned host" };
  host.setAttribute("data-edit-probe", "1");
  return { ok: true, cm: host.querySelectorAll(".cm-content").length, buttons: host.querySelectorAll("button").length };
});
console.log("host:", JSON.stringify(located));
if (!located.ok || !located.cm) { console.log("CANNOT DRIVE: no CodeMirror in the pinned host"); await b.close(); process.exit(0); }

const cm = frame.locator('[data-edit-probe="1"] .cm-content').first();
await cm.click();
await p.keyboard.press(process.platform === "darwin" ? "Meta+A" : "Control+A");
await p.keyboard.type("title = md\`# " + NEW_TITLE + "\`");
await p.waitForTimeout(500);
console.log("editor now holds:", JSON.stringify((await cm.innerText()).slice(0, 120)));

// ▶️ is the apply button
const applied = await frame.evaluate(() => {
  const host = document.querySelector('[data-edit-probe="1"]')!;
  const btn = [...host.querySelectorAll("button")].find((b) => b.textContent?.includes("▶"));
  if (!btn) return "no apply button: " + [...host.querySelectorAll("button")].map((b) => b.textContent).join("|");
  (btn as HTMLButtonElement).click();
  return "clicked";
});
console.log("apply:", applied);
await p.waitForTimeout(6000);
console.log("title AFTER :", await titleBefore());
console.log("editor after:", JSON.stringify(await cm.innerText({ timeout: 4000 }).then((t) => t.slice(0, 120)).catch(() => "(editor DOM was replaced)")));
console.log("--- console (errors/warnings) ---");
for (const l of console_.slice(-25)) console.log(l);
await b.close();
