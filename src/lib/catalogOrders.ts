import { supabase } from './supabase';
import { getSetting, setSetting, watchTable } from './db';
import { CatalogOrder, CatalogOrderStatus, CatalogPaymentStatus } from '../types';

export const STATUS_LABELS: Record<CatalogOrderStatus, string> = {
  new: 'Шинэ',
  confirmed: 'Баталгаажсан',
  shipped: 'Хүргэлтэд гарсан',
  delivered: 'Хүлээлгэн өгсөн',
  cancelled: 'Цуцлагдсан',
};

export const STATUS_STYLES: Record<CatalogOrderStatus, string> = {
  new: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  shipped: 'bg-violet-100 text-violet-800',
  delivered: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-stone-200 text-stone-600',
};

export const STATUS_FLOW: CatalogOrderStatus[] = ['new', 'confirmed', 'shipped', 'delivered'];

export const PAYMENT_LABELS: Record<CatalogPaymentStatus, string> = {
  unpaid: 'Төлөөгүй',
  paid: 'Төлсөн',
};

export const DISTRICTS = [
  'Баянзүрх', 'Сүхбаатар', 'Чингэлтэй', 'Хан-Уул', 'Баянгол',
  'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай', 'Орон нутаг',
];

// No 0/O, 1/I/L so codes survive being read out over the phone
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

export function formatCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function orderTotal(order: Pick<CatalogOrder, 'unitPrice' | 'quantity' | 'deliveryFee'>): number | null {
  return order.unitPrice == null ? null : order.unitPrice * order.quantity + (order.deliveryFee || 0);
}

function fromRow(r: any): CatalogOrder {
  return {
    code: r.code,
    productId: r.product_id ?? '',
    productTitle: r.product_title ?? '',
    quantity: r.quantity,
    unitPrice: r.unit_price ?? null,
    deliveryFee: r.delivery_fee ?? 0,
    fullName: r.full_name ?? '',
    phone: r.phone ?? '',
    deliveryMethod: r.delivery_method,
    district: r.district ?? '',
    address: r.address ?? '',
    note: r.note ?? '',
    status: r.status,
    paymentStatus: r.payment_status,
    adminNote: r.admin_note ?? '',
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export interface CatalogPricing {
  price: number | null;
  deliveryFee: number;
}

export async function getCatalogPricing(): Promise<CatalogPricing> {
  const value = await getSetting<{ price?: number | null; deliveryFee?: number }>('house_catalog');
  return {
    price: typeof value?.price === 'number' ? value.price : null,
    deliveryFee: typeof value?.deliveryFee === 'number' ? value.deliveryFee : 0,
  };
}

export async function setCatalogPricing(pricing: CatalogPricing): Promise<void> {
  await setSetting('house_catalog', pricing);
}

export type NewCatalogOrder = Pick<
  CatalogOrder,
  'productId' | 'productTitle' | 'quantity' | 'fullName' | 'phone' | 'deliveryMethod' | 'district' | 'address' | 'note'
>;

export async function createCatalogOrder(input: NewCatalogOrder): Promise<CatalogOrder> {
  const code = generateCode();
  // No .select(): the public may create an order but not read the table.
  // Price, status and timestamps are set by a database trigger.
  const { error } = await supabase.from('catalog_orders').insert({
    code,
    product_id: input.productId,
    product_title: input.productTitle,
    quantity: input.quantity,
    full_name: input.fullName,
    phone: input.phone,
    delivery_method: input.deliveryMethod,
    district: input.district,
    address: input.address,
    note: input.note,
  });
  if (error) throw error;
  const stored = await getCatalogOrder(code);
  return { ...input, ...stored!, fullName: input.fullName, phone: input.phone, note: input.note, code };
}

// Public lookup by code (get_catalog_order hides name, phone and notes)
export async function getCatalogOrder(code: string): Promise<CatalogOrder | null> {
  const { data, error } = await supabase.rpc('get_catalog_order', { p_code: normalizeCode(code) });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? fromRow(row) : null;
}

export function watchCatalogOrders(
  onChange: (orders: CatalogOrder[]) => void,
  onError: (err: Error) => void
): () => void {
  return watchTable('catalog_orders', async () => {
    const { data, error } = await supabase.from('catalog_orders').select('*').order('created_at', { ascending: false });
    if (error) onError(new Error(error.message));
    else onChange((data || []).map(fromRow));
  });
}

export async function updateCatalogOrder(
  code: string,
  changes: Partial<Pick<CatalogOrder, 'status' | 'paymentStatus' | 'adminNote' | 'unitPrice'>>
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (changes.status !== undefined) row.status = changes.status;
  if (changes.paymentStatus !== undefined) row.payment_status = changes.paymentStatus;
  if (changes.adminNote !== undefined) row.admin_note = changes.adminNote;
  if (changes.unitPrice !== undefined) row.unit_price = changes.unitPrice;
  const { error } = await supabase.from('catalog_orders').update(row).eq('code', code);
  if (error) throw error;
}
