import { env } from './env';

export const appConfig = {
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  RUN_WORKERS: true,
  RUN_SCRIPTS: true
};
