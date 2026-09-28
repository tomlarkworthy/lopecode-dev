// rc5t-github-dashboard: a username box drives a GitHub profile dashboard (top-10 stars bar chart, language
// breakdown, total stars), and a missing user or a rate limit shows a message instead of an error.
// Worker 20260928-0600-w30. GitHub is emulated in the page (setup.initScript wraps fetch, as
// rc5t-forecast-window does) rather than setup.routes: routes cannot set response headers, and the 403
// needs the real x-ratelimit-* headers; the collect also has to switch the rate limit on mid-run.
// Emulated responses copy api.github.com's shapes: 404 {"message":"Not Found",...}; 403 {"message":"API rate
// limit exceeded for ...", documentation_url} with x-ratelimit-limit 60 / remaining 0 / reset / used / resource.
// Usernames: anything that looks made-up (not/no/non/fake/invalid/missing/doesnt/xyz/zzz/asdf/qwer, or 4+
// digits) is 404; every other name owns the same 15 fixture repos, so an agent that tests with its own
// favourite username still sees data.
// Each property is its own collected key, scored separately. The collect types into the username box
// (value + "input", then clicks a submit button in the same form if there is one) and polls up to 5s.

const REPOS = [
  ["aurora-db", 4210, "Go"], ["bramble", 3120, "JavaScript"], ["cinder-ui", 2475, "TypeScript"],
  ["dovetail", 1830, "JavaScript"], ["eskerfs", 1502, "Rust"], ["fennel-lang", 988, "Python"],
  ["gantry", 760, "JavaScript"], ["halyard", 541, "Go"], ["isotope-py", 433, "Python"],
  ["juniper-kit", 390, "JavaScript"], ["kestrel", 212, "Rust"], ["lumen-docs", 97, null],
  ["mortise", 45, "Python"], ["nimbus-cfg", 12, "JavaScript"], ["octo-notes", 0, null],
];
// total 16615; top 10 = aurora-db .. juniper-kit; languages JavaScript 5, Python 3, Go 2, Rust 2, TypeScript 1

