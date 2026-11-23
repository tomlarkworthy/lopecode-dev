const start = () => "2026-01-10";
const end = () => "2026-03-01";
// days since 1970-01-01 for a yyyy-mm-dd string (Howard Hinnant's days_from_civil)
const dayNumber = () => (iso: string): number => {
  const [y0 = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const y = m <= 2 ? y0 - 1 : y0;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
};
const daysBetween = (start: string, end: string, dayNumber: (iso: string) => number) => dayNumber(end) - dayNumber(start);
const endWeekday = (end: string, dayNumber: (iso: string) => number) => ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"][((dayNumber(end) % 7) + 7) % 7];
