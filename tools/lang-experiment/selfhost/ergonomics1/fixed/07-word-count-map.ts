const text = () => "the cat and the hat and the bat";
const counts = (text: string) => {
  const m = new Map<string, number>();
  for (const w of text.split(" ")) m.set(w, (m.get(w) || 0) + 1);
  return m;
};
const top = (counts: Map<string, number>) => {
  const es = [...counts.entries()];
  es.sort((a, b) => b[1] - a[1]);
  return es.slice(0, 2).map(([w, c]) => `${w}=${c}`);
};
