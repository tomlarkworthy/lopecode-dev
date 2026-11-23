const start = () => "2026-01-10";
const end = () => "2026-03-01";
const daysBetween = (start: string, end: string) => {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.round(ms / 86400000);
};
const endWeekday = (end: string) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(end).getUTCDay()];
