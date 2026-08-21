rowWalkFrame = {
  // Where the row is. The strip down the right says what the detector gets out of
  // each row, so the slider can be aimed rather than hunted with. It carries the
  // circles' colours because locating a mark is not decoding one: a strip that goes
  // green on a hit reads as success on rows that returned no id at all.
  const b = hexFrameBank[rowWalkCfg.frame];
  const { y, w, h, kept } = rowWalkRow;
  const rows = rowWalkScan.rows;
  const MUT = "var(--theme-foreground-muted,#888)";
  const STRIP = 30;
  let s = `<image href="${b.url}" x="0" y="0" width="${w}" height="${h}"/>`;
  for (const t of b.truth)
    s += `<circle cx="${t.x}" cy="${t.y}" r="${t.radiusPx}" fill="none"
      stroke="#ffffff" stroke-opacity="0.28" stroke-width="2"/>`;
  s += `<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="#5af" stroke-width="2"/>`;
  for (const k of kept)
    s += `<circle cx="${k.foot.toFixed(1)}" cy="${y}" r="7" fill="none"
      stroke="${k.id != null ? "#2fe08a" : "#f5a524"}" stroke-width="3"/>`;
  for (const r of rows) {
    const idd = r.hits.some((hit) => hit.id != null);
    const on = r.hits.length > 0;
    s += `<rect x="${w + 10}" y="${r.y - 1}" width="${idd ? 16 : on ? 11 : 6}" height="3"
      fill="${idd ? "#2fe08a" : on ? "#f5a524" : "#777"}"/>`;
  }
  s += `<rect x="${w + 8}" y="${y - 3}" width="20" height="7" fill="none" stroke="#5af" stroke-width="2"/>`;

  const el = htl.html`<div></div>`;
  el.innerHTML = `<svg viewBox="0 0 ${w + STRIP} ${h}"
    style="display:block;width:100%;height:auto;cursor:crosshair;touch-action:none">${s}</svg>`;

  // Click or drag anywhere on the frame to put the scan row there. Drives the
  // slider rather than shadowing it, so the two can never disagree. Write to
  // the Inputs.range FORM, not its <input> -- the form's setter is what holds
  // the value the composite reads back; the raw element is re-synced from it.
  const svg = el.firstChild;
  const rowForm = viewof rowWalkCfg.querySelectorAll("input[type=range]")[0]?.closest("form");
  const aim = (ev) => {
    const ctm = svg.getScreenCTM();
    if (!ctm || !rowForm) return;
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX;
    pt.y = ev.clientY;
    const frac = pt.matrixTransform(ctm.inverse()).y / (h - 1);
    rowForm.value = +Math.min(1, Math.max(0, frac)).toFixed(3);
    rowForm.dispatchEvent(new Event("input", { bubbles: true }));
  };
  svg.addEventListener("pointerdown", (ev) => {
    svg.setPointerCapture(ev.pointerId);
    aim(ev);
  });
  svg.addEventListener("pointermove", (ev) => {
    if (svg.hasPointerCapture(ev.pointerId)) aim(ev);
  });
  svg.addEventListener("pointerup", (ev) => svg.releasePointerCapture(ev.pointerId));

  const dec = kept.filter((k) => k.id != null).length;
  const rowsDecoded = rows.filter((r) => r.hits.some((hit) => hit.id != null)).length;
  return htl.html`<figure style="margin:12px 0">
    ${el}
    <figcaption style="font:11px/1.5 ui-monospace,monospace;color:${MUT};margin-top:6px">
      <b>${b.name}</b> · ${w}×${h} · row y = <b>${y}</b> ·
      ${rowWalkScan.locked} of ${rowWalkScan.total} scanned rows lock at least one mark,
      ${rowsDecoded} of them decode an id ·
      this row locks <b>${kept.length}</b>${dec ? `, ${dec} of them with an id` : ", none with an id"}.
      Click or drag on the frame to move the scan row.
      Green carries an id, amber is located but undecoded — for the circles and for the
      strip alike. The faint white circles are the frame's recorded marks — context, not input.
    </figcaption>
  </figure>`;
}