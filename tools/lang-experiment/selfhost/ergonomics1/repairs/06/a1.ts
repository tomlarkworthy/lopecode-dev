const tags = () => ["js", "ts", "js", "go", "ts", "rust"];
const unique = (tags: string[]) => [...new Set(tags)];
const uniqueSorted = (tags: string[]) => {
  const xs = Array.from(new Set(tags));
  xs.sort();
  return xs;
};
const seenTwice = (tags: string[]) => {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const t of tags) {
    if (seen.has(t)) dup.add(t);
    seen.add(t);
  }
  return [...dup];
};
