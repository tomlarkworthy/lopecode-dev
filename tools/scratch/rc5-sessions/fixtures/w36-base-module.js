const _doc = function doc(md){return(
md`# Habit Tracker

Track daily habits on a 14-day grid. Add habits, click cells to toggle done, see current streaks, and download as CSV.

Data persists via **sticky** — save the notebook to keep your habits.`
)};
const _today = function today(){return(
new Date().toISOString().slice(0, 10)
)};
const _dates = function dates(d3){return(
d3.range(-13, 1).map(offset => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
})
)};
const _viewof_tracker = function tracker(sticky, htl, dates, d3, Inputs){return(
sticky((() => {
  const root = htl.html`<div>`;
  let state = { habits: [], checks: {} };

  function streak(habit, checks, dates) {
    let s = 0;
    for (let i = dates.length - 1; i >= 0; i--) {
      if (checks[habit]?.[dates[i]]) s++;
      else break;
    }
    return s;
  }

  function render() {
    root.innerHTML = '';
    Object.assign(root.style, { fontFamily: 'system-ui, sans-serif' });

    const { habits, checks } = state;

    // --- input row ---
    const form = htl.html`<div style="display:flex;gap:8px;margin-bottom:14px;">`;
    const input = htl.html`<input type="text" placeholder="New habit…" style="flex:1;padding:7px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px;">`;
    const addBtn = htl.html`<button onclick=${(e) => {
      const name = input.value.trim();
      if (!name || habits.includes(name)) { e.stopPropagation(); return; }
      state = { habits: [...habits, name], checks: { ...checks, [name]: {} } };
      root.value = state;
      root.dispatchEvent(new Event('input', { bubbles: true }));
    }} style="padding:7px 16px;border:none;border-radius:6px;background:#4f46e5;color:#fff;font-size:14px;cursor:pointer;font-weight:600;">+ Add</button>`;
    form.append(input, addBtn);

    if (habits.length === 0) {
      root.append(form, htl.html`<p style="color:#888;margin:0;">Add a habit to start tracking!</p>`);
      return;
    }

    // --- grid ---
    const table = htl.html`<table style="border-collapse:collapse;font-size:13px;width:100%;">`;
    const thead = htl.html`<thead>`;
    const hrow = htl.html`<tr>`;
    hrow.append(htl.html`<th style="text-align:left;padding:6px 8px;border-bottom:2px solid #ddd;">Habit`);
    dates.forEach(d => {
      const day = d3.timeFormat('%a')(new Date(d + 'T12:00:00'));
      const num = d.slice(8);
      hrow.append(htl.html`<th style="text-align:center;padding:4px 2px;border-bottom:2px solid #ddd;width:34px;">
        <div style="font-size:10px;color:#999;">${day}</div>
        <div style="font-size:12px;font-weight:600;">${num}</div>`);
    });
    hrow.append(htl.html`<th style="text-align:center;padding:6px 8px;border-bottom:2px solid #ddd;font-size:12px;">🔥`);
    hrow.append(htl.html`<th style="padding:6px;border-bottom:2px solid #ddd;">`);
    thead.append(hrow);
    table.append(thead);

    const tbody = htl.html`<tbody>`;
    habits.forEach(habit => {
      const row = htl.html`<tr>`;
      row.append(htl.html`<td style="padding:6px 8px;font-weight:500;white-space:nowrap;">${habit}`);

      dates.forEach(d => {
        const on = !!checks[habit]?.[d];
        const cell = htl.html`<td onclick=${() => {
          const nc = {};
          Object.entries(checks).forEach(([h, dmap]) => { nc[h] = { ...dmap }; });
          nc[habit][d] = !nc[habit][d];
          state = { ...state, checks: nc };
          root.value = state;
          root.dispatchEvent(new Event('input', { bubbles: true }));
        }} style="text-align:center;padding:4px 2px;cursor:pointer;">`;
        const dot = htl.html`<div style="width:26px;height:26px;margin:0 auto;border-radius:50%;background:${on ? '#4f46e5' : '#f0f0f0'};transition:background .15s;display:flex;align-items:center;justify-content:center;font-size:14px;color:#fff;font-weight:700;">`;
        dot.textContent = on ? '✓' : '';
        cell.append(dot);
        row.append(cell);
      });

      const s = streak(habit, checks, dates);
      row.append(htl.html`<td style="text-align:center;padding:6px 8px;font-weight:700;color:${s > 0 ? '#4f46e5' : '#ccc'};">${s}`);

      const del = htl.html`<button onclick=${(e) => {
        const nh = habits.filter(h => h !== habit);
        const nc = { ...checks };
        delete nc[habit];
        state = { habits: nh, checks: nc };
        root.value = state;
        root.dispatchEvent(new Event('input', { bubbles: true }));
        e.stopPropagation();
      }} style="border:none;background:none;cursor:pointer;font-size:14px;color:#ccc;padding:6px;" title="Remove habit">✕</button>`;
      row.append(htl.html`<td style="text-align:center;">${del}`);

      tbody.append(row);
    });
    table.append(tbody);

    const dlBtn = htl.html`<button onclick=${() => {
      const lines = ['Habit,' + dates.join(',') + ',Streak'];
      habits.forEach(h => {
        const s = streak(h, checks, dates);
        const vals = dates.map(d => checks[h]?.[d] ? '1' : '0').join(',');
        lines.push(`"${h}",${vals},${s}`);
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = htl.html`<a href=${url} download="habits.csv" style="display:none;"></a>`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }} style="margin-top:14px;padding:8px 18px;border:1px solid #ddd;border-radius:6px;background:white;font-size:13px;cursor:pointer;font-weight:500;">⬇ Download CSV</button>`;

    root.append(form, table, dlBtn);
  }

  Object.defineProperty(root, 'value', {
    get: () => state,
    set: (v) => { if (v && Array.isArray(v.habits)) { state = v; } render(); }
  });

  render();
  return root;
})(), { "habits": [], "checks": {} } )
)};
const _tracker = function tracker(G, viewof_tracker){return(
G.input(viewof_tracker)
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => {
    main.variable(observer(name)).define(name, deps, fn).pid = pid;
  };

  main.define("module @tomlarkworthy/sticky", async () => runtime.module((await import("/@tomlarkworthy/sticky.js?v=4")).default));
  main.define("sticky", ["module @tomlarkworthy/sticky", "@variable"], (_, v) => v.import("sticky", _));

  $def("_doc", "doc", ["md"], _doc);
  $def("_today", "today", [], _today);
  $def("_dates", "dates", ["d3"], _dates);
  $def("_viewof_tracker", "viewof tracker", ["sticky","htl","dates","d3","Inputs"], _viewof_tracker);
  $def("_tracker", "tracker", ["Generators","viewof tracker"], _tracker);

  return main;
}