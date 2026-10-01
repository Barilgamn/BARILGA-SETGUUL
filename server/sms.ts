import crypto from 'crypto';

// Operator SMS gateway (Unitel / Mobicom / Skytel). Each operator's URL and
// parameter names differ and come from the contract, so the request is a
// template filled from .env rather than code per operator:
//
//   SMS_GATEWAY_URL="https://gateway.example.mn/send?token={token}&from={from}&to={to}&text={text}"
//   SMS_GATEWAY_METHOD="GET"                     # or POST
//   SMS_GATEWAY_BODY='{"to":"{to}","text":"{text}"}'   # POST only
//   SMS_GATEWAY_CONTENT_TYPE="application/json"  # POST only
//   SMS_GATEWAY_AUTH_HEADER="Bearer {token}"     # optional Authorization header
//   SMS_GATEWAY_SUCCESS="OK"                     # optional text the reply must contain
//
// Placeholders: {token} {from} {to} {text}. In the URL they are URL-encoded.

const env = (key: string) => process.env[key]?.trim() || '';

export function smsConfigured(): boolean {
  return !!env('SMS_GATEWAY_URL');
}

// Mongolian numbers are 8 digits; gateways usually want them without +976
export function localNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('976') ? digits.slice(3) : digits;
}

function fill(template: string, values: Record<string, string>, encode: (v: string) => string) {
  return template.replace(/\{(token|from|to|text)\}/g, (_, key) => encode(values[key] ?? ''));
}

// Resolves with the gateway's reply text (useful when testing a new gateway)
export async function sendSms(to: string, text: string): Promise<string> {
  const url = env('SMS_GATEWAY_URL');
  if (!url) throw new Error('SMS_GATEWAY_URL is not configured');

  const values = { token: env('SMS_API_TOKEN'), from: env('SMS_SENDER'), to: localNumber(to), text };
  const method = (env('SMS_GATEWAY_METHOD') || 'GET').toUpperCase();
  const headers: Record<string, string> = {};
  const auth = env('SMS_GATEWAY_AUTH_HEADER');
  if (auth) headers.Authorization = fill(auth, values, v => v);

  let body: string | undefined;
  if (method !== 'GET') {
    const contentType = env('SMS_GATEWAY_CONTENT_TYPE') || 'application/json';
    headers['Content-Type'] = contentType;
    body = fill(env('SMS_GATEWAY_BODY'), values, v =>
      contentType.includes('json') ? JSON.stringify(v).slice(1, -1) : encodeURIComponent(v)
    );
  }

  const res = await fetch(fill(url, values, encodeURIComponent), { method, headers, body });
  const reply = await res.text();
  const mustContain = env('SMS_GATEWAY_SUCCESS');
  if (!res.ok || (mustContain && !reply.includes(mustContain))) {
    // Log the reply but never the token-bearing URL
    throw new Error(`SMS gateway refused (${res.status}): ${reply.slice(0, 200)}`);
  }
  return reply;
}

// Most operator gateways bill Cyrillic as several messages or garble it, so
// the default text is Latin. Override with SMS_OTP_TEMPLATE; {code} is the OTP.
export function otpMessage(code: string): string {
  return (env('SMS_OTP_TEMPLATE') || 'Barilga.MN: tany nevtrekh kod {code}. Hend ch bitgii heleerei.').replace('{code}', code);
}

// Supabase "Send SMS" hook requests are signed per Standard Webhooks:
// base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`)), secret given as
// "v1,whsec_<base64>". Reject anything unsigned, mis-signed or older than 5 min.
export function verifySupabaseHook(rawBody: string, headers: Record<string, string | string[] | undefined>): boolean {
  const secret = env('SUPABASE_SMS_HOOK_SECRET').replace(/^v1,/, '').replace(/^whsec_/, '');
  const id = String(headers['webhook-id'] || '');
  const timestamp = String(headers['webhook-timestamp'] || '');
  const signatures = String(headers['webhook-signature'] || '');
  if (!secret || !id || !timestamp || !signatures) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const expected = crypto
    .createHmac('sha256', Buffer.from(secret, 'base64'))
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest();
  return signatures.split(' ').some(entry => {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig, 'base64');
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
}
