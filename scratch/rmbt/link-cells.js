//====CELL _extlink
const _extlink = function _externalLink(htl) {return ((label, href, { title = "Opens in a new tab" } = {}) => {
  // Convention ported from @tomlarkworthy/lopecode-live-2026: a link that LEAVES
  // the page carries the arrow, an in-document `ref` carries its section number,
  // so the reader can tell the two apart before clicking. Fresh icon per call --
  // one shared node would move itself to the last link that used it.
  const icon = htl.svg`<svg xmlns="http://www.w3.org/2000/svg" width="0.9em" height="0.9em"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
    style="vertical-align:-0.05em;margin-left:0.15em">
    <path d="M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6" />
    <path d="M11 13l9 -9" />
    <path d="M15 4h5v5" />
  </svg>`;
  return htl.html`<a href=${href} target="_blank" rel="noopener noreferrer" title=${title}>${label}${icon}</a>`;
});};
//====CELL _ref
const _ref = function _ref(sectionIndex,htl) {return ((key, label) => {
  const s = sectionIndex.get(key);
  // Loud on purpose. A cross-reference that no longer resolves is the failure
  // this machinery exists to prevent, so it must not render as ordinary text.
  if (!s) return htl.html`<strong style="color:#c96a6a">[missing section: ${key}]</strong>`;
  // Default label is the number. Pass one to make a word in the prose the link
  // itself -- "print out the pattern" reads better than "print out the §2".
  // The key is still resolved either way, so a dead reference is still loud.
  const num = s.num === null ? null : `§${s.num}`;
  // A labelled ref used to render as a bare word, which is exactly what an
  // external link looks like. The trailing number is the internal marker, the
  // counterpart of externalLink's arrow: the reader knows the target is in this
  // document, and where, without clicking.
  const tail = label && num ? htl.html`<span style="opacity:0.6;font-size:0.85em"> ${num}</span>` : "";
  return htl.html`<a href="#sec-${key}" title="${s.num === null ? s.title : `§${s.num} ${s.title}`}"
    onclick=${(ev) => {
      ev.preventDefault();
      const el = document.getElementById(`sec-${key}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }}>${label ?? (num ?? s.title)}${tail}</a>`;
});};
//====CELL _0d8v3u6
const _0d8v3u6 = function _anonymous(md,sec,externalLink) {return (md`${sec('about')}

Part V of a super long \[${externalLink("younger me", "https://www.youtube.com/watch?app=desktop&v=Y1KQNuUBxAk&t=93s")}, 2012\] and infrequently worked on project for fast optical localization. In this installment I added

* Detect multiple circular barcodes in the scene
* Decode them so each has an unambiguous code for matching
* Compile into WASM via AssemblyScript for fast performance
* Use Web Workers for parallelism
* Fuse multiple barcodes to get a pose

Less than 2ms per frame on MacBook, 16ms on phone 🤙 which is complete overkill for the browser as both max out at 30 f.p.s. for webcams, however, the long term aim is for hardware.

There are lots of optical tracking systems, including circular barcodes. The unique thing about this one is the design around single scan lines, so barcodes can be recognized with appropriate hardware as pixels leave the camera's MIPI. This is potentially hundreds of times faster than the frames per second rating of a camera.`);};
//====CELL _priorwork
const _priorwork = function _priorWork(htl,externalLink) {
  // The series as each notebook's own opening prose describes it, not as
  // remembered. Destinations checked 2026-08-13: Parts I and II answer 200 on
  // observablehq.com; Part III is not published there (api.observablehq.com
  // 404s for the slug) and ships only as a lopecode page.
  const rows = [
    ["2012",
     externalLink("Optical localization to 0.1mm, no problemo",
       "https://edinburghhacklab.com/2012/05/optical-localization-to-0-1mm-no-problemo/"),
     "Where it started. Cheap high-speed optical positioning for a robot's end effector, on a webcam."],
    ["I",
     externalLink("Simplifying Pose Estimation with Circular Barcodes",
       "https://observablehq.com/@tomlarkworthy/circular-barcode-simulator"),
     "The geometry, in a three.js camera simulator. A circular barcode reads the same along any chord through its centre, so a 2D pose search becomes a 1D pattern match on one row of pixels."],
    ["II",
     externalLink("Fast 1D Circular Barcode Matching",
       "https://observablehq.com/@tomlarkworthy/fast-1d-circular-barcode-matching"),
     "Centre and tilt of one barcode from one scan row of a simulated frame, by recovering the Möbius transform — the exact 1D projective map — from an anchor search, a DP alignment and a least-squares refit."],
    ["III",
     externalLink("Realtime Multi-Barcode Tracking",
       "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_realtime-multi-barcode-tracking.html"),
     "Several barcodes at independent poses, on live frames. Strided rows so each barcode is near-centred on one of them, and a cross-ratio test in place of Part II's anchor SVD."],
    ["V", htl.html`<span style="opacity:0.7">This notebook</span>`,
     "Printed marks that carry their own position, decoded from a live camera, fused into a plane pose."]
  ];
  return htl.html`<div style="margin:10px 0">
    <div style="font:12px ui-monospace,monospace;opacity:0.7;margin-bottom:4px">Earlier installments</div>
    <table style="border-collapse:collapse;width:100%">
      ${rows.map(([n, link, subject]) => htl.html`<tr style="border-top:1px solid rgba(128,128,128,0.25)">
        <td style="padding:6px 12px 6px 0;vertical-align:top;font:12px ui-monospace,monospace;opacity:0.6">${n}</td>
        <td style="padding:6px 12px 6px 0;vertical-align:top;min-width:15em">${link}</td>
        <td style="padding:6px 0;vertical-align:top;line-height:1.5">${subject}</td>
      </tr>`)}
    </table>
  </div>`;
};
//====CELL _wsmw0
const _wsmw0 = function _anonymous(md,htl,externalLink) {return (htl.html`<div>${md`AI rewrote the web worker algorithms in AssemblyScript and shipped an in-browser AssemblyScript Compiler. This makes it faster, and avoids the initial slow down you get with unoptimized Javascript when first run on a page.

The AssemblyScript compiler is included in this notebook as \`@tomlarkworthy/assembly-script\`, which owns \`asc\`, \`assemblyscript\`, \`long\` and \`binaryen\`.`}<aside style="font:11px/1.5 ui-monospace,monospace;color:var(--theme-foreground-muted,#888);border-left:2px solid currentColor;padding-left:10px;margin:8px 0">It is a module inside this file, so nothing is fetched to compile. Its Observable original is ${externalLink("observablehq.com/@tomlarkworthy/assembly-script", "https://observablehq.com/@tomlarkworthy/assembly-script")}.</aside></div>`);};
