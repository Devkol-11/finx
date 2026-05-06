import { Redis } from "ioredis";
import { env } from "../config/env";

let redisApi: Redis | undefined;
let redisBullMq: Redis | undefined;

export const connectRedis = async (): Promise<void> => {
  redisApi = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
      if (times > 3) {
        return null;
      }

      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisApi.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  await redisApi.connect();
};

export const getRedisApi = (): Redis => {
  if (!redisApi) {
    throw new Error("Redis not initialized. Call connectRedis() first.");
  }

  return redisApi;
};

export const isRedisReady = (): boolean => redisApi?.status === "ready";

export const pingRedis = async (): Promise<boolean> => {
  if (!isRedisReady()) {
    return false;
  }

  return (await getRedisApi().ping()) === "PONG";
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisApi) {
    await redisApi.quit();
    redisApi = undefined;
  }

  if (redisBullMq) {
    await redisBullMq.quit();
    redisBullMq = undefined;
  }
};

export const getRedisBullMq = (): Redis => {
  if (!redisBullMq) {
    redisBullMq = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy: (times) => Math.min(times * 200, 2000),
      lazyConnect: true,
    });
  }

  return redisBullMq;
};
