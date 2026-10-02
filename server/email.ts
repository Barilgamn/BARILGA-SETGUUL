// Outgoing email through Resend (https://resend.com). Needs RESEND_API_KEY and
// EMAIL_FROM, e.g. "Барилга.МН <order@barilga.mn>" on a domain verified in Resend.
// Replies go to the office's order address.
const REPLY_TO = 'order@barilga.mn';

export function emailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Resend's batch endpoint takes up to 100 messages a call
export async function sendEmails(emails: Email[]): Promise<{ sent: number; failed: number }> {
  if (!emailConfigured()) throw new Error('Email is not configured (RESEND_API_KEY, EMAIL_FROM)');
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const batch = emails.slice(i, i + 100);
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(batch.map(e => ({ from: process.env.EMAIL_FROM, reply_to: REPLY_TO, ...e }))),
    });
    if (res.ok) sent += batch.length;
    else {
      failed += batch.length;
      console.error('Resend batch failed:', res.status, await res.text().catch(() => ''));
    }
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
