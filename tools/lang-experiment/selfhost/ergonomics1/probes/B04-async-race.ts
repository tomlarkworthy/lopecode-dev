const winner = async (fetch: Fetch) => {
  let last = "";
  const a = fetch("https://example.test/a.json").then(() => { last = "a"; });
  const b = fetch("https://example.test/b.json").then(() => { last = "b"; });
  await Promise.all([a, b]);
  return last;
};
