type Count = { readonly word: string; readonly n: number };

const text = () => "the cat and the hat and the bat";

const top = (text: string) => {
  const counts = new Map<string, number>();
  for (const w of text.split(" ")) counts.set(w, (counts.get(w) ?? 0) + 1);
  const ranked: Count[] = [];
  for (const word of counts.keys()) ranked.push({ word, n: counts.get(word) ?? 0 });
  return ranked
    .toSorted((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((c) => `${c.word}=${c.n}`);
};
