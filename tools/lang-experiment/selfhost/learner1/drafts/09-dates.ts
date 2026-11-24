// No Date in SoundScript: days since 1970-01-01 (UTC) from the civil calendar.
const start = () => "2026-01-10";
const end = () => "2026-03-01";

const dayNumber = () => (iso: string): number => {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
};

const daysBetween = (start: string, end: string, dayNumber) => dayNumber(end) - dayNumber(start);

// 1970-01-01 was a Thursday.
const endWeekday = (end: string, dayNumber) => {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const i = (((dayNumber(end) + 4) % 7) + 7) % 7;
  return names[i] ?? "";
};
