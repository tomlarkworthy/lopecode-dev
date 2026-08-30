// Pasting an image. cli.js reads clipboard images by shelling out (xclip/osascript),
// which does not exist here — so the page hands the bytes to the frame and the shim
// answers the shell-out from them. Drives a real paste event carrying a PNG File.
import { chromium } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
const check = (n, ok, d) => { out.push({ n, ok: !!ok }); console.log((ok ? "PASS  " : "FAIL  ") + n + (d !== undefined ? "  " + JSON.stringify(d).slice(0, 240) : "")); };

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 });
await sleep(6000);
await p.click("#cb-term");

// A real paste event carrying a real PNG File, as Cmd+V produces.
await p.evaluate(async () => {
  const c = document.createElement("canvas"); c.width = 24; c.height = 16;
  const g = c.getContext("2d"); g.fillStyle = "#c0ffee"; g.fillRect(0, 0, 24, 16);
  const blob = await new Promise((r) => c.toBlob(r, "image/png"));
  const dt = new DataTransfer();
  dt.items.add(new File([blob], "pasted.png", { type: "image/png" }));
  document.activeElement.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
});
await sleep(6000);

const state = await p.evaluate(() => {
  const w = document.querySelector("#cb-cli-frame").contentWindow;
  const img = w.__CLIPBOARD_IMAGE;
  return {
    stashed: !!(img && img.base64 && img.base64.length > 40),
    mediaType: img && img.mediaType,
    clipboardCalls: (w.__CPLOG || []).map((e) => (e.args && e.args[1]) || e.cmd).filter((s) => /xclip|wl-paste|rm -f/.test(String(s))).map((s) => String(s).slice(0, 70)),
  };
});
check("page stashed the image for the frame", state.stashed, { mediaType: state.mediaType });
check("cli.js asked the clipboard for it", state.clipboardCalls.length > 0, state.clipboardCalls);

const screen = await p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
const promptLine = screen.split("\n").filter((l) => l.includes("❯")).pop() || "";
check("the prompt shows an attached image", /\[Image #?\d|Image #\d|\[image/i.test(promptLine), promptLine.trim());
if (!out[out.length - 1].ok) console.log("---- screen ----\n" + screen.split("\n").slice(-14).join("\n"));

console.log("\n" + out.filter((x) => x.ok).length + "/" + out.length + " pass");
await b.close();
process.exit(out.every((x) => x.ok) ? 0 : 1);
