// Flood protection for the SMS we pay for. Before any code goes out:
// - Mongolian mobile numbers only (international "SMS pumping" fraud targets
//   premium foreign numbers);
// - per number: one SMS a minute, 5 an hour, 10 a day;
// - overall: a cap per hour, so a bot spreading over many numbers can't run
//   up the bill.
// Limits can be tuned with SMS_LIMIT_INTERVAL_S, SMS_LIMIT_HOUR, SMS_LIMIT_DAY
// and SMS_LIMIT_GLOBAL_HOUR. Every allowed SMS is written to sms_log.
import { admin } from './supabase.js';

export type SmsKind = 'login' | 'phone-change' | 'other';
export type SmsRefusalReason = 'not-mongolian' | 'too-soon' | 'hourly' | 'daily' | 'busy';
// ok, the normalised phone when allowed; otherwise why, and when to retry
export interface SmsCheck {
  ok: boolean;
  phone: string;
  reason?: SmsRefusalReason;
  retryIn?: number;
}

const num = (name: string, fallback: number) => Number(process.env[name]) || fallback;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "97688008088", "+976 8800-8088", "88008088" → "+97688008088"; else null
export function normalizeMnPhone(input: string): string | null {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('976')) digits = digits.slice(3);
  return /^[5-9]\d{7}$/.test(digits) ? `+976${digits}` : null;
}

export async function allowSms(rawPhone: string, kind: SmsKind): Promise<SmsCheck> {
  const phone = normalizeMnPhone(rawPhone);
  if (!phone) return { ok: false, phone: '', reason: 'not-mongolian' };
  if (!admin) return { ok: true, phone };

  const now = Date.now();
  const gap = num('SMS_LIMIT_INTERVAL_S', 60) * 1000;
  const perHour = num('SMS_LIMIT_HOUR', 5);
  const perDay = num('SMS_LIMIT_DAY', 10);
  const globalHour = num('SMS_LIMIT_GLOBAL_HOUR', 300);

  const [mine, all] = await Promise.all([
    admin.from('sms_log').select('sent_at').eq('phone', phone).gte('sent_at', now - DAY).order('sent_at', { ascending: false }),
    admin.from('sms_log').select('id', { count: 'exact', head: true }).gte('sent_at', now - HOUR),
  ]);
  // Before migration 0010 the table is missing: send rather than lock everyone out
  if (mine.error || all.error) {
    console.error('SMS guard could not read sms_log:', (mine.error || all.error)?.message);
    return { ok: true, phone };
  }

  const times = (mine.data || []).map(r => Number(r.sent_at));
  const last = times[0];
  if (last && now - last < gap) return { ok: false, phone, reason: 'too-soon', retryIn: Math.ceil((gap - (now - last)) / 1000) };
  const lastHour = times.filter(t => now - t < HOUR);
  if (lastHour.length >= perHour) {
    return { ok: false, phone, reason: 'hourly', retryIn: Math.ceil((HOUR - (now - Math.min(...lastHour))) / 1000) };
  }
  if (times.length >= perDay) return { ok: false, phone, reason: 'daily', retryIn: Math.ceil((DAY - (now - Math.min(...times))) / 1000) };
  if ((all.count || 0) >= globalHour) return { ok: false, phone, reason: 'busy', retryIn: 15 * 60 };

  await admin.from('sms_log').insert({ phone, kind, sent_at: now });
  return { ok: true, phone };
}

// Shown on the login page; it reads the code before the colon
export function refusalMessage(r: SmsCheck): string {
  return `SMS_LIMIT:${r.reason}:${r.retryIn ?? 0}`;
}
