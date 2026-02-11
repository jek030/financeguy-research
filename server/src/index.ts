import express from 'express';
import { env } from './config/env';
import { corsMiddleware } from './middleware/cors';
import { healthRouter } from './routes/health';
import { earningsRouter } from './routes/earnings';

const app = express();

// Middleware
app.use(corsMiddleware);
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/earnings', earningsRouter);

// Start server
const port = parseInt(env.PORT, 10);

app.listen(port, () => {
  console.log(`[server] FinanceGuy API running on http://localhost:${port}`);
  console.log(`[server] Environment: ${env.NODE_ENV}`);
});

export default app;
