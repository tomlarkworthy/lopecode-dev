// rc5t-forecast-window-from-now: "the next 48 hours" of a live forecast must start at the current hour.
// In run 20260928-0000-w7-before the agent fetched Open-Meteo with forecast_days=3 (which starts at
// 00:00 today) and filtered only the upper bound `time <= now + 48h`. The run happened at 00:09, so the
// chart looked right; at 15:30 the same code plots 15 past hours plus 48 future ones (63 points).
// The eval pins the page clock to 15:30 Berlin and serves Open-Meteo from an emulator that honours
// forecast_days / forecast_hours / past_* / timezone / timeformat like the real API (checked against
// api.open-meteo.com 2026-09-28), so the run is deterministic and any correct query passes.
// Checks behaviour, not spelling: the rows the chart is drawn from (the nearest array of
// {time, temperature} rows upstream of the SVG cell) are compared to the fixture's absolute instants,
// which also catches the UTC-vs-local slip (GMT strings parsed as local shift every point by 2h).

const NOW_UTC = Date.UTC(2026, 8, 28, 13, 30); // Mon 2026-09-28 15:30 Europe/Berlin

const INIT = `(() => {
  const NOW_UTC = ${NOW_UTC};
  const RealDate = Date, realNow = RealDate.now.bind(RealDate), off = NOW_UTC - realNow();
  function FakeDate(...a) {
    if (!new.target) return new RealDate(realNow() + off).toString();
    return a.length ? new RealDate(...a) : new RealDate(realNow() + off);
  }
  FakeDate.prototype = RealDate.prototype;
  Object.setPrototypeOf(FakeDate, RealDate);
  FakeDate.now = () => realNow() + off;
  FakeDate.parse = RealDate.parse; FakeDate.UTC = RealDate.UTC;
  globalThis.Date = FakeDate;

  const H = 3600e3;
  const tzOffset = (tz) => tz === "Europe/Berlin" ? 2 * H : 0; // CEST; the window never crosses a DST change
  const temp = (ms, berlin) => Math.round((11 + 6 * Math.sin(2 * Math.PI * (((ms / H) + 2) % 24 - 9) / 24) + 0.03 * ((ms - NOW_UTC) / H) + (berlin ? 0 : 8)) * 10) / 10;
  globalThis.__meteoTemp = temp;
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (ms) => { const d = new RealDate(ms); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + ":00"; };
  globalThis.__meteoCalls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = function (input, init) {
    let url;
    try { url = new URL(typeof input === "string" ? input : input.url, location.href); } catch { return realFetch.apply(this, arguments); }
    if (url.hostname !== "api.open-meteo.com") return realFetch.apply(this, arguments);
    const p = url.searchParams, num = (k, d) => p.has(k) ? Number(p.get(k)) : d;
    const lat = num("latitude", NaN), lon = num("longitude", NaN);
    const berlin = Math.abs(lat - 52.52) < 0.5 && Math.abs(lon - 13.41) < 0.5;
    let tz = p.get("timezone") || "GMT";
    if (tz === "auto") tz = berlin ? "Europe/Berlin" : "GMT";
    if (tz !== "Europe/Berlin") tz = /Berlin/.test(decodeURIComponent(tz)) ? "Europe/Berlin" : "GMT";
    const off = tzOffset(tz), now = FakeDate.now();
    const hourStart = Math.floor(now / H) * H;
    const dayStart = Math.floor((now + off) / (24 * H)) * 24 * H - off;
    let start, end;
    if (p.has("forecast_hours") || p.has("past_hours")) {
      start = hourStart - num("past_hours", 0) * H;
      end = hourStart + num("forecast_hours", 24 * num("forecast_days", 7)) * H;
    } else {
      start = dayStart - num("past_days", 0) * 24 * H;
      end = dayStart + num("forecast_days", 7) * 24 * H;
    }
    const f = p.get("temperature_unit") === "fahrenheit";
    const unix = p.get("timeformat") === "unixtime";
    const time = [], t2 = [];
    for (let ms = start; ms < end; ms += H) {
      time.push(unix ? ms / 1000 : iso(ms + off));
      const c = temp(ms, berlin);
      t2.push(f ? Math.round((c * 9 / 5 + 32) * 10) / 10 : c);
    }
    globalThis.__meteoCalls.push({ url: url.href, lat, lon, tz, n: time.length });
    const hourlyVars = (p.get("hourly") || "").split(",").filter(Boolean);
    const hourly = { time }, hourly_units = { time: unix ? "unixtime" : "iso8601" };
    for (const v of hourlyVars) { hourly[v] = v.startsWith("temperature") || v.startsWith("apparent") ? t2 : t2.map(() => 0); hourly_units[v] = v.startsWith("temp") || v.startsWith("apparent") ? (f ? "°F" : "°C") : ""; }
    const body = { latitude: lat, longitude: lon, generationtime_ms: 0.03, utc_offset_seconds: off / 1000, timezone: tz, timezone_abbreviation: off ? "GMT+2" : "GMT", elevation: 38 };
    const cur = p.get("current") || (p.get("current_weather") === "true" ? "temperature" : null);
    if (cur) {
      const c = temp(hourStart, berlin);
      body.current_units = { time: unix ? "unixtime" : "iso8601", interval: "seconds", temperature_2m: f ? "°F" : "°C" };
      body.current = { time: unix ? hourStart / 1000 : iso(hourStart + off), interval: 900, temperature_2m: f ? Math.round((c * 9 / 5 + 32) * 10) / 10 : c };
      if (p.get("current_weather") === "true") body.current_weather = { time: body.current.time, temperature: body.current.temperature_2m };
    }
    if (hourlyVars.length) { body.hourly_units = hourly_units; body.hourly = hourly; }
    return Promise.resolve(new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json", "access-control-allow-origin": "*" } }));
  };
})();`;

