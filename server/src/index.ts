import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import exportRoutes from './routes/exportRoutes';
import integrationsRoutes from './routes/integrationsRoutes';
import recordsRoutes from './routes/recordsRoutes';
import weatherRoutes from './routes/weatherRoutes';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => res.status(200).json({ success: true, data: { ok: true } }));

app.use('/api/weather', weatherRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/integrations', integrationsRoutes);
app.use('/api/export', exportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  console.log(`[${new Date().toISOString()}] server listening on :${port}`);
});

