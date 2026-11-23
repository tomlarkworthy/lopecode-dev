type Repo = { name: string; stars: number; language: string };
const toRepos = () => (x: unknown): Repo[] => {
  if (!Array.isArray(x)) throw new Error("expected an array");
  return x.map((r) => {
    if (typeof r !== "object" || r === null) throw new Error("expected an object");
    return { name: String(r.name), stars: Number(r.stars), language: String(r.language) };
  });
};
const repos = async (fetch: Fetch, toRepos: (x: unknown) => Repo[]) => {
  const res = await fetch("https://example.test/repos.json");
  return toRepos(await res.json());
};
const topRepo = (repos: Repo[]) => {
  let best: Repo | null = null;
  for (const r of repos) if (best === null || r.stars > best.stars) best = r;
  return best;
};
const languages = (repos: Repo[]) => [...new Set(repos.map((r) => r.language))];
