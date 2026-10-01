import { supabase, supabaseConfigured } from './supabase';
import { getSetting, setSetting, watchTable } from './db';
import { generateCode } from './catalogOrders';
import { DEFAULT_BANK } from './bank';
import { BankSettings, Magazine, Purchase, PurchaseMethod, QPayInvoiceInfo } from '../types';

export const PURCHASE_STATUS_LABELS: Record<Purchase['status'], string> = {
  pending: 'Төлбөр хүлээгдэж буй',
  paid: 'Төлөгдсөн',
  cancelled: 'Цуцлагдсан',
};

function fromRow(r: any): Purchase {
  return {
    id: r.id,
    uid: r.user_id,
    phone: r.phone ?? '',
    issueId: r.issue_id,
    issueTitle: r.issue_title ?? '',
    coverImage: r.cover_image ?? '',
    amount: r.amount,
    method: r.method,
    status: r.status,
    createdAt: Number(r.created_at),
    paidAt: r.paid_at == null ? undefined : Number(r.paid_at),
    paidVia: r.paid_via ?? undefined,
    qpay: r.qpay ?? undefined,
  };
}

// --- Prices (admin)
export async function getIssuePrices(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('issue_prices').select('issue_id, price');
  if (error) throw error;
  return new Map((data || []).map(r => [r.issue_id as string, r.price as number]));
}

export async function setIssuePrice(issue: Pick<Magazine, 'id' | 'title'>, price: number | null): Promise<void> {
  const { error } = price
    ? await supabase.from('issue_prices').upsert({ issue_id: issue.id, price, title: issue.title, updated_at: Date.now() })
    : await supabase.from('issue_prices').delete().eq('issue_id', issue.id);
  if (error) throw error;
}

// --- Bank transfer details shown on invoices (admin-editable)
// Admin-set account if there is one, otherwise the office's default account
// Payment details must never hang on a slow database, so give it 4 seconds.
export async function getBankSettings(): Promise<BankSettings> {
  if (!supabaseConfigured) return DEFAULT_BANK;
  try {
    const saved = await Promise.race([
      getSetting<BankSettings>('bank'),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 4000)),
    ]);
    return saved?.accountNumber ? saved : DEFAULT_BANK;
  } catch {
    return DEFAULT_BANK;
  }
}

export async function setBankSettings(settings: BankSettings): Promise<void> {
  await setSetting('bank', settings);
}

// --- Buyer side
async function api(path: string, init: RequestInit = {}) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

export type ReadAccess =
  | { kind: 'ok'; link: string }
  | { kind: 'login-required' | 'payment-required'; price: number }
  | { kind: 'not-found' | 'error' };

export async function getReadAccess(issueId: string): Promise<ReadAccess> {
  const { status, body } = await api(`/api/read/${encodeURIComponent(issueId)}`);
  if (status === 200 && body.heyzineLink) return { kind: 'ok', link: body.heyzineLink };
  if (status === 401) return { kind: 'login-required', price: body.price };
  if (status === 402) return { kind: 'payment-required', price: body.price };
  if (status === 404) return { kind: 'not-found' };
  return { kind: 'error' };
}

export async function findMyPurchase(uid: string, issueId: string): Promise<Purchase | null> {
  const { data, error } = await supabase
    .from('purchases')
    .select('*')
    .eq('user_id', uid)
    .eq('issue_id', issueId)
    .neq('status', 'cancelled');
  if (error) throw error;
  const purchases = (data || []).map(fromRow);
  // A paid purchase wins over a pending one
  return purchases.find(p => p.status === 'paid') || purchases[0] || null;
}

export async function createPurchase(
  issue: Magazine,
  method: PurchaseMethod,
  buyer: { uid: string; phone: string }
): Promise<Purchase> {
  // Amount, owner and status are set by a database trigger from issue_prices
  const { data, error } = await supabase
    .from('purchases')
    .insert({
      id: generateCode(),
      user_id: buyer.uid,
      phone: buyer.phone,
      issue_id: issue.id,
      issue_title: issue.title,
      cover_image: issue.coverImage,
      amount: issue.price ?? 0,
      method,
    })
    .select()
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function switchPurchaseMethod(purchaseId: string, method: PurchaseMethod): Promise<void> {
  const { error } = await supabase.rpc('set_purchase_method', { p_id: purchaseId, p_method: method });
  if (error) throw error;
}

export function watchPurchase(id: string, onChange: (p: Purchase | null) => void): () => void {
  return watchTable(
    'purchases',
    async () => {
      const { data, error } = await supabase.from('purchases').select('*').eq('id', id).maybeSingle();
      if (error) console.error('Purchase watch failed:', error.message);
      else onChange(data ? fromRow(data) : null);
    },
    `id=eq.${id}`
  );
}

export function watchMyPurchases(uid: string, onChange: (p: Purchase[]) => void): () => void {
  return watchTable(
    'purchases',
    async () => {
      const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });
      if (error) console.error('Purchases watch failed:', error.message);
      else onChange((data || []).map(fromRow));
    },
    `user_id=eq.${uid}`
  );
}

export type QPayStart =
  | { kind: 'ok'; invoice: QPayInvoiceInfo; sandbox: boolean }
  | { kind: 'unavailable' | 'error' };

export async function startQPay(purchaseId: string): Promise<QPayStart> {
  const { status, body } = await api(`/api/purchases/${purchaseId}/qpay`, { method: 'POST' });
  if (status === 200) return { kind: 'ok', invoice: body, sandbox: !!body.sandbox };
  if (status === 503) return { kind: 'unavailable' };
  return { kind: 'error' };
}

export async function checkQPay(purchaseId: string): Promise<'paid' | 'pending' | 'error'> {
  const { status, body } = await api(`/api/purchases/${purchaseId}/check`, { method: 'POST' });
  return status === 200 && (body.status === 'paid' || body.status === 'pending') ? body.status : 'error';
}

// --- Admin
export function watchAllPurchases(onChange: (p: Purchase[]) => void, onError: (e: Error) => void): () => void {
  return watchTable('purchases', async () => {
    const { data, error } = await supabase.from('purchases').select('*').order('created_at', { ascending: false });
    if (error) onError(new Error(error.message));
    else onChange((data || []).map(fromRow));
  });
}

export async function adminSetPurchaseStatus(id: string, status: 'paid' | 'cancelled' | 'pending'): Promise<void> {
  const { error } = await supabase
    .from('purchases')
    .update(status === 'paid' ? { status, paid_at: Date.now(), paid_via: 'admin' } : { status })
    .eq('id', id);
  if (error) throw error;
}
