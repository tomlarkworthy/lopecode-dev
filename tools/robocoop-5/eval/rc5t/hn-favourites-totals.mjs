// rc5-train eval (20260928-0847-m11): maintenance goal «Some numbers in my notebook look wrong: the totals
// don't add up. Find the bug and fix it.»
// setup.files seeds @user/hn-favourites, re-homed from @tomlarkworthy/hacker-favourites-analysis
// (lopebooks/notebooks/@tomlarkworthy_hacker-favourites-analysis.html): the CSV attachment is replaced by 28
// inline rows (8 members), the @jashkenas checkbox by Inputs.toggle, the footer dropped, and a summary cell
// added that prints the vote budget (members x 30) next to the sum of the ranking's votes.
// ONE seeded bug in score_per_link, which every shown number computes through: the first favourite of a link
// seeds its score with that member's vote share instead of 0, and the += below adds it again, so the first
// voter of every link is counted twice. With the toggle on, the summary shows 240 votes to share and 351
// counted; frank's only favourite shows 60 faves out of his 30 votes.
// setup.collect scores what is SHOWN, with the toggle on and then off (a fix that only works for the default,
// or that edits the summary instead of the scores, fails):
//   favesOk    every link's "N faves" is within rounding of an independent recomputation (EXPECT below, fixtures/expected.mjs)
//   totalOk    no buggy total (351 / 353) is shown and the members line still reads 8 members
//   rowsOk     10 links listed with the toggle on, 12 with it off (the filter is unchanged)

