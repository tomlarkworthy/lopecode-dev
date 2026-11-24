const words = () => ["apple", "avocado", "banana", "blueberry", "cherry"];

const letterCounts = (words: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const w of words) {
    const letter = w[0] ?? "";
    counts.set(letter, (counts.get(letter) ?? 0) + 1);
  }
  const parts: string[] = [];
  for (const letter of counts.keys()) parts.push(`${letter}:${counts.get(letter) ?? 0}`);
  return parts.join(" ");
};
