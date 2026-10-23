import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { testConnection, initializeDatabaseSchema } from './config/db';

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  app.listen(PORT, async () => {
    console.log(`[DocDrop API] Server running on http://localhost:${PORT}`);
    console.log(`[DocDrop API] Health status: http://localhost:${PORT}/api/health`);
    console.log(`[DocDrop API] Database status: http://localhost:${PORT}/api/db-status`);

    // Verify PostgreSQL connection
    const dbStatus = await testConnection();
    if (dbStatus.connected) {
      console.log(`[DocDrop API] Connected to PostgreSQL database "${dbStatus.database}".`);
      await initializeDatabaseSchema();
    } else {
      console.warn(`[DocDrop API] PostgreSQL connection warning: ${dbStatus.error}`);
      console.warn(
        `[DocDrop API] Tried ${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}. ` +
          `Ensure the Docker PostgreSQL container is running: "docker-compose up -d"`
      );
    }
  });
}

bootstrap().catch((err) => {
  console.error('[DocDrop API] Failed to start server:', err);
  process.exit(1);
});