const FIXTURE = "const _intro = function _intro(md){return(\nmd`# Most favorited Hacker News posts\n\nThe most favorited articles among a sample of Hacker News members, taken from their public favourites lists.\n\nTo calculate the top favourites, I give each member 30 votes to divide equally over their favourited articles. I sum the votes over all articles.`\n)};\nconst _excludeInternals = function _excludeInternals(Inputs){return(\nInputs.toggle({ label: \"Exclude ycombinator results like Tell/Ask HN?\", value: true })\n)};\nconst _excludeInternals_value = (G, _) => G.input(_);\nconst _summary = function _summary(md,links_by_username,score_per_link,d3){return(\nmd`**${links_by_username.size}** members × 30 votes = **${links_by_username.size * 30}** votes to share out.\n\nVotes counted in the ranking below: **${Math.round(d3.sum(score_per_link, d => d.score) * 30)}**`\n)};\nconst _display = function _display(html,score_per_link){return(\nhtml`\n<style>\n.hnfav td { font-family:Verdana, Geneva, sans-serif; font-size:10pt; color:#828282; }\n.hnfav .subtext { font-size: 7pt; }\n.hnfav a:link { color:#000000; text-decoration:none; }\n</style>\n<table border=\"0\" cellpadding=\"0\" cellspacing=\"0\" class=\"itemlist hnfav\">\n<tbody>${score_per_link.slice(0, 50).map((element, index) => {return `<tr class=\"athing\" id=\"${element.id}\">\n<td><span class=\"rank\">${index + 1}.</span></td>\n<td class=\"title\">\n<a href=\"${(element.link.startsWith(\"item?\")?\"http://news.ycombinator.com/\":\"\") + element.link}\" class=\"storylink\" target=\"_blank\">${element.label}</a>\n<span class=\"sitebit comhead\"> <a href=\"http://news.ycombinator.com/${element.from_link}\" target=\"_blank\"><span class=\"sitestr\">${element.from_label}</span></a></span>\n</td>\n</tr>\n<tr>\n<td></td>\n<td class=\"subtext\">\n<span class=\"score\">${Math.round(element.score * 30)} faves</span> | <a href=\"http://news.ycombinator.com/item?id=${element.id}\" target=\"_blank\">comments</a>\n</td>\n</tr>`}).join(\"\")}</tbody></table>`\n)};\nconst _score_per_link = function _score_per_link(favourites,links_by_username,d3){return(\nObject.values(favourites.reduce((acc, item) => {\n    if (!acc[item.id]) {\n      item.score = 1.0 / links_by_username.get(item.username);\n      acc[item.id] = item;\n    }\n    acc[item.id].score += (1.0 / links_by_username.get(item.username))\n    return acc;\n  }, {}))\n  .sort((a, b) => d3.descending(a.score, b.score))\n)};\nconst _links_by_username = function _links_by_username(d3,favourites){return(\nd3.rollup(\n  favourites,\n  links => links.length,\n  link => link.username\n)\n)};\nconst _favourites_csv = function _favourites_csv(){return(\n`username,id,link,label,from_link,from_label\nalice,16591133,https://teachyourselfcs.com/,Teach Yourself Computer Science,from?site=teachyourselfcs.com,teachyourselfcs.com\nalice,22226380,https://missing.csail.mit.edu/,The Missing Semester of Your CS Education,from?site=mit.edu,mit.edu\nalice,12381609,item?id=12381609,Ask HN: What are the best MOOCs you've taken?,item?id=12381609,news.ycombinator.com\nalice,13223412,https://github.com/jwasham/coding-interview-university,Coding Interview University,from?site=github.com/jwasham,github.com/jwasham\nalice,17360847,https://craftinginterpreters.com/,Crafting Interpreters,from?site=craftinginterpreters.com,craftinginterpreters.com\nbob,16591133,https://teachyourselfcs.com/,Teach Yourself Computer Science,from?site=teachyourselfcs.com,teachyourselfcs.com\nbob,20626101,http://www.paulgraham.com/hwh.html,How to Work Hard,from?site=paulgraham.com,paulgraham.com\nbob,14506354,https://www.nand2tetris.org/,Build a Modern Computer from First Principles,from?site=nand2tetris.org,nand2tetris.org\ncarol,22226380,https://missing.csail.mit.edu/,The Missing Semester of Your CS Education,from?site=mit.edu,mit.edu\ncarol,12381609,item?id=12381609,Ask HN: What are the best MOOCs you've taken?,item?id=12381609,news.ycombinator.com\ncarol,19120419,https://danluu.com/programmer-moneyball/,Programmer Moneyball,from?site=danluu.com,danluu.com\ncarol,17360847,https://craftinginterpreters.com/,Crafting Interpreters,from?site=craftinginterpreters.com,craftinginterpreters.com\ndave,16591133,https://teachyourselfcs.com/,Teach Yourself Computer Science,from?site=teachyourselfcs.com,teachyourselfcs.com\ndave,15876052,https://github.com/ossu/computer-science,Open Source Society University,from?site=github.com/ossu,github.com/ossu\nerin,16591133,https://teachyourselfcs.com/,Teach Yourself Computer Science,from?site=teachyourselfcs.com,teachyourselfcs.com\nerin,22226380,https://missing.csail.mit.edu/,The Missing Semester of Your CS Education,from?site=mit.edu,mit.edu\nerin,13223412,https://github.com/jwasham/coding-interview-university,Coding Interview University,from?site=github.com/jwasham,github.com/jwasham\nerin,21440241,item?id=21440241,Ask HN: What book changed your life in 2019?,item?id=21440241,news.ycombinator.com\nerin,14506354,https://www.nand2tetris.org/,Build a Modern Computer from First Principles,from?site=nand2tetris.org,nand2tetris.org\nerin,24062823,https://jvns.ca/blog/brag-documents/,Get your work recognized: write a brag document,from?site=jvns.ca,jvns.ca\nfrank,18966386,https://fs.blog/feynman-technique/,The Feynman Technique,from?site=fs.blog,fs.blog\ngrace,12381609,item?id=12381609,Ask HN: What are the best MOOCs you've taken?,item?id=12381609,news.ycombinator.com\ngrace,20626101,http://www.paulgraham.com/hwh.html,How to Work Hard,from?site=paulgraham.com,paulgraham.com\ngrace,17360847,https://craftinginterpreters.com/,Crafting Interpreters,from?site=craftinginterpreters.com,craftinginterpreters.com\nheidi,22226380,https://missing.csail.mit.edu/,The Missing Semester of Your CS Education,from?site=mit.edu,mit.edu\nheidi,19120419,https://danluu.com/programmer-moneyball/,Programmer Moneyball,from?site=danluu.com,danluu.com\nheidi,15876052,https://github.com/ossu/computer-science,Open Source Society University,from?site=github.com/ossu,github.com/ossu\nheidi,24062823,https://jvns.ca/blog/brag-documents/,Get your work recognized: write a brag document,from?site=jvns.ca,jvns.ca`\n)};\nconst _favourites = function _favourites(d3,favourites_csv,excludeInternals){return(\nd3\n  .csvParse(favourites_csv)\n  .filter(value => !value.link.startsWith(\"item?\") || !excludeInternals)\n)};\n\nexport default function define(runtime, observer) {\n  const main = runtime.module();\n  const $def = (pid, name, deps, fn) => {\n    main.variable(observer(name)).define(name, deps, fn).pid = pid;\n  };\n  $def(\"_intro\", null, [\"md\"], _intro);\n  $def(\"_excludeInternals\", \"viewof excludeInternals\", [\"Inputs\"], _excludeInternals);\n  $def(\"_excludeInternals_value\", \"excludeInternals\", [\"Generators\", \"viewof excludeInternals\"], _excludeInternals_value);\n  $def(\"_summary\", \"summary\", [\"md\", \"links_by_username\", \"score_per_link\", \"d3\"], _summary);\n  $def(\"_display\", \"display\", [\"html\", \"score_per_link\"], _display);\n  $def(\"_score_per_link\", \"score_per_link\", [\"favourites\", \"links_by_username\", \"d3\"], _score_per_link);\n  $def(\"_links_by_username\", \"links_by_username\", [\"d3\", \"favourites\"], _links_by_username);\n  $def(\"_favourites_csv\", \"favourites_csv\", [], _favourites_csv);\n  $def(\"_favourites\", \"favourites\", [\"d3\", \"favourites_csv\", \"excludeInternals\"], _favourites);\n  return main;\n}\n";

