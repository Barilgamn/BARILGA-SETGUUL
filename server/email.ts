// Outgoing email. Two providers, picked by what's configured:
// - SMTP, e.g. the office's Google Workspace mailbox: SMTP_HOST=smtp.gmail.com,
//   SMTP_PORT=465, SMTP_USER=order@barilga.mn, SMTP_PASS=<app password>
//   (about 2,000 messages a day per mailbox)
// - Mailjet's Send API v3.1: MAILJET_API_KEY, MAILJET_SECRET_KEY
// Both need EMAIL_FROM, e.g. "Барилга.МН <order@barilga.mn>". Replies go to
// the office's order address.
import nodemailer from 'nodemailer';

const REPLY_TO = 'order@barilga.mn';

const smtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
const mailjetConfigured = () => !!(process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY);

export function emailConfigured(): boolean {
  return !!process.env.EMAIL_FROM && (smtpConfigured() || mailjetConfigured());
}

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// "Барилга.МН <order@barilga.mn>" → name and address
function sender(): { Email: string; Name?: string } {
  const from = String(process.env.EMAIL_FROM || '').trim();
  const m = from.match(/^(.*)<([^>]+)>$/);
  return m ? { Name: m[1].trim().replace(/^"|"$/g, '') || undefined, Email: m[2].trim() } : { Email: from };
}

export async function sendEmails(emails: Email[]): Promise<{ sent: number; failed: number }> {
  if (!emailConfigured()) throw new Error('Email is not configured (EMAIL_FROM plus SMTP_* or MAILJET_*)');
  return smtpConfigured() ? sendViaSmtp(emails) : sendViaMailjet(emails);
}

// One message per recipient (no shared To/Bcc), over a small pool of connections
async function sendViaSmtp(emails: Email[]): Promise<{ sent: number; failed: number }> {
  const port = Number(process.env.SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    // Google shows App Passwords in groups of four; the spaces aren't part of it
    auth: { user: process.env.SMTP_USER, pass: String(process.env.SMTP_PASS).replace(/\s+/g, '') },
    pool: true,
    maxConnections: 3,
  });
  const from = sender();
  let sent = 0;
  let failed = 0;
  try {
    for (let i = 0; i < emails.length; i += 3) {
      const results = await Promise.allSettled(
        emails.slice(i, i + 3).map(e =>
          transport.sendMail({
            from: from.Name ? { name: from.Name, address: from.Email } : from.Email,
            to: e.to,
            replyTo: REPLY_TO,
            subject: e.subject,
            text: e.text,
            html: e.html,
          })
        )
      );
      results.forEach(r => {
        if (r.status === 'fulfilled') sent++;
        else {
          failed++;
          console.error('SMTP send failed:', (r.reason as Error)?.message);
        }
      });
    }
  } finally {
    transport.close();
  }
  return { sent, failed };
}

// Mailjet takes up to 50 messages a call
async function sendViaMailjet(emails: Email[]): Promise<{ sent: number; failed: number }> {
  const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');
  const from = sender();
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += 50) {
    const batch = emails.slice(i, i + 50);
    const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Messages: batch.map(e => ({
          From: from,
          To: [{ Email: e.to }],
          ReplyTo: { Email: REPLY_TO },
          Subject: e.subject,
          TextPart: e.text,
          HTMLPart: e.html,
        })),
      }),
    });
    const body: any = await res.json().catch(() => null);
    // Each message reports its own Status, so one bad address doesn't sink the rest
    const statuses: string[] = Array.isArray(body?.Messages) ? body.Messages.map((m: any) => m.Status) : [];
    const ok = statuses.filter(s => s === 'success').length;
    sent += ok;
    failed += batch.length - ok;
    if (ok < batch.length) console.error('Mailjet send problems:', res.status, JSON.stringify(body?.Messages?.filter((m: any) => m.Status !== 'success') ?? body).slice(0, 2000));
  }
  return { sent, failed };
}

const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// The new-issue announcement
export function newIssueEmail(to: string, title: string, coverUrl: string, link: string, unsubscribe: string): Email {
  const t = escape(title);
  return {
    to,
    subject: `${title} гарлаа`,
    text: `${title} гарлаа.\n\nУнших: ${link}\n\nМэдэгдэл авахаа болих: ${unsubscribe}`,
    html: `<!doctype html><html><body style="margin:0;background:#faf8f4;font-family:Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:520px;background:#ffffff;border:1px solid #e7e5e4" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px;border-bottom:1px solid #1c1917;font-size:13px;font-weight:bold;letter-spacing:2px;color:#57534e">БАРИЛГА.МН · ЦАХИМ НОМЫН САН</td></tr>
<tr><td style="padding:28px">
<p style="margin:0 0 6px;font-size:13px;color:#b45309;font-weight:bold">Шинэ дугаар</p>
<h1 style="margin:0 0 20px;font-family:Georgia,serif;font-size:26px;line-height:1.2">${t}</h1>
${coverUrl ? `<a href="${link}"><img src="${coverUrl}" alt="${t}" width="220" style="display:block;width:220px;max-width:100%;border:0;margin:0 0 24px"></a>` : ''}
<a href="${link}" style="display:inline-block;background:#0c0a09;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 26px">Унших</a>
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c">
Та «Миний мэдээлэл» дээр шинэ дугаарын мэдэгдэл авахаар сонгосон тул энэ и-мэйлийг хүлээн авлаа.
<a href="${unsubscribe}" style="color:#78716c">Мэдэгдэл авахаа болих</a></td></tr>
</table></td></tr></table></body></html>`,
  };
}
