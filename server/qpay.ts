// QPay merchant API v2. Defaults point at QPay's public sandbox and its
// published test merchant; production credentials come from .env.
const BASE_URL = process.env.QPAY_BASE_URL || 'https://merchant-sandbox.qpay.mn/v2';
const USERNAME = process.env.QPAY_USERNAME || 'TEST_MERCHANT';
const PASSWORD = process.env.QPAY_PASSWORD || '123456';
const INVOICE_CODE = process.env.QPAY_INVOICE_CODE || 'TEST_INVOICE';

export const QPAY_IS_SANDBOX = BASE_URL.includes('sandbox');

let cachedToken: { value: string; at: number } | null = null;
const TOKEN_TTL_MS = 30 * 60 * 1000;

async function token(): Promise<string> {
  if (cachedToken && Date.now() - cachedToken.at < TOKEN_TTL_MS) return cachedToken.value;
  const res = await fetch(`${BASE_URL}/auth/token`, {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64') },
  });
  const data: any = await res.json();
  if (!res.ok || !data.access_token) throw new Error(`QPay auth failed: ${res.status}`);
  cachedToken = { value: data.access_token, at: Date.now() };
  return data.access_token;
}

async function call(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) cachedToken = null;
    throw new Error(`QPay ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export interface QPayInvoice {
  invoiceId: string;
  qrImage: string;
  shortUrl: string;
  urls: { name: string; description?: string; logo?: string; link: string }[];
}

export async function createInvoice(opts: {
  senderInvoiceNo: string;
  amount: number;
  description: string;
  callbackUrl: string;
}): Promise<QPayInvoice> {
  const data = await call('/invoice', {
    invoice_code: INVOICE_CODE,
    sender_invoice_no: opts.senderInvoiceNo,
    invoice_receiver_code: 'terminal',
    invoice_description: opts.description,
    amount: opts.amount,
    callback_url: opts.callbackUrl,
  });
  return {
    invoiceId: data.invoice_id,
    qrImage: data.qr_image,
    shortUrl: data.qPay_shortUrl,
    urls: data.urls || [],
  };
}

// Sum of PAID payments on the invoice
export async function paidAmount(invoiceId: string): Promise<number> {
  const data = await call('/payment/check', {
    object_type: 'INVOICE',
    object_id: invoiceId,
    offset: { page_number: 1, page_limit: 100 },
  });
  return (data.rows || [])
    .filter((row: any) => row.payment_status === 'PAID')
    .reduce((sum: number, row: any) => sum + Number(row.payment_amount || 0), 0);
}