const FIXED = FIXTURE.replace("item.score = 1.0 / links_by_username.get(item.username);", "item.score = 0;");
if (FIXED === FIXTURE) throw new Error("hn-favourites eval: FIXED did not apply");

const EXPECT = {"on":{"members":8,"budget":240,"counted":239.99999999999997,"countedBuggy":351,"faves":{"Teach Yourself Computer Science":38.5,"The Missing Semester of Your CS Education":31,"Coding Interview University":13.5,"Crafting Interpreters":32.5,"How to Work Hard":25,"Build a Modern Computer from First Principles":16,"Programmer Moneyball":17.5,"Open Source Society University":22.5,"Get your work recognized: write a brag document":13.5,"The Feynman Technique":30},"favesBuggy":{"Teach Yourself Computer Science":46,"The Missing Semester of Your CS Education":38.5,"Coding Interview University":21,"Crafting Interpreters":40,"How to Work Hard":35,"Build a Modern Computer from First Principles":26,"Programmer Moneyball":27.5,"Open Source Society University":37.5,"Get your work recognized: write a brag document":19.5,"The Feynman Technique":60}},"off":{"members":8,"budget":240,"counted":240,"countedBuggy":353,"faves":{"Teach Yourself Computer Science":36,"The Missing Semester of Your CS Education":26,"Ask HN: What are the best MOOCs you've taken?":23.5,"Coding Interview University":11,"Crafting Interpreters":23.5,"How to Work Hard":20,"Build a Modern Computer from First Principles":15,"Programmer Moneyball":15,"Open Source Society University":22.5,"Ask HN: What book changed your life in 2019?":5,"Get your work recognized: write a brag document":12.5,"The Feynman Technique":30},"favesBuggy":{"Teach Yourself Computer Science":42,"The Missing Semester of Your CS Education":32,"Ask HN: What are the best MOOCs you've taken?":29.5,"Coding Interview University":17,"Crafting Interpreters":29.5,"How to Work Hard":30,"Build a Modern Computer from First Principles":25,"Programmer Moneyball":22.5,"Open Source Society University":37.5,"Ask HN: What book changed your life in 2019?":10,"Get your work recognized: write a brag document":17.5,"The Feynman Technique":60}}};

const INIT = String.raw`(() => { globalThis.__rc5tBaseMods = new Set([...globalThis.__ojs_runtime.mains.keys()].filter(k => k !== "@user/hn-favourites")); })()`;

