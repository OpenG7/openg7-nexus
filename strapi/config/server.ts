import type { Core } from '@strapi/strapi';

interface Env {
  (key: string, defaultValue?: any): any;
  int(key: string, defaultValue?: number): number;
  bool(key: string, defaultValue?: boolean): boolean;
  array(key: string, defaultValue?: string[]): string[];
}

interface ConfigContext {
  env: Env;
}

export default ({ env }: ConfigContext) =>
  ({
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    url: env('PUBLIC_URL'),
    app: {
      // Clés nécessaires pour signer les cookies / sessions
      keys: env.array('APP_KEYS', ['appKeyA', 'appKeyB']),
    },
    proxy: env.bool('SERVER_USE_PROXY', true),
  }) satisfies Core.Config.Server;
