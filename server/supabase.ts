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
