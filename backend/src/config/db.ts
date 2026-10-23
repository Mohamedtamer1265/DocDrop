import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

// Create connection pool directly with PostgreSQL (in Docker or local service)
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
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
 * Ensure database schema & initial seed data are populated, and apply migrations
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

    // Auto-migrate column constraints if table already existed with older VARCHAR(50)
    await pool.query(`
      ALTER TABLE document_versions ALTER COLUMN file_type TYPE VARCHAR(255);
      ALTER TABLE document_versions ALTER COLUMN file_size TYPE BIGINT;
      ALTER TABLE documents ALTER COLUMN title TYPE VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Editor (Upload & View)';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS can_upload BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS can_view BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      INSERT INTO users (full_name, email, department_id, role, can_upload, can_view, is_admin)
      SELECT 'EEMW Admin', 'admin@docdrop.internal', NULL, 'System Admin', TRUE, TRUE, TRUE
      WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@docdrop.internal');
      UPDATE users SET role = 'System Admin', can_upload = TRUE, can_view = TRUE, is_admin = TRUE WHERE email = 'admin@docdrop.internal';
      CREATE TABLE IF NOT EXISTS document_activity_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        actor_name VARCHAR(255) NOT NULL DEFAULT 'System',
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_activity_logs_doc_id ON document_activity_logs(document_id);
    `).catch(() => {
      // Table might not exist yet or columns already updated
    });
  } catch (err: any) {
    console.error('[PostgreSQL] Schema initialization warning:', err.message);
  }
}

/**
 * Reset and clear all documents and versions (keeps users, departments, and tags)
 */
export async function clearAllDocuments(): Promise<void> {
  try {
    await pool.query('TRUNCATE TABLE documents CASCADE');
    console.log('[PostgreSQL] All documents and versions cleared.');
  } catch (err: any) {
    console.error('[PostgreSQL] Error clearing documents:', err.message);
  }
}

export default {
  pool,
  query,
  getClient,
  testConnection,
  initializeDatabaseSchema,
};
