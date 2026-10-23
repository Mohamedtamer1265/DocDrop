import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { testConnection, query } from './config/db';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error.middleware';

const app: Application = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files directory
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database Connection Status & Verification Endpoint
app.get('/api/db-status', async (req: Request, res: Response) => {
  const dbStatus = await testConnection();
  if (!dbStatus.connected) {
    return res.status(503).json({
      status: 'error',
      message: 'Could not connect to PostgreSQL database.',
      details: dbStatus.error,
      config: {
        host: process.env.POSTGRES_HOST || 'localhost',
        port: process.env.POSTGRES_PORT || '5432',
        database: process.env.POSTGRES_DB || 'document_repo',
        user: process.env.POSTGRES_USER || 'postgres',
      },
    });
  }

  try {
    const [depts, users, tags, docs] = await Promise.all([
      query('SELECT COUNT(*) FROM departments'),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM tags'),
      query('SELECT COUNT(*) FROM documents'),
    ]);

    return res.status(200).json({
      status: 'success',
      database: dbStatus.database,
      serverTime: dbStatus.timestamp,
      counts: {
        departments: parseInt(depts.rows[0].count, 10),
        users: parseInt(users.rows[0].count, 10),
        tags: parseInt(tags.rows[0].count, 10),
        documents: parseInt(docs.rows[0].count, 10),
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'partial_success',
      message: 'Connected to database, but tables might need initialization.',
      error: err.message,
    });
  }
});

// Mount Main API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
