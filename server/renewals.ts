// Renewal reminders for print subscriptions, by SMS and email: 14 days
// before the end («soon»), 3 days before («last») and once it has ended
// («ended», within a week). Each stage goes out once per subscription, and
// not at all if the subscriber has already ordered again.
//
// Runs daily from Vercel Cron (vercel.json → /api/cron/renewals, guarded by
// CRON_SECRET); admins can preview and send by hand from «Багц захиалга».
import type express from 'express';
import { admin, isAdminUser, userIdFromToken } from './supabase.js';
import { sendSms } from './sms.js';
import { allowSms } from './smsGuard.js';
import { emailConfigured, renewalEmail, sendEmails } from './email.js';

type Helpers = { bearer: (req: express.Request) => string | null; appUrl: (req: express.Request) => string };
type Stage = 'soon' | 'last' | 'ended';

const DAY = 24 * 60 * 60 * 1000;
const UB_OFFSET = 8 * 60 * 60 * 1000;

const PLAN_NAMES: Record<string, string> = {
  quarterly: 'улирлын багц (3 дугаар)',
  'half-year': 'хагас жилийн багц (6 дугаар)',
  yearly: 'жилийн багц (12 дугаар)',
};
// SMS stays in Latin letters: Cyrillic halves what fits in one message
const PLAN_SMS: Record<string, string> = { quarterly: 'uliral', 'half-year': 'hagas jil', yearly: 'jil' };

