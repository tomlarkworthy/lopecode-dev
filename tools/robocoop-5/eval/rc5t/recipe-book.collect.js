// Page-side (setup.collect) for rc5t-recipe-book: act as the user on the recipe book the agent built.
// Every control is found by its label/placeholder text across all element values of the new modules.
// 1. examples: before anything is added, the new modules show recipes (>= 2 checkboxes, options or list rows)
// 2. add two recipes through the form (text box, servings, ingredients textarea, steps textarea, Add button)
// 3. search: by a title word, then by an ingredient; some cell that showed both probes shows only the match
// 4. scale: pick probe A (select option / radio / click its title), set the servings control to 4 (A is for 2)
// 5. combined list: tick both probes; 200 g + 150 g zorbleberry must show as 350 g
// 6. export (the file a save writes), boot it in a sandboxed blob: iframe, report whether both probes are shown
(async () => {
  const A = { title: "Zorble Stew 7Q", servings: 2, ingredients: "200 g zorbleberry\n3 tbsp quibble oil", steps: "Stir.\nServe." };
  const B = { title: "Crumpet Toast 7Q", servings: 1, ingredients: "150 g zorbleberry\n2 slice bread", steps: "Toast." };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const T0 = Date.now();
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { newModules: [...rt.mains.keys()].filter(n => !base.has(n)) };
  const mods = () => out.newModules.map(n => rt.mains.get(n));
  const vars = () => [...rt._variables].filter(v => v._module && mods().includes(v._module));
  const keepers = [];
  for (const v of vars().filter(v => v._name && !String(v._name).startsWith("module "))) {
    try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {}
  }
  await sleep(800);
  const els = () => vars().map(v => v._value).filter(x => x instanceof Element);
  const texts = () => new Map(vars().filter(v => v._value instanceof Element).map(v => [v._name, v._value.textContent]));
  const allText = () => els().map(e => e.textContent).join("\n");
  const q = sel => els().flatMap(e => [...e.querySelectorAll(sel)]);
  const labelOf = el => {
    const parts = [el.placeholder, el.getAttribute("aria-label"), el.name, el.title, el.id];
    for (const l of el.labels || []) parts.push(l.textContent);
    const c = el.closest("label"); if (c) parts.push(c.textContent);
    // Inputs.* wrap: <form><label>Text</label><div><input></div></form>; a bare <b>Title</b><input> sibling
    let p = el.parentElement;
    for (let i = 0; i < 2 && p; i++, p = p.parentElement) if (p.textContent.length < 80) parts.push(p.textContent);
    const prev = el.previousElementSibling; if (prev && prev.textContent.length < 60) parts.push(prev.textContent);
    return parts.filter(Boolean).join(" ");
  };
  const set = (el, v) => {
    el.focus?.();
    el.value = v;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  if (!out.newModules.length) return { ...out, stage: "no new module" };

  // 1. examples shown before anything is added
  const recipeLikeRows = () => {
    const boxes = q("input[type=checkbox]").length, opts = q("option").length;
    return Math.max(boxes, opts);
  };
  out.initialRows = recipeLikeRows();
  out.hasExamples = out.initialRows >= 2 || vars().some(v => Array.isArray(v._value) && v._value.length >= 2 && v._value.every(r => r && typeof r === "object" && Object.values(r).some(Array.isArray)));

  // 2. add
  const addOne = async (R) => {
    const areas = q("textarea");
    const ingr = areas.find(a => /ingred/i.test(labelOf(a))) || areas[0];
    if (!ingr) return "no textarea for ingredients";
    const stepsEl = areas.find(a => a !== ingr && /step|method|instruc|direction|prep/i.test(labelOf(a))) || areas.find(a => a !== ingr);
    const texts_ = q("input[type=text], input:not([type])");
    const title = texts_.find(i => /title|name|recipe/i.test(labelOf(i)) && !/search|filter|find/i.test(labelOf(i)));
    if (!title) return "no title text box";
    const serv = q("input[type=number], input[type=range], input[type=text], input:not([type])").filter(i => i !== title).find(i => /serv|yield|portion|people/i.test(labelOf(i)) && !/scale|to\b/i.test(labelOf(i)));
    set(title, R.title);
    if (serv) set(serv, String(R.servings));
    set(ingr, R.ingredients);
    if (stepsEl) set(stepsEl, R.steps);
    await sleep(300);
    const btn = q("button, input[type=submit], input[type=button]").find(b => /add|save recipe|create|submit/i.test(b.textContent + " " + (b.value || "") + " " + (b.title || "")) && !/notebook|export|shopping|search/i.test(b.textContent));
    if (!btn) return "no Add button";
    btn.click();
    await sleep(500);
    return allText().includes(R.title) ? "ok" : "added title not shown";
  };
  out.addA = await addOne(A);
  out.addB = out.addA === "ok" ? await addOne(B) : "skipped";
  out.addedLive = out.addA === "ok" && out.addB === "ok";
  if (!out.addedLive) return { ...out, stage: "add" };

  // 3. search
  const search = q("input[type=search], input[type=text], input:not([type])").find(i => /search|filter|find/i.test(labelOf(i)));
  const narrows = async (term, keep, drop) => {
    const before = texts();
    set(search, term);
    await sleep(500);
    const after = texts();
    return [...after].some(([n, t]) => (before.get(n) || "").includes(keep) && (before.get(n) || "").includes(drop) && t.includes(keep) && !t.includes(drop));
  };
  if (search) {
    out.searchTitle = await narrows("crumpet", B.title, A.title);
    set(search, ""); await sleep(400);
    out.searchIngredient = await narrows("quibble oil", A.title, B.title);
    set(search, ""); await sleep(500);
  } else { out.searchTitle = out.searchIngredient = false; out.searchStage = "no search box"; }

  // 4. pick A, scale to 4 servings (A is written for 2): 400 g zorbleberry, 6 tbsp quibble oil
  const pick = async () => {
    const sel = q("select").find(s => [...s.options].some(o => o.textContent.includes(A.title)));
    if (sel) { const o = [...sel.options].find(o => o.textContent.includes(A.title)); sel.value = o.value; o.selected = true; set(sel, sel.value); return "select"; }
    const radio = q("input[type=radio]").find(r => (r.closest("label")?.textContent || labelOf(r)).includes(A.title));
    if (radio) { radio.click(); return "radio"; }
    const hit = q("*").filter(e => e.textContent.trim() === A.title && !e.closest("label, h1, h2")).pop();
    if (hit) { hit.click(); return "click"; }
    return "none";
  };
  out.pickVia = await pick();
  await sleep(500);
  const scaledRe = [/400\s*g\s*zorbleberry|zorbleberry\W*400\s*g/i, /(^|[^\d.])6\s*tbsp\s*quibble oil|quibble oil\W*6\s*tbsp/i];
  const scaleCandidates = q("input[type=number], input[type=range], input[type=text], input:not([type])")
    .filter(i => !/search|filter|find|title/i.test(labelOf(i)));
  out.scaleControls = scaleCandidates.map(labelOf).map(s => s.slice(0, 40));
  out.scaled = false;
  for (const i of scaleCandidates.sort((a, b) => /serv|scale|people|portion/i.test(labelOf(b)) - /serv|scale|people|portion/i.test(labelOf(a)))) {
    set(i, "4");
    await sleep(500);
    if (scaledRe.every(re => re.test(allText()))) { out.scaled = true; break; }
  }

  // 5. tick A and B: the shopping list sums 200 g + 150 g zorbleberry
  for (const R of [A, B]) {
    const cb = q("input[type=checkbox]").find(c => (c.closest("label")?.textContent || labelOf(c)).includes(R.title));
    if (cb && !cb.checked) { cb.click(); await sleep(300); }
    out["ticked" + (R === A ? "A" : "B")] = !!cb;
  }
  await sleep(400);
  out.combinedSum = /350\s*g\s*zorbleberry|zorbleberry\W*350\s*g/i.test(allText());
  const line = allText().match(/[^\n]{0,40}zorbleberry[^\n]{0,20}/gi);
  out.zorbLines = line ? line.slice(-4) : null;

  // 6. save + reopen
  for (const k of keepers) try { k.delete(); } catch {}
  out.liveMs = Date.now() - T0;
  const exp = [...rt._variables].find(v => v._name === "exportToHTML" && typeof v._value === "function")._value;
  const r = await exp({ mains: rt.mains });
  let html = typeof r === "string" ? r : r.source;
  const BUDGET = Math.max(3000, 26500 - (Date.now() - T0));
  out.reopenBudgetMs = BUDGET;
  const reporter = `<script>(${async function (titles, base, budget) {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const t0 = Date.now();
    let res = { found: [] };
    while (Date.now() - t0 < budget) {
      await sleep(400);
      const rt = globalThis.__ojs_runtime;
      if (!rt || !rt.mains || !rt.mains.size) continue;
      const ms = [...rt.mains].filter(([n]) => !base.includes(n));
      const seen = new Set();
      for (const [n, m] of ms) for (const v of [...rt._variables].filter(v => v._module === m && v._name)) {
        let x; try { x = await Promise.race([m.value(v._name), sleep(600).then(() => undefined)]); } catch (e) { x = undefined; }
        if (!(x instanceof Element)) continue;
        for (const t of titles) if (x.textContent.includes(t)) seen.add(t);
      }
      res = { found: [...seen], seen: ms.map(([n]) => n) };
      if (seen.size === titles.length || (ms.length && Date.now() - t0 > budget - 1500)) break;
    }
    parent.postMessage({ __recipeProbe: res }, "*");
  }})(${JSON.stringify([A.title, B.title])}, ${JSON.stringify([...base])}, ${BUDGET})<\/script>`;
  html = html.replace(/<\/body>(?![\s\S]*<\/body>)/i, reporter + "</body>");
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const frame = document.createElement("iframe");
  frame.sandbox = "allow-scripts";
  frame.style.cssText = "position:fixed;left:0;top:0;width:1200px;height:900px;opacity:0;pointer-events:none";
  const got = new Promise(res => {
    addEventListener("message", e => { if (e.data && e.data.__recipeProbe) res(e.data.__recipeProbe); });
    setTimeout(() => res({ found: [], timeout: true }), BUDGET + 1000);
  });
  frame.src = url;
  document.body.appendChild(frame);
  out.reopened = await got;
  out.reopenedShown = out.reopened.found?.length === 2;
  frame.remove();
  out.stage = "done";
  return out;
})()
