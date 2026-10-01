// All /api routes. Imported by server.ts for local development and by
// api/index.ts as the Vercel serverless function.
import express from 'express';
import cors from 'cors';
import { admin, isAdminUser, loadIssuePrices, userIdFromToken, userOwnsIssue } from './supabase.js';
import { createInvoice, paidAmount, QPAY_IS_SANDBOX } from './qpay.js';
import { otpMessage, sendSms, verifySupabaseHook } from './sms.js';

const app = express();

app.use(cors());

// Supabase Auth "Send SMS" hook: Supabase generates the login code and asks us
// to deliver it through the operator gateway. Registered before express.json()
// because the signature is computed over the raw body.
app.post('/api/auth/send-sms', express.text({ type: '*/*' }), async (req, res) => {
  const rawBody = typeof req.body === 'string' ? req.body : '';
  if (!verifySupabaseHook(rawBody, req.headers)) {
    return res.status(401).json({ error: { http_code: 401, message: 'Invalid signature' } });
  }
  try {
    const payload = JSON.parse(rawBody);
    const phone: string = payload?.user?.phone || '';
    const code: string = payload?.sms?.otp || '';
    if (!phone || !code) return res.status(400).json({ error: { http_code: 400, message: 'Missing phone or code' } });
    await sendSms(phone, otpMessage(code));
    return res.json({});
  } catch (error: any) {
    console.error('Send SMS hook failed:', error.message);
    return res.status(500).json({ error: { http_code: 500, message: 'Could not send SMS' } });
  }
});

app.use(express.json());

function bearer(req: express.Request): string | null {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}


