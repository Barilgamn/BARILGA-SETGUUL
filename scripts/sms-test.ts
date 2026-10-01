// Send one test SMS through the configured operator gateway:
//   npm run sms:test -- 99112233
import 'dotenv/config';
import { otpMessage, sendSms, smsConfigured } from '../server/sms';

const to = process.argv[2];
if (!to) {
  console.error('Хэрэглээ: npm run sms:test -- 99112233');
  process.exit(1);
}
if (!smsConfigured()) {
  console.error('.env дотор SMS_GATEWAY_URL тохируулаагүй байна.');
  process.exit(1);
}
sendSms(to, otpMessage('123456'))
  .then(reply => console.log(`Илгээлээ → ${to}. Утсаа шалгана уу.\nGateway-ийн хариу: ${reply.slice(0, 300)}`))
  .catch(err => {
    console.error('Илгээж чадсангүй:', err.message);
    process.exit(1);
  });