// Runs on the live page after the turn. Finds the chart (an SVG, or an element holding one) in an @user
// module, walks its inputs to the nearest array of time/temperature rows, and reports each property.
const COLLECT = `(async () => {
  const H = 3600e3, NOW = ${NOW_UTC};
  const reg = globalThis.__ojs_runtime;
  const out = { calls: (globalThis.__meteoCalls || []).length, berlin: false, chart: false, rows: 0, startsNow: false, spans48h: false, aligned: false, noErrors: true, detail: "" };
  const calls = globalThis.__meteoCalls || [];
  out.berlin = calls.length > 0 && calls.every(c => Math.abs(c.lat - 52.52) < 0.5 && Math.abs(c.lon - 13.41) < 0.5);
  // the agent's module: any main, @user/* first (one run wrote /src/@tomlarkworthy/berlin-temp.js)
  const mains = [...reg.mains].sort(([a], [b]) => (b.startsWith("@user/") ? 1 : 0) - (a.startsWith("@user/") ? 1 : 0));
  const isChart = x => x && typeof x === "object" && (x instanceof SVGElement || (x instanceof Element && x.querySelector && x.querySelector("svg")));
  const allVars = [...reg._variables];
  const charts = [];
  for (const [, m] of mains) for (const v of allVars) if (v._module === m && isChart(v._value) && v._value.querySelectorAll("path,circle,rect,line").length > 5) charts.push(v);
  const toMs = t => t instanceof Date ? t.getTime() : typeof t === "number" ? (t > 1e11 ? t : t > 1e9 ? t * 1000 : NaN) : typeof t === "string" && /^\\d{4}-\\d\\d-\\d\\dT/.test(t) ? new Date(t).getTime() : NaN;
  const asRows = val => {
    if (Array.isArray(val) && val.length >= 5 && val.every(r => r && typeof r === "object")) {
      const k0 = val[0];
      const tk = Object.keys(k0).find(k => Number.isFinite(toMs(k0[k])));
      const yk = Object.keys(k0).find(k => k !== tk && typeof k0[k] === "number" && k0[k] > -60 && k0[k] < 130);
      if (tk && yk) return val.map(r => ({ ms: toMs(r[tk]), y: r[yk] }));
    }
    if (val && typeof val === "object" && val.hourly && Array.isArray(val.hourly.time)) {
      const yk = Object.keys(val.hourly).find(k => k.startsWith("temperature"));
      if (yk) return val.hourly.time.map((t, i) => ({ ms: toMs(t), y: val.hourly[yk][i] }));
    }
    return null;
  };
  let rows = null, chartVar = null;
  for (const c of charts) {
    let frontier = [c], seen = new Set();
    while (frontier.length && !rows) {
      const next = [];
      for (const v of frontier) for (const i of v._inputs || []) {
        if (seen.has(i)) continue; seen.add(i);
        const r = asRows(i._value); if (r) { rows = r; break; }
        next.push(i);
      }
      frontier = next;
    }
    if (rows) { chartVar = c; break; }
  }
  out.chart = !!chartVar;
  if (chartVar) out.noErrors = allVars.every(v => v._module !== chartVar._module || v._error == null);
  if (!rows) { out.detail = "no time/temperature rows upstream of a chart"; return out; }
  out.rows = rows.length;
  const first = Math.min(...rows.map(r => r.ms)), last = Math.max(...rows.map(r => r.ms));
  out.startsNow = first >= NOW - 1.5 * H && first <= NOW + H;
  out.spans48h = rows.length >= 45 && rows.length <= 51 && last - first >= 44 * H && last - first <= 49 * H;
  const f = globalThis.__meteoTemp;
  const hit = rows.filter(r => { const c = f(r.ms, true); return Math.abs(r.y - c) < 0.06 || Math.abs(r.y - (c * 9 / 5 + 32)) < 0.11; }).length;
  out.aligned = hit >= 0.9 * rows.length;
  out.detail = "rows " + rows.length + ", first " + new Date(first).toISOString() + ", last " + new Date(last).toISOString() + ", aligned " + hit + "/" + rows.length;
  return out;
})()`;

