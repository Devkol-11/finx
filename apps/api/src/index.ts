import { buildApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";

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

    await app.listen({
      host: "0.0.0.0",
      port: env.PORT,
    });

    app.log.info(
      { port: env.PORT, environment: env.NODE_ENV },
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
    } catch {}

    process.exit(1);
  }
};

void bootstrap();
