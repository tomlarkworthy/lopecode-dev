type Repo = { name: string; stars: number; language: string };
const repos = async (fetch: Fetch) => {
  const res = await fetch("https://example.test/repos.json");
  const data: Repo[] = await res.json();
  return data;
};
const topRepo = (repos: Repo[]) => repos.reduce((best, r) => (r.stars > best.stars ? r : best));
const languages = (repos: Repo[]) => [...new Set(repos.map((r) => r.language))];
