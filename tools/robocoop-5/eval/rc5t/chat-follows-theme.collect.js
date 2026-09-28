// Page-side (setup.collect) for rc5t-chat-follows-theme. Acts as the user after the turn:
// 1. live: read the chat panel's computed colours, switch the notebook theme to the other brightness
//    (dark -> cotton, light -> near-midnight) through viewof theme_assets, read again. The panel
//    background, the message box background and the text must all change, the panel must land on the
//    same side (light/dark) as the page, and text must stay readable against it.
// 2. alive: the chat panel is still in the page with its message box and Send button.
// 3. saved: export the notebook (the file a save writes), boot it in a sandboxed blob: iframe, and do the
//    same switch there: the saved file's chat must follow the theme too.
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const probe = async function (inFrame) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rgb = s => (String(s).match(/[\d.]+/g) || []).slice(0, 4).map(Number);
    // colour-mix()/oklch results come back as color(srgb r g b) in 0..1; rgb() in 0..255
    const lin = s => {
      let [r, g, b, a = 1] = rgb(s);
      if (/^color\(/.test(s)) { r *= 255; g *= 255; b *= 255; }
      if (/^color\(/.test(s) && rgb(s).length === 4) a = rgb(s)[3];
      return { l: [r, g, b].map(c => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0), a };
    };
    // the effective background: walk up while transparent
    const bgOf = el => { for (let e = el; e; e = e.parentElement || e.getRootNode?.().host) { const c = getComputedStyle(e).backgroundColor; if (lin(c).a > 0.5) return c; } return getComputedStyle(document.documentElement).backgroundColor; };
    const t0 = Date.now();
    let chat;
    while (!(chat = document.querySelector("[data-rc5-group]")) && Date.now() - t0 < (inFrame ? 4000 : 15000)) await sleep(300);
    // a blob: frame has no URL hash, so lopepage does not lay out the chat: compute the chat cell and mount it
    if (!chat && inFrame) {
      const t2 = Date.now();
      let host;
      while (!(host = [...(globalThis.__ojs_runtime?._variables || [])].find(v => v._name === "robocoop_5")) && Date.now() - t2 < 8000) await sleep(300);
      if (host) { const el = await host._module.value("robocoop_5"); if (el instanceof Element) document.body.append(el); }
      chat = document.querySelector("[data-rc5-group]");
    }
    if (!chat) return { stage: "no chat panel" };
    const ta = () => document.querySelector("[data-rc5-group] textarea");
    const read = () => {
      const c = document.querySelector("[data-rc5-group]"), t = ta();
      return { bg: bgOf(c), fg: getComputedStyle(c).color, ta: t ? bgOf(t) : null, page: bgOf(document.body) };
    };
    const rt = globalThis.__ojs_runtime;
    const vv = [...rt._variables].find(v => v._name === "viewof theme_assets" && v._value instanceof Element);
    const tv = [...rt._variables].find(v => v._name === "themes" && v._value instanceof Map && v._value.has("cotton"));
    if (!vv || !tv) return { stage: "no theme control" };
    const before = read();
    const target = lin(before.page).l < 0.2 ? "cotton" : "near-midnight";
    vv._value.value = tv._value.get(target);
    vv._value.dispatchEvent(new Event("input", { bubbles: true }));
    let after;
    const t1 = Date.now();
    do { await sleep(400); after = read(); } while (after.page === before.page && Date.now() - t1 < 8000);
    await sleep(600);
    after = read();
    const side = s => lin(s).l > 0.2;
    const out = { target, before, after };
    out.pageSwitched = after.page !== before.page;
    out.follows = out.pageSwitched && after.bg !== before.bg && after.ta !== before.ta && after.fg !== before.fg &&
      side(after.bg) === side(after.page) && side(after.ta) === side(after.page) &&
      Math.abs(lin(after.fg).l - lin(after.bg).l) > 0.3;
    const c = document.querySelector("[data-rc5-group]");
    out.alive = !!(c && c.isConnected && ta() && [...c.querySelectorAll("button")].some(b => /^Send$/.test(b.textContent.trim())));
    return out;
  };

  const out = { live: await probe(false) };
  const rt = globalThis.__ojs_runtime;
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")?._value;
  if (!exp) return { ...out, stage: "no exportToHTML" };
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  const reporter = `<script>(async () => { const probe = ${probe.toString()}; let res; try { res = await probe(true); } catch (e) { res = { stage: "threw " + e.message }; } parent.postMessage({ __themeProbe: res }, "*"); })()<\/script>`;
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__themeProbe) res(e.data.__themeProbe); });
    setTimeout(() => res({ stage: "timeout" }), 17000);
  });
  frame.src = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  document.body.appendChild(frame);
  out.saved = await got;
  frame.remove();
  return { liveFollows: !!out.live.follows, alive: !!out.live.alive, savedFollows: !!out.saved.follows, ...out };
})()
