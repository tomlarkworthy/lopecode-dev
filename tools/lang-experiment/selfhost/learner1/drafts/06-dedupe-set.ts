const tags = () => ["js", "ts", "js", "go", "ts", "rust"];

const unique = (tags: readonly string[]) => [...new Set(tags)];

const uniqueSorted = (unique: readonly string[]) => unique.toSorted();

const seenTwice = (tags: readonly string[]) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    if (seen.has(t)) {
      if (!out.includes(t)) out.push(t);
    } else {
      seen.add(t);
    }
  }
  return out;
};
