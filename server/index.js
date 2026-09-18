import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchKielsaBranches } from './places.js';

const app = express();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

app.get('/api/branches', async (_request, response) => {
  try {
    const data = await fetchKielsaBranches(process.env.GOOGLE_MAPS_SERVER_KEY);
    response.json(data);
  } catch (error) {
    console.error('Error de Places:', error);
    response.status(error.message.startsWith('Falta ') ? 503 : 502).json({ error: error.message });
  }
});

app.use(express.static(dist));
app.get('/{*path}', (_request, response) => {
  response.sendFile(path.join(dist, 'index.html'));
});

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || '127.0.0.1';
app.listen(port, host, () => {
  console.log(`API Kielsa disponible en http://${host}:${port}`);
});
