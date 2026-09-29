import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Heyzine API Integration Endpoint
app.post('/api/magazines/heyzine', async (req, res) => {
  try {
    const { pdfUrl, title } = req.body;
    
    if (!pdfUrl) {
      return res.status(400).json({ error: 'PDF URL is required' });
    }
    
    const heyzineApiKey = process.env.HEYZINE_API_KEY;
    if (!heyzineApiKey) {
      return res.status(500).json({ error: 'Heyzine API key is not configured' });
    }
    
    console.log('Sending to Heyzine:', { pdfUrl, title });
    
    // Using fetch to call Heyzine API
    // According to Heyzine docs, the endpoint is https://heyzine.com/api1/rest
    // The request can be GET or POST. Using GET with params per standard convention for simple rest calls on heyzine
    const heyzineUrl = new URL('https://heyzine.com/api1/rest');
    heyzineUrl.searchParams.append('pdf', pdfUrl);
    
    if (title) {
      heyzineUrl.searchParams.append('t', title);
    }
    
    const response = await fetch(heyzineUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${heyzineApiKey}`,
        'Accept': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      console.error('Heyzine API Error:', data);
      return res.status(400).json({ 
        error: data.error || 'Failed to convert PDF via Heyzine API',
        details: data
      });
    }
    
    console.log('Heyzine Success:', data);
    return res.json(data);
    
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
  ['blueprint', /жишиг загвар|альбом|\d+[,.]?\d*\s*[мm]2|хувийн (орон )?сууц|typical/iu],
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

app.get('/api/heyzine/flipbooks', async (_req, res) => {
  const heyzineApiKey = process.env.HEYZINE_API_KEY;
  if (!heyzineApiKey || heyzineApiKey === 'MY_HEYZINE_API_KEY') {
    return res.status(500).json({ error: 'Heyzine API key is not configured' });
  }

  if (heyzineCache && Date.now() - heyzineCache.at < HEYZINE_CACHE_MS) {
    return res.json(heyzineCache.items);
  }

  try {
    const response = await fetch('https://heyzine.com/api1/flipbook-list', {
      headers: {
        'Authorization': `Bearer ${heyzineApiKey}`,
        'Accept': 'application/json'
      }
    });
    const data = await response.json();

    if (!response.ok || !Array.isArray(data)) {
      console.error('Heyzine list error:', data);
      return res.status(502).json({ error: 'Failed to list Heyzine flipbooks', details: data });
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
    return res.json(items);
  } catch (error: any) {
    console.error('Server error listing Heyzine flipbooks:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Vite middleware for development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
