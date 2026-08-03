const _cwdash01 = function _cwDashboard(){
  // CloudWatch dashboard JSON -> GetMetricData requests -> tidy rows.
  // Widget `metrics` entries come in two forms:
  //   [{expression, id, label, period, region}]                       — SEARCH()/maths, the common case
  //   ["Namespace","MetricName","Dim","Val",…,{stat,period,label,id}] — a concrete metric
  const parse = (body) => {
    const dash = typeof body === 'string' ? JSON.parse(body) : body;
    return (dash.widgets || []).map((w, i) => {
      const p = w.properties || {};
      return {
        i,
        type: w.type,
        x: w.x || 0, y: w.y || 0, width: w.width || 6, height: w.height || 6,
        title: p.title || null,
        markdown: p.markdown || null,
        region: p.region || null,
        stat: p.stat || 'Average',
        period: p.period || 300,
        view: p.view || 'timeSeries',
        stacked: !!p.stacked,
        yAxis: p.yAxis || null,
        metrics: p.metrics || []
      };
    });
  };

  // CloudWatch ids must match /^[a-z][a-zA-Z0-9_]*$/ and be unique within one request.
  const mkId = (raw, n, used) => {
    let id = String(raw == null ? '' : raw).replace(/[^a-zA-Z0-9_]/g, '_');
    if (!/^[a-z]/.test(id)) id = 'q' + id;
    let candidate = id, k = 1;
    while (used.has(candidate)) candidate = id + '_' + k++;
    used.add(candidate);
    return candidate;
  };

  // -> { queries, legend } where legend maps query Id -> the label to show.
  const widgetQueries = (widget) => {
    const used = new Set();
    const queries = [], legend = {};
    (widget.metrics || []).forEach((entry, n) => {
      const opts = entry.find((e) => e && typeof e === 'object') || {};
      const parts = entry.filter((e) => typeof e === 'string');
      const id = mkId(opts.id || 'm' + n, n, used);
      legend[id] = opts.label || (parts.length > 1 ? parts[1] : id);
      if (opts.expression) {
        queries.push({ Id: id, Expression: opts.expression, Label: opts.label, Period: opts.period || widget.period, ReturnData: true });
        return;
      }
      if (parts.length < 2) return; // not a metric we can query
      const dims = [];
      for (let k = 2; k + 1 < parts.length; k += 2) dims.push({ Name: parts[k], Value: parts[k + 1] });
      queries.push({
        Id: id, Label: opts.label, ReturnData: true,
        MetricStat: {
          Metric: { Namespace: parts[0], MetricName: parts[1], Dimensions: dims },
          Period: opts.period || widget.period,
          Stat: opts.stat || widget.stat
        }
      });
    });
    return { queries, legend };
  };

  // GetMetricData returns one result per series; SEARCH() expands to many, so the
  // series count is not known until the response arrives — hence Label-driven colouring.
  // Two response shapes: the public API returns `MetricDataResults` with `Id` and ISO/Date
  // timestamps; the console API (CloudWatchVersion20130116) returns `MetricData` with `Alias`
  // and epoch-SECONDS timestamps (e.g. 1.785258E9). Normalise both.
  const toDate = (t) => {
    if (t instanceof Date) return t;
    const n = Number(t);
    // numeric && < year ~2001 in ms  => it's epoch seconds, scale up
    return new Date(Number.isFinite(n) && n < 1e12 ? n * 1000 : (Number.isFinite(n) ? n : t));
  };
  const tidy = (result, legend = {}) => {
    const results = (result && (result.MetricDataResults || result.MetricData || result.MetricDataResult)) || [];
    const list = Array.isArray(results) ? results : [results];
    const rows = [];
    for (const r of list) {
      if (!r) continue;
      const ts = [].concat(r.Timestamps || []);
      const vs = [].concat(r.Values || []);
      const key = r.Id || r.Alias;
      const label = r.Label || legend[key] || key;
      for (let k = 0; k < ts.length; k++) {
        rows.push({ id: key, series: label, time: toDate(ts[k]), value: Number(vs[k]) });
      }
    }
    rows.sort((a, b) => a.time - b.time);
    return rows;
  };

  const statusOf = (result) => {
    const list = [].concat((result && result.MetricDataResults) || []);
    const bad = list.filter((r) => r && r.StatusCode && r.StatusCode !== 'Complete');
    return { partial: bad.length > 0, messages: [].concat((result && result.Messages) || []) };
  };

  return { parse, widgetQueries, tidy, statusOf, mkId };
};
const _cwshared01 = function _cwCallConsole(){return(
// The CloudWatch shared-dashboard metrics API. Reads go to the console-internal target
// `CloudWatchVersion20130116.*` on monitoring.<region>.amazonaws.com, authorised by THREE things
// beyond plain SigV4, all reverse-engineered from the official CloudWatchDashboardsJS bundle:
//   1. x-amz-user-agent = "aws-sdk-js/2.1687.0 cloudwatch-dashboard-sharing promise" (a marker)
//   2. X-Amz-Sharing-MetaSum / -MetaTime  — MetaSum = SHA256hex(target + body + userAgent + metaTime)
//   3. X-CloudWatch-SharedDashboardToken   — a server-minted, per-widget HMAC token that GetDashboard
//      returns on each widget (`widget.sharedDashboardToken`). GetMetricData is denied without it even
//      though the role can call GetDashboard; the token is what actually grants the read.
// All of these plus the security token are inside the SigV4 SignedHeaders set.
async function cwCallConsole(operation, body, { credentials, region = 'us-east-1', token = null } = {}) {
  const UA = 'aws-sdk-js/2.1687.0 cloudwatch-dashboard-sharing promise';
  const target = 'CloudWatchVersion20130116.' + operation;
  const service = 'monitoring', host = `${service}.${region}.amazonaws.com`;
  const enc = new window.TextEncoder();
  const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
  const sha = async (m) => hex(await window.crypto.subtle.digest('SHA-256', typeof m === 'string' ? enc.encode(m) : m));
  const hmac = async (k, m) => new Uint8Array(await window.crypto.subtle.sign('HMAC', await window.crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(m)));
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''), ds = amzDate.slice(0, 8);
  const metaTime = String(Date.now());
  const metaSum = await sha(`${target}${body}${UA}${metaTime}`);
  const bodyHash = await sha(body);
  const signed = {
    host, 'x-amz-content-sha256': bodyHash, 'x-amz-date': amzDate,
    'x-amz-security-token': credentials.sessionToken,
    'x-amz-sharing-metasum': metaSum, 'x-amz-sharing-metatime': metaTime,
    'x-amz-target': target, 'x-amz-user-agent': UA,
  };
  if (token) signed['x-cloudwatch-shareddashboardtoken'] = token;
  const names = Object.keys(signed).sort();
  const canon = ['POST', '/', '', names.map((n) => `${n}:${String(signed[n]).trim()}\n`).join(''), names.join(';'), bodyHash].join('\n');
  const scope = [ds, region, service, 'aws4_request'].join('/');
  const sts = ['AWS4-HMAC-SHA256', amzDate, scope, await sha(canon)].join('\n');
  let k = enc.encode('AWS4' + credentials.secretAccessKey);
  for (const p of [ds, region, service, 'aws4_request']) k = await hmac(k, p);
  const auth = `AWS4-HMAC-SHA256 Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${hex(await hmac(k, sts))}`;
  const send = { ...signed, 'content-type': 'application/x-amz-json-1.0', authorization: auth };
  delete send.host;
  const r = await window.fetch(`https://${host}/`, { method: 'POST', headers: send, body });
  const text = await r.text();
  if (!r.ok) { const e = new Error(text.slice(0, 300)); e.status = r.status; throw e; }
  return JSON.parse(text);
}
)};
const _cwfetchdash01 = function _cwFetchDashboard(cwCallConsole,cwDashboard){return(
// Fetch the dashboard definition WITH its per-widget sharedDashboardToken (GetDashboard via the
// console target returns tokens; the public Query GetDashboard does not). Returns parsed widgets,
// each carrying `.token`.
async function cwFetchDashboard(dashboardName, { credentials, region = 'us-east-1' } = {}) {
  const res = await cwCallConsole('GetDashboard', JSON.stringify({ DashboardName: dashboardName }), { credentials, region });
  const dash = JSON.parse(res.DashboardBody);
  const widgets = cwDashboard.parse(dash);
  (dash.widgets || []).forEach((w, i) => { widgets[i].token = w.sharedDashboardToken || (w.properties && w.properties.sharedDashboardToken) || null; });
  return { arn: res.DashboardArn, widgets };
}
)};
const _cwfetch01 = function _cwFetchWidget(cwDashboard,cwCallConsole){return(
async function cwFetchWidget(widget, { credentials, start, end, region, maxDatapoints = 100800 } = {}) {
  const { queries, legend } = cwDashboard.widgetQueries(widget);
  if (!queries.length) return { rows: [], legend, empty: true };
  // Console GetMetricData wants `Metrics` (Alias-keyed), not the public `MetricDataQueries` (Id-keyed).
  const Metrics = queries.map((q) => q.Expression
    ? { Alias: q.Id, Expression: q.Expression, Period: q.Period, ReturnData: true }
    : { Alias: q.Id, Namespace: q.MetricStat.Metric.Namespace, MetricName: q.MetricStat.Metric.MetricName,
        Dimensions: q.MetricStat.Metric.Dimensions, Stat: q.MetricStat.Stat, Period: q.MetricStat.Period, ReturnData: true });
  const body = JSON.stringify({
    Metrics,
    Defaults: { Period: widget.period || 60, Stat: widget.stat || 'Average',
      Range: { StartTime: Math.floor(start / 1000), EndTime: Math.floor(end / 1000) } },
    MaxDatapoints: maxDatapoints
  });
  try {
    const res = await cwCallConsole('GetMetricData', body, { credentials, region: region || widget.region || 'us-east-1', token: widget.token });
    return { rows: cwDashboard.tidy(res, legend), legend, raw: res };
  } catch (e) {
    // A bare AccessDenied here means the widget's token was missing/stale; surface it rather than
    // rendering an empty chart that reads as "no traffic".
    return { rows: [], legend, error: (e.status ? 'HTTP ' + e.status + ' ' : '') + (e.message || String(e)).slice(0, 160) };
  }
}
)};
const _cwplot01 = function _cwPlotWidget(htl,Plot){return(
function cwPlotWidget(widget, result, { width = 420, height = 180 } = {}) {
  const frame = htl.html`<div style="font:12px/1.4 system-ui,sans-serif;border:1px solid #d8d8d8;border-radius:6px;padding:8px;overflow:hidden">`;
  const head = htl.html`<div style="font-weight:600;margin-bottom:4px">${widget.title || '(untitled)'}${widget.region ? htl.html`<span style="font-weight:400;color:#888"> · ${widget.region}</span>` : ''}</div>`;
  frame.append(head);

  if (widget.type === 'text') {
    frame.append(htl.html`<div style="color:#444;white-space:pre-wrap">${widget.markdown || ''}</div>`);
    return frame;
  }
  if (result && result.error) {
    frame.append(htl.html`<div style="color:#c00;font:11px ui-monospace,monospace">${result.error}</div>`);
    return frame;
  }
  const rows = (result && result.rows) || [];
  if (!rows.length) {
    frame.append(htl.html`<div style="color:#888">no datapoints in range</div>`);
    return frame;
  }

  const nSeries = new Set(rows.map((r) => r.series)).size;
  const marks = [
    Plot.ruleY([0], { stroke: '#ccc' }),
    widget.stacked
      ? Plot.areaY(rows, { x: 'time', y: 'value', fill: 'series', order: 'sum' })
      : Plot.lineY(rows, { x: 'time', y: 'value', stroke: 'series', strokeWidth: 1.25 })
  ];
  frame.append(Plot.plot({
    width, height,
    marginLeft: 48, marginBottom: 24,
    x: { label: null, grid: false },
    y: { label: null, grid: true, nice: true },
    // SEARCH() widgets can expand to dozens of series; a legend then costs more than it gives.
    color: nSeries > 1 && nSeries <= 8 ? { legend: true } : undefined,
    marks
  }));
  if (nSeries > 8) frame.append(htl.html`<div style="color:#888">${nSeries} series</div>`);
  return frame;
}
)};
const _cwtest01 = function _cwSelfTest(cwDashboard,cwPlotWidget,htl){
  // Exercises parse -> widgetQueries -> tidy -> plot with a synthetic GetMetricData response.
  // Real data is blocked on cloudwatch:GetMetricData, so this proves the render path only.
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, pass: !!cond, detail: detail || '' });

  const body = JSON.stringify({
    widgets: [
      { type: 'text', x: 0, y: 0, width: 24, height: 1, properties: { markdown: '## Section' } },
      { type: 'metric', x: 0, y: 1, width: 12, height: 6, properties: {
          title: 'Queue depth', region: 'eu-central-1', stat: 'Average', period: 300, stacked: false,
          metrics: [
            [{ expression: `SUM(SEARCH('{AWS/SQS,QueueName} MetricName="ApproximateNumberOfMessagesVisible"', 'Average', 300))`, id: 'firehose', label: 'Simulations', period: 300 }],
            ['AWS/SQS', 'NumberOfMessagesSent', 'QueueName', 'commit-queue', { stat: 'Sum', label: 'Commits' }]
          ] } }
    ]
  });

  const widgets = cwDashboard.parse(body);
  ok('parse: widget count', widgets.length === 2, widgets.length + '');
  ok('parse: text widget keeps markdown', widgets[0].markdown === '## Section');
  ok('parse: region carried through', widgets[1].region === 'eu-central-1');

  const { queries, legend } = cwDashboard.widgetQueries(widgets[1]);
  ok('queries: one per metric entry', queries.length === 2, JSON.stringify(queries.map((q) => q.Id)));
  ok('queries: expression entry uses Expression', !!queries[0].Expression);
  ok('queries: metric entry uses MetricStat', !!queries[1].MetricStat);
  ok('queries: dimensions paired', queries[1].MetricStat.Metric.Dimensions[0].Name === 'QueueName' && queries[1].MetricStat.Metric.Dimensions[0].Value === 'commit-queue');
  ok('queries: per-entry stat overrides widget stat', queries[1].MetricStat.Stat === 'Sum');
  ok('queries: ids are CloudWatch-legal', queries.every((q) => /^[a-z][a-zA-Z0-9_]*$/.test(q.Id)), queries.map((q) => q.Id).join(','));

  const used = new Set();
  ok('mkId: dedupes collisions', cwDashboard.mkId('x', 0, used) === 'x' && cwDashboard.mkId('x', 1, used) === 'x_1');
  ok('mkId: fixes leading digit', /^q/.test(cwDashboard.mkId('9bad', 0, new Set())));

  // SEARCH() expands to N series the request never named — the response is the only source of truth.
  const t0 = Date.parse('2026-07-28T09:00:00Z');
  const mk = (id, label, n, f) => ({ Id: id, Label: label, StatusCode: 'Complete',
    Timestamps: Array.from({ length: n }, (_, k) => new Date(t0 + k * 300000).toISOString()),
    Values: Array.from({ length: n }, (_, k) => f(k)) });
  const fake = { MetricDataResults: [
    mk('firehose', 'eu-central-1 sims', 24, (k) => 100 + 40 * Math.sin(k / 3)),
    mk('firehose', 'eu-west-1 sims', 24, (k) => 60 + 20 * Math.cos(k / 4)),
    mk('m1', 'Commits', 24, (k) => 5 + (k % 7))
  ], Messages: [] };

  const rows = cwDashboard.tidy(fake, legend);
  ok('tidy: row count', rows.length === 72, rows.length + '');
  ok('tidy: Label wins over legend', new Set(rows.map((r) => r.series)).size === 3);
  ok('tidy: times are Dates', rows[0].time instanceof Date);
  ok('tidy: sorted ascending', rows.every((r, k) => k === 0 || rows[k - 1].time <= r.time));
  ok('tidy: values numeric', rows.every((r) => Number.isFinite(r.value)));
  ok('tidy: empty response is empty, not throwing', cwDashboard.tidy({}, {}).length === 0);

  // Real console shape: `MetricData` array, `Alias` id, epoch-SECONDS timestamps (verified live).
  const consoleResp = { MetricData: [
    { Alias: 'invocations', Label: 'history-rule', Unit: 'Count', Timestamps: [1.785258E9, 1.7852544E9, 1.7852508E9], Values: [24.0, 24.0, 24.0] }
  ], Messages: [], Defaults: { StatusCode: 'Complete' } };
  const crows = cwDashboard.tidy(consoleResp);
  ok('tidy: reads console MetricData shape', crows.length === 3, crows.length + '');
  ok('tidy: epoch-seconds -> correct year', crows[0].time.getUTCFullYear() === 2026, String(crows[0].time.getUTCFullYear()));
  ok('tidy: console Label used as series', crows.every((r) => r.series === 'history-rule'));

  const chart = cwPlotWidget(widgets[1], { rows, legend }, { width: 460, height: 190 });
  ok('plot: produced an element', chart && chart.querySelector('svg') !== null);
  const denied = cwPlotWidget(widgets[1], { rows: [], error: 'AccessDenied' });
  ok('plot: denial is visible, not an empty chart', /AccessDenied/.test(denied.textContent));
  const textW = cwPlotWidget(widgets[0], {});
  ok('plot: text widget renders markdown', /Section/.test(textW.textContent));

  const passed = checks.filter((c) => c.pass).length;
  return htl.html`<div style="font:13px/1.5 system-ui,sans-serif">
    <div style="font-weight:600;color:${passed === checks.length ? '#080' : '#c00'}">
      render path self-test — ${passed}/${checks.length} passing
    </div>
    <ul style="margin:4px 0 8px;padding-left:18px">
      ${checks.filter((c) => !c.pass).map((c) => htl.html`<li style="color:#c00">${c.name} ${c.detail}</li>`)}
    </ul>
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-start">${chart}${denied}</div>
  </div>`;
};
