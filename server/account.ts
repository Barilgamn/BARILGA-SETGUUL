// Account routes: changing the login phone (our own SMS code, then the auth
// record is updated with the service role), new-issue email alerts sent by an
// admin, and the admin's list of users by last sign-in.
import crypto from 'node:crypto';
import type express from 'express';
import { admin, isAdminUser, loadMagazineRows, userIdFromToken } from './supabase.js';
import { sendSms } from './sms.js';
import { emailConfigured, newIssueEmail, sendEmails } from './email.js';

type Helpers = {
  bearer: (req: express.Request) => string | null;
  appUrl: (req: express.Request) => string;
};

const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;

// Mongolian mobile numbers: 8 digits, optionally written with +976
export function normalizeMnPhone(input: string): string | null {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('976')) digits = digits.slice(3);
  return /^[5-9]\d{7}$/.test(digits) ? `+976${digits}` : null;
}

const hashCode = (userId: string, code: string) =>
  crypto
    .createHash('sha256')
    .update(`${userId}:${code}:${process.env.SUPABASE_SERVICE_ROLE_KEY || ''}`)
    .digest('hex');

export function registerAccountRoutes(app: express.Express, { bearer, appUrl }: Helpers) {
  const signedIn = async (req: express.Request, res: express.Response) => {
    const uid = await userIdFromToken(bearer(req));
    if (!uid || !admin) {
      res.status(401).json({ error: 'login-required' });
      return null;
    }
    return uid;
  };
  const signedInAdmin = async (req: express.Request, res: express.Response) => {
    const uid = await signedIn(req, res);
    if (!uid) return null;
    if (!(await isAdminUser(uid))) {
      res.status(403).json({ error: 'admin-only' });
      return null;
    }
    return uid;
  };

  // 1. Send a code to the new number
  app.post('/api/account/phone/start', async (req, res) => {
    try {
      const uid = await signedIn(req, res);
      if (!uid) return;
      const phone = normalizeMnPhone(req.body?.phone);
      if (!phone) return res.status(400).json({ error: 'bad-phone' });

      const { data: current } = await admin!.auth.admin.getUserById(uid);
      if (current?.user?.phone && `+${current.user.phone.replace(/^\+/, '')}` === phone) {
        return res.status(400).json({ error: 'same-phone' });
      }
      const { data: pending } = await admin!.from('phone_changes').select('sent_at').eq('user_id', uid).maybeSingle();
      if (pending && Date.now() - Number(pending.sent_at) < RESEND_AFTER_MS) {
        return res.status(429).json({ error: 'wait', retryIn: Math.ceil((RESEND_AFTER_MS - (Date.now() - Number(pending.sent_at))) / 1000) });
      }

      const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
      const now = Date.now();
      const { error } = await admin!.from('phone_changes').upsert({
        user_id: uid,
        phone,
        code_hash: hashCode(uid, code),
        attempts: 0,
        sent_at: now,
        expires_at: now + CODE_TTL_MS,
      });
      if (error) throw error;
      await sendSms(phone, `Barilga.MN: utasny dugaar solih kod ${code}. 10 minutyn dotor oruulna uu.`);
      return res.json({ ok: true });
    } catch (error: any) {
      console.error('Phone change start failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });

  // 2. Check the code and move the login to the new number
  app.post('/api/account/phone/verify', async (req, res) => {
    try {
      const uid = await signedIn(req, res);
      if (!uid) return;
      const code = String(req.body?.code || '').replace(/\D/g, '');
      const { data: pending } = await admin!.from('phone_changes').select('*').eq('user_id', uid).maybeSingle();
      if (!pending || Date.now() > Number(pending.expires_at)) return res.status(410).json({ error: 'expired' });
      if (pending.attempts >= MAX_ATTEMPTS) return res.status(429).json({ error: 'too-many' });
      if (hashCode(uid, code) !== pending.code_hash) {
        await admin!.from('phone_changes').update({ attempts: pending.attempts + 1 }).eq('user_id', uid);
        return res.status(400).json({ error: 'wrong-code', left: MAX_ATTEMPTS - pending.attempts - 1 });
      }

      const { error } = await admin!.auth.admin.updateUserById(uid, { phone: pending.phone, phone_confirm: true });
      if (error) {
        // Supabase refuses a number another account already uses
        const taken = /already|registered|exists/i.test(error.message);
        return res.status(taken ? 409 : 500).json({ error: taken ? 'phone-taken' : 'failed' });
      }
      await admin!.from('profiles').upsert({ id: uid, phone: pending.phone }, { onConflict: 'id' });
      await admin!.from('phone_changes').delete().eq('user_id', uid);
      return res.json({ ok: true, phone: pending.phone });
    } catch (error: any) {
      console.error('Phone change verify failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });

  // New-issue alerts: how many would get one, and whether it went out already
  app.get('/api/admin/notify-issue/:id', async (req, res) => {
    try {
      if (!(await signedInAdmin(req, res))) return;
      const [{ count }, { data: sent }] = await Promise.all([
        admin!.from('profiles').select('id', { count: 'exact', head: true }).eq('notify_new_issue', true).neq('email', ''),
        admin!.from('issue_notifications').select('*').eq('issue_id', req.params.id).maybeSingle(),
      ]);
      return res.json({ subscribers: count || 0, sent: sent || null, emailReady: emailConfigured() });
    } catch (error: any) {
      console.error('Notify preview failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });

  app.post('/api/admin/notify-issue/:id', async (req, res) => {
    try {
      if (!(await signedInAdmin(req, res))) return;
      const id = req.params.id;
      const mag = (await loadMagazineRows()).find(r => r.id === id);
      if (!mag) return res.status(404).json({ error: 'not-found' });

      if (!emailConfigured()) return res.status(503).json({ error: 'email-not-configured' });

      // Claim the issue first, so a double click can't send twice
      const number = String(mag.issue_number || '').match(/\d+/)?.[0];
      const title = number ? `Барилга МН сэтгүүл №${number}` : String(mag.title || 'Барилга МН сэтгүүлийн шинэ дугаар');
      const { error: claimError } = await admin!.from('issue_notifications').insert({ issue_id: id, title });
      if (claimError) return res.status(409).json({ error: 'already-sent' });

      const { data: people, error } = await admin!
        .from('profiles')
        .select('email')
        .eq('notify_new_issue', true)
        .neq('email', '');
      if (error) throw error;
      const base = appUrl(req);
      const emails = [...new Set((people || []).map(p => String(p.email).trim().toLowerCase()))]
        .filter(e => /^\S+@\S+\.\S+$/.test(e))
        .map(to => newIssueEmail(to, title, mag.cover_image ? `${base}/api/cover/${id}` : '', `${base}/magazine/${id}`, `${base}/profile`));
      const { sent, failed } = await sendEmails(emails);
      await admin!.from('issue_notifications').update({ sent_count: sent, sent_at: Date.now() }).eq('issue_id', id);
      return res.json({ sent, failed, total: emails.length });
    } catch (error: any) {
      console.error('Notify issue failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });

  // Users, most recently signed in first
  app.get('/api/admin/users', async (req, res) => {
    try {
      if (!(await signedInAdmin(req, res))) return;
      const users: any[] = [];
      for (let page = 1; page <= 10; page++) {
        const { data, error } = await admin!.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        users.push(...data.users);
        if (data.users.length < 1000) break;
      }
      const [{ data: profiles }, { data: purchases }] = await Promise.all([
        admin!.from('profiles').select('id, last_name, first_name, email, notify_new_issue'),
        admin!.from('purchases').select('user_id').eq('status', 'paid'),
      ]);
      const profileById = new Map((profiles || []).map(p => [p.id, p]));
      const bought = new Map<string, number>();
      (purchases || []).forEach(p => bought.set(p.user_id, (bought.get(p.user_id) || 0) + 1));

      const rows = users
        .map(u => {
          const p: any = profileById.get(u.id) || {};
          return {
            id: u.id,
            phone: u.phone ? `+${String(u.phone).replace(/^\+/, '')}` : '',
            email: p.email || u.email || '',
            name: [p.last_name, p.first_name].filter(Boolean).join(' '),
            notify: !!p.notify_new_issue,
            purchases: bought.get(u.id) || 0,
            createdAt: u.created_at ? Date.parse(u.created_at) : null,
            lastSignInAt: u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : null,
          };
        })
        .sort((a, b) => (b.lastSignInAt || 0) - (a.lastSignInAt || 0));
      return res.json(rows);
    } catch (error: any) {
      console.error('Listing users failed:', error.message);
      return res.status(500).json({ error: 'failed' });
    }
  });
}
