// Typing on a phone. A soft keyboard is not a keyboard: Android delivers
// keydown{key:"Unidentified",keyCode:229} and the real text on an input event, so a
// keydown-only bridge receives nothing. Emulates a Pixel and drives the three input
// shapes a phone actually produces, plus the tap that has to focus the terminal first.
import { chromium, devices } from "playwright";
const NB = "/Users/tom.larkworthy/dev/lopecode-dev/lopebooks/notebooks/Caged_Code.html";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = [];
const check = (n, ok, d) => { out.push({ n, ok: !!ok }); console.log((ok ? "PASS  " : "FAIL  ") + n + (d !== undefined ? "  " + JSON.stringify(d).slice(0, 200) : "")); };

const b = await chromium.launch({ headless: true });
const ctx = await b.newContext({ ...devices["Pixel 7"] });
const p = await ctx.newPage();
await p.goto("file://" + NB + "#view=S100(@tomlarkworthy/claude-code-browser)", { waitUntil: "load", timeout: 60000 });
await p.waitForFunction(() => window.__termHealth && window.__termHealth().renderedChars > 0, { timeout: 120000 });
await sleep(6000);

// 1) a TAP must focus xterm's helper textarea — without focus nothing else can work
await p.tap("#cb-term");
await sleep(400);
const focused = await p.evaluate(() => {
  const a = document.activeElement;
  return { tag: a && a.tagName, cls: a && a.className, inTerm: !!(a && document.getElementById("cb-term").contains(a)) };
});
check("tap focuses the terminal", focused.inTerm, focused);

const dump = () => p.evaluate(() => (window.__dumpTerm ? window.__dumpTerm() : ""));
const prompt = async () => (await dump()).split("\n").filter((l) => l.includes("❯")).pop() || "";

// 2) Android/GBoard: keydown is a placeholder, the text arrives on input
async function soft(text) {
  await p.evaluate((t) => {
    const ta = document.querySelector("#cb-term textarea");
    for (const ch of t) {
      ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified", keyCode: 229, which: 229, bubbles: true, cancelable: true }));
      ta.dispatchEvent(new InputEvent("beforeinput", { inputType: "insertText", data: ch, bubbles: true, cancelable: true }));
      ta.value += ch;
      ta.dispatchEvent(new InputEvent("input", { inputType: "insertText", data: ch, bubbles: true }));
      ta.dispatchEvent(new KeyboardEvent("keyup", { key: "Unidentified", keyCode: 229, bubbles: true }));
    }
  }, text);
  await sleep(900);
}
await soft("hello");
check("soft-keyboard text reaches the TUI", (await prompt()).includes("hello"), await prompt());

// 3) backspace and enter, as a soft keyboard sends them
await p.evaluate(() => {
  const ta = document.querySelector("#cb-term textarea");
  ta.dispatchEvent(new KeyboardEvent("keydown", { key: "Unidentified", keyCode: 229, bubbles: true, cancelable: true }));
  ta.dispatchEvent(new InputEvent("beforeinput", { inputType: "deleteContentBackward", bubbles: true, cancelable: true }));
  ta.dispatchEvent(new InputEvent("input", { inputType: "deleteContentBackward", bubbles: true }));
});
await sleep(900);
check("soft backspace deletes a char", !(await prompt()).includes("hello") && (await prompt()).includes("hell"), await prompt());

// 4) IME composition (predictive text commits a whole word at once)
await p.evaluate(() => {
  const ta = document.querySelector("#cb-term textarea");
  ta.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
  ta.dispatchEvent(new CompositionEvent("compositionupdate", { data: "wor", bubbles: true }));
  ta.dispatchEvent(new InputEvent("input", { inputType: "insertCompositionText", data: "wor", bubbles: true }));
  ta.dispatchEvent(new CompositionEvent("compositionend", { data: "world", bubbles: true }));
  ta.dispatchEvent(new InputEvent("input", { inputType: "insertFromComposition", data: "world", bubbles: true }));
});
await sleep(900);
check("IME commit reaches the TUI once", /worlds?$|world/.test(await prompt()) && !/worworld|worldworld/.test(await prompt()), await prompt());

// 5) a physical keyboard must still work exactly as before (no double characters)
await p.keyboard.type("XY", { delay: 30 });
await sleep(800);
const after = await prompt();
check("hardware keys still single", after.includes("XY") && !after.includes("XXYY"), after);

console.log("\n" + out.filter((x) => x.ok).length + "/" + out.length + " pass");
await b.close();
process.exit(out.every((x) => x.ok) ? 0 : 1);
