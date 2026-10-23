import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  socket: {
    reconnectStrategy: (retries: number) => {
      // Reconnect after 3 seconds, max 5 attempts
      if (retries > 5) {
        return false;
      }
      return 3000;
    },
  },
});

let isRedisConnected = false;

redisClient.on('connect', () => {
  isRedisConnected = true;
  console.log('[Redis] Connected successfully to cache server.');
});

redisClient.on('error', (err: Error) => {
  isRedisConnected = false;
  // Non-fatal warning: redis is optional in POC
});

// Attempt initial connection without crashing if Redis isn't running
(async () => {
  try {
    await redisClient.connect();
  } catch (err: any) {
    // Redis optional fallback
    isRedisConnected = false;
  }
})();

export async function getCached<T>(key: string): Promise<T | null> {
  if (!isRedisConnected) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  if (!isRedisConnected) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Ignore cache failure
  }
}

export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!isRedisConnected) return;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch {
    // Ignore cache failure
  }
}

export default {
  redisClient,
  getCached,
  setCached,
  invalidateCachePattern,
};
