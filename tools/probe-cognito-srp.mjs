// Cognito SRP-6a login + identity-pool credential exchange, WebCrypto only (ports straight to a notebook cell).
// Usage: CW_USER=... CW_PASS=... node tools/probe-cognito-srp.mjs
const subtle = globalThis.crypto.subtle;

const CTX = JSON.parse(Buffer.from(process.env.CW_CONTEXT, 'base64').toString('utf8'));
const REGION = CTX.R, POOL_ID = CTX.U, CLIENT_ID = CTX.C, IDP_ID = CTX.I;
const POOL_NAME = POOL_ID.split('_')[1];
const IDP = `https://cognito-idp.${REGION}.amazonaws.com/`;
const IDENTITY = `https://cognito-identity.${REGION}.amazonaws.com/`;

// RFC 5054 3072-bit group
const N = BigInt('0x' + [
  'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DD',
  'EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED',
  'EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F',
  '83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B',
  'E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA0510',
  '15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7',
  'ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200C',
  'BBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF',
].join(''));
const g = 2n;

const enc = new TextEncoder();
const hexToBytes = (h) => Uint8Array.from(h.match(/../g).map((b) => parseInt(b, 16)));
const bytesToHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const cat = (...as) => { const t = new Uint8Array(as.reduce((n, a) => n + a.length, 0)); let o = 0; for (const a of as) { t.set(a, o); o += a.length; } return t; };

// amazon-cognito-identity-js padHex: pad to even length, else prefix 00 when the MSB is set.
function padHex(v) {
  let h = typeof v === 'bigint' ? v.toString(16) : v;
  if (h.length % 2 === 1) h = '0' + h;
  else if (/^[89a-f]/i.test(h)) h = '00' + h;
  return h;
}
const sha256 = async (bytes) => new Uint8Array(await subtle.digest('SHA-256', bytes));
const hashHex = async (bytes) => bytesToHex(await sha256(bytes));
const hexHash = async (hex) => hashHex(hexToBytes(hex));
async function hmac(keyBytes, msgBytes) {
  const k = await subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await subtle.sign('HMAC', k, msgBytes));
}
function modPow(base, exp, mod) {
  base = ((base % mod) + mod) % mod;
  let r = 1n;
  while (exp > 0n) { if (exp & 1n) r = (r * base) % mod; base = (base * base) % mod; exp >>= 1n; }
  return r;
}

const call = async (url, target, body) => {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/x-amz-json-1.1', 'x-amz-target': target },
    body: JSON.stringify(body),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${target}: ${j.__type || r.status}: ${j.message || ''}`);
  return j;
};

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const p2 = (n) => String(n).padStart(2, '0');
const cognitoTimestamp = (d) =>
  `${WD[d.getUTCDay()]} ${MO[d.getUTCMonth()]} ${d.getUTCDate()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())} UTC ${d.getUTCFullYear()}`;

async function srpLogin(username, password) {
  const aBytes = crypto.getRandomValues(new Uint8Array(128));
  const a = BigInt('0x' + bytesToHex(aBytes)) % N;
  const A = modPow(g, a, N);

  const init = await call(IDP, 'AWSCognitoIdentityProviderService.InitiateAuth', {
    AuthFlow: 'USER_SRP_AUTH', ClientId: CLIENT_ID,
    AuthParameters: { USERNAME: username, SRP_A: A.toString(16) },
  });
  if (init.ChallengeName !== 'PASSWORD_VERIFIER') return { init };
  const cp = init.ChallengeParameters;
  const B = BigInt('0x' + cp.SRP_B);
  if (B % N === 0n) throw new Error('bad server public value B');
  const salt = BigInt('0x' + cp.SALT);
  const srpUser = cp.USER_ID_FOR_SRP;

  const k = BigInt('0x' + (await hexHash(padHex(N) + padHex(g))));
  const u = BigInt('0x' + (await hexHash(padHex(A) + padHex(B))));
  if (u === 0n) throw new Error('u === 0');

  const upHash = await hashHex(enc.encode(`${POOL_NAME}${srpUser}:${password}`));
  const x = BigInt('0x' + (await hexHash(padHex(salt) + upHash)));
  const S = modPow(B - k * modPow(g, x, N), a + u * x, N);

  // HKDF as Cognito does it: prk = HMAC(salt=u, ikm=S); key = HMAC(prk, "Caldera Derived Key"\x01)[0..16]
  const prk = await hmac(hexToBytes(padHex(u)), hexToBytes(padHex(S)));
  const key = (await hmac(prk, cat(enc.encode('Caldera Derived Key'), new Uint8Array([1])))).slice(0, 16);

  const ts = cognitoTimestamp(new Date());
  const secretBlock = Uint8Array.from(Buffer.from(cp.SECRET_BLOCK, 'base64'));
  const sig = await hmac(key, cat(enc.encode(POOL_NAME), enc.encode(srpUser), secretBlock, enc.encode(ts)));

  const res = await call(IDP, 'AWSCognitoIdentityProviderService.RespondToAuthChallenge', {
    ChallengeName: 'PASSWORD_VERIFIER', ClientId: CLIENT_ID,
    ChallengeResponses: {
      USERNAME: srpUser,
      PASSWORD_CLAIM_SECRET_BLOCK: cp.SECRET_BLOCK,
      PASSWORD_CLAIM_SIGNATURE: Buffer.from(sig).toString('base64'),
      TIMESTAMP: ts,
    },
  });
  return res;
}

const res = await srpLogin(process.env.CW_USER, process.env.CW_PASS);
if (res.ChallengeName) {
  console.log('CHALLENGE:', res.ChallengeName, Object.keys(res.ChallengeParameters || {}));
  process.exit(0);
}
const auth = res.AuthenticationResult;
const idToken = auth.IdToken;
const claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());
console.log('LOGIN OK. token lifetimes:', {
  ExpiresIn: auth.ExpiresIn, TokenType: auth.TokenType,
  hasRefreshToken: !!auth.RefreshToken,
  iat_to_exp_seconds: claims.exp - claims.iat,
});
console.log('id-token claims:', { sub: claims.sub, aud: claims.aud, email: claims.email, iss: claims.iss });

const logins = { [`cognito-idp.${REGION}.amazonaws.com/${POOL_ID}`]: idToken };
const { IdentityId } = await call(IDENTITY, 'AWSCognitoIdentityService.GetId', { IdentityPoolId: IDP_ID, Logins: logins });
const { Credentials } = await call(IDENTITY, 'AWSCognitoIdentityService.GetCredentialsForIdentity', { IdentityId, Logins: logins });
console.log('CREDENTIALS OK:', {
  IdentityId,
  AccessKeyId: Credentials.AccessKeyId.slice(0, 8) + '…',
  hasSessionToken: !!Credentials.SessionToken,
  Expiration: new Date(Credentials.Expiration * 1000).toISOString(),
  validForMinutes: Math.round((Credentials.Expiration * 1000 - Date.now()) / 60000),
});

// hand off to the SigV4 probe
const { writeFileSync } = await import('node:fs');
writeFileSync('/private/tmp/claude-502/-Users-tom-larkworthy-dev-lopecode-dev/af1aa31a-7710-49d1-9fde-617650fa64f7/scratchpad/cw-creds.json',
  JSON.stringify({ Credentials, RefreshToken: auth.RefreshToken ? '(present)' : null }, null, 2));
console.log('creds written to scratchpad');