// Admin: convert a PDF URL into a Heyzine flipbook (Heyzine REST: POST
// /api1/rest with the client id). Admin-only: it spends the account's quota.
app.post('/api/magazines/heyzine', async (req, res) => {
  try {
    const uid = await userIdFromToken(bearer(req));
    if (!uid || !(await isAdminUser(uid))) return res.status(403).json({ error: 'admin-only' });

    const { pdfUrl, title } = req.body || {};
    if (!pdfUrl) return res.status(400).json({ error: 'PDF URL is required' });
    const clientId = process.env.HEYZINE_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'HEYZINE_CLIENT_ID is not configured' });

    const response = await fetch('https://heyzine.com/api1/rest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ pdf: pdfUrl, client_id: clientId, ...(title ? { title } : {}) }),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || data.error || !data.url) {
      console.error('Heyzine API Error:', data);
      return res.status(400).json({ error: data.error || data.msg || 'Failed to convert PDF via Heyzine API' });
    }
    heyzineCache = null; // the new flipbook should show up in the catalog
    return res.json({ ...data, link: data.url, thumbnail: data.thumbnail });
  } catch (error: any) {
    console.error('Server error creating Heyzine flipbook:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Heyzine flipbooks carry no tags, so the category comes from the title and
// subtitle. Rules run in order and the first match wins; anything unmatched is
// treated as a norm document, since most of the library is БНбД and their
// titles often omit the code. Cyrillic needs explicit boundaries: JS \b is ASCII-only.
const CYR_WORD = '(?<![а-яёөүa-z])';
const CYR_END = '(?![а-яёөүa-z])';
const CATEGORY_RULES: [string, RegExp][] = [
  ['magazine', /сэтгүүл|барилга\s*\.?\s*мн\s*№|^барилга\s*\.?мн/iu],
  ['blueprint', /каталог|жишиг загвар|альбом|\d+[,.]?\d*\s*[мm]2|хувийн (орон )?сууц|typical/iu],
  ['research', /судалгаа|тайлан|индекс|үнийн өсөлт|marketing|маркетинг|жишиг үнэ/iu],
  ['standard', new RegExp(`${CYR_WORD}MNS${CYR_END}|стандарт|ерөнхий шаардлага|тавих шаардлага|тавигдах шаардлага`, 'iu')],
  ['norm', /БНбД|БНиД|СНиП|ГОСТ|норм|дүрэм|журам|техникийн зохицуулалт|заавар|аргачлал|зураг төсөл|правила|нормы/iu],
  ['book', new RegExp(`эрчим хүчний хэмнэл(т|ттэй)|дулаалга|танилцуулга|эмхэтгэл|гарын авлага|толь|guide|expo|бодлого|төсөв${CYR_END}|${CYR_WORD}ном${CYR_END}|ярилцлага|үзэсгэлэн`, 'iu')],
];

function categorize(title: string, subtitle: string): string {
  const text = `${title} | ${subtitle}`;
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return category;
  }
  return 'norm';
}

// Heyzine flipbook list — shows every flipbook in the Heyzine account on the site.
// Cached briefly so each page view doesn't hit the Heyzine API.
let heyzineCache: { at: number; items: any[] } | null = null;
const HEYZINE_CACHE_MS = 5 * 60 * 1000;

async function loadFlipbooks(): Promise<any[]> {
  const heyzineApiKey = process.env.HEYZINE_API_KEY;
  if (!heyzineApiKey || heyzineApiKey === 'MY_HEYZINE_API_KEY') {
    throw new Error('Heyzine API key is not configured');
  }
  if (heyzineCache && Date.now() - heyzineCache.at < HEYZINE_CACHE_MS) return heyzineCache.items;

  const response = await fetch('https://heyzine.com/api1/flipbook-list', {
    headers: {
      'Authorization': `Bearer ${heyzineApiKey}`,
      'Accept': 'application/json'
    }
  });
  const data = await response.json();
  if (!response.ok || !Array.isArray(data)) {
    console.error('Heyzine list error:', data);
    throw new Error('Failed to list Heyzine flipbooks');
  }

  const items = data
    .map((fb: any) => ({ ...fb, title: String(fb.title || '').trim() || String(fb.subtitle || '').trim() }))
    // Untitled flipbooks can't be found or recognised by readers
    .filter((fb: any) => fb.title)
    .map((fb: any) => ({
      // Flipbook ids end in ".pdf"; strip it so the id is safe in SPA routes.
      id: `hz-${String(fb.id).replace(/\.pdf$/, '')}`,
      title: fb.title,
      description: fb.description || fb.subtitle || '',
      coverImage: fb.links?.thumbnail || '',
      heyzineLink: fb.links?.custom || fb.links?.base || '',
      pdfUrl: fb.links?.pdf || '',
      pages: fb.pages,
      publishedDate: fb.date ? new Date(fb.date).getTime() : Date.now(),
      issueNumber: fb.subtitle || '',
      format: 'both',
      category: categorize(fb.title, String(fb.subtitle || '')),
      source: 'heyzine'
    }));

  heyzineCache = { at: Date.now(), items };
  return items;
}

// Paid-issue prices set in the admin panel (issue_prices). Short cache so a
// price change reaches readers within half a minute.
let priceCache: { at: number; prices: Map<string, number> } | null = null;
const PRICE_CACHE_MS = 30 * 1000;

async function loadPrices(): Promise<Map<string, number>> {
  if (priceCache && Date.now() - priceCache.at < PRICE_CACHE_MS) return priceCache.prices;
  const prices = await loadIssuePrices();
  priceCache = { at: Date.now(), prices };
  return prices;
}

app.get('/api/heyzine/flipbooks', async (_req, res) => {
  try {
    const [items, prices] = await Promise.all([loadFlipbooks(), loadPrices()]);
    // Paid issues go out without their flipbook or PDF links; /api/read hands
    // the link only to buyers.
    return res.json(
      items.map(item => {
        const price = prices.get(item.id);
        return price ? { ...item, price, locked: true, heyzineLink: '', pdfUrl: '' } : item;
      })
    );
  } catch (error: any) {
    console.error('Server error listing Heyzine flipbooks:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});


app.get('/api/read/:id', async (req, res) => {
  try {
    const [items, prices] = await Promise.all([loadFlipbooks(), loadPrices()]);
    const item = items.find(i => i.id === req.params.id);
    if (!item) return res.status(404).json({ error: 'not-found' });

    const price = prices.get(item.id);
    if (!price) return res.json({ heyzineLink: item.heyzineLink });

    const uid = await userIdFromToken(bearer(req));
    if (!uid) return res.status(401).json({ error: 'login-required', price });
    if (!(await userOwnsIssue(uid, item.id))) return res.status(402).json({ error: 'payment-required', price });
    return res.json({ heyzineLink: item.heyzineLink });
  } catch (error: any) {
    console.error('Read access check failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// --- QPay. Purchases are created by the buyer (rules pin the amount to the
// admin price); only the server may mark one paid, after QPay confirms it.
function appUrl(req: express.Request): string {
  return process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
    ? process.env.APP_URL.replace(/\/$/, '')
    : `${req.protocol}://${req.get('host')}`;
}

async function markPaidIfQPayPaid(purchaseId: string): Promise<'paid' | 'pending' | 'not-found'> {
  if (!admin) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  const { data: purchase, error } = await admin.from('purchases').select('*').eq('id', purchaseId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!purchase) return 'not-found';
  if (purchase.status === 'paid') return 'paid';
  if (purchase.status !== 'pending' || !purchase.qpay?.invoiceId) return 'pending';

  const paid = await paidAmount(purchase.qpay.invoiceId);
  if (paid < purchase.amount) return 'pending';
  const { error: updateError } = await admin
    .from('purchases')
    .update({ status: 'paid', paid_at: Date.now(), paid_via: 'qpay', paid_amount: paid })
    .eq('id', purchaseId)
    .eq('status', 'pending');
  if (updateError) throw new Error(updateError.message);
  return 'paid';
}

async function ownPurchase(req: express.Request, res: express.Response) {
  if (!admin) {
    res.status(503).json({ error: 'qpay-unavailable' });
    return null;
  }
  const uid = await userIdFromToken(bearer(req));
  if (!uid) {
    res.status(401).json({ error: 'login-required' });
    return null;
  }
  const { data: purchase } = await admin.from('purchases').select('*').eq('id', req.params.id).maybeSingle();
  if (!purchase || purchase.user_id !== uid) {
    res.status(404).json({ error: 'not-found' });
    return null;
  }
  return { purchase };
}

app.post('/api/purchases/:id/qpay', async (req, res) => {
  try {
    const owned = await ownPurchase(req, res);
    if (!owned) return;
    const { purchase } = owned;
    if (purchase.status !== 'pending') return res.status(409).json({ error: 'not-pending', status: purchase.status });
    // One QPay invoice per purchase; reopening the page shows the same QR
    if (purchase.qpay?.invoiceId) return res.json({ ...purchase.qpay, sandbox: QPAY_IS_SANDBOX });

    const invoice = await createInvoice({
      senderInvoiceNo: req.params.id,
      amount: purchase.amount,
      description: `${purchase.issue_title} (${req.params.id})`.slice(0, 250),
      callbackUrl: `${appUrl(req)}/api/qpay/callback?purchase=${req.params.id}`,
    });
    const { error: saveError } = await admin!.from('purchases').update({ method: 'qpay', qpay: invoice }).eq('id', req.params.id);
    if (saveError) throw new Error(saveError.message);
    return res.json({ ...invoice, sandbox: QPAY_IS_SANDBOX });
  } catch (error: any) {
    console.error('QPay invoice creation failed:', error);
    return res.status(502).json({ error: 'qpay-failed' });
  }
});

app.post('/api/purchases/:id/check', async (req, res) => {
  try {
    const owned = await ownPurchase(req, res);
    if (!owned) return;
    return res.json({ status: await markPaidIfQPayPaid(req.params.id) });
  } catch (error: any) {
    console.error('QPay payment check failed:', error);
    return res.status(502).json({ error: 'qpay-failed' });
  }
});

// QPay calls this when an invoice is paid. It carries nothing we trust: we
// only use it as a cue to ask QPay ourselves.
app.all('/api/qpay/callback', async (req, res) => {
  const purchaseId = String(req.query.purchase || '');
  if (/^[A-Z0-9]{8}$/.test(purchaseId)) {
    try {
      await markPaidIfQPayPaid(purchaseId);
    } catch (error) {
      console.error('QPay callback handling failed:', error);
    }
  }
  res.status(200).send('SUCCESS');
});

export default app;
