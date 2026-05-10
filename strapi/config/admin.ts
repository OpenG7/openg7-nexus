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

interface AdminConfigWithSecrets extends Core.Config.Admin {
  secrets: {
    encryptionKey: string;
  };
  watchIgnoreFiles?: string[];
}

export default ({ env }: ConfigContext) =>
  ({
    /**
     * Secret pour l'authentification de l'admin (Strapi en a déjà généré un dans .env: JWT_SECRET)
     */
    auth: {
      secret: env('ADMIN_JWT_SECRET', env('JWT_SECRET', 'change-me-admin-jwt')),
    },

    /**
     * Sel utilisé pour générer les API Tokens
     */
    apiToken: {
      salt: env('API_TOKEN_SALT', 'change-me-api-token-salt'),
    },

    /**
     * Optionnel mais propre : sel pour les tokens de transfert (import/export)
     */
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT', 'change-me-transfer-token-salt'),
      },
    },

    /**
     * Utilise par le service d'encryption admin (tokens/champs sensibles internes).
     */
    secrets: {
      encryptionKey: env('ADMIN_ENCRYPTION_KEY', 'change-me-admin-encryption-key'),
    },

    watchIgnoreFiles: [
      '**/data/**/*.sqlite',
      '**/data/**/*.sqlite-*',
      '**/data/**/*.db',
      '**/data/**/*.db-*',
    ],
  }) satisfies AdminConfigWithSecrets;
