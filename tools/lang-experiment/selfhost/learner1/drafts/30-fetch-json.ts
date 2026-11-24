type Repo = { readonly name: string; readonly stars: number; readonly language: string };

const repos = async (fetch: Fetch) => {
  const res = await fetch("https://example.test/repos.json");
  const r = cast<readonly Repo[]>(await res.json());
  if (!r.ok) throw new Error("repos.json: " + r.error);
  return r.value;
};

const topRepo = (repos: readonly Repo[]) => {
  let best = repos[0];
  for (const r of repos) if (best === undefined || r.stars > best.stars) best = r;
  if (best === undefined) throw new Error("no repos");
  return best;
};

const languages = (repos: readonly Repo[]) => [...new Set(repos.map((r) => r.language))];
