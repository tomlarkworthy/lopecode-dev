const _sections = function _sections() {return ([
  // The document's spine. Position in THIS array is the section number; nothing
  // else assigns one. Moving a section is moving its line, and every heading,
  // cross-reference and the contents list follow.
  //
  // Written because they did not follow. Hand-numbered headings had drifted
  // from the references pointing at them: on 2026-08-09 the source carried
  // live references to §0, §2.1, §5.2, §10, §11, §11.2, §11.4 and §11.5, none
  // of which the document still had. A reader following one landed nowhere.
  //
  // `num: null` is a section that is deliberately unnumbered -- front matter
  // the reader meets before the argument starts. It still gets an anchor, so
  // `ref` can link to it.
  { key: "scanner", title: "The Scanner", num: null },
  { key: "about", title: "About", num: null, parent: "scanner" },

  { key: "mark", title: "The barcode mark" },
  { key: "multi", title: "Multiple Barcodes" },

  { key: "eval", title: "Evaluation" },
  { key: "labels", title: "The label set", parent: "eval" },
  { key: "nearmiss", title: "Near misses", parent: "eval" },
  { key: "score", title: "Score at the current settings", parent: "eval" },
  { key: "overlay", title: "The same frames, with the fit drawn on", parent: "eval" },

  { key: "detect", title: "Detection" },
  { key: "pattern", title: "The circular barcode pattern", parent: "detect" },
  { key: "scanline", title: "One scanline", parent: "detect" },
  { key: "combine", title: "Combine Scanlines", parent: "detect" },
  { key: "ortho", title: "Scanning orthogonally", parent: "combine" },
  { key: "pose", title: "From marks to a pose", parent: "detect" },
  { key: "fast", title: "Making it fast", parent: "detect" },
  { key: "faster", title: "Making it even faster, and fast to start", parent: "detect" },
  { key: "relabel", title: "Relabelling", parent: "detect" },
  { key: "tests", title: "Tests", parent: "detect" },

  { key: "next", title: "Next steps" },
  { key: "lattice", title: "The ring lattice", parent: "next" },
  { key: "constrains", title: "What one mark constrains", parent: "next" }
]);};
const _sectionIndex = function _sectionIndex(sections) {
  // key -> { num, title, level, key }. Depth comes from the parent chain rather
  // than a declared level, so a section cannot claim a heading level that
  // disagrees with where it sits.
  const index = new Map();
  const counter = new Map();   // parent key (or "" for top) -> count so far
  for (const s of sections) {
    const parent = s.parent ? index.get(s.parent) : null;
    if (s.parent && !parent) throw new Error(`section ${s.key} has unknown parent ${s.parent}`);
    if (index.has(s.key)) throw new Error(`duplicate section key ${s.key}`);
    const level = parent ? parent.level + 1 : 2;
    // An unnumbered section, and anything under one, stays unnumbered.
    const unnumbered = s.num === null || (parent && parent.num === null);
    let num = null;
    if (!unnumbered) {
      const bucket = s.parent ?? "";
      const n = (counter.get(bucket) ?? 0) + 1;
      counter.set(bucket, n);
      num = parent ? `${parent.num}.${n}` : String(n);
    }
    index.set(s.key, { key: s.key, num, title: s.title, level });
  }
  return index;
};
const _sec = function _sec(sectionIndex, htl) {return ((key) => {
  const s = sectionIndex.get(key);
  if (!s) return htl.html`<h2 style="color:#c96a6a">[missing section: ${key}]</h2>`;
  const text = s.num === null ? s.title : `§${s.num}   ${s.title}`;
  // htl.html cannot take a dynamic tag name, so the heading is built directly.
  const h = document.createElement(`h${Math.min(s.level, 6)}`);
  h.id = `sec-${key}`;
  h.textContent = text;
  return h;
});};
const _ref = function _ref(sectionIndex, htl) {return ((key) => {
  const s = sectionIndex.get(key);
  // Loud on purpose. A cross-reference that no longer resolves is the failure
  // this machinery exists to prevent, so it must not render as ordinary text.
  if (!s) return htl.html`<strong style="color:#c96a6a">[missing section: ${key}]</strong>`;
  const label = s.num === null ? s.title : `§${s.num}`;
  return htl.html`<a href="#sec-${key}" title="${s.num === null ? s.title : `§${s.num} ${s.title}`}"
    onclick=${(ev) => {
      ev.preventDefault();
      const el = document.getElementById(`sec-${key}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }}>${label}</a>`;
});};
const _toc = function _toc(sectionIndex, htl) {
  const items = [...sectionIndex.values()].map((s) => htl.html`<li style="
      margin:0; padding:1px 0; list-style:none;
      padding-left:${(s.level - 2) * 1.2}em;
      font-weight:${s.level === 2 ? 600 : 400};
      opacity:${s.level > 3 ? 0.75 : 1};
    "><a href="#sec-${s.key}" style="text-decoration:none" onclick=${(ev) => {
      ev.preventDefault();
      const el = document.getElementById(`sec-${s.key}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }}>${s.num === null ? "" : `§${s.num}  `}${s.title}</a></li>`);
  return htl.html`<nav style="
    border:1px solid rgba(128,128,128,0.35); border-radius:6px;
    padding:10px 14px; margin:8px 0; font-size:14px; line-height:1.45;
    columns:2; column-gap:28px;
  "><ul style="margin:0; padding:0">${items}</ul></nav>`;
};
