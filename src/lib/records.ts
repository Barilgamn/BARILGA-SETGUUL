// Supabase access for hand-added magazines, single-issue orders and
// subscription (багц) orders. Rows are snake_case; the app uses camelCase.
import { supabase } from './supabase';
import { Magazine, Order, SubscriptionOrder } from '../types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (id: string) => UUID.test(id);

// ------------------------------------------------------------ magazines
export function magazineFromRow(r: any): Magazine & { createdAt: number } {
  return {
    id: r.id,
    title: r.title,
    issueNumber: r.issue_number ?? '',
    category: r.category ?? 'magazine',
    description: r.description ?? '',
    coverImage: r.cover_image ?? '',
    pdfUrl: r.pdf_url ?? '',
    heyzineLink: r.heyzine_link ?? '',
    priceDigital: r.price_digital ?? 0,
    pricePrint: r.price_print ?? 0,
    publishedDate: Number(r.published_date ?? r.created_at),
    format: 'both',
    createdAt: Number(r.created_at),
    // Set by the server for issues with a digital price
    locked: !!r.locked,
    price: r.price || undefined,
  };
}

export type MagazineInput = Pick<
  Magazine,
  'title' | 'issueNumber' | 'category' | 'description' | 'coverImage' | 'pdfUrl' | 'heyzineLink' | 'priceDigital' | 'pricePrint'
>;

function magazineToRow(m: Partial<MagazineInput>) {
  const row: Record<string, unknown> = {};
  if (m.title !== undefined) row.title = m.title;
  if (m.issueNumber !== undefined) row.issue_number = m.issueNumber;
  if (m.category !== undefined) row.category = m.category;
  if (m.description !== undefined) row.description = m.description;
  if (m.coverImage !== undefined) row.cover_image = m.coverImage;
  if (m.pdfUrl !== undefined) row.pdf_url = m.pdfUrl;
  if (m.heyzineLink !== undefined) row.heyzine_link = m.heyzineLink;
  if (m.priceDigital !== undefined) row.price_digital = m.priceDigital;
  if (m.pricePrint !== undefined) row.price_print = m.pricePrint;
  return row;
}

// Public pages read magazines through the server, which leaves the flipbook
// link and PDF out of paid issues (the table itself is admin-only)
export async function listMagazines() {
  const res = await fetch('/api/magazines');
  if (!res.ok) throw new Error(`magazines: ${res.status}`);
  return ((await res.json()) as any[]).map(magazineFromRow);
}

