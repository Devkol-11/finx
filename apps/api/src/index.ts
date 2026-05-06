import { buildApp } from "./app";
import { appConfig } from "./config/app.config";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { connectRedis, disconnectRedis } from "./lib/redis";
import { startWorkers } from "./workers/worker-manager";

let shuttingDown = false;

const bootstrap = async (): Promise<void> => {
  const app = await buildApp();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    app.log.info({ signal }, "Graceful shutdown initiated.");

    try {
      await app.close();
      await prisma.$disconnect();
      await disconnectRedis();
      app.log.info({ signal }, "Application shutdown completed cleanly.");
      process.exit(0);
    } catch (error) {
      app.log.error({ err: error, signal }, "Graceful shutdown failed.");
      process.exit(1);
    }
  };

  try {
    await prisma.$connect();
    app.log.info("Prisma database connection established.");

    await connectRedis();
    app.log.info("Redis connection established.");

    if (appConfig.RUN_WORKERS) {
      await startWorkers();
    }

    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });

    app.log.info(
      { host: env.HOST, port: env.PORT, environment: env.NODE_ENV },
      "FINX API started successfully."
    );

    process.once("SIGINT", () => {
      void shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
      void shutdown("SIGTERM");
    });
  } catch (error) {
    app.log.fatal({ err: error }, "Application bootstrap failed.");

    try {
      await prisma.$disconnect();
      await disconnectRedis();
    } catch {}

    process.exit(1);
  }
};

void bootstrap();
