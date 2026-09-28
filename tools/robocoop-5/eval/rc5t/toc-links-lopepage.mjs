// rc5-train eval (20260928-0245-w18): a table of contents whose links break lopepage.
// In run 20260928-0245-w18-before the agent found the existing Contents cell of
// @tomlarkworthy/inputs-reference, decided its linkTo('@tomlarkworthy/inputs-reference#radio_docs')
// links "navigate away from the page", and replaced them with bare markdown anchors [radio](#radio_docs).
// In a lopepage notebook the URL hash is the pane layout (#view=...). Clicking a bare #radio_docs
// replaced the whole hash with "#radio_docs" (layout gone from the URL) and scrolled nothing
// (target heading stayed at top=1049px). The linkTo links it removed kept the layout and scrolled the
// heading to top=24px. Every cell "computed with no runtime error".
//
// Behavioural check, so any working TOC passes (linkTo hrefs, a click handler that scrolls, …):
// setup.collect opens inputs-reference in a pane, requires a link above the first section for every
// `Inputs.<name>(` heading plus Utilities, clicks three of them, and requires that the layout survives in
// location.hash and that the target heading ends up in the top half of the viewport.

const COLLECT = String.raw`(async () => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const M = "@tomlarkworthy/inputs-reference";
  const LAYOUT = "#view=R100(S60(" + M + "),S40(@tomlarkworthy/robocoop-5))";
  const go = h => { history.pushState(null, "", h); dispatchEvent(new HashChangeEvent("hashchange")); };
  go(LAYOUT);
  const heads = () => [...document.querySelectorAll("h2,h3")];
  const heading = n => n === "utilities" ? heads().find(h => /^\s*Utilities\s*$/.test(h.textContent))
    : heads().find(h => h.textContent.includes("Inputs." + n + "("));
  for (let i = 0; i < 60 && !heading("button"); i++) await sleep(250);
  if (!heading("button")) return "inputs-reference did not render after opening it in a pane";
  await sleep(1500);
  const names = [...new Set(heads().map(h => h.textContent.match(/Inputs\.(\w+)\(/)?.[1]).filter(Boolean)), "utilities"];
  const firstSection = heads().find(h => /Inputs\.\w+\(/.test(h.textContent));
  const tocLink = n => [...document.querySelectorAll("a")].find(a =>
    (a.compareDocumentPosition(firstSection) & Node.DOCUMENT_POSITION_FOLLOWING) &&
    !/^https?:/i.test(a.getAttribute("href") || "") &&
    new RegExp("(^|[^\\w])" + n + "([^\\w]|$)", "i").test(a.textContent.trim()));
  const missing = names.filter(n => !tocLink(n));
  if (missing.length) return "TOC has no link for: " + missing.join(", ");
  let informative = 0;
  for (const n of ["table", "file", "radio"]) {
    go(LAYOUT);
    await sleep(800);
    const a = tocLink(n);
    if (!a) return "TOC link for " + n + " vanished after re-opening the layout";
    a.scrollIntoView({ block: "start" });
    await sleep(200);
    const t0 = heading(n).getBoundingClientRect().top;
    const href = a.getAttribute("href");
    a.click();
    await sleep(1500);
    const hash = decodeURIComponent(location.hash);
    if (!hash.includes("view=") || !hash.includes(M) || !hash.includes("@tomlarkworthy/robocoop-5"))
      return "clicking the " + n + " link (href " + href + ") lost the pane layout: hash is now " + JSON.stringify(location.hash.slice(0, 120));
    const h = heading(n);
    if (!h) return "section " + n + " no longer rendered after clicking its link";
    const t1 = h.getBoundingClientRect().top;
    if (t0 >= -5 && t0 < innerHeight / 2) continue;
    informative++;
    if (!(t1 >= -5 && t1 < innerHeight / 2)) return "clicking the " + n + " link (href " + href + ") did not scroll to it: heading top " + Math.round(t0) + " -> " + Math.round(t1) + "px, viewport " + innerHeight;
  }
  if (!informative) return "every target was already on screen before its click; the check measured nothing";
  return "ok";
})()`;

export default {
  id: "rc5t-toc-links-lopepage",
  category: "rc5-train",
  question: "The inputs-reference page is long. Add a table of contents at the top that links to each of its sections.",
  setup: { collect: COLLECT },
  criteria: [
    // the defect: a TOC link that replaces the #view= layout hash and scrolls nothing
    { name: "collected_equals", args: { equals: "ok" }, weight: 4 },
    // the page that documents lopepage links was read
  ],
  // The module already carries a working TOC (contents_docs, linkTo hrefs); reading it and leaving it is correct.
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/links-to-cells-in-a-lopepage-notebook.md" } },
    { tool: "read_file", args: { file_path: "/src/@tomlarkworthy/inputs-reference.js" } },
  ],
};