const INIT_SCRIPT = String.raw`(() => {
  const REPOS = ${JSON.stringify(REPOS)};
  // API order is not star order: sorted by name reversed, so a chart that skips sorting fails
  const ORDER = REPOS.slice().reverse();
  // one user owns 130 repos: 115 low-star fillers come first in every order GitHub offers for this
  // endpoint (default, full_name, created, updated, pushed), so page 1 of 100 holds none of the top 10
  const LANGS = ["JavaScript", "Python", "Go", "Rust", "TypeScript"];
  const FILLERS = Array.from({ length: 115 }, (_, k) => ["aa-sample-" + String(k + 1).padStart(3, "0"), (k + 1) % 7, LANGS[(k + 1) % 5]]);
  const BIG = /^sindresorhus$/i;
  const listFor = login => BIG.test(login) ? [...FILLERS, ...ORDER] : ORDER;
  const idFor = login => BIG.test(login) ? 4343 : 4242;
  const loginFor = id => id === "4343" ? "sindresorhus" : "octocat";
  globalThis.__ghCalls = [];
  globalThis.__ghRateLimited = false;
  const BAD = /(^|[-_])(not|no|non|fake|invalid|missing|doesnt|nobody|none)([-_]|$)|nonexist|notexist|doesnotexist|xyz|zzz|asdf|qwer|\d{4,}/i;
  const realFetch = globalThis.fetch;
  const reset = () => Math.floor(Date.now() / 1000) + 1800;
  const json = (status, body, extra) => new Response(JSON.stringify(body), { status, statusText: status === 200 ? "OK" : status === 404 ? "Not Found" : status === 403 ? "rate limit exceeded" : "", headers: Object.assign({
    "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*",
    "access-control-expose-headers": "ETag, Link, Location, Retry-After, X-GitHub-OTP, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Used, X-RateLimit-Resource, X-RateLimit-Reset",
    "x-ratelimit-limit": "60", "x-ratelimit-remaining": "57", "x-ratelimit-used": "3", "x-ratelimit-resource": "core", "x-ratelimit-reset": String(reset()),
  }, extra || {}) });
  const repoObj = (login, [name, stars, language], i) => ({
    id: 900000 + i, node_id: "R_" + i, name, full_name: login + "/" + name, private: false, fork: false,
    owner: { login, id: 4242, type: "User", avatar_url: "https://avatars.githubusercontent.com/u/4242?v=4", html_url: "https://github.com/" + login },
    html_url: "https://github.com/" + login + "/" + name, description: "fixture repo " + name, url: "https://api.github.com/repos/" + login + "/" + name,
    languages_url: "https://api.github.com/repos/" + login + "/" + name + "/languages",
    created_at: "2020-01-0" + (1 + i % 9) + "T00:00:00Z", updated_at: "2026-09-0" + (1 + i % 9) + "T00:00:00Z", pushed_at: "2026-09-0" + (1 + i % 9) + "T00:00:00Z",
    size: 100 + i, stargazers_count: stars, watchers_count: stars, watchers: stars, language, forks_count: Math.floor(stars / 10), forks: Math.floor(stars / 10),
    open_issues_count: i, open_issues: i, archived: false, disabled: false, visibility: "public", default_branch: "main", topics: [],
  });
  const userObj = login => ({ login, id: idFor(login), node_id: "U_4242", avatar_url: "https://avatars.githubusercontent.com/u/4242?v=4", html_url: "https://github.com/" + login,
    type: "User", name: login, company: null, blog: "", location: null, bio: null, public_repos: listFor(login).length, public_gists: 0, followers: 120, following: 3,
    created_at: "2015-03-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", repos_url: "https://api.github.com/users/" + login + "/repos" });
  const notFound = doc => json(404, { message: "Not Found", documentation_url: doc || "https://docs.github.com/rest/users/users#get-a-user", status: "404" });
  globalThis.fetch = function (input, init) {
    let url;
    try { url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.href); } catch (e) { return realFetch.apply(this, arguments); }
    if (url.hostname !== "api.github.com") return realFetch.apply(this, arguments);
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    globalThis.__ghCalls.push({ path: url.pathname + url.search, limited: globalThis.__ghRateLimited });
    if (globalThis.__ghRateLimited) {
      return Promise.resolve(json(403, { message: "API rate limit exceeded for 203.0.113.7. (But here's the good news: Authenticated requests get a higher rate limit. Check out the documentation for more details.)", documentation_url: "https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting" },
        { "x-ratelimit-remaining": "0", "x-ratelimit-used": "60" }));
    }
    const exists = login => login && !BAD.test(login);
    const p = url.searchParams, page = Number(p.get("page") || 1), per = Math.min(100, Number(p.get("per_page") || 30));
    let res;
    if (parts[0] === "rate_limit") res = json(200, { resources: { core: { limit: 60, remaining: 57, used: 3, reset: reset() } }, rate: { limit: 60, remaining: 57, used: 3, reset: reset() } });
    else if (parts[0] === "users" && parts.length === 2) res = exists(parts[1]) ? json(200, userObj(parts[1])) : notFound();
    else if ((parts[0] === "users" || parts[0] === "user") && parts[2] === "repos" && parts.length === 3) {
      const login = parts[0] === "user" ? loginFor(parts[1]) : parts[1];
      if (!exists(login)) res = notFound("https://docs.github.com/rest/repos/repos#list-repositories-for-a-user");
      else {
        // like api.github.com: sort=stars is not a sort this endpoint knows, so it is ignored
        const list = listFor(login).map((r, i) => repoObj(login, r, i));
        const last = Math.max(1, Math.ceil(list.length / per));
        const link = (n, rel) => "<https://api.github.com/user/" + idFor(login) + "/repos?per_page=" + per + "&page=" + n + ">; rel=\"" + rel + "\"";
        const links = [];
        if (page > 1) links.push(link(page - 1, "prev"), link(1, "first"));
        if (page < last) links.push(link(page + 1, "next"), link(last, "last"));
        res = json(200, list.slice((page - 1) * per, page * per), links.length ? { link: links.join(", ") } : {});
      }
    } else if (parts[0] === "search" && parts[1] === "repositories") {
      const m = /user:([^\s+]+)/.exec(p.get("q") || "");
      const login = m && m[1];
      if (!exists(login)) res = json(422, { message: "Validation Failed", errors: [{ message: "The listed users and repositories cannot be searched either because the resources do not exist or you do not have permission to view them.", resource: "Search", field: "q", code: "invalid" }], documentation_url: "https://docs.github.com/v3/search/", status: "422" });
      else {
        let list = listFor(login).map((r, i) => repoObj(login, r, i));
        if (p.get("sort") === "stars") list.sort((a, b) => b.stargazers_count - a.stargazers_count);
        res = json(200, { total_count: list.length, incomplete_results: false, items: list.slice((page - 1) * per, page * per) });
      }
    } else if (parts[0] === "repos" && parts.length >= 3) {
      const r = [...REPOS, ...FILLERS].find(x => x[0] === parts[2]);
      if (!exists(parts[1]) || !r) res = notFound("https://docs.github.com/rest/repos/repos#get-a-repository");
      else if (parts[3] === "languages") res = json(200, r[2] ? { [r[2]]: 1000 + r[1] } : {});
      else if (parts.length === 3) res = json(200, repoObj(parts[1], r, 0));
      else res = notFound("https://docs.github.com/rest");
    } else res = notFound("https://docs.github.com/rest");
    return Promise.resolve(res);
  };
})();`;

