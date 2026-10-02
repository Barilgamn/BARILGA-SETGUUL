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

// Mail goes out under the magazine's name, from EMAIL_FROM's address
const SENDER_NAME = 'Барилга МН сэтгүүл';

function sender(): { Email: string; Name: string } {
  const from = String(process.env.EMAIL_FROM || '').trim();
  const m = from.match(/<([^>]+)>/);
  return { Name: SENDER_NAME, Email: (m ? m[1] : from).trim() };
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
            from: { name: from.Name, address: from.Email },
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

// The magazine's letterhead around every email: logo, a hidden preview line
// for inbox lists, the content, and the office's details at the foot.
function layout(opts: { base: string; preheader: string; body: string; footnote: string }): string {
  const { base, preheader, body, footnote } = opts;
  return `<!doctype html>
<html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Барилга МН сэтгүүл</title></head>
<body style="margin:0;padding:0;background:#f4f1ea;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escape(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-top:4px solid #0c0a09">
<tr><td style="padding:26px 32px 22px;border-bottom:1px solid #e7e5e4">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
<td><a href="${base}"><img src="${base}/images/barilga-mn-logo-email.png" width="150" alt="Барилга МН" style="display:block;width:150px;height:auto;border:0"></a></td>
<td align="right" style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1.5px;color:#78716c;text-transform:uppercase">Сэтгүүл · 2010 оноос</td>
</tr></table>
</td></tr>
${body}
<tr><td style="padding:22px 32px;background:#0c0a09;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:19px;color:#a8a29e">
<b style="color:#ffffff">Барилга МН сэтгүүл</b><br>
Улаанбаатар, Баянзүрх дүүрэг, 6-р хороо, 21-р сургуулийн баруун талд<br>
Утас: <a href="tel:+97691000233" style="color:#fbbf24;text-decoration:none">9100-0233</a> · <a href="mailto:order@barilga.mn" style="color:#fbbf24;text-decoration:none">order@barilga.mn</a>
</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:17px;color:#a8a29e">${footnote}</p>
</td></tr></table>
</body></html>`;
}

const button = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#0c0a09;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-weight:bold;font-size:15px;text-decoration:none;padding:15px 30px">${label}</a>`;

// «Барилга МН сэтгүүл №196 гарлаа»
export function newIssueEmail(opts: {
  to: string;
  base: string;
  title: string;
  description?: string;
  coverUrl: string;
  link: string;
}): Email {
  const { to, base, title, description, coverUrl, link } = opts;
  const t = escape(title);
  const blurb = description && description.trim() && description.trim() !== title ? escape(description.trim()) : 'Барилгын салбарын шинэ технологи, норм дүрэм, зах зээлийн үнэ ханшийн судалгаа — шинэ дугаарт.';
  const body = `
<tr><td style="padding:30px 32px 6px;font-family:Arial,Helvetica,sans-serif">
<p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#b45309">Шинэ дугаар гарлаа</p>
<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:36px;color:#0c0a09">${t}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:23px;color:#57534e">${blurb}</p>
</td></tr>
${coverUrl ? `<tr><td align="center" style="padding:0 32px 26px"><a href="${link}"><img src="${coverUrl}" width="300" alt="${t}" style="display:block;width:300px;max-width:100%;height:auto;border:0;box-shadow:0 18px 36px -18px rgba(0,0,0,.55)"></a></td></tr>` : ''}
<tr><td align="center" style="padding:0 32px 14px">${button(link, 'Сэтгүүлийг унших')}</td></tr>
<tr><td align="center" style="padding:0 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px">
<a href="${base}/tsahim-nomuud?category=magazine" style="color:#57534e">Өмнөх дугаарууд</a>
&nbsp;·&nbsp;
<a href="${base}/subscribe" style="color:#57534e">Хэвлэмэлээр захиалах</a>
</td></tr>`;
  return {
    to,
    subject: `${title} гарлаа`,
    text: `${title} гарлаа.\n\n${description || ''}\n\nУнших: ${link}\nӨмнөх дугаарууд: ${base}/tsahim-nomuud?category=magazine\n\nМэдэгдэл авахаа болих: ${base}/profile\n\nБарилга МН сэтгүүл · 9100-0233 · order@barilga.mn`,
    html: layout({
      base,
      preheader: `${title} гарлаа — одоо уншаарай.`,
      body,
      footnote: `Та барилга.мн дээрх «Миний мэдээлэл» хэсэгт шинэ дугаарын мэдэгдэл авахаар сонгосон тул энэ и-мэйлийг хүлээн авлаа. <a href="${base}/profile" style="color:#a8a29e">Мэдэгдэл авахаа болих</a>`,
    }),
  };
}

// The link that proves the reader owns the address
export function verifyEmail(opts: { to: string; base: string; link: string; name?: string }): Email {
  const { to, base, link, name } = opts;
  const hello = name ? `Сайн байна уу, ${escape(name)}.` : 'Сайн байна уу.';
  const body = `
<tr><td style="padding:32px 32px 8px;font-family:Arial,Helvetica,sans-serif">
<p style="margin:0 0 8px;font-size:12px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#b45309">И-мэйл баталгаажуулах</p>
<h1 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:32px;color:#0c0a09">И-мэйл хаягаа баталгаажуулна уу</h1>
<p style="margin:0 0 10px;font-size:15px;line-height:23px;color:#57534e">${hello}</p>
<p style="margin:0 0 26px;font-size:15px;line-height:23px;color:#57534e">Энэ хаягаар Барилга МН сэтгүүлийн шинэ дугаарын мэдэгдэл авахын тулд доорх товчийг дарна уу.</p>
</td></tr>
<tr><td style="padding:0 32px 22px">${button(link, 'И-мэйлээ баталгаажуулах')}</td></tr>
<tr><td style="padding:0 32px 32px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#78716c">
Товч ажиллахгүй бол энэ хаягийг хөтөч рүүгээ хуулна уу:<br><a href="${link}" style="color:#78716c;word-break:break-all">${link}</a><br><br>
Линк 24 цагийн дотор хүчинтэй. Та өөрөө хүсээгүй бол энэ и-мэйлийг тоохгүй өнгөрөөж болно.
</td></tr>`;
  return {
    to,
    subject: 'И-мэйл хаягаа баталгаажуулна уу — Барилга МН сэтгүүл',
    text: `${name ? `Сайн байна уу, ${name}.` : 'Сайн байна уу.'}\n\nИ-мэйл хаягаа баталгаажуулахын тулд энэ линкийг нээнэ үү (24 цаг хүчинтэй):\n${link}\n\nТа өөрөө хүсээгүй бол энэ и-мэйлийг тоохгүй өнгөрөөж болно.\n\nБарилга МН сэтгүүл · 9100-0233 · order@barilga.mn`,
    html: layout({
      base,
      preheader: 'Шинэ дугаарын мэдэгдэл авахын тулд и-мэйлээ баталгаажуулна уу.',
      body,
      footnote: `Энэ и-мэйлийг барилга.мн дээрх «Миний мэдээлэл» хэсэгт ${escape(to)} хаягийг оруулсан тул илгээлээ.`,
    }),
  };
}
