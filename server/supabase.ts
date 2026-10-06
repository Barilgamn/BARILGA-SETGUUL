import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Service-role client: bypasses row level security, so it lives only on the
// server and is used for what the browser must not do itself (mark a QPay
// payment paid, check a buyer's purchases before handing out a link).
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const admin: SupabaseClient | null =
  url && serviceKey ? createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

if (!admin) console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not set; paid reading and QPay are disabled');

export async function userIdFromToken(token: string | null): Promise<string | null> {
  if (!admin || !token) return null;
  const { data, error } = await admin.auth.getUser(token);
  return error ? null : data.user?.id ?? null;
}

// Mirrors public.is_admin(): listed in public.admins with a confirmed email
export async function isAdminUser(userId: string): Promise<boolean> {
  if (!admin) return false;
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const user = data?.user;
  if (error || !user?.email || !user.email_confirmed_at) return false;
  const { data: row } = await admin.from('admins').select('email').eq('email', user.email.toLowerCase()).maybeSingle();
  return !!row;
}

export async function loadIssuePrices(): Promise<Map<string, number>> {
  if (!admin) return new Map();
  const { data, error } = await admin.from('issue_prices').select('issue_id, price');
  if (error) throw new Error(`issue_prices: ${error.message}`);
  return new Map((data || []).map(r => [r.issue_id as string, r.price as number]));
}

export async function userOwnsIssue(userId: string, issueId: string): Promise<boolean> {
  if (!admin) return false;
  const { data, error } = await admin
    .from('purchases')
    .select('id')
    .eq('user_id', userId)
    .eq('issue_id', issueId)
    .eq('status', 'paid')
    .limit(1);
  if (error) throw new Error(`purchases: ${error.message}`);
  return (data || []).length > 0;
}

// Hand-added magazines, read with the service role: since 0004 the public
// can't select this table, because rows hold the flipbook links of paid issues.
export async function loadMagazineRows(): Promise<any[]> {
  if (!admin) return [];
  const { data, error } = await admin.from('magazines').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(`magazines: ${error.message}`);
  return data || [];
}

// Print buyers read their issues online too: a paid single-issue order of
// this very issue, or a paid subscription (theirs, or one in their phone
// number) running when the issue came out.
// A subscription also covers the issue current when it started (the 31 days
// before), since that is usually the first one delivered.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MONTH = 31 * 24 * 60 * 60 * 1000;

export async function userHasPrintAccess(
  userId: string,
  issue: { issueId: string; publishedAt: number; isMagazine: boolean }
): Promise<boolean> {
  if (!admin) return false;
  // Orders placed as a guest or typed in by the office carry only a phone
  // number, so they also count when their phone is the login phone
  const { data: account } = await admin.auth.admin.getUserById(userId);
  const last8 = String(account?.user?.phone || '').replace(/\D/g, '').slice(-8);
  const samePhone = (phone: unknown) => last8.length === 8 && String(phone || '').replace(/\D/g, '').slice(-8) === last8;

  if (UUID.test(issue.issueId)) {
    const { data } = await admin
      .from('orders')
      .select('user_id, phone')
      .eq('magazine_id', issue.issueId)
      .eq('payment_status', 'paid');
    if ((data || []).some(o => o.user_id === userId || samePhone(o.phone))) return true;
  }
  if (!issue.isMagazine || !issue.publishedAt) return false;
  const { data: paid, error } = await admin
    .from('subscription_orders')
    .select('user_id, phone, start_date, end_date, created_at')
    .eq('payment_status', 'paid');
  if (error) throw new Error(`subscription_orders: ${error.message}`);
  // Phones are typed freely ("9911-2233", "+976 99112233"), so compare digits
  const subs = (paid || []).filter(s => s.user_id === userId || samePhone(s.phone));
  return (subs || []).some(s => {
    const start = Number(s.start_date ?? s.created_at);
    const end = s.end_date == null ? Infinity : Number(s.end_date);
    return issue.publishedAt >= start - MONTH && issue.publishedAt <= end;
  });
}
