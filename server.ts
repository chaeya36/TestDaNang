import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, 'db.json');

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize DB if not exists
const initDb = async () => {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify({ memo: "", checklist: null }));
  }
};

// API Routes
app.get('/api/memo', async (req, res) => {
  try {
    console.log('GET /api/memo');
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    console.log('Read data:', data);
    res.json({ memo: data.memo || "" });
  } catch (e) {
    console.error('Failed to read data:', e);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/memo', async (req, res) => {
  try {
    console.log('POST /api/memo', req.body);
    const { memo } = req.body;
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    data.memo = memo;
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    console.log('Saved data:', data);
    
    // Broadcast update to all connected clients
    broadcastMemo(memo);
    
    res.json({ success: true });
  } catch (e) {
    console.error('Failed to save data:', e);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.get('/api/checklist', async (req, res) => {
  try {
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    res.json({ checklist: data.checklist });
  } catch (e) {
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/checklist', async (req, res) => {
  try {
    const { checklist } = req.body;
    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
    data.checklist = checklist;
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', async (message) => {
    try {
      const parsed = JSON.parse(message.toString());
      if (parsed.type === 'UPDATE_MEMO') {
        const { memo } = parsed;
        // Save to DB
        const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
        data.memo = memo;
        await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
        
        // Broadcast to others
        broadcastMemo(memo, ws);
      }
    } catch (e) {
      console.error('WebSocket error:', e);
    }
  });
});

function broadcastMemo(memo: string, excludeWs?: WebSocket) {
  wss.clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'MEMO_UPDATED', memo }));
    }
  });
}

// Vite middleware
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
    hmr: {
        server: server
    }
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static('dist'));
}

initDb().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
