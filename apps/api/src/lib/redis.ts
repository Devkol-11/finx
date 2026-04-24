import { Redis } from "ioredis";
import { env } from "../config/env";

let redisApi: Redis;
let redisBullMq: Redis;

export const connectRedis = async (): Promise<void> => {
  redisApi = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 3) return null; // Stop retrying
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  await redisApi.connect();
  console.log("✅ Redis connected");

  redisApi.on("error", (err) => {
    console.error("Redis error:", err.message);
  });

  redisApi.on("connect", () => {
    console.log("✅ Redis connected");
  });
};

export const getRedisApi = (): Redis => {
  if (!redisApi) {
    throw new Error("Redis not initialized. Call connectRedis() first.");
  }
  return redisApi;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisApi) {
    await redisApi.quit();
    console.log("🔌 Redis disconnected");
  }
};

export const getRedisBullMq = () => {
  if (!redisBullMq) {
    redisBullMq = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => {
        return Math.min(times * 200, 2000); // never return null
      },
      lazyConnect: true,
    });
  }
  return redisBullMq;
};
