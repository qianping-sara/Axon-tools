import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.warn("REDIS_URL is not set; dashboard cache will be disabled.");
}

let client: Redis | null = null;

export function getRedis(): Redis | null {
  if (!redisUrl) return null;
  if (!client) {
    client = new Redis(redisUrl, { maxRetriesPerRequest: null });
  }
  return client;
}

export const DASHBOARD_CACHE_KEY = "smart-proposal-dashboard:cache";
