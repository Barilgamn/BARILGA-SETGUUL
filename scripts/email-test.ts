// Sends one test email through the configured provider:
//   npm run email:test -- you@example.com
import 'dotenv/config';
import { emailConfigured, sendEmails } from '../server/email.ts';

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run email:test -- you@example.com');
  process.exit(1);
}
if (!emailConfigured()) {
  console.error('Set EMAIL_FROM and either SMTP_HOST/SMTP_USER/SMTP_PASS or MAILJET_API_KEY/MAILJET_SECRET_KEY in .env first.');
  process.exit(1);
}
const result = await sendEmails([
  {
    to,
    subject: 'Барилга.МН — туршилтын и-мэйл',
    text: 'Энэ бол Барилга.МН сайтаас илгээсэн туршилтын и-мэйл. Ирсэн бол тохиргоо зөв байна.',
    html: '<p>Энэ бол <b>Барилга.МН</b> сайтаас илгээсэн туршилтын и-мэйл.</p><p>Ирсэн бол тохиргоо зөв байна.</p>',
  },
]);
console.log(result.sent ? `Sent to ${to}` : 'Not sent', result);
