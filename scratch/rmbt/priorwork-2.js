const _priorwork = function _priorWork(htl,externalLink) {
  // The series as each notebook's own opening prose describes it, not as
  // remembered. The 2012 post is Part I, which is what makes this one Part V --
  // the notebooks number themselves I, II, III because they count only
  // notebooks, so a reader following their self-labels lands one short.
  //
  // Destinations checked 2026-08-13: II and III answer 200 on observablehq.com;
  // IV is not published there (api.observablehq.com 404s for the slug) and
  // ships only as a lopecode page.
  //
  // Dates: I from the post's own URL; II and III are Observable publish_time
  // (api.observablehq.com/document/@tomlarkworthy/<slug>); IV and V are their
  // first commit in the lopebooks repo, which goes back to 2025-04, so those
  // are creation dates and not the repo's birthday.
  const rows = [
    ["I", "2012-05",
     externalLink("Optical localization to 0.1mm, no problemo",
       "https://edinburghhacklab.com/2012/05/optical-localization-to-0-1mm-no-problemo/"),
     "Where it started. Cheap high-speed optical positioning for a robot's end effector, on a webcam."],
    ["II", "2023-06",
     externalLink("Simplifying Pose Estimation with Circular Barcodes",
       "https://observablehq.com/@tomlarkworthy/circular-barcode-simulator"),
     "The geometry, in a three.js camera simulator. A circular barcode reads the same along any chord through its centre, so a 2D pose search becomes a 1D pattern match on one row of pixels."],
    ["III", "2025-08",
     externalLink("Fast 1D Circular Barcode Matching",
       "https://observablehq.com/@tomlarkworthy/fast-1d-circular-barcode-matching"),
     "Centre and tilt of one barcode from one scan row of a simulated frame, by recovering the Möbius transform — the exact 1D projective map — from an anchor search, a DP alignment and a least-squares refit."],
    ["IV", "2026-08",
     externalLink("Realtime Multi-Barcode Tracking",
       "https://tomlarkworthy.github.io/lopebooks/notebooks/tomlarkworthy_realtime-multi-barcode-tracking.html"),
     "Several barcodes at independent poses, on live frames. Strided rows so each barcode is near-centred on one of them, and a cross-ratio test in place of the anchor SVD."],
    ["V", "2026-08", htl.html`<span style="opacity:0.7">This notebook</span>`,
     "Printed marks that carry their own position, decoded from a live camera, fused into a plane pose."]
  ];
  return htl.html`<div style="margin:10px 0">
    <div style="font:12px ui-monospace,monospace;opacity:0.7;margin-bottom:4px">Earlier installments</div>
    <table style="border-collapse:collapse;width:100%">
      ${rows.map(([n, when, link, subject]) => htl.html`<tr style="border-top:1px solid rgba(128,128,128,0.25)">
        <td style="padding:6px 10px 6px 0;vertical-align:top;font:12px ui-monospace,monospace;opacity:0.6">${n}</td>
        <td style="padding:6px 12px 6px 0;vertical-align:top;white-space:nowrap;font:12px ui-monospace,monospace;opacity:0.6">${when}</td>
        <td style="padding:6px 12px 6px 0;vertical-align:top;min-width:15em">${link}</td>
        <td style="padding:6px 0;vertical-align:top;line-height:1.5">${subject}</td>
      </tr>`)}
    </table>
  </div>`;
};
