// rc5-train eval (20260928-0640-w34): binary-search stepper tutorial.
// Behavioural, per part, so any correct build passes whatever the module id, cell names, markup (HTML
// boxes or SVG) or highlight style (a low/mid/high label under or inside a box, a class name, a colour
// keyed by a legend, or a "low = … mid = … high = …" status line). setup.collect keeps every cell of a
// module created during the turn reachable, mounts any detached cell output off-screen so it has
// layout, and returns one verdict per part:
//   prose    : a markdown/prose block of 60+ words that mentions binary search; a stated worst case
//              ("at most N steps") must equal the worst case of the array shown
//   boxes    : exactly 20 numbers drawn as boxes, in sorted order
//   found    : typing a present target and pressing Step walks exactly the (low, mid, high) sequence of
//              a standard binary search over the array shown (lo=0, hi=n-1, mid=floor((lo+hi)/2)), and
//              the finish message says found and gives the comparison count
//   absent   : an absent target finishes with a not-found message
//   retarget : after two steps, changing the target restarts the walk (the new target's walk matches)
//   reset    : after two steps, Reset restarts the walk (the same target's walk matches again)
// The expected sequence is computed from the numbers the module actually shows.

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const userVars = [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const R = { prose: "not run", boxes: "not run", found: "not run", absent: "not run", retarget: "not run", reset: "not run" };
  if (!userVars.length) { for (const k in R) R[k] = "no module was created"; return R; }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of userVars) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  let stage = document.getElementById("__rc5t_stage");
  if (!stage) { stage = document.createElement("div"); stage.id = "__rc5t_stage";
    stage.style.cssText = "position:absolute;left:0;top:0;width:1400px;background:#fff;z-index:99999"; document.body.appendChild(stage); }
  let homeMods = null;
  const roots = () => {
    const out = [];
    for (const v of userVars) { const x = v._value;
      if (homeMods && !homeMods.has(v._module)) continue;
      if (!(x instanceof Element)) continue;
      if (!x.isConnected) stage.appendChild(x);
      out.push(x); }
    return out;
  };
  const all = sel => roots().flatMap(r => [...(r.matches(sel) ? [r] : []), ...r.querySelectorAll(sel)]);
  const numsOf = t => (String(t).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  // ---- boxes: 20 sorted numbers, as the element children of one container (HTML) or 20 numeric texts (SVG)
  const findBoxes = () => {
    let best = null;
    const consider = (els) => {
      const withNum = els.filter(e => numsOf(e.textContent).length && e.textContent.trim().length < 24 && !e.closest("button"));
      if (withNum.length !== 20) return;
      const strategies = [n => n[0], n => n[n.length - 1], (n, i) => n.find(x => x !== i) ?? n[0]];
      for (const s of strategies) {
        const vals = withNum.map((e, i) => s(numsOf(e.textContent), i));
        const sorted = vals.every((x, i) => i === 0 || x >= vals[i - 1]);
        const isIndex = vals.every((x, i) => x === i || x === i + 1);
        if (sorted && !isIndex && new Set(vals).size >= 10) { best = best || { els: withNum, vals }; return; }
      }
    };
    for (const r of roots()) {
      for (const c of [r, ...r.querySelectorAll("*")]) {
        if (c.tagName.toLowerCase() === "svg") consider([...c.querySelectorAll("text")]);
        else if (c.children.length >= 20) consider([...c.children]);
        if (best) return best;
      }
    }
    return best;
  };
  // ---- role marks
  const ROLE = { low: "lo", lo: "lo", l: "lo", left: "lo", mid: "mid", m: "mid", middle: "mid", high: "hi", hi: "hi", h: "hi", right: "hi" };
  const LABEL_RE = /^[\s↑↓▲▼^←→⬆⬇]*((?:low|lo|mid|middle|high|hi|l|m|h)(?:\s*[,/&+=|·]\s*|\s+)?)+[\s↑↓▲▼^←→⬆⬇:]*$/i;
  const rolesOfLabel = t => (String(t).toLowerCase().match(/\b(low|lo|mid|middle|high|hi|l|m|h)\b/g) || []).map(w => ROLE[w]);
  const center = e => { const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const byLabels = (B) => {
    const obs = { lo: null, mid: null, hi: null };
    const cs = B.els.map(center);
    const leaves = all("*").filter(e => !e.children.length && e.textContent.trim() && e.textContent.trim().length <= 16 && LABEL_RE.test(e.textContent.trim()) && !e.closest("button") && !/legend/i.test(e.parentElement?.className?.baseVal ?? e.parentElement?.className ?? ""));
    for (const lab of leaves) {
      let idx = B.els.findIndex(b => b !== lab && b.contains(lab));
      if (idx < 0) {
        const c = center(lab);
        if (!c.w && !c.h) continue;
        let bd = Infinity;
        cs.forEach((b, i) => { const dx = Math.abs(b.x - c.x), dy = Math.abs(b.y - c.y);
          if (dx <= Math.max(b.w, 8) * 0.6 && dy < 90 && dx + dy / 10 < bd) { bd = dx + dy / 10; idx = i; } });
      }
      if (idx < 0) continue;
      for (const role of rolesOfLabel(lab.textContent)) if (obs[role] == null) obs[role] = idx;
    }
    return obs;
  };
  const byClass = (B) => {
    const obs = { lo: null, mid: null, hi: null };
    B.els.forEach((b, i) => {
      const chain = [b, ...b.querySelectorAll("*")];
      let p = b.parentElement; if (p && p.children.length < 20 && p.children.length <= 3) chain.push(p);
      for (const e of chain) {
        const cls = (e.className?.baseVal ?? e.className ?? "") + " " + [...e.attributes].filter(a => a.name.startsWith("data-")).map(a => a.name + " " + a.value).join(" ");
        for (const m of String(cls).toLowerCase().matchAll(/(?:^|[\s_-])(low|lo|mid|high|hi)(?=$|[\s_-])/g)) { const r = ROLE[m[1]]; if (obs[r] == null) obs[r] = i; }
      }
    });
    return obs;
  };
  const colorsOf = e => { const s = getComputedStyle(e);
    return [s.backgroundColor, s.borderTopColor, s.outlineColor, s.fill, s.stroke].filter(c => c && !/rgba\(0, 0, 0, 0\)|transparent|none/.test(c)); };
  let baseColours = null;
  const byColour = (B) => {
    const obs = { lo: null, mid: null, hi: null };
    const boxCols = B.els.map(b => {
      const cols = new Set(colorsOf(b));
      if (!b.ownerSVGElement) for (const d of b.querySelectorAll("*")) colorsOf(d).forEach(x => cols.add(x));
      if (b.ownerSVGElement) { const c = center(b);
        for (const r of b.ownerSVGElement.querySelectorAll("rect,circle")) { const q = r.getBoundingClientRect();
          if (c.x >= q.left && c.x <= q.right && c.y >= q.top && c.y <= q.bottom) colorsOf(r).forEach(x => cols.add(x)); } }
      return cols;
    });
    const counts = new Map(); boxCols.forEach(s => s.forEach(c => counts.set(c, (counts.get(c) || 0) + 1)));
    const legend = all("*").filter(e => e.textContent.trim().length <= 24 && [...e.childNodes].some(n => n.nodeType === 3 && LABEL_RE.test(n.textContent.trim()) && n.textContent.trim()) && !B.els.some(b => b.contains(e)));
    for (const lab of legend) {
      const roles = rolesOfLabel([...lab.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(" "));
      const cands = [...colorsOf(lab), getComputedStyle(lab).color];
      for (const sib of [lab.previousElementSibling, lab.firstElementChild]) if (sib) cands.push(...colorsOf(sib));
      for (const col of cands) {
        if ((counts.get(col) || 0) > 3) continue;
        const i = boxCols.findIndex(s => s.has(col));
        if (i >= 0) { for (const r of roles) if (obs[r] == null) obs[r] = i; break; }
      }
    }
    return obs;
  };
  const textOf = r => { const c = r.cloneNode(true); c.querySelectorAll("style,script").forEach(e => e.remove()); c.querySelectorAll("*").forEach(e => e.append(" ")); return c.tagName === "STYLE" ? "" : c.textContent; };
  // the explanation is not a status line: skip long prose blocks that hold neither boxes nor controls
  const isProse = r => !r.querySelector("button,input") && !B_contains(r) && textOf(r).split(/\s+/).length >= 40;
  let B_contains = () => false;
  const statusText = (B) => { B_contains = r => B.els.some(b => r.contains(b));
    return roots().filter(r => !B.els.some(b => r === b || b.contains(r)) && !isProse(r)).map(textOf).join(" \n "); };
  const byStatus = (B) => {
    const t = statusText(B).replace(new RegExp(B.vals.join("\\s*"), "g"), " ");
    const get = re => { const m = t.match(re); if (!m) return null; const n = +m[1];
      const asVal = B.vals.indexOf(n); return { n, asVal }; };
    return { lo: get(/\b(?:low|lo|left)\b\s*(?:index|idx)?\s*[=:]?\s*\[?(-?\d+)/i),
             mid: get(/\b(?:mid|middle)\b\s*(?:index|idx)?\s*[=:]?\s*\[?(-?\d+)/i),
             hi: get(/\b(?:high|hi|right)\b\s*(?:index|idx)?\s*[=:]?\s*\[?(-?\d+)/i), status: true };
  };
  const observe = (B) => {
    for (const f of [byLabels, byClass, byColour]) { const o = f(B); if (o.mid != null || o.lo != null) return o; }
    return byStatus(B);
  };
  // status-derived marks may name an index or a value; a box-derived mark is an index
  const eqIdx = (o, want) => o == null ? true : (typeof o === "number" ? o === want : (o.n === want || o.asVal === want));
  const seen = (o) => o != null;
  // ---- controls
  const buttons = () => all("button, input[type=button], input[type=submit]");
  const btn = re => buttons().find(b => re.test((b.textContent || b.value || "").trim()));
  const targetBox = () => {
    const ins = all("input").filter(i => /^(text|number|search|)$/.test(i.type || ""));
    return ins.find(i => /target|search|find|look/i.test((i.labels ? [...i.labels].map(l => l.textContent).join(" ") : "") + " " + (i.placeholder || "") + " " + (i.name || "") + " " + (i.closest("form,label,div")?.textContent || ""))) || ins[0];
  };
  const setTarget = async n => {
    const i = targetBox(); if (!i) return false;
    i.focus?.(); i.value = String(n);
    i.dispatchEvent(new Event("input", { bubbles: true }));
    i.dispatchEvent(new Event("change", { bubbles: true }));
    i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    i.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
    await sleep(500); return true;
  };
  const click = async re => { const b = btn(re); if (!b) return false; b.click(); await sleep(350); return true; };
  const STEP = /^(step|next|▶|→|step\s*[▶→>]+|[▶→>]\s*step|next\s*step|step\s*forward)$/i;
  const STEP_LOOSE = /\bstep\b|\bnext\b/i;
  const RESET = /reset|restart|start over|clear/i;
  const stepBtn = () => btn(STEP) || buttons().find(b => STEP_LOOSE.test(b.textContent || b.value || "") && !RESET.test(b.textContent || b.value || "") && !/auto|play|run|all/i.test(b.textContent || ""));
  const doStep = async () => { const b = stepBtn(); if (!b) return false; b.click(); await sleep(350); return true; };
  // ---- the algorithm
  const expected = (vals, t) => { const steps = []; let lo = 0, hi = vals.length - 1;
    while (lo <= hi) { const mid = Math.floor((lo + hi) / 2); steps.push({ lo, mid, hi });
      if (vals[mid] === t) return { steps, found: mid };
      if (vals[mid] < t) lo = mid + 1; else hi = mid - 1; }
    steps.push({ lo, mid: null, hi }); return { steps, found: -1 }; };
  const FOUND = /\bfound\b|\bat index\b|\bis at\b|🎉|✓|✔/i;
  const NOTFOUND = /not\s+(?:be\s+)?(?:found|in|present|there|exist)|isn['’]t|is not|doesn['’]t|does not|absent|no such|missing|not\s+in\s+the/i;
  const countIn = t => { const out = [];
    for (const m of t.matchAll(/(\d+)\s*(?:steps?|comparisons?|tries|probes?|iterations?|checks?)/gi)) out.push(+m[1]);
    for (const m of t.matchAll(/(?:steps?|comparisons?|tries|probes?|iterations?|checks?)\s*(?:taken|used|made|needed)?\s*[:=]?\s*(\d+)/gi)) out.push(+m[1]);
    const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    for (const m of t.matchAll(/\b(one|two|three|four|five|six)\s+(?:steps?|comparisons?)/gi)) out.push(W[m[1].toLowerCase()]);
    return out; };
  // walk a target from a reset state; returns "ok" or why not
  const walk = async (B0, t, { wantFound }) => {
    const E = expected(B0.vals, t); const K = E.steps.filter(s => s.mid != null).length;
    const obsList = [];
    let finishedAt = -1, finalText = "";
    const pre = observe(findBoxes() || B0);
    for (let k = 1; k <= K + 2; k++) {
      if (!(await doStep())) return "no Step button (buttons: " + JSON.stringify(buttons().map(b => (b.textContent || b.value).trim().slice(0, 30))) + ")";
      const B = findBoxes(); if (!B) return "the 20 boxes disappeared after Step " + k;
      if (B.vals.join() !== B0.vals.join()) return "the array changed after Step " + k + ": " + B.vals.join(",");
      const o = observe(B); obsList.push(o);
      const txt = statusText(B);
      const done = wantFound ? (FOUND.test(txt.replace(NOTFOUND, "")) && !NOTFOUND.test(txt)) : NOTFOUND.test(txt);
      if (done) { finishedAt = k; finalText = txt; break; }
    }
    if (finishedAt < 0) return (wantFound ? "no found message" : "no not-found message") + " after " + (K + 2) + " Steps for target " + t + " (expected " + K + " comparisons); text: " + statusText(findBoxes() || B0).replace(/\s+/g, " ").slice(-240);
    if (finishedAt < K) return "finished after " + finishedAt + " Steps, a standard binary search for " + t + " needs " + K + " comparisons";
    // mids: after click k the shown mid is mid_k (shown after comparing) or mid_{k+1} (the next probe, previewed)
    const mids = E.steps.map(s => s.mid);
    const showsMid = obsList.slice(0, K).map(o => o.mid);
    const fits = off => showsMid.every((m, i) => m == null || eqIdx(m, mids[i + off]) || (i + off >= K && m != null && eqIdx(m, mids[K - 1])));
    if (!showsMid.some(m => m != null)) return "no mid highlight could be read while stepping to " + t;
    const off = fits(0) ? 0 : (fits(1) ? 1 : -1);
    if (off < 0) return "highlighted mid sequence " + JSON.stringify(showsMid.map(m => m == null ? null : (typeof m === "number" ? m : m.n))) + " is not the binary-search mid sequence " + JSON.stringify(mids.slice(0, K)) + " for target " + t;
    // low/high: the bracket before or after the comparison
    for (let i = 0; i < Math.min(K, obsList.length); i++) {
      const o = obsList[i], a = E.steps[i], b = E.steps[i + 1] || a;
      const loOk = eqIdx(o.lo, a.lo) || eqIdx(o.lo, b.lo) || (b.lo > b.hi && (eqIdx(o.lo, b.lo) || eqIdx(o.lo, a.lo)));
      const hiOk = eqIdx(o.hi, a.hi) || eqIdx(o.hi, b.hi);
      if (!loOk || !hiOk) return "after Step " + (i + 1) + " for target " + t + " low/high shown as " + JSON.stringify([o.lo, o.hi]) + ", binary search has low=" + a.lo + " high=" + a.hi + " before and low=" + b.lo + " high=" + b.hi + " after that comparison";
    }
    if (![pre, ...obsList].some(o => seen(o.lo)) || ![pre, ...obsList].some(o => seen(o.hi))) return "low and high are never highlighted while stepping to " + t;
    if (wantFound) {
      const counts = countIn(finalText);
      if (!counts.includes(K)) return "found message does not give the comparison count " + K + " for target " + t + ": " + finalText.replace(/\s+/g, " ").slice(-200);
    }
    return "ok";
  };
  try {
    await sleep(1000);
    // prose
    const prose = userVars.map(v => v._value).filter(x => x instanceof Element && !x.querySelector("button,input")).map(textOf).join("\n");
    const words = prose.split(/\s+/).filter(w => /[a-z]/i.test(w)).length;
    R.prose = !/binary search/i.test(prose) ? "no prose block mentions binary search" : (words < 60 ? "prose is only " + words + " words" : "ok");
    const B0 = findBoxes();
    if (!B0) { R.boxes = "no 20 sorted numbers drawn as boxes"; for (const k of ["found", "absent", "retarget", "reset"]) R[k] = "no boxes"; return R; }
    R.boxes = "ok";
    homeMods = new Set(userVars.filter(v => v._value instanceof Element && (B0.els.some(b => v._value.contains(b)) || [...(v._value.matches("button") ? [v._value] : []), ...v._value.querySelectorAll("button")].some(x => /step|reset|next/i.test(x.textContent)))).map(v => v._module));
    const worst = expected(B0.vals, Infinity).steps.filter(s => s.mid != null).length; // 5 for n=20
    let worstCase = 0; for (let t0 of B0.vals) worstCase = Math.max(worstCase, expected(B0.vals, t0).steps.filter(s => s.mid != null).length);
    const claim = prose.match(/(?:at most|no more than|maximum of|max(?:imum)?\s*(?:of)?|never more than|up to|worst[- ]case[^.]{0,30}?)\s+(\d+|one|two|three|four|five|six)\s+(?:steps?|comparisons?|guesses|tries)/i);
    if (R.prose === "ok" && claim) { const W = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
      const n = W[claim[1].toLowerCase()] ?? +claim[1];
      if (n !== worstCase && n !== Math.max(worst, worstCase)) R.prose = "prose says " + JSON.stringify(claim[0]) + " but the widget's worst case is " + worstCase; }
    if (!targetBox()) { for (const k of ["found", "absent", "retarget", "reset"]) R[k] = "no target input box"; return R; }
    // a present target with the longest walk, an absent one, a second present one
    let tFound = B0.vals[0], best = 0;
    for (const v of B0.vals) { const n = expected(B0.vals, v).steps.length; if (n > best) { best = n; tFound = v; } }
    let tAbsent = null;
    for (let i = 0; i + 1 < 20 && tAbsent == null; i++) if (B0.vals[i + 1] - B0.vals[i] >= 2 && i >= 6) tAbsent = B0.vals[i] + 1;
    if (tAbsent == null) tAbsent = B0.vals[19] + 1;
    const tOther = B0.vals.find(v => v !== tFound && expected(B0.vals, v).steps.length >= 3 && Math.abs(B0.vals.indexOf(v) - B0.vals.indexOf(tFound)) > 3) ?? B0.vals[2];
    const fresh = async t => { await setTarget(t); await click(RESET); await sleep(200); };
    await fresh(tFound);
    R.found = await walk(B0, tFound, { wantFound: true });
    await fresh(tAbsent);
    R.absent = await walk(B0, tAbsent, { wantFound: false });
    // retarget: two steps on one target, then type another: its walk must start from the beginning
    await fresh(tOther); await doStep(); await doStep();
    await setTarget(tFound);
    R.retarget = await walk(B0, tFound, { wantFound: true });
    if (R.retarget !== "ok") R.retarget = "after 2 Steps on " + tOther + " then typing " + tFound + ": " + R.retarget;
    // reset: two steps, Reset, walk again
    await setTarget(tOther); await doStep(); await doStep();
    if (!(await click(RESET))) R.reset = "no Reset button";
    else { R.reset = await walk(B0, tOther, { wantFound: true }); if (R.reset !== "ok") R.reset = "after 2 Steps then Reset: " + R.reset; }
    return R;
  } catch (e) {
    for (const k in R) if (R[k] === "not run") R[k] = "collect threw: " + (e && e.message);
    return R;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

// Search state is one mutable (@tomlarkworthy/gallery `mutable edits` pattern); the Step / Reset buttons
// are htl.html onclick handlers that write it ($edits.value = … in @tomlarkworthy/gallery.card,
// lopebooks/notebooks/@tomlarkworthy_gallery.html); a cell that lists the target writes the initial
// state back, so typing a new target restarts the walk.
const SOLUTION = `const _intro = function intro(md){return( md\`# Binary search, one comparison at a time

Binary search finds a value in a **sorted** array by repeatedly halving the part of the array that could still contain it. It keeps two indices, **low** and **high**, that bracket the candidates. At the start low is the first index and high is the last.

Each step looks at the middle index, **mid** = ⌊(low + high) / 2⌋, and compares the number there with the target. If they are equal the search is over. If the middle number is smaller than the target, everything at or left of mid can be discarded, so low becomes mid + 1. If it is larger, high becomes mid − 1.

When low passes high the bracket is empty and the target is not in the array. Because every comparison halves the bracket, an array of 20 numbers needs at most 5 comparisons. Type a target below and press **Step** to watch low, mid and high move.\` )};
const _arr = function arr(){return( [3, 8, 11, 15, 19, 24, 27, 31, 36, 40, 44, 49, 53, 58, 62, 67, 71, 75, 82, 90] )};
const _target = function target(Inputs){return( Inputs.number({label: "Target", value: 53}) )};
const _target_v = (G, _) => G.input(_);
const _fresh = function fresh(arr){return( () => ({lo: 0, hi: arr.length - 1, mid: null, steps: 0, status: "ready"}) )};
const _initial_search = function initial_search(fresh){return( fresh() )};
const _mutable_search = function mutable_search(Mutable, initial_search){return( new Mutable(initial_search) )};
const _search = function search(mutable_search){return( mutable_search.generator )};
const _restartOnTarget = function restartOnTarget(target, $search, fresh){ $search.value = fresh(); return target; };
const _advance = function advance(arr){return( (s, t) => {
  if (s.status === "found" || s.status === "absent") return s;
  if (s.lo > s.hi) return {...s, mid: null, status: "absent"};
  const mid = Math.floor((s.lo + s.hi) / 2), steps = s.steps + 1;
  if (arr[mid] === t) return {lo: s.lo, hi: s.hi, mid, steps, status: "found"};
  const next = arr[mid] < t ? {lo: mid + 1, hi: s.hi} : {lo: s.lo, hi: mid - 1};
  return {...next, mid, steps, status: next.lo > next.hi ? "absent" : "searching", seen: {lo: s.lo, hi: s.hi}};
} )};
const _controls = function controls(htl, advance, target, $search, fresh){return( htl.html\`<div style="display:flex;gap:8px">
  <button onclick=\${() => { $search.value = advance($search.value, target); }}>Step</button>
  <button onclick=\${() => { $search.value = fresh(); }}>Reset</button>
</div>\` )};
const _view = function view(htl, arr, search, target){
  const s = search, lo = s.seen ? s.seen.lo : s.lo, hi = s.seen ? s.seen.hi : s.hi;
  const roles = i => [i === lo && s.mid != null ? "low" : null, i === s.mid ? "mid" : null, i === hi && s.mid != null ? "high" : null].filter(Boolean);
  const box = (v, i) => { const r = roles(i), active = i >= lo && i <= hi;
    return htl.html\`<div style="display:flex;flex-direction:column;align-items:center;width:44px">
      <div style=\${{border: "2px solid " + (i === s.mid ? "#d33" : "#999"), background: i === s.mid ? "#fdd" : active ? "#fff" : "#eee", padding: "6px 0", width: "40px", textAlign: "center", fontFamily: "monospace"}}>\${v}</div>
      <div style="font-size:11px;height:14px">\${r.join("/")}</div></div>\`; };
  const msg = s.status === "found" ? \`Found \${target} at index \${s.mid} in \${s.steps} comparisons.\`
    : s.status === "absent" ? \`\${target} is not in the array (checked in \${s.steps} comparisons).\`
    : s.steps === 0 ? "Press Step to make the first comparison." : \`Comparison \${s.steps}: arr[\${s.mid}] = \${arr[s.mid]} vs \${target}.\`;
  return htl.html\`<div><div style="display:flex;gap:4px">\${arr.map(box)}</div><p>\${msg}</p></div>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_arr", "arr", [], _arr);
  $def("_target", "viewof target", ["Inputs"], _target);
  main.variable(observer("target")).define("target", ["Generators", "viewof target"], _target_v);
  $def("_fresh", "fresh", ["arr"], _fresh);
  $def("_initial_search", "initial search", ["fresh"], _initial_search);
  $def("_mutable_search", "mutable search", ["Mutable", "initial search"], _mutable_search);
  $def("_search", "search", ["mutable search"], _search);
  $def("_restartOnTarget", "restartOnTarget", ["target", "mutable search", "fresh"], _restartOnTarget);
  $def("_advance", "advance", ["arr"], _advance);
  $def("_controls", "controls", ["htl", "advance", "target", "mutable search", "fresh"], _controls);
  $def("_view", "view", ["htl", "arr", "search", "target"], _view);
  return main;
}
`;

export default {
  id: "rc5t-binary-search-stepper",
  category: "rc5-train",
  question: "Write a short interactive tutorial that explains binary search: a few paragraphs of explanation, a sorted array of 20 numbers drawn as boxes, a box where I type the target, and Step / Reset buttons that walk through the search one comparison at a time, highlighting low, mid and high, and saying how many steps it took when it finishes (or that the number isn't there).",
  setup: { init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "prose", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "boxes", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "found", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "absent", equals: "ok" }, weight: 1 },
    { name: "collected_equals", args: { key: "retarget", equals: "ok" }, weight: 2 },
    { name: "collected_equals", args: { key: "reset", equals: "ok" }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/event-handlers-in-cells.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/binary-search.js", content: SOLUTION } },
  ],
};
