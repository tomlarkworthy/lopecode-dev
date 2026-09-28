// Page-side (setup.collect) for rc5t-orders-table: act as the user on the module the agent built.
// Each part is its own key so a defect costs only its own criterion.
//  rows500     a new-module cell holds 500 order objects with region/quantity/price fields
//  stable      that cell's rows are the same (JSON) after the dropdown and slider change
//  regionFilter  picking a region in the dropdown leaves only that region in the table
//  sliderFilter  raising the slider leaves only rows whose quantity*price >= the slider value
//  sortWorks   clicking the quantity header orders the rendered rows by quantity
//  onlyOrderRows every row in the table body is an order (no totals/summary row mixed into the data)
//  countShown  a number equal to the table's row count is rendered outside the table
//  totalsShown the sum of quantity and of quantity*price over the table's rows are both rendered
// "the table's rows" = the Inputs.table value (all displayed rows when none is selected), else the
// <tbody> rows of an HTML table that renders every row.
(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rt = globalThis.__ojs_runtime;
  const base = globalThis.__baseMods || new Set();
  const out = { newModules: [...rt.mains.keys()].filter(n => !base.has(n)) };
  const newVars = () => [...rt._variables].filter(v => v._module && v._name && out.newModules.some(n => rt.mains.get(n) === v._module));
  const keepers = [];
  for (const v of newVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  try {
    await sleep(1500);
    const key = (o, re) => Object.keys(o).find(k => re.test(k));
    const isOrders = x => Array.isArray(x) && x.length && x[0] && typeof x[0] === "object" &&
      key(x[0], /region/i) && key(x[0], /qty|quant/i) && key(x[0], /price/i);
    // the source cell: of the 500-row cells, the one with the fewest inputs (a filtered view is also 500 rows at boot)
    const cands = newVars().filter(v => isOrders(v._value) && v._value.length === 500).sort((a, b) => a._inputs.length - b._inputs.length);
    const snaps = cands.map(v => JSON.stringify(v._value));
    const dataVar = cands[0];
    out.rowCounts = newVars().filter(v => isOrders(v._value)).map(v => v._name + ":" + v._value.length);
    out.rows500 = !!dataVar;
    if (!dataVar) return out;
    const r0 = dataVar._value[0];
    const K = { region: key(r0, /region/i), qty: key(r0, /qty|quant/i), price: key(r0, /price/i) };
    const num = x => typeof x === "number" ? x : parseFloat(String(x).replace(/[^0-9.\-]/g, ""));
    const total = r => num(r[K.qty]) * num(r[K.price]);

    const els = () => newVars().map(v => v._value).filter(x => x instanceof Element);
    const all = sel => els().flatMap(e => [...(e.matches(sel) ? [e] : []), ...e.querySelectorAll(sel)]);
    const regions = [...new Set(dataVar._value.map(r => r[K.region]))];
    const select = all("select").find(s => [...s.options].some(o => regions.includes(o.value) || regions.includes(o.textContent.trim())));
    const slider = all("input[type=range]")[0];
    out.hasSelect = !!select; out.hasSlider = !!slider;
    // The table whose rows are orders: Inputs.table's form (value = shown rows) or a plain table
    const tableRows = () => {
      const forms = els().flatMap(e => [...(e.matches("form") ? [e] : []), ...e.querySelectorAll("form")]).filter(f => f.querySelector("table") && Array.isArray(f.value) && (f.value.length === 0 || isOrders(f.value)));
      if (forms.length) {
        const v = forms[0].value;
        return { rows: v.filter(r => regions.includes(r[K.region])), extra: v.length - v.filter(r => regions.includes(r[K.region])).length, el: forms[0] };
      }
      const t = all("table").find(t => t.querySelectorAll("tbody tr").length > 0 && regions.some(r => t.textContent.includes(r)));
      if (!t) return null;
      const heads = [...t.querySelectorAll("thead th, tr:first-child th")].map(h => h.textContent.trim());
      const ix = re => heads.findIndex(h => re.test(h));
      const iq = ix(/qty|quant/i), ir = ix(/region/i);
      const ip = heads.findIndex((h, i) => i !== iq && /price|unit/i.test(h));
      const cells = [...t.querySelectorAll("tbody tr")].map(tr => [...tr.children].map(td => td.textContent.trim()));
      const rows = cells.filter(c => regions.includes(c[ir])).map(c => ({ [K.region]: c[ir], [K.qty]: c[iq], [K.price]: c[ip] }));
      return { rows, extra: cells.length - rows.length, el: t };
    };
    const setVal = async (input, value) => {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await sleep(1200);
    };
    const t0 = tableRows();
    out.hasTable = !!t0;
    if (!select || !slider || !t0) return out;

    // region: the least frequent region, so a no-op filter cannot pass
    const counts = regions.map(r => [r, dataVar._value.filter(x => x[K.region] === r).length]).sort((a, b) => a[1] - b[1]);
    const R = counts[0][0];
    const opt = [...select.options].find(o => o.value === R || o.textContent.trim() === R);
    await setVal(slider, slider.min || 0);
    await setVal(select, opt.value);
    let t = tableRows();
    const want1 = dataVar._value.filter(x => x[K.region] === R && total(x) >= num(slider.value || 0)).length;
    out.region = { R, shown: t?.rows.length, want: want1 };
    out.regionFilter = !!t && t.rows.length > 0 && t.rows.length === want1 && t.rows.every(x => x[K.region] === R);

    // slider: the median total within that region
    const tots = dataVar._value.filter(x => x[K.region] === R).map(total).sort((a, b) => a - b);
    const target = tots[Math.floor(tots.length / 2)];
    await setVal(slider, target);
    const T = num(slider.value);
    t = tableRows();
    const expected = dataVar._value.filter(x => x[K.region] === R && total(x) >= T);
    out.slider = { T, shown: t?.rows.length, want: expected.length };
    out.sliderFilter = T > num(slider.min || 0) && !!t && t.rows.length === expected.length && t.rows.every(x => total(x) >= T - 1e-9 && x[K.region] === R);

    // sort: click the quantity header up to twice; the rendered rows must come out ordered by quantity
    const sortTable = () => all("table").find(t => [...t.querySelectorAll("th")].some(h => /qty|quant/i.test(h.textContent)) && t.querySelectorAll("tbody tr").length > 1);
    const qtySeq = () => {
      const tb = sortTable(); if (!tb) return null;
      const ths = [...(tb.querySelector("thead tr") || tb.querySelector("tr")).children];
      const i = ths.findIndex(h => /qty|quant/i.test(h.textContent));
      return [...tb.querySelectorAll("tbody tr")].slice(0, 15).map(tr => num(tr.children[i]?.textContent));
    };
    const ordered = a => a && a.length > 2 && a.every(Number.isFinite) && (a.every((x, i) => !i || a[i - 1] <= x) || a.every((x, i) => !i || a[i - 1] >= x));
    const seqs = [qtySeq()];
    for (let k = 0; k < 2 && !ordered(seqs[seqs.length - 1]); k++) {
      const th = [...(sortTable()?.querySelectorAll("th") || [])].find(h => /qty|quant/i.test(h.textContent));
      if (!th) break;
      th.click();
      await sleep(800);
      seqs.push(qtySeq());
    }
    out.sortSeqs = seqs.map(a => a && a.slice(0, 6));
    out.sortWorks = seqs.length > 1 && !ordered(seqs[0]) && ordered(seqs[seqs.length - 1]);

    // a summary row pushed into the table's data is a row that sorts, selects and counts with the orders
    out.extraRows = t ? t.extra : null;
    out.onlyOrderRows = !!t && t.extra === 0;

    out.stable = cands.some((v, i) => newVars().includes(v) && JSON.stringify(v._value) === snaps[i]);

    // count and totals, from the table's own rows, rendered anywhere outside the rows themselves
    const rows = t ? t.rows : [];
    const text = newVars().map(v => v._value).map(x => x instanceof Element ? x.textContent : (typeof x === "string" || typeof x === "number") ? String(x) : "").join(" | ");
    const nums = [...text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)].map(m => parseFloat(m[0].replace(/,/g, "")));
    const has = (v, tol) => nums.some(n => Math.abs(n - v) <= tol);
    const sq = rows.reduce((s, x) => s + num(x[K.qty]), 0);
    const sr = rows.reduce((s, x) => s + total(x), 0);
    out.sums = { count: rows.length, qty: sq, revenue: Math.round(sr * 100) / 100 };
    // the count must differ from 500 and the region count, so a stale or unfiltered count fails
    out.countShown = rows.length !== 500 && has(rows.length, 0);
    out.totalsShown = has(sq, 0) && has(sr, Math.max(1, sr * 0.0005));
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()