// Detail/reader/checkout pages also see Heyzine ("hz-…") and seed ids; only
// uuids can be rows here, so skip the request for anything else.
export async function getMagazine(id: string) {
  if (!isUuid(id)) return null;
  const res = await fetch(`/api/magazines/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`magazine: ${res.status}`);
  return magazineFromRow(await res.json());
}

// Admin panel: the full rows, links included
export async function listAllMagazines() {
  const { data, error } = await supabase.from('magazines').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(magazineFromRow);
}

export async function addMagazine(m: MagazineInput) {
  const { data, error } = await supabase.from('magazines').insert(magazineToRow(m)).select().single();
  if (error) throw error;
  return magazineFromRow(data);
}

export async function updateMagazine(id: string, m: Partial<MagazineInput>) {
  const { error } = await supabase.from('magazines').update(magazineToRow(m)).eq('id', id);
  if (error) throw error;
}

export async function deleteMagazine(id: string) {
  const { error } = await supabase.from('magazines').delete().eq('id', id);
  if (error) throw error;
}

// ------------------------------------------------------------ single-issue orders
export function orderFromRow(r: any): Order & { magazineTitle: string } {
  return {
    id: r.id,
    userId: r.user_id,
    magazineId: r.magazine_id,
    magazineTitle: r.magazine_title ?? '',
    format: r.format,
    totalPrice: r.total_price,
    paymentStatus: r.payment_status,
    deliveryStatus: r.delivery_status,
    createdAt: Number(r.created_at),
    phoneNumber: r.phone ?? '',
    shippingAddress: r.shipping_address ?? undefined,
  };
}

export async function createOrder(input: {
  magazineId: string;
  format: Order['format'];
  phone: string;
  shippingAddress?: Order['shippingAddress'];
}) {
  // Price, owner and statuses come from a database trigger. Guests may order
  // but not read orders back, so the id is made here and nothing is selected.
  const id = crypto.randomUUID();
  const { error } = await supabase.from('orders').insert({
    id,
    magazine_id: input.magazineId,
    format: input.format,
    phone: input.phone,
    shipping_address: input.shippingAddress ?? null,
  });
  if (error) throw error;
  return { id };
}

export async function listMyOrders(uid: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(orderFromRow);
}

export async function listAllOrders() {
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(orderFromRow);
}

export async function updateOrder(id: string, changes: Partial<Pick<Order, 'paymentStatus' | 'deliveryStatus'>>) {
  const row: Record<string, unknown> = {};
  if (changes.paymentStatus) row.payment_status = changes.paymentStatus;
  if (changes.deliveryStatus) row.delivery_status = changes.deliveryStatus;
  const { error } = await supabase.from('orders').update(row).eq('id', id);
  if (error) throw error;
}

// ------------------------------------------------------------ subscription orders
export function subscriptionFromRow(r: any): SubscriptionOrder {
  return {
    id: r.id,
    userId: r.user_id ?? '',
    plan: r.plan,
    price: r.price,
    fullName: r.full_name,
    phone: r.phone ?? '',
    email: r.email ?? '',
    city: r.city ?? '',
    district: r.district ?? '',
    khoroo: r.khoroo ?? '',
    addressDetail: r.address_detail ?? '',
    placeType: r.place_type ?? 'home',
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    ebarimtType: r.ebarimt_type,
    companyName: r.company_name || undefined,
    registerNumber: r.register_number || undefined,
    paymentMethod: r.payment_method,
    paymentStatus: r.payment_status,
    deliveryStatus: r.delivery_status,
    createdAt: Number(r.created_at),
    startDate: r.start_date == null ? undefined : Number(r.start_date),
    endDate: r.end_date == null ? undefined : Number(r.end_date),
    digitalCode: r.digital_code || undefined,
  };
}

export type SubscriptionInput = Pick<
  SubscriptionOrder,
  | 'plan' | 'fullName' | 'phone' | 'email' | 'city' | 'district' | 'khoroo' | 'addressDetail' | 'placeType' | 'lat' | 'lng'
  | 'ebarimtType' | 'companyName' | 'registerNumber' | 'paymentMethod'
>;

function subscriptionToRow(s: Partial<SubscriptionOrder>) {
  const map: Record<string, string> = {
    plan: 'plan', price: 'price', fullName: 'full_name', phone: 'phone', email: 'email', city: 'city',
    district: 'district', khoroo: 'khoroo', addressDetail: 'address_detail', placeType: 'place_type', lat: 'lat', lng: 'lng', ebarimtType: 'ebarimt_type', companyName: 'company_name',
    registerNumber: 'register_number', paymentMethod: 'payment_method', paymentStatus: 'payment_status',
    deliveryStatus: 'delivery_status', digitalCode: 'digital_code', startDate: 'start_date', endDate: 'end_date',
  };
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (map[k] && v !== undefined) row[map[k]] = v;
  return row;
}

// Price and statuses are set by a database trigger for non-admins. Anyone may
// subscribe without an account; guests can't read the row back, so the id is
// made here (it numbers the invoice) and nothing is selected.
export async function createSubscription(input: SubscriptionInput) {
  const id = crypto.randomUUID();
  const { error } = await supabase.from('subscription_orders').insert({ id, ...subscriptionToRow(input) });
  if (error) throw error;
  return { id };
}

// Database refusals worded for buyers (see migration 0013)
export const isRateLimited = (err: unknown) => /RATE_LIMIT/.test(String((err as any)?.message || ''));

// Admin "Гараар шивэх": keeps the admin's values
export async function createManualSubscription(input: Partial<SubscriptionOrder>) {
  const { data, error } = await supabase.from('subscription_orders').insert(subscriptionToRow(input)).select().single();
  if (error) throw error;
  return subscriptionFromRow(data);
}

export async function listMySubscriptions(uid: string) {
  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .eq('user_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(subscriptionFromRow);
}

export async function listAllSubscriptions() {
  const { data, error } = await supabase
    .from('subscription_orders')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(subscriptionFromRow);
}

export async function updateSubscription(id: string, changes: Partial<SubscriptionOrder>) {
  const { error } = await supabase.from('subscription_orders').update(subscriptionToRow(changes)).eq('id', id);
  if (error) throw error;
}
