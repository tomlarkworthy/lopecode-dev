// The panel check probe-editor5-shipped.mjs got wrong: its click heuristic toggled an already-open
// editor shut (cm-content 2 -> 1). This one finds the hotbar control by inspecting the DOM first,
// then opens a definitely-closed cell and reports whether a CodeMirror editor materialised.
import { chromium } from "playwright";

const FILE = process.argv[2];
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto("file://" + FILE, { waitUntil: "load" });
await page.waitForTimeout(15000);

const shape = await page.evaluate(() => {
  const bar = document.querySelectorAll(".hotbar")[3];
  return {
    hotbarHTML: bar ? bar.outerHTML.slice(0, 600) : null,
    bodies: document.querySelectorAll(".cell-editor-body").length,
    openBodies: [...document.querySelectorAll(".cell-editor-body")].filter(
      (b) => b.style.display !== "none"
    ).length
  };
});
console.log("DOM shape:", JSON.stringify(shape, null, 2));

const result = await page.evaluate(async () => {
  const rt = window.__ojs_runtime;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const dynCount = () =>
    [...rt._variables].filter((v) => typeof v._name === "string" && v._name.startsWith("dynamic "))
      .length;

  // A closed cell: a hotbar whose sibling editor body is hidden (or absent).
  const bars = [...document.querySelectorAll(".hotbar")];
  const closed = bars.find((b) => {
    const body = b.parentElement && b.parentElement.querySelector(".cell-editor-body");
    return !body || body.style.display === "none";
  });
  if (!closed) return { ran: false, reason: "no closed hotbar found" };

  const before = {
    cm: document.querySelectorAll(".cm-content").length,
    vars: rt._variables.size,
    dyn: dynCount()
  };

  const toggle = [...closed.querySelectorAll("*")].find((el) =>
    /✏|\u{1F4DD}/u.test(el.textContent || "")
  );
  (toggle || closed).click();
  await wait(5000);

  const body = closed.parentElement.querySelector(".cell-editor-body");
  return {
    ran: true,
    clicked: toggle ? (toggle.textContent || "").trim().slice(0, 4) : "(hotbar)",
    before,
    after: {
      cm: document.querySelectorAll(".cm-content").length,
      vars: rt._variables.size,
      dyn: dynCount()
    },
    bodyVisible: body ? body.style.display !== "none" : null,
    bodyHasEditor: body ? !!body.querySelector(".cm-content") : null,
    editorText: body && body.querySelector(".cm-content")
      ? body.querySelector(".cm-content").textContent.slice(0, 80)
      : null
  };
});

console.log(JSON.stringify(result, null, 2));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
