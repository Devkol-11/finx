import dotenv from 'dotenv';
import path from 'path';
import { defineConfig } from 'prisma/config';

// Resolve .env from this file's directory so it works regardless of CWD
// (e.g. running `pnpm --filter @finx/api db:migrate` from the repo root)
dotenv.config({ path: path.resolve(__dirname, '.env') });

const DATABASE_URL = process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/finx';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: DATABASE_URL
  }
});
