---
scope: [local-development, in-notebook]
write-triggers:
  - "\\b(fetch|d3\\.json)\\([^;]*[?&](per_page|page_size|pageSize|perPage|limit|offset|cursor|page)="
  - "https://api\\.github\\.com/"
---

# Reading a whole list from a paged web API

A list endpoint (a user's repos, issues, records, search results) returns one page. Anything
computed over "all of them" (a total, a top 10, a breakdown) is wrong when only the first page was
read, and nothing errors: the cells compute and the numbers look plausible.

## One request is one page

Measured on api.github.com, unauthenticated, 2026-09-28:

```
/users/sindresorhus                                      public_repos 1141
/users/sindresorhus/repos?per_page=100&sort=stars&direction=desc
   100 repos, 22,384 stars, top repo awesome-chatgpt 6,421
   link: <.../user/170270/repos?per_page=100&sort=stars&direction=desc&page=2>; rel="next", <...&page=12>; rel="last"
/search/repositories?q=user:sindresorhus&sort=stars&order=desc&per_page=10
   top repo awesome 511,507
```

- `per_page` defaults to 30 and stops at 100 (GitHub's docs; the 100 page above is consistent).
- `sort=stars` is not a sort `/users/{u}/repos` accepts (it takes `created`, `updated`, `pushed`,
  `full_name`). It is ignored without an error, so the 100 repos above are not the 100 most starred
  and the real top repo, `awesome`, is not among them.
- An account under 100 repos (`mbostock`, 88) fits in one page, so testing with a small account
  hides the defect.

In run 20260928-0600-w30-before (robocoop-5, mimo-v2.5-pro) the agent built a GitHub dashboard with
one `per_page=100` request, tested it on `torvalds`, and reported it "fully working". For a
130-repo user it printed "has 100 public repos with a total of 297 stars" and charted ten
low-star repos (the 130-repo user is the eval's emulated GitHub, `rc5t-github-dashboard`).

## Follow the pages

Loop until the API says there are no more, with a bound on the number of pages. The corpus form is
`@tomlarkworthy/at-write._knownCidsFromPds` (lopebooks/notebooks/Feeling_of_Computing.html), which
follows a `cursor` with `maxPages`:

```js
let cursor = null;
for (let page = 0; page < maxPages; page++) {
  const q = new URLSearchParams({ did, limit: '1000', ...cursor ? { cursor } : {} });
  const r = await fetch(`${ pds }/xrpc/com.atproto.sync.listBlobs?${ q }`);
  if (!r.ok) break;
  const data = await r.json();
  for (const c of data.cids || []) known.add(String(c));
  cursor = data.cursor;
  if (!cursor || !(data.cids || []).length) break;
}
```

GitHub signals the next page in the `Link` response header rather than the body:

```js
let url = `https://api.github.com/users/${encodeURIComponent(login)}/repos?per_page=100`;
for (let page = 0; url && page < 30; page++) {
  const r = await fetch(url);
  if (!r.ok) { /* return a message value, see below */ }
  repos.push(...await r.json());
  url = (/<([^>]+)>;\s*rel="next"/.exec(r.headers.get("link") || "") || [])[1];
}
```

Check the count you got against one the API states when there is one (`public_repos` on
`/users/{u}`); say "first N of M" in the output if the bound was hit.

For "top N by X" only, a search endpoint that sorts server-side can answer in one request
(`/search/repositories?q=user:{u}&sort=stars&per_page=10` above). It does not give a total over
every item, and GitHub's search has its own budget (10 requests a minute unauthenticated, per
GitHub's docs; not measured here).

## Every page is a request against the rate limit

Unauthenticated GitHub allows 60 requests an hour per IP (`x-ratelimit-limit: 60` on every
response). A 1141-repo user costs 12 of them. An `Inputs.text` without `submit` changes its value
on every keystroke, so typing `torvalds` looks up `t`, `to`, … `torvald` first: in the w30 replay
that was 7 wasted lookups per name. Use `submit: true` so the value changes on Enter or the
button, as `@tomlarkworthy/viewroutine.newName` does (lopebooks/notebooks/@tomlarkworthy_rss-feed.html):

```js
Inputs.text({
  label: "please enter the name of the thing to create",
  submit: true,
  minlength: 1
})
```

When the budget is spent GitHub answers 403 (or 429, per its docs) with `x-ratelimit-remaining: 0`
and `x-ratelimit-reset` in epoch seconds. Return that as a value the page shows ("rate limit
reached, try again after 16:05"), not a thrown error; `@tomlarkworthy/foc-wiki._wikiPulls`
(Feeling_of_Computing.html) returns `{ ok: false, error: msg, remaining: r.headers.get("x-ratelimit-remaining") }`.
The 403 body and headers here are from GitHub's documentation, not from a captured response.
