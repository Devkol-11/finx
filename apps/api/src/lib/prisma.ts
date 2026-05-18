import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

declare global {
  var __finxPrisma__: PrismaClient | undefined;
}

const prismaAdapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

export const prisma =
  globalThis.__finxPrisma__ ??
  new PrismaClient({
    adapter: prismaAdapter,
    log:
      env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

if (env.NODE_ENV !== "production") {
  globalThis.__finxPrisma__ = prisma;
}
