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
