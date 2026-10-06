// Admin overview («Тойм»): sign-ins, today's orders, what's paid and what's
// waiting, revenue, and reader opens. Also the endpoint that records an open.
import crypto from 'node:crypto';
import type express from 'express';
import { admin, isAdminUser, userIdFromToken } from './supabase.js';

type Helpers = { bearer: (req: express.Request) => string | null };

const DAY = 24 * 60 * 60 * 1000;
// Mongolia is UTC+8 all year; "today" starts at local midnight
const UB_OFFSET = 8 * 60 * 60 * 1000;
const startOfDay = (t: number) => Math.floor((t + UB_OFFSET) / DAY) * DAY - UB_OFFSET;

export function registerStatsRoutes(app: express.Express, { bearer }: Helpers) {
  // The reader reports each open; signed-in readers are linked to their account
  app.post('/api/views', async (req, res) => {
    try {
      if (!admin) return res.status(204).end();
      const issueId = String(req.body?.issueId || '').slice(0, 100);
      if (!issueId) return res.status(400).json({ error: 'issue-required' });
      const title = String(req.body?.title || '').slice(0, 300);
      const uid = await userIdFromToken(bearer(req));
      // Who is reading: the account, or a hash of the network address and
      // browser (never stored raw), so reloads can't inflate the count
      const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
      const viewer = uid || `v:${crypto.createHash('sha256').update(`${ip}|${req.headers['user-agent'] || ''}`).digest('hex').slice(0, 24)}`;
      const { data: recent, error: lookupError } = await admin
        .from('issue_views')
        .select('id')
        .eq('issue_id', issueId)
        .eq('viewer', viewer)
        .gte('viewed_at', Date.now() - 30 * 60 * 1000)
        .limit(1);
      if (!lookupError && recent?.length) return res.status(204).end();
      // Before migration 0012 there is no viewer column; count without it
      const { error } = await admin.from('issue_views').insert({ issue_id: issueId, title, user_id: uid, ...(lookupError ? {} : { viewer }) });
      if (error) console.error('Recording a view failed:', error.message);
      return res.status(204).end();
    } catch {
      return res.status(204).end();
    }
  });

  app.get('/api/admin/stats', async (req, res) => {
    try {
      const uid = await userIdFromToken(bearer(req));
      if (!uid || !admin) return res.status(401).json({ error: 'login-required' });
      if (!(await isAdminUser(uid))) return res.status(403).json({ error: 'admin-only' });
      return res.json(await computeStats());
    } catch (error: any) {
      console.error('Stats failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });
}

// Everything on «Тойм», read with the service role
export async function computeStats() {
  if (!admin) throw new Error('Supabase is not configured');
  const now = Date.now();
  const today = startOfDay(now);
  const week = today - 6 * DAY;
  const month = today - 29 * DAY;

  const users: any[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const [profiles, purchases, subs, catalog, prints, views] = await Promise.all([
    admin.from('profiles').select('id, last_name, first_name'),
    admin.from('purchases').select('id, issue_title, amount, paid_amount, status, method, created_at, paid_at, phone'),
    admin.from('subscription_orders').select('id, full_name, plan, price, payment_status, created_at'),
    admin.from('catalog_orders').select('code, full_name, quantity, unit_price, delivery_fee, status, payment_status, created_at'),
    admin.from('orders').select('id, total_price, payment_status, created_at'),
    admin.from('issue_views').select('issue_id, title, viewed_at').gte('viewed_at', month),
  ]);
  const rows = (r: { data: any[] | null }) => r.data || [];
  const names = new Map(rows(profiles).map(p => [p.id, [p.last_name, p.first_name].filter(Boolean).join(' ')]));

  const signIn = (u: any) => (u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0);
  const created = (u: any) => (u.created_at ? Date.parse(u.created_at) : 0);

  const catalogTotal = (o: any) => (o.unit_price || 0) * (o.quantity || 0) + (o.delivery_fee || 0);
  const since = (list: any[], key: string, from: number) => list.filter(o => Number(o[key]) >= from);

  const p = rows(purchases);
  const s = rows(subs);
  const c = rows(catalog);
  const o = rows(prints);
  const v = views.error ? null : rows(views);

  // Revenue counts what's confirmed paid, on the day it was ordered
  const revenue = (from: number) =>
    since(p.filter(x => x.status === 'paid'), 'created_at', from).reduce((n, x) => n + (x.paid_amount || x.amount || 0), 0) +
    since(s.filter(x => x.payment_status === 'paid'), 'created_at', from).reduce((n, x) => n + (x.price || 0), 0) +
    since(c.filter(x => x.payment_status === 'paid'), 'created_at', from).reduce((n, x) => n + catalogTotal(x), 0) +
    since(o.filter(x => x.payment_status === 'paid'), 'created_at', from).reduce((n, x) => n + (x.total_price || 0), 0);

  const ordersSince = (from: number) => ({
    purchases: since(p, 'created_at', from).length,
    subscriptions: since(s, 'created_at', from).length,
    catalog: since(c, 'created_at', from).length,
    prints: since(o, 'created_at', from).length,
  });

  // The last 14 days, oldest first, for the daily bars
  const days = Array.from({ length: 14 }, (_, i) => {
    const from = today - (13 - i) * DAY;
    const to = from + DAY;
    const inDay = (list: any[], key: string) => list.filter(x => Number(x[key]) >= from && Number(x[key]) < to).length;
    return {
      day: from,
      orders: inDay(p, 'created_at') + inDay(s, 'created_at') + inDay(c, 'created_at') + inDay(o, 'created_at'),
      views: v ? inDay(v, 'viewed_at') : 0,
      signIns: users.filter(u => signIn(u) >= from && signIn(u) < to).length,
    };
  });

  const topIssues = v
    ? [...v.reduce((m, x) => m.set(x.issue_id, { title: x.title || x.issue_id, count: (m.get(x.issue_id)?.count || 0) + 1 }), new Map<string, { title: string; count: number }>()).values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
    : [];

  return {
    generatedAt: now,
    users: {
      total: users.length,
      signedInToday: users.filter(u => signIn(u) >= today).length,
      signedInWeek: users.filter(u => signIn(u) >= week).length,
      newToday: users.filter(u => created(u) >= today).length,
      newWeek: users.filter(u => created(u) >= week).length,
      recent: users
        .filter(u => signIn(u))
        .sort((a, b) => signIn(b) - signIn(a))
        .slice(0, 10)
        .map(u => ({
          phone: u.phone ? `+${String(u.phone).replace(/^\+/, '')}` : '',
          email: u.email || '',
          name: names.get(u.id) || '',
          at: signIn(u),
          isNew: created(u) >= today,
        })),
    },
    orders: {
      today: ordersSince(today),
      week: ordersSince(week),
      // Waiting on the office: unpaid or not yet confirmed
      waiting: {
        purchases: p.filter(x => x.status === 'pending').length,
        subscriptions: s.filter(x => x.payment_status === 'pending').length,
        catalog: c.filter(x => x.status === 'new' || x.payment_status === 'unpaid').filter(x => x.status !== 'cancelled').length,
        prints: o.filter(x => x.payment_status === 'pending').length,
      },
      paid: {
        purchases: p.filter(x => x.status === 'paid').length,
        subscriptions: s.filter(x => x.payment_status === 'paid').length,
        catalog: c.filter(x => x.payment_status === 'paid').length,
        prints: o.filter(x => x.payment_status === 'paid').length,
      },
    },
    revenue: { today: revenue(today), week: revenue(week), month: revenue(month) },
    views: v
      ? { today: v.filter(x => x.viewed_at >= today).length, week: v.filter(x => x.viewed_at >= week).length, month: v.length, topIssues }
      : null,
    days,
    recentPurchases: [...p]
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 6)
      .map(x => ({ id: x.id, title: x.issue_title, amount: x.amount, status: x.status, method: x.method, at: Number(x.created_at), phone: x.phone })),
  };
}
