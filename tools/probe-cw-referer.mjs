// Hypothesis: the CWDBSharing role's cloudwatch:* statements carry an aws:Referer condition
// scoped to https://cloudwatch.amazonaws.com/. Browsers can't set Referer; Node can.
// Usage: CW_IDTOKEN=... node tools/probe-cw-referer.mjs
const IDTOK = process.env.CW_IDTOKEN;
const POOL_ID = 'us-east-1_REsoKtwzI';
const IDENTITY_POOL = 'us-east-1:8a154425-663a-470f-9fac-f4de1d480f7c';
const REGION = 'us-east-1';

const claims = JSON.parse(Buffer.from(IDTOK.split('.')[1], 'base64url').toString());
const now = Math.floor(Date.now() / 1000);
console.log('token exp in', claims.exp - now, 'seconds; preferred_role =', claims['cognito:preferred_role'].split('/').pop());
if (claims.exp <= now) { console.log('TOKEN EXPIRED — need a fresh one'); process.exit(1); }

const jsonCall = async (host, target, body) => {
  const r = await fetch(`https://${host}/`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': target },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${target}: ${j.__type}: ${j.message || ''}`);
  return j;
};

const logins = { [`cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`]: IDTOK };
const { IdentityId } = await jsonCall(`cognito-identity.${REGION}.amazonaws.com`, 'AWSCognitoIdentityService.GetId', { IdentityPoolId: IDENTITY_POOL, Logins: logins });
const { Credentials } = await jsonCall(`cognito-identity.${REGION}.amazonaws.com`, 'AWSCognitoIdentityService.GetCredentialsForIdentity', { IdentityId, Logins: logins });
const creds = { accessKeyId: Credentials.AccessKeyId, secretAccessKey: Credentials.SecretKey, sessionToken: Credentials.SessionToken };
console.log('credentials OK:', creds.accessKeyId.slice(0, 8) + '…');

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const hex = (b) => Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
const sha = async (s) => hex(await subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s));
const hmac = async (k, m) => new Uint8Array(await subtle.sign('HMAC', await subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), enc.encode(m)));

async function signedPost({ service, target, body, extraHeaders = {}, contentType }) {
  const host = `${service}.${REGION}.amazonaws.com`;
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const ds = amzDate.slice(0, 8);
  const signed = { 'content-type': contentType, host, 'x-amz-date': amzDate };
  if (target) signed['x-amz-target'] = target;
  signed['x-amz-security-token'] = creds.sessionToken;
  const names = Object.keys(signed).sort();
  const canon = ['POST', '/', '', names.map((n) => `${n}:${String(signed[n]).trim()}\n`).join(''), names.join(';'), await sha(body)].join('\n');
  const scope = [ds, REGION, service, 'aws4_request'].join('/');
  const sts = ['AWS4-HMAC-SHA256', amzDate, scope, await sha(canon)].join('\n');
  let k = enc.encode('AWS4' + creds.secretAccessKey);
  for (const p of [ds, REGION, service, 'aws4_request']) k = await hmac(k, p);
  const auth = `AWS4-HMAC-SHA256 Credential=${creds.accessKeyId}/${scope}, SignedHeaders=${names.join(';')}, Signature=${hex(await hmac(k, sts))}`;
  const send = { 'content-type': contentType, 'x-amz-date': amzDate, 'x-amz-security-token': creds.sessionToken, authorization: auth, ...extraHeaders };
  if (target) send['x-amz-target'] = target;
  const r = await fetch(`https://${host}/`, { method: 'POST', headers: send, body });
  return { status: r.status, text: (await r.text()).replace(/\s+/g, ' ').slice(0, 900) };
}

const PAYLOAD = JSON.stringify({
  Metrics: [{ Alias: 'firehose', Expression: `SUM(SEARCH('{AWS/SQS,QueueName} MetricName="ApproximateNumberOfMessagesVisible" -simulation-outcome-queue', 'Average', 300))`, Label: 'Simulations', ReturnData: true, Period: 300 }],
  Defaults: { Period: 60, Stat: 'Average', Range: { StartTime: 1785230400, EndTime: 1785241200 } },
  MaxDatapoints: 504000,
});

const CW_ORIGIN = { origin: 'https://cloudwatch.amazonaws.com', referer: 'https://cloudwatch.amazonaws.com/' };

const ISO = { StartTime: new Date(1785230400000).toISOString(), EndTime: new Date(1785241200000).toISOString() };
const CONSOLE_PAYLOAD = JSON.stringify({
  Metrics: [{ Alias: 'firehose', Expression: `SUM(SEARCH('{AWS/SQS,QueueName} MetricName="ApproximateNumberOfMessagesVisible" -simulation-outcome-queue', 'Average', 300))`, Label: 'Simulations', ReturnData: true, Period: 300 }],
  Defaults: { Period: 60, Stat: 'Average', Range: ISO },
  MaxDatapoints: 504000,
});
const cases = [
  ['*** CloudWatchVersion20130116.GetMetricData (console API) ***', { service: 'monitoring', target: 'CloudWatchVersion20130116.GetMetricData', body: CONSOLE_PAYLOAD, contentType: 'application/x-amz-json-1.0' }],
  ['CloudWatchVersion20130116.GetMetricData + referer', { service: 'monitoring', target: 'CloudWatchVersion20130116.GetMetricData', body: CONSOLE_PAYLOAD, contentType: 'application/x-amz-json-1.0', extraHeaders: CW_ORIGIN }],
];
for (const [label, opts] of cases) {
  const r = await signedPost(opts);
  console.log(`\n--- ${label} --- HTTP ${r.status}\n${r.text}`);
}