const INIT = String.raw`(() => {
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  globalThis.__rc5tBefore = new Set([...rt._variables].map(v => v._module));
})()`;

const COLLECT = String.raw`(async () => {
  const REPOS = ${JSON.stringify(REPOS)};
  const NAMES = REPOS.map(r => r[0]);
  const TOP = NAMES.slice(0, 10);
  const LANGS = ["JavaScript", "Python", "Go", "Rust", "TypeScript"];
  const out = { found: false, top10: false, total: false, languages: false, allPagesTop10: false, allPagesTotal: false, notFound: false, rateLimited: false, noErrorsAfterBad: false, recovers: false, oneLookupPerName: false, detail: [] };
  const note = s => out.detail.push(s);
  const rt = [...globalThis.__ojs_runtime.mains.values()].find(m => m && m._runtime)._runtime;
  const newVars = () => [...rt._variables].filter(v => !globalThis.__rc5tBefore.has(v._module) && v._name &&
    !String(v._name).startsWith("module ") && v._name !== "@variable" && !String(v._name).startsWith("@"));
  if (!newVars().length) { note("no module was created"); return out; }
  // lazily booted library modules also appear after init: keep the module(s) that own a text box
  const isBox = i => /^(text|search|)$/.test(i.type || "");
  const ownsBox = v => v._value instanceof Element && (v._value.matches("input") ? isBox(v._value) : [...v._value.querySelectorAll("input")].some(isBox));
  const mods = new Set(newVars().filter(ownsBox).map(v => v._module));
  const userVars = () => newVars().filter(v => mods.size ? mods.has(v._module) : true);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const keepers = [];
  for (const v of newVars()) { try { keepers.push(v._module.variable(true).define([v._name], x => x)); } catch (e) {} }
  const els = () => userVars().map(v => v._value).filter(x => x instanceof Element);
  // text nodes joined by spaces: an SVG's tick labels have no separators in textContent
  const words = n => { if (!n) return ""; const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT); const a = []; let t; while ((t = w.nextNode())) { if (t.parentElement && t.parentElement.closest("style,script")) continue; a.push(t.nodeValue); } return a.join(" "); };
  const text = () => els().map(words).join(" | ") + " | " + userVars().map(v => typeof v._value === "string" ? v._value : "").join(" | ");
  const errors = () => userVars().filter(v => v._error != null).map(v => v._name + ": " + String(v._error && v._error.message || v._error).slice(0, 80));
  const box = () => {
    const ins = [];
    for (const x of els()) for (const i of (x.matches("input") ? [x] : [...x.querySelectorAll("input")]))
      if (/^(text|search|)$/.test(i.type || "") && !ins.includes(i)) ins.push(i);
    const lab = i => ((i.labels ? [...i.labels].map(l => l.textContent).join(" ") : "") + " " + (i.placeholder || "") + " " + (i.name || "") + " " + (i.id || "") + " " + (i.getAttribute("aria-label") || "") + " " + ((i.closest("form,label") || {}).textContent || "")).toLowerCase();
    return ins.find(i => /user|login|github|handle|name/.test(lab(i))) || ins[0];
  };
  const type = async (value) => {
    const b = box();
    if (!b) return false;
    b.focus && b.focus();
    b.value = value;
    b.dispatchEvent(new Event("input", { bubbles: true }));
    b.dispatchEvent(new Event("change", { bubbles: true }));
    const form = b.closest("form") || b.parentElement;
    const btn = form && [...form.querySelectorAll("button, input[type=submit]")].find(x => x.type === "submit" || /submit|go|load|search|fetch|show|look/i.test(x.textContent || x.value || ""));
    if (btn) btn.click();
    else b.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    return true;
  };
  const until = async (pred, ms = 3500) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (pred()) return true; await sleep(200); } return pred(); };
  // the chart: the smallest element (a user value or an svg/figure/div inside one) naming exactly the top 10
  const chartOrder = () => {
    for (const x of els()) {
      const cands = [...x.querySelectorAll("svg"), x, ...x.querySelectorAll("figure, div, ul, ol, table")];
      for (const c of cands) {
        const t = words(c);
        const hit = NAMES.filter(n => new RegExp("(^|[^\\w-])" + n.replace(/-/g, "\\-") + "([^\\w-]|$)").test(t));
        if (hit.length === 10) return hit.sort((a, b) => t.indexOf(a) - t.indexOf(b));
      }
    }
    return null;
  };
  const topOk = () => {
    const o = chartOrder();
    if (!o) return false;
    const same = o.join() === TOP.join() || o.join() === TOP.slice().reverse().join();
    return same;
  };
  const totalOk = (n = "16615") => new RegExp("(^|[^\\d])" + n.slice(0, 2) + "[,.\\s\u00a0\u202f']?" + n.slice(2) + "([^\\d]|$)").test(text());
  const hasLangs = () => { const t = text(); return LANGS.every(l => new RegExp("\\b" + l + "\\b").test(t)); };
  const MSG404 = /not\s*found|doesn['’]?t exist|does not exist|no (such )?(github )?user|couldn['’]?t find|could not find|unknown user|no user|404/i;
  const MSG403 = /rate[\s-]?limit|too many requests|limit (exceeded|reached)|api limit/i;
  const withHolds = async (p) => { try { return await p(); } catch (e) { note("collect threw: " + e); return false; } };
  try {
    await sleep(800);
    if (!box()) { note("no username text box among the new module's outputs"); return out; }
    out.found = true;
    // 1. a real user
    await type("mbostock");
    await until(() => topOk() && totalOk() && hasLangs());
    out.top10 = topOk(); out.total = totalOk(); out.languages = hasLangs();
    if (!out.top10) note("top10 chart order: " + JSON.stringify(chartOrder()));
    if (!out.total) note("no 16,615 total in: " + text().replace(/\s+/g, " ").slice(0, 200));
    if (!out.languages) note("languages missing: " + LANGS.filter(l => !new RegExp("\\b" + l + "\\b").test(text())).join(","));
    // 1b. a user with 130 public repos: the top 10 and the total need every page, not the first 100
    await type("sindresorhus");
    await until(() => topOk() && totalOk("16957"), 4500);
    out.allPagesTop10 = topOk(); out.allPagesTotal = totalOk("16957");
    if (!out.allPagesTop10) note("130-repo user, chart names: " + JSON.stringify(chartOrder()));
    if (!out.allPagesTotal) note("130-repo user, no 16,957 total in: " + text().replace(/\s+/g, " ").slice(0, 200));
    // 2. a user that does not exist
    await type("no-such-user-zz");
    await until(() => MSG404.test(text()));
    out.notFound = MSG404.test(text());
    const e1 = errors();
    if (!out.notFound) note("no not-found message: " + text().replace(/\s+/g, " ").slice(0, 200));
    // 3. rate limited
    globalThis.__ghRateLimited = true;
    await type("gaearon");
    await until(() => MSG403.test(text()));
    out.rateLimited = MSG403.test(text());
    const e2 = errors();
    if (!out.rateLimited) note("no rate-limit message: " + text().replace(/\s+/g, " ").slice(0, 200));
    out.noErrorsAfterBad = e1.length === 0 && e2.length === 0;
    if (!out.noErrorsAfterBad) note("erroring cells after bad input: " + JSON.stringify([...e1, ...e2]).slice(0, 300));
    // 4. back to a good user, limit lifted
    globalThis.__ghRateLimited = false;
    await type("octocat");
    await until(() => topOk() && totalOk() && errors().length === 0);
    out.recovers = topOk() && totalOk() && errors().length === 0;
    if (!out.recovers) note("did not recover: top " + topOk() + " total " + totalOk() + " errors " + JSON.stringify(errors()).slice(0, 200));
    // 5. typing a name one key at a time: each lookup costs requests against a 60/hour budget, so
    // lookups of the half-typed prefixes (t, to, tor, ...) are waste; at most one is tolerated
    const b = box();
    const c0 = globalThis.__ghCalls.length;
    const name = "torvalds";
    for (let k = 1; k <= name.length; k++) {
      b.value = name.slice(0, k);
      b.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(90);
    }
    await type(name);
    await until(() => globalThis.__ghCalls.slice(c0).some(c => c.path.toLowerCase().includes(name)) && !!chartOrder(), 3500);
    await sleep(600);
    const prefixes = new Set(globalThis.__ghCalls.slice(c0).map(c => (/\/users\/([^/?]+)|user:([^+&\s]+)/.exec(decodeURIComponent(c.path)) || []).slice(1).find(Boolean)).filter(u => u && u.toLowerCase() !== name));
    out.oneLookupPerName = prefixes.size <= 1;
    if (!out.oneLookupPerName) note("typing " + name + " looked up " + prefixes.size + " prefixes: " + [...prefixes].join(","));
    return out;
  } finally {
    globalThis.__ghRateLimited = false;
    out.calls = (globalThis.__ghCalls || []).length;
    out.detail = out.detail.join(" ; ");
    for (const k of keepers) { try { k.delete(); } catch (e) {} }
  }
})()`;

