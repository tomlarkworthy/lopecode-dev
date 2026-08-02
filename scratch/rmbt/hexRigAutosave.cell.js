hexRigAutosave = {
  // Captured cases die with the tab. hexRigCases is an Inputs.input([]), so it
  // holds real pixels at runtime and exports as empty -- a reload, a crash or a
  // slow export throws away work that costs someone standing in front of a
  // camera holding a printed sheet at arm's length. This takes each case off
  // the page the moment it is kept.
  //
  // What gets sent is the `gray` buffer, which is exactly the bytes the
  // detector was handed, plus a sidecar of the frozen labels and the settings
  // that produced them. No image codec in either direction, so a restored case
  // is bit-identical to the captured one -- which matters here more than
  // anywhere, because a JPEG round trip moves measured centres by up to 10px
  // and these cases exist to BE the ground truth.
  //
  // It depends on the cases NODE, not the cases value. Depending on the value
  // would re-run this cell on every capture, rebuilding the panel and losing
  // track of what had already been sent; listening to the node's input event
  // leaves the cell running and stateful across captures.
  const node = viewof hexRigCases;
  const sent = new Set();
  let sink = "http://127.0.0.1:8787";
  let auto = true;

  const el = htl.html`<div style="font:12px/1.5 ui-monospace,monospace;border:1px solid #0002;border-radius:6px;padding:8px 10px;margin:6px 0">
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
      <label style="display:flex;gap:5px;align-items:center"><input type="checkbox" checked> autosave to</label>
      <input type="text" value="${sink}" size="26" style="font:inherit">
      <button>save all now</button>
      <button>download bundle</button>
      <span data-status style="opacity:.7"></span>
    </div>
    <div data-log style="opacity:.6;margin-top:4px;max-height:70px;overflow:auto"></div>
  </div>`;
  const [chk, box] = [el.querySelector("input[type=checkbox]"), el.querySelector("input[type=text]")];
  const [saveBtn, dlBtn] = el.querySelectorAll("button");
  const status = el.querySelector("[data-status]");
  const log = el.querySelector("[data-log]");
  const say = (m) => {
    log.textContent = `${m}\n${log.textContent}`.split("\n").slice(0, 12).join("\n");
  };
  chk.oninput = () => (auto = chk.checked);
  box.oninput = () => { sink = box.value.trim(); sent.clear(); };

  const meta = (c) => ({
    name: c.name, w: c.w, h: c.h, labelled: c.labelled, pinned: c.pinned,
    difficulty: c.difficulty, truth: c.truth, cfg: c.cfg, capture: c.capture
  });

  async function push(c) {
    // gray first: if the sidecar lands without pixels the case is unusable, and
    // this way a half-finished transfer leaves the recoverable half on disk.
    const g = await fetch(`${sink}/gray/${encodeURIComponent(c.name)}`, { method: "POST", body: c.gray });
    if (!g.ok) throw new Error("gray " + g.status);
    const j = await fetch(`${sink}/meta/${encodeURIComponent(c.name)}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify(meta(c), null, 1)
    });
    if (!j.ok) throw new Error("meta " + j.status);
  }

  async function drain(force = false) {
    if (!sink || (!auto && !force)) return;
    const cases = node.value ?? [];
    let n = 0, failed = 0;
    for (const c of cases) {
      if (sent.has(c.name) && !force) continue;
      if (!c.gray) continue;
      try { await push(c); sent.add(c.name); n++; say(`saved ${c.name} (${c.gray.length.toLocaleString()}B)`); }
      catch (e) { failed++; say(`FAILED ${c.name}: ${e.message}`); }
    }
    status.textContent = `${sent.size}/${cases.length} on disk` + (failed ? ` — ${failed} failed` : "");
    return n;
  }

  // A bundle for when there is no receiver running: raw gray, gzipped, one
  // file, restorable without an image decoder.
  async function bundle() {
    const cases = node.value ?? [];
    const parts = [];
    for (const c of cases) {
      const cs = new window.CompressionStream("gzip");
      const packed = await new Response(new Blob([c.gray]).stream().pipeThrough(cs)).arrayBuffer();
      let s = "";
      const b = new Uint8Array(packed);
      for (let i = 0; i < b.length; i += 0x8000)
        s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      parts.push({ ...meta(c), grayGzipB64: window.btoa(s) });
    }
    const blob = new Blob([JSON.stringify({ format: "hexrig-cases-1", cases: parts })],
      { type: "application/json" });
    const a = window.document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hexrig-cases.json";
    a.click();
    say(`bundled ${parts.length} case(s)`);
  }

  saveBtn.onclick = () => drain(true);
  dlBtn.onclick = () => bundle();
  node.addEventListener("input", () => drain());
  invalidation.then(() => node.removeEventListener("input", drain));
  drain();
  return el;
}
