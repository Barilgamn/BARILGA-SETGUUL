// All /api routes. Imported by server.ts for local development and by
// api/index.ts as the Vercel serverless function.
import express from 'express';
import { PDFDocument } from 'pdf-lib';
import cors from 'cors';
import { admin, isAdminUser, loadIssuePrices, loadMagazineRows, userIdFromToken, userOwnsIssue } from './supabase.js';
import { createInvoice, paidAmount, QPAY_IS_SANDBOX } from './qpay.js';
import { otpMessage, sendSms, verifySupabaseHook } from './sms.js';

const app = express();

app.use(cors());

// Supabase Auth "Send SMS" hook: Supabase generates the login code and asks us
// to deliver it through the operator gateway. Registered before express.json()
// because the signature is computed over the raw body.
app.post('/api/auth/send-sms', express.raw({ type: '*/*' }), async (req, res) => {
  // The signature covers the exact bytes Supabase sent. On Vercel this only
  // works with NODEJS_HELPERS=0; otherwise its helpers consume the stream and
  // hand us an already-parsed object.
  const rawBody = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : typeof req.body === 'string' ? req.body : '';
  if (!verifySupabaseHook(rawBody, req.headers)) {
    console.error('Send SMS hook rejected:', {
      secretConfigured: !!process.env.SUPABASE_SMS_HOOK_SECRET,
      bodyType: Buffer.isBuffer(req.body) ? 'buffer' : typeof req.body,
      hasSignature: !!req.headers['webhook-signature'],
    });
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

// Hand-added magazines (admin «Сэтгүүл нэмэх»). A digital price above zero
// makes the issue paid. Same short cache as prices so admin edits show quickly.
let magazineCache: { at: number; rows: any[] } | null = null;

async function loadMagazines(): Promise<any[]> {
  if (magazineCache && Date.now() - magazineCache.at < PRICE_CACHE_MS) return magazineCache.rows;
  const rows = await loadMagazineRows();
  magazineCache = { at: Date.now(), rows };
  return rows;
}

// Heyzine flipbooks are keyed by the first 10 hex digits of their file hash:
// it's in the flipbook link, the cover and the PDF address alike.
function flipbookKey(...urls: string[]): string | null {
  for (const url of urls) {
    const m = String(url || '').match(/(?:flip-book\/(?:cover\/)?|uploaded\/v3\/)([0-9a-f]{10})/i);
    if (m) return m[1].toLowerCase();
  }
  return null;
}

// Paid issues leave the server without anything that leads to the flipbook:
// no link, no PDF, and the cover through our proxy, since Heyzine's cover
// address contains the flipbook id.
const coverProxy = (id: string) => `/api/cover/${encodeURIComponent(id)}`;

function publicMagazine(row: any) {
  const price = Number(row.price_digital) > 0 ? Number(row.price_digital) : 0;
  const out = { ...row, locked: price > 0, price };
  return price ? { ...out, heyzine_link: '', pdf_url: '', cover_image: row.cover_image ? coverProxy(row.id) : '' } : out;
}

app.get('/api/magazines', async (_req, res) => {
  try {
    res.json((await loadMagazines()).map(publicMagazine));
  } catch (error: any) {
    console.error('Listing magazines failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/magazines/:id', async (req, res) => {
  try {
    const row = (await loadMagazines()).find(r => r.id === req.params.id);
    if (!row) return res.status(404).json({ error: 'not-found' });
    res.json(publicMagazine(row));
  } catch (error: any) {
    console.error('Loading magazine failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/heyzine/flipbooks', async (_req, res) => {
  try {
    const [items, prices, rows] = await Promise.all([loadFlipbooks(), loadPrices(), loadMagazines().catch(() => [])]);
    // A flipbook that was also added by hand is listed once, as the magazine,
    // so its price can't be dodged through the Heyzine copy
    const handAdded = new Set(rows.map(r => flipbookKey(r.heyzine_link, r.cover_image)).filter(Boolean));
    return res.json(
      items
        .filter(item => !handAdded.has(flipbookKey(item.heyzineLink, item.coverImage)))
        .map(item => {
          const price = prices.get(item.id);
          return price
            ? { ...item, price, locked: true, heyzineLink: '', pdfUrl: '', coverImage: item.coverImage ? coverProxy(item.id) : '' }
            : item;
        })
    );
  } catch (error: any) {
    console.error('Server error listing Heyzine flipbooks:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// What an issue id stands for: the id purchases are recorded against, its
// price (0 = free) and the real flipbook link and cover.
async function resolveIssue(
  id: string
): Promise<{ issueId: string; price: number; link: string; cover: string; pdf: string } | null> {
  const rows = await loadMagazines();
  const fromRow = (row: any) => ({
    issueId: row.id,
    price: Number(row.price_digital) > 0 ? Number(row.price_digital) : 0,
    link: row.heyzine_link || '',
    cover: row.cover_image || '',
    pdf: row.pdf_url || pdfBesideThumb(row.cover_image),
  });
  if (!id.startsWith('hz-')) {
    const row = rows.find(r => r.id === id);
    return row ? fromRow(row) : null;
  }
  const [items, prices] = await Promise.all([loadFlipbooks(), loadPrices()]);
  const item = items.find(i => i.id === id);
  if (!item) return null;
  const key = flipbookKey(item.heyzineLink, item.coverImage);
  const row = key && rows.find(r => flipbookKey(r.heyzine_link, r.cover_image) === key);
  if (row) return fromRow(row);
  return { issueId: item.id, price: prices.get(item.id) || 0, link: item.heyzineLink, cover: item.coverImage, pdf: item.pdfUrl };
}

// Heyzine keeps the uploaded PDF next to its thumbnail: ".../<hash>.pdf-thumb.jpg"
function pdfBesideThumb(cover: string): string {
  return String(cover || '').match(/^(https:\/\/cdnm?\.heyzine\.com\/files\/uploaded\/.+\.pdf)-thumb\.jpg$/)?.[1] || '';
}

app.get('/api/cover/:id', async (req, res) => {
  try {
    const issue = await resolveIssue(req.params.id);
    if (!issue?.cover || !/^https:\/\//i.test(issue.cover)) return res.status(404).end();
    const upstream = await fetch(issue.cover);
    if (!upstream.ok) return res.status(502).end();
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error: any) {
    console.error('Cover proxy failed:', error.message);
    res.status(502).end();
  }
});

// Admin helper: given a Heyzine flipbook link, return its title and cover so
// the "add magazine" form fills itself. Our cached account list has the most
// detail; links from elsewhere fall back to Heyzine's public oEmbed.
app.get('/api/heyzine/lookup', async (req, res) => {
  const url = String(req.query.url || '').trim();
  if (!/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'url-required' });
  try {
    const shortId = url.match(/flip-book\/([0-9a-f]{10})/i)?.[1]?.toLowerCase();
    if (shortId) {
      const items = await loadFlipbooks().catch(() => []);
      const item = items.find((i: any) => String(i.heyzineLink).toLowerCase().includes(shortId));
      if (item) {
        return res.json({
          title: item.title,
          issueNumber: item.issueNumber !== item.title ? item.issueNumber : '',
          coverImage: item.coverImage,
          pages: item.pages,
          category: item.category,
          heyzineLink: item.heyzineLink,
        });
      }
    }
    const oembed = await fetch(`https://heyzine.com/api1/oembed?url=${encodeURIComponent(url)}&format=json`);
    const data: any = await oembed.json().catch(() => null);
    if (!oembed.ok || !data?.thumbnail_url) return res.status(404).json({ error: 'not-found' });
    return res.json({ title: data.title || '', coverImage: data.thumbnail_url, heyzineLink: url });
  } catch (error: any) {
    console.error('Heyzine lookup failed:', error.message);
    return res.status(502).json({ error: 'lookup-failed' });
  }
});


// Free first pages of any issue, paid ones included. The page preview can't be
// given the real PDF of a paid issue, so the first pages are copied into a
// small PDF of their own, stored once in a public Storage bucket, and the
// client is handed that file's address.
const PREVIEW_PAGES = 6;
const PREVIEW_BUCKET = 'previews';
let previewBucketReady = false;

async function ensurePreviewBucket() {
  if (previewBucketReady || !admin) return;
  const { error } = await admin.storage.getBucket(PREVIEW_BUCKET);
  if (error) {
    const created = await admin.storage.createBucket(PREVIEW_BUCKET, { public: true });
    if (created.error && !/already exists/i.test(created.error.message)) throw created.error;
  }
  previewBucketReady = true;
}

app.get('/api/preview/:id', async (req, res) => {
  try {
    const issue = await resolveIssue(req.params.id);
    if (!issue?.pdf || !admin) return res.status(404).json({ error: 'no-preview' });

    // The flipbook key in the name means a replaced PDF gets a fresh preview
    const path = `${issue.issueId}-${flipbookKey(issue.pdf, issue.link, issue.cover) || 'pdf'}.pdf`;
    const url = admin.storage.from(PREVIEW_BUCKET).getPublicUrl(path).data.publicUrl;

    const existing = await fetch(url, { method: 'HEAD' });
    if (!existing.ok) {
      const source = await fetch(issue.pdf);
      if (!source.ok) return res.status(502).json({ error: 'pdf-unavailable' });
      const full = await PDFDocument.load(await source.arrayBuffer(), { ignoreEncryption: true });
      const preview = await PDFDocument.create();
      const count = Math.min(PREVIEW_PAGES, full.getPageCount());
      const pages = await preview.copyPages(full, Array.from({ length: count }, (_, i) => i));
      pages.forEach(page => preview.addPage(page));
      const bytes = await preview.save();

      await ensurePreviewBucket();
      const { error } = await admin.storage
        .from(PREVIEW_BUCKET)
        .upload(path, bytes, { contentType: 'application/pdf', upsert: true, cacheControl: '31536000' });
      if (error) throw error;
    }
    res.set('Cache-Control', 'public, max-age=300, s-maxage=3600');
    return res.json({ url });
  } catch (error: any) {
    console.error('Preview failed:', error);
    return res.status(500).json({ error: 'preview-failed' });
  }
});

app.get('/api/read/:id', async (req, res) => {
  try {
    const issue = await resolveIssue(req.params.id);
    if (!issue) return res.status(404).json({ error: 'not-found' });
    if (!issue.price) return res.json({ heyzineLink: issue.link });

    const uid = await userIdFromToken(bearer(req));
    if (!uid) return res.status(401).json({ error: 'login-required', price: issue.price });
    const allowed = (await userOwnsIssue(uid, issue.issueId)) || (await isAdminUser(uid));
    if (!allowed) return res.status(402).json({ error: 'payment-required', price: issue.price });
    return res.json({ heyzineLink: issue.link });
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