// Error handling copied from @tomlarkworthy/foc-wiki._wikiPulls (lopebooks/notebooks/Feeling_of_Computing.html):
// `if (!r.ok) { ... try { const j = JSON.parse(body); if (j.message) msg = j.message } ...; return { ok: false, error: msg,
// remaining: r.headers.get("x-ratelimit-remaining") } }` — a failed fetch becomes a value, not a thrown error.
const ORACLE_SRC = `const _intro = function intro(md){return( md\`# GitHub profile dashboard\` )};
// submit: true as in @tomlarkworthy/viewroutine.newName (lopebooks/notebooks/@tomlarkworthy_rss-feed.html): the
// value changes on Enter or the button, not on every keystroke, so a half-typed name is never looked up
const _username = function username(Inputs){return( Inputs.text({label: "GitHub username", placeholder: "octocat", value: "octocat", submit: true}) )};
const _username_v = (G, _) => G.input(_);
const _profile = async function profile(username){
  const login = username.trim();
  if (!login) return { ok: false, error: "Type a GitHub username." };
  try {
    // every page, following the Link header's rel="next", bounded like at-write._knownCidsFromPds's maxPages
    const repos = [];
    let url = "https://api.github.com/users/" + encodeURIComponent(login) + "/repos?per_page=100&type=owner";
    for (let page = 0; url && page < 30; page++) {
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      let msg = r.status + " " + r.statusText;
      try { const j = JSON.parse(body); if (j.message) msg = j.message; } catch (e) {}
      if (r.status === 404) return { ok: false, error: "No GitHub user named \\"" + login + "\\" was found." };
      if ((r.status === 403 || r.status === 429) && r.headers.get("x-ratelimit-remaining") === "0") {
        const reset = new Date(Number(r.headers.get("x-ratelimit-reset")) * 1000);
        return { ok: false, error: "GitHub rate limit reached. Try again after " + reset.toLocaleTimeString() + "." };
      }
      return { ok: false, error: "GitHub said: " + msg };
    }
    repos.push(...await r.json());
    url = (/<([^>]+)>;\\s*rel="next"/.exec(r.headers.get("link") || "") || [])[1];
    }
    return { ok: true, login, repos };
  } catch (e) {
    return { ok: false, error: "Could not reach GitHub: " + e };
  }
};
const _dashboard = function dashboard(profile, Plot, htl){
  if (!profile.ok) return htl.html\`<p style="color:#b00">\${profile.error}</p>\`;
  const repos = profile.repos;
  const total = repos.reduce((s, r) => s + r.stargazers_count, 0);
  const top = repos.slice().sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 10);
  const counts = new Map();
  for (const r of repos) counts.set(r.language || "Unknown", (counts.get(r.language || "Unknown") || 0) + 1);
  const langs = [...counts].map(([language, repos]) => ({ language, repos })).sort((a, b) => b.repos - a.repos);
  return htl.html\`<div>
    <h3>\${profile.login}: \${repos.length} public repos, \${total.toLocaleString("en-US")} stars</h3>
    \${Plot.plot({ marginLeft: 100, x: { label: "Stars" }, y: { label: null }, marks: [Plot.barX(top, { y: "name", x: "stargazers_count", sort: { y: "-x" } })] })}
    \${Plot.plot({ marginLeft: 100, x: { label: "Repos" }, y: { label: null }, marks: [Plot.barX(langs, { y: "language", x: "repos", sort: { y: "-x" } })] })}
  </div>\`;
};
export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_username", "viewof username", ["Inputs"], _username);
  main.variable(observer("username")).define("username", ["Generators", "viewof username"], _username_v);
  $def("_profile", "profile", ["username"], _profile);
  $def("_dashboard", "dashboard", ["profile", "Plot", "htl"], _dashboard);
  return main;
}
`;

export default {
  id: "rc5t-github-dashboard",
  category: "rc5-train",
  question: "Make a GitHub profile dashboard: I type a username, and it shows their public repos as a bar chart of stars (top 10), a breakdown of languages, and the total stars. If the user doesn't exist or GitHub rate-limits us, show a clear message instead of breaking.",
  setup: { initScript: INIT_SCRIPT, init: INIT, collect: COLLECT },
  criteria: [
    { name: "collected_equals", args: { key: "found", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "top10", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "total", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "languages", equals: true }, weight: 1 },
    // THE defect in 20260928-0600-w30-before: one request with per_page=100, so a user with more repos
    // gets a top 10 and a total from whichever 100 came first
    { name: "collected_equals", args: { key: "allPagesTop10", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "allPagesTotal", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "notFound", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "rateLimited", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "noErrorsAfterBad", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "recovers", equals: true }, weight: 2 },
    // secondary: a lookup per keystroke spends the 60/hour unauthenticated budget on half-typed names
    { name: "collected_equals", args: { key: "oneLookupPerName", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/reading-a-list-from-a-paged-web-api.md" } },
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/writing-cells-in-module-source.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/github-dashboard.js", content: ORACLE_SRC }, settleMs: 2000 },
  ],
};
