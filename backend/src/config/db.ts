import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool directly with PostgreSQL (in Docker or local service)
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'document_repo',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err: Error) => {
  console.error('[PostgreSQL] Unexpected idle client error:', err.message);
});

/**
 * Execute a parameterized query safely
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SQL Query] duration: ${duration}ms | rows: ${res.rowCount}`);
  }
  return res;
}

/**
 * Acquire a transactional client
 */
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

/**
 * Test database connectivity
 */
export async function testConnection(): Promise<{ connected: boolean; database?: string; timestamp?: string; error?: string }> {
  try {
    const res = await pool.query('SELECT NOW() as now, current_database() as db');
    return {
      connected: true,
      database: res.rows[0].db,
      timestamp: res.rows[0].now,
    };
  } catch (error: any) {
    return {
      connected: false,
      error: error.message,
    };
  }
}

/**
 * Ensure database schema & initial seed data are populated
 */
export async function initializeDatabaseSchema(): Promise<void> {
  try {
    const initSqlPath = path.resolve(__dirname, '../../../database/init.sql');
    if (fs.existsSync(initSqlPath)) {
      const sql = fs.readFileSync(initSqlPath, 'utf8');
      await pool.query(sql);
      console.log('[PostgreSQL] Schema and seed data successfully verified/initialized.');
    } else {
      console.warn('[PostgreSQL] init.sql not found at:', initSqlPath);
    }
  } catch (err: any) {
    console.error('[PostgreSQL] Schema initialization warning:', err.message);
  }
}

export default {
  pool,
  query,
  getClient,
  testConnection,
  initializeDatabaseSchema,
};
