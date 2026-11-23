const groupBy = () => <T>(xs: readonly T[], key: (x: T) => string): Record<string, T[]> => {
  const out: Record<string, T[]> = {};
  for (const x of xs) {
    const k = key(x);
    out[k] = [...(out[k] ?? []), x];
  }
  return out;
};
type Sale = { region: "north" | "south"; amount: number };
const sales = (): Sale[] => [
  { region: "north", amount: 5 },
  { region: "south", amount: 7 },
  { region: "north", amount: 1 },
];
const byRegion = (groupBy, sales: Sale[]) => groupBy(sales, (s: Sale) => s.region);
const northTotal = (byRegion: Record<string, Sale[]>) => (byRegion.north ?? []).reduce((a, s) => a + s.amount, 0);
