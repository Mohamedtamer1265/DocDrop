import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

export const redisClient = createClient({
  url: `redis://${REDIS_HOST}:${REDIS_PORT}`,
  socket: {
    // Keep retrying in background every 5s so Redis can reconnect when started later
    reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
  },
});

let isRedisReady = false;

// Fix 2: Set flag on 'ready' (when client is authenticated & can process commands)
redisClient.on('ready', () => {
  isRedisReady = true;
  console.log('[Redis] Cache server is ready and connected.');
});

redisClient.on('end', () => {
  isRedisReady = false;
});

redisClient.on('error', () => {
  isRedisReady = false;
});

// Non-blocking initial connect
(async () => {
  try {
    await redisClient.connect();
  } catch {
    isRedisReady = false;
  }
})();

export async function getCached<T>(key: string): Promise<T | null> {
  if (!isRedisReady) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function setCached(key: string, value: any, ttlSeconds: number = 60): Promise<void> {
  if (!isRedisReady) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch {
    // Fail-safe: cache write error does not block the request
  }
}

// Fix 1: Use non-blocking SCAN iterator instead of blocking KEYS
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (!isRedisReady) return;
  try {
    const keysToDelete: string[] = [];
    for await (const key of redisClient.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      keysToDelete.push(key);
    }
    if (keysToDelete.length > 0) {
      await redisClient.del(keysToDelete);
    }
  } catch {
    // Fail-safe: cache invalidation error does not block the request
  }
}

export default {
  redisClient,
  getCached,
  setCached,
  invalidateCachePattern,
};
