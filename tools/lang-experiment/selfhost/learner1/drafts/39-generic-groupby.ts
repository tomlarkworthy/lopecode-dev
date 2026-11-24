type Region = "north" | "south";
type Sale = { readonly region: Region; readonly amount: number };

const groupBy = () => <T>(xs: readonly T[], keyOf: (x: T) => string): { readonly [k: string]: readonly T[] } => {
  const out: { [k: string]: readonly T[] } = {};
  for (const x of xs) {
    const k = keyOf(x);
    const g = out[k];
    out[k] = g === undefined ? [x] : [...g, x];
  }
  return out;
};

const sales = (): readonly Sale[] => [
  { region: "north", amount: 5 },
  { region: "south", amount: 7 },
  { region: "north", amount: 1 },
];

const byRegion = (sales: readonly Sale[], groupBy) => groupBy(sales, (s: Sale) => s.region);

const northTotal = (byRegion) => (byRegion["north"] ?? []).reduce((sum, s) => sum + s.amount, 0);
