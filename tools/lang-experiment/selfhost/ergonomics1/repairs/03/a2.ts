const words = () => ["apple", "avocado", "banana", "blueberry", "cherry"];
const byLetter = (words: string[]) => {
  const groups: Record<string, string[]> = {};
  for (const w of words) {
    const k = w.charAt(0);

    groups[k] = [...(groups[k] ?? []), w];
  }
  return groups;
};
const letterCounts = (byLetter: Record<string, string[]>) =>
  Object.entries(byLetter).map(([k, ws]) => `${k}:${ws.length}`).join(" ");