const digits8 = (phone: string) => String(phone || '').replace(/\D/g, '').slice(-8);
const ubDate = (ms: number) => {
  const d = new Date(ms + UB_OFFSET);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${String(d.getUTCDate()).padStart(2, '0')}`;
};

function stageFor(daysLeft: number): Stage | null {
  if (daysLeft <= 0 && daysLeft > -7) return 'ended';
  if (daysLeft > 0 && daysLeft <= 3) return 'last';
  if (daysLeft > 3 && daysLeft <= 14) return 'soon';
  return null;
}

export interface DueReminder {
  subscriptionId: string;
  stage: Stage;
  name: string;
  plan: string;
  endDate: number;
  daysLeft: number;
  phone: string;
  email: string;
}

// Who should get which reminder now
export async function findDueReminders(now = Date.now()): Promise<DueReminder[]> {
  if (!admin) return [];
  const [{ data: subs, error }, { data: sent }, { data: profiles }] = await Promise.all([
    admin.from('subscription_orders').select('id, user_id, plan, full_name, phone, email, payment_status, end_date, created_at'),
    admin.from('subscription_reminders').select('subscription_id, stage'),
    admin.from('profiles').select('id, email, email_verified'),
  ]);
  if (error) throw new Error(`subscription_orders: ${error.message}`);
  const done = new Set((sent || []).map(r => `${r.subscription_id}:${r.stage}`));
  const verifiedEmail = new Map((profiles || []).filter(p => p.email && p.email_verified).map(p => [p.id, p.email]));
  const all = subs || [];

  const due: DueReminder[] = [];
  for (const s of all) {
    if (s.payment_status !== 'paid' || s.end_date == null) continue;
    const daysLeft = Math.ceil((Number(s.end_date) - now) / DAY);
    const stage = stageFor(daysLeft);
    if (!stage || done.has(`${s.id}:${stage}`)) continue;
    // A later order from the same person (by account or phone) means they renewed
    const renewed = all.some(
      o =>
        o.id !== s.id &&
        o.payment_status !== 'failed' &&
        Number(o.created_at) > Number(s.created_at) &&
        ((s.user_id && o.user_id === s.user_id) || (digits8(s.phone).length === 8 && digits8(o.phone) === digits8(s.phone)))
    );
    if (renewed) continue;
    due.push({
      subscriptionId: s.id,
      stage,
      name: s.full_name || '',
      plan: s.plan,
      endDate: Number(s.end_date),
      daysLeft,
      phone: s.phone || '',
      email: (s.user_id && verifiedEmail.get(s.user_id)) || s.email || '',
    });
  }
  return due;
}

// Send what's due; each stage is claimed first so a rerun can't double-send
export async function sendDueReminders(base: string, now = Date.now()) {
  const due = await findDueReminders(now);
  const results: { subscriptionId: string; stage: Stage; sms: boolean; email: boolean }[] = [];
  for (const r of due) {
    const { error: claimed } = await admin!.from('subscription_reminders').insert({ subscription_id: r.subscriptionId, stage: r.stage });
    if (claimed) continue;

    const renewLink = `${base}/subscribe?plan=${r.plan}`;
    let sms = false;
    let email = false;

    const check = await allowSms(r.phone, 'other');
    if (check.ok) {
      const text =
        r.stage === 'ended'
          ? `Barilga MN setguul: tany ${PLAN_SMS[r.plan] || ''} zahialga duussan. Sungah: ${renewLink}`
          : `Barilga MN setguul: tany ${PLAN_SMS[r.plan] || ''} zahialga ${ubDate(r.endDate)}-nd duusna. Sungah: ${renewLink}`;
      sms = await sendSms(check.phone, text).then(
        () => true,
        err => (console.error('Renewal SMS failed:', err.message), false)
      );
    }

    if (r.email && /^\S+@\S+\.\S+$/.test(r.email) && emailConfigured()) {
      const { sent } = await sendEmails([
        renewalEmail({
          to: r.email,
          base,
          name: r.name,
          planName: PLAN_NAMES[r.plan] || 'захиалга',
          endDate: ubDate(r.endDate),
          ended: r.stage === 'ended',
          daysLeft: Math.max(r.daysLeft, 0),
          renewLink,
        }),
      ]).catch(err => (console.error('Renewal email failed:', err.message), { sent: 0 }));
      email = sent > 0;
    }

    await admin!.from('subscription_reminders').update({ sms, email }).eq('subscription_id', r.subscriptionId).eq('stage', r.stage);
    results.push({ subscriptionId: r.subscriptionId, stage: r.stage, sms, email });
  }
  return results;
}

export function registerRenewalRoutes(app: express.Express, { bearer, appUrl }: Helpers) {
  // Vercel Cron sends «Authorization: Bearer <CRON_SECRET>»
  app.get('/api/cron/renewals', async (req, res) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || bearer(req) !== secret) return res.status(401).json({ error: 'unauthorized' });
    try {
      const sent = await sendDueReminders(appUrl(req));
      console.log('Renewal reminders sent:', sent.length);
      return res.json({ sent: sent.length, results: sent });
    } catch (error: any) {
      console.error('Renewal cron failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });

  const adminOnly = async (req: express.Request, res: express.Response) => {
    const uid = await userIdFromToken(bearer(req));
    if (!uid || !admin) {
      res.status(401).json({ error: 'login-required' });
      return false;
    }
    if (!(await isAdminUser(uid))) {
      res.status(403).json({ error: 'admin-only' });
      return false;
    }
    return true;
  };

  // Admin preview: who is due, and what went out lately
  app.get('/api/admin/renewals', async (req, res) => {
    try {
      if (!(await adminOnly(req, res))) return;
      const [due, { data: recent }] = await Promise.all([
        findDueReminders(),
        admin!.from('subscription_reminders').select('*').order('sent_at', { ascending: false }).limit(30),
      ]);
      return res.json({ due, recent: recent || [], cron: !!process.env.CRON_SECRET, email: emailConfigured() });
    } catch (error: any) {
      console.error('Renewal preview failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });

  app.post('/api/admin/renewals', async (req, res) => {
    try {
      if (!(await adminOnly(req, res))) return;
      const sent = await sendDueReminders(appUrl(req));
      return res.json({ sent: sent.length, results: sent });
    } catch (error: any) {
      console.error('Renewal send failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });
}
