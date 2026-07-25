// Why does save_options fail with "Failed to construct 'Blob'" on new.observablehq.com?
// Inspect the write-path cells of @tomlarkworthy/fileattachments in the live runtime.
import { chromium } from "playwright";
const url = process.argv[2] ?? "https://new.observablehq.com/@tomlarkworthy/editor-5";
const browser = await chromium.launch({ headless: !process.env.HEADED });
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.waitForTimeout(Number(process.argv[3] ?? 28000));
let frame = page.frames().find((f) => /chat-worker|worker-|observableusercontent/.test(f.url()));
for (let i = 0; i < 20 && !frame; i++) {
  await page.waitForTimeout(1000);
  frame = page.frames().find((f) => /chat-worker|worker-|observableusercontent/.test(f.url()));
}
if (!frame) { console.log("frames:", page.frames().map((f) => f.url())); process.exit(1); }
console.log(url);
console.log(JSON.stringify(await frame.evaluate(() => {
  const rt: any = (window as any).__ojs_runtime;
  if (!rt) return { error: "no __ojs_runtime" };
  const vars = [...rt._variables];
  const get = (n: string) => vars.find((v: any) => v._name === n);
  const st = (n: string) => {
    const v: any = get(n);
    if (!v) return "absent";
    return {
      computed: v._value !== undefined,
      err: v._error ? String(v._error.message ?? v._error).slice(0, 90) : null,
      kind: typeof v._value,
      ctor: v._value?.constructor?.name,
    };
  };
  const out: any = {};
  for (const n of ["sampleFileAttachment", "FileAttachmentClass", "jsonFileAttachment",
                   "createFileAttachment", "setFileAttachment", "plainFile", "viewof fileInput", "options"]) out[n] = st(n);

  // try the write path by hand
  const jfa: any = get("jsonFileAttachment")?._value;
  const cfa: any = get("createFileAttachment")?._value;
  const klass: any = get("FileAttachmentClass")?._value;
  out.FileAttachmentClassName = klass?.name ?? String(klass);
  out.classArity = typeof klass === "function" ? klass.length : null;
  if (typeof cfa === "function") {
    try { const f = cfa("blob:fake", "x.json", "application/json"); out.createFileAttachment = { ok: true, ctor: f?.constructor?.name, name: f?.name }; }
    catch (e: any) { out.createFileAttachment = "throw: " + e.message.slice(0, 90); }
  }
  if (typeof jfa === "function") {
    try { const f = jfa("x.json", { a: 1 }); out.jsonFileAttachment = { ok: true, ctor: f?.constructor?.name, name: f?.name }; }
    catch (e: any) { out.jsonFileAttachment = "throw: " + e.message.slice(0, 90); }
  }
  // is Blob itself sane in this realm?
  try { out.blobSanity = new Blob([new TextEncoder().encode("{}")]).size; }
  catch (e: any) { out.blobSanity = "throw: " + e.message.slice(0, 90); }
  return out;
}), null, 1));
await browser.close();