const COLLECT = String.raw`(async () => {
  const EXPECT = ${JSON.stringify(EXPECT)};
  const rt = globalThis.__ojs_runtime;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const base = globalThis.__rc5tBaseMods || new Set();
  const mods = [...rt.mains].filter(([k]) => !base.has(k)).map(([, m]) => m);
  const vars = () => [...rt._variables].filter(v => mods.includes(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable");
  const out = { modules: [...rt.mains.keys()].filter(k => !base.has(k)), favesOk: false, totalOk: false, rowsOk: false };
  if (!vars().length) return { ...out, error: "no @user/hn-favourites or new module" };
  const keepers = [];
  for (const v of vars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch {} }
  const text = () => vars().map(v => v._value instanceof Element ? v._value.textContent : "").join(" | ").replace(/\s+/g, " ");
  const rows = () => vars().map(v => v._value).filter(x => x instanceof Element).reduce((n, e) => n + e.querySelectorAll("tr.athing").length, 0);
  const check = (key) => {
    const t = text(), e = EXPECT[key], bad = [];
    for (const [label, n] of Object.entries(e.faves)) {
      const i = t.indexOf(label);
      const m = i < 0 ? null : /(\d+)\s*faves/.exec(t.slice(i + label.length, i + label.length + 300));
      if (!m || Math.abs(+m[1] - n) > 0.51) bad.push(label.slice(0, 24) + ": " + (m ? m[1] : "missing") + " want " + n);
    }
    return { bad, buggyTotal: new RegExp("\\b" + e.countedBuggy + "\\b").test(t), members: /\b8\b[^|]{0,20}members/.test(t),
      rows: rows(), wantRows: Object.keys(e.faves).length };
  };
  try {
    await sleep(1500);
    const on = check("on");
    const toggle = vars().map(v => v._value).filter(x => x instanceof Element)
      .flatMap(e => e.matches("input[type=checkbox]") ? [e] : [...e.querySelectorAll("input[type=checkbox]")])[0];
    let off = null;
    if (toggle) {
      toggle.checked = false; toggle.dispatchEvent(new Event("input", { bubbles: true })); await sleep(1500);
      off = check("off");
      toggle.checked = true; toggle.dispatchEvent(new Event("input", { bubbles: true })); await sleep(500);
    }
    out.on = on; out.off = off;
    const both = [on, off || { bad: ["no toggle found"], buggyTotal: false, members: true, rows: 12, wantRows: 12 }];
    out.favesOk = both.every(r => r.bad.length === 0);
    out.totalOk = both.every(r => !r.buggyTotal && r.members);
    out.rowsOk = both.every(r => r.rows === r.wantRows);
    return out;
  } finally {
    for (const k of keepers) { try { k.delete(); } catch {} }
  }
})()`;

export default {
  id: "rc5t-hn-favourites-totals",
  category: "rc5-train",
  question: "Some numbers in my notebook look wrong: the totals don't add up. Find the bug and fix it.",
  setup: { files: { "/src/@user/hn-favourites.js": FIXTURE }, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "favesOk", equals: true }, weight: 5 },
    { name: "collected_equals", args: { key: "totalOk", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "rowsOk", equals: true }, weight: 1 },
    { name: "no_runtime_errors", args: {}, weight: 1 },
    // the reply names the cause: the first vote of each link is counted twice
    { name: "answer_matches", args: { pattern: "twice|double|two times|counted (again|two)|initiali[sz]|(start|seed)\\w* (at|from|with) (zero|0)|score\\s*=\\s*0", flags: "i" }, weight: 2 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/src/@user/hn-favourites.js" } },
    { tool: "write_file", args: { file_path: "/src/@user/hn-favourites.js", content: FIXED } },
    { assistant: "The bug was in score_per_link. When a link was seen for the first time its score was set to that member's vote share instead of 0, and the += on the next line added the share again, so the first member to favourite each link was counted twice. The ranking counted 351 votes against 240 to share out (8 members x 30). I changed the initial score to 0; the ranking now counts 240 votes with the toggle on and off, and The Feynman Technique shows 30 faves (frank's 30 votes) instead of 60." },
  ],
};
export { FIXTURE, FIXED };