const ORACLE_SRC = `const _intro = function intro(md){return( md\`# Berlin temperature, next 48 hours
Hourly forecast from [Open-Meteo](https://open-meteo.com/), plotted in your local time.\` )};

const _forecast = function forecast(){return(
  fetch("https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&forecast_hours=48&timeformat=unixtime")
    .then(r => r.json())
)};

const _rows = function rows(forecast){return(
  forecast.hourly.time.map((t, i) => ({ time: new Date(t * 1000), temperature: forecast.hourly.temperature_2m[i] }))
)};

const _chart = function chart(Plot, rows){return(
  Plot.plot({
    y: { label: "Temperature (°C)", grid: true },
    x: { label: "Time" },
    marks: [
      Plot.lineY(rows, { x: "time", y: "temperature" }),
      Plot.dot(rows, { x: "time", y: "temperature", r: 2, tip: true })
    ]
  })
)};

export default function define(runtime, observer) {
  const main = runtime.module();
  const $def = (pid, name, deps, fn) => main.variable(observer(name)).define(name, deps, fn).pid = pid;
  $def("_intro", "intro", ["md"], _intro);
  $def("_forecast", "forecast", [], _forecast);
  $def("_rows", "rows", ["forecast"], _rows);
  $def("_chart", "chart", ["Plot", "rows"], _chart);
  return main;
}
`;

export default {
  id: "rc5t-forecast-window-from-now",
  category: "rc5-train",
  question: "Show me a chart of the temperature in Berlin over the next 48 hours.",
  // New York, not Berlin: a Berlin-local parse of GMT strings is only visible off Berlin time.
  setup: { initScript: INIT, collect: COLLECT, timezoneId: "America/New_York" },
  criteria: [
    // THE defect: forecast_days=N starts at 00:00 today; the window must start at the current hour.
    { name: "collected_equals", args: { key: "startsNow", equals: true }, weight: 3 },
    { name: "collected_equals", args: { key: "spans48h", equals: true }, weight: 2 },
    // UTC strings parsed as local time (or local strings parsed as UTC) put every point 2h off.
    { name: "collected_equals", args: { key: "aligned", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "chart", equals: true }, weight: 2 },
    { name: "collected_equals", args: { key: "berlin", equals: true }, weight: 1 },
    { name: "collected_equals", args: { key: "noErrors", equals: true }, weight: 1 },
  ],
  oracle: [
    { tool: "read_file", args: { file_path: "/content/@tomlarkworthy/markdown-wiki/time-series-from-a-web-api.md" } },
    { tool: "write_file", args: { file_path: "/src/@user/berlin-temperature.js", content: ORACLE_SRC }, settleMs: 2000 },
  ],
};
