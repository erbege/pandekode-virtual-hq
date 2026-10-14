import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatWithNPC, tickNPC, getActiveAiConfig, setAiConfig, loadAiConfigFromDb, testAiConnection } from './chat.js';
import { initDb, getGameState, saveGameState, getKanbanData, saveKanbanData, getInfoBoard, saveInfoBoard } from './database.js';

dotenv.config(); // Memuat variabel .env (seperti OPENAI_API_KEY)

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Middleware
// Mengizinkan origin frontend lokal selama development
app.use(cors({
  origin: true, // Izinkan Vite dev server dan Electron desktop window
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json()); // Untuk parsing payload JSON

// Endpoint root
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PANDEKODE HQ API Server' });
});

// Database initialization & load active AI config
initDb().then(async () => {
  console.log('✅ SQLite Database Connected');
  await loadAiConfigFromDb();
}).catch(console.error);

// Endpoint API Game State
app.get('/api/state', async (req, res) => {
  try {
    const state = await getGameState();
    res.json(state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal memuat game state." });
  }
});

app.post('/api/state', async (req, res) => {
  try {
    await saveGameState(req.body);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Gagal menyimpan game state." });
  }
});

app.get('/api/kanban', async (req, res) => {
  try {
    const data = await getKanbanData();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat kanban." });
  }
});

app.post('/api/kanban', async (req, res) => {
  try {
    await saveKanbanData(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menyimpan kanban." });
  }
});

app.get('/api/infoboard', async (req, res) => {
  try {
    const data = await getInfoBoard();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Gagal memuat infoboard." });
  }
});

app.post('/api/infoboard', async (req, res) => {
  try {
    await saveInfoBoard(req.body);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Gagal menyimpan infoboard." });
  }
});

// Endpoint untuk AI Conversation (Manual via Chat)
app.post('/api/chat', async (req, res) => {
  const { sessionId = "guest-user", npcId = "alex", message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: "Pesan tidak boleh kosong." });
  }

  try {
    const result = await chatWithNPC(npcId, sessionId, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Gagal memproses pesan AI. Pastikan API key sudah diset di .env" });
  }
});

// Endpoint untuk AI Autonomous Tick (Game Loop)
app.post('/api/tick', async (req, res) => {
  const { sessionId = "guest-user", npcId = "alex", worldState } = req.body;
  
  try {
    const result = await tickNPC(npcId, sessionId, worldState);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Gagal menjalankan tick AI." });
  }
});

// Endpoint Konfigurasi AI Multi-Provider
app.get('/api/config/ai', (req, res) => {
  const config = getActiveAiConfig();
  const apiKey = config.apiKey || '';
  res.json({
    provider: config.provider || 'gemini',
    modelName: config.modelName || 'gemini-3.5-flash-lite',
    baseUrl: config.baseUrl || '',
    isKeyConfigured: Boolean(apiKey),
    maskedApiKey: apiKey.length > 8 ? `${apiKey.slice(0, 4)}••••${apiKey.slice(-4)}` : (apiKey ? '••••' : '')
  });
});

app.post('/api/config/ai', async (req, res) => {
  try {
    const { provider, apiKey, modelName, baseUrl } = req.body;
    const current = getActiveAiConfig();
    
    // Jangan hapus key jika pengguna hanya mengganti model/provider dan kolom key dikosongkan/di-mask
    let updatedKey = current.apiKey;
    if (apiKey !== undefined && apiKey !== '' && !apiKey.includes('••••')) {
      updatedKey = apiKey.trim();
    }

    const saved = await setAiConfig({
      provider: provider || current.provider,
      apiKey: updatedKey,
      modelName: modelName !== undefined ? modelName.trim() : current.modelName,
      baseUrl: baseUrl !== undefined ? baseUrl.trim() : current.baseUrl
    });

    res.json({
      success: true,
      message: 'Konfigurasi AI berhasil disimpan!',
      provider: saved.provider,
      modelName: saved.modelName,
      isKeyConfigured: Boolean(saved.apiKey)
    });
  } catch (err) {
    console.error("Gagal simpan konfigurasi AI:", err);
    res.status(500).json({ error: "Gagal menyimpan konfigurasi AI." });
  }
});

// Endpoint untuk Tes Koneksi AI
app.post('/api/config/ai/test', async (req, res) => {
  try {
    const result = await testAiConnection();
    res.json(result);
  } catch (err) {
    console.warn("Tes AI gagal:", err.message);
    res.status(400).json({ error: err.message || "Gagal menghubungi provider AI." });
  }
});

// Endpoint health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Jalankan server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server backend PANDEKODE HQ berjalan di http://localhost:${PORT}`);
});
