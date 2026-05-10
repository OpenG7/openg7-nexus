import type { Core } from '@strapi/strapi';

import {
  createSessionForUser,
  extractSessionTokenClaims,
  issueSessionJwt,
  validateSessionForToken,
} from '../../utils/auth-sessions';

type AuthController = Record<string, (...args: any[]) => Promise<any> | any>;

const AUTH_RESPONSE_ACTIONS = [
  'callback',
  'register',
  'changePassword',
  'resetPassword',
  'emailConfirmation',
] as const;

let runtimeStrapi: Core.Strapi | null = null;

function mapSessionValidationError(reason: string | null): string {
  if (reason === 'idle-timeout') {
    return 'Session expired due to inactivity. Please sign in again.';
  }
  return 'Session expired. Please sign in again.';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function attachSessionToAuthResponse(
  strapi: Core.Strapi,
  ctx: Record<string, unknown>,
): Promise<void> {
  if (!isObject(ctx.body)) {
    return;
  }

  const responseBody = ctx.body as Record<string, unknown>;
  const jwt = responseBody.jwt;
  const user = responseBody.user;
  if (typeof jwt !== 'string' || !isObject(user)) {
    return;
  }

  const userId = user.id;
  if (typeof userId !== 'string' && typeof userId !== 'number') {
    return;
  }

  const session = await createSessionForUser(strapi, userId, ctx);
  responseBody.jwt = issueSessionJwt(strapi, userId, session);
}

function wrapAuthController(plugin: Record<string, any>): void {
  const authController = plugin.controllers?.auth as AuthController | undefined;
  if (!authController) {
    return;
  }

  for (const actionName of AUTH_RESPONSE_ACTIONS) {
    const originalAction = authController[actionName];
    if (typeof originalAction !== 'function') {
      continue;
    }

    authController[actionName] = async function wrappedAuthAction(
      this: unknown,
      ctx: Record<string, unknown>,
      ...args: unknown[]
    ) {
      const result = await originalAction.call(this, ctx, ...args);
      const strapi = runtimeStrapi;
      if (strapi) {
        await attachSessionToAuthResponse(strapi, ctx);
      }
      return result;
    };
  }
}

function wrapUsersPermissionsStrategy(
  strategy: Record<string, unknown>,
  strapi: Core.Strapi,
): Record<string, unknown> {
  const authenticate = strategy.authenticate;
  if (typeof authenticate !== 'function') {
    return strategy;
  }

  return {
    ...strategy,
    async authenticate(ctx: Record<string, unknown>) {
      const result = await (authenticate as (input: unknown) => Promise<unknown>)(ctx);
      if (!isObject(result) || result.authenticated !== true) {
        return result;
      }

      const credentials = result.credentials;
      if (!isObject(credentials)) {
        return result;
      }

      const userId = credentials.id;
      if (typeof userId !== 'string' && typeof userId !== 'number') {
        return {
          authenticated: false,
          error: new Error('Session validation failed.'),
        };
      }

      const claims = await extractSessionTokenClaims(strapi, ctx);
      const validation = await validateSessionForToken(strapi, userId, claims, ctx);
      if (!validation.valid) {
        return {
          authenticated: false,
          error: new Error(mapSessionValidationError(validation.reason)),
        };
      }

      return result;
    },
  };
}

function wrapPluginRegister(plugin: Record<string, any>): void {
  const originalRegister = plugin.register;
  if (typeof originalRegister !== 'function') {
    return;
  }

  plugin.register = function wrappedRegister({ strapi }: { strapi: Core.Strapi }) {
    runtimeStrapi = strapi;
    const authService = strapi.get('auth') as {
      register(type: string, strategy: Record<string, unknown>): unknown;
    };
    const originalAuthRegister = authService.register.bind(authService);

    authService.register = (type: string, strategy: Record<string, unknown>) => {
      if (type === 'content-api' && strategy?.name === 'users-permissions') {
        return originalAuthRegister(type, wrapUsersPermissionsStrategy(strategy, strapi));
      }
      return originalAuthRegister(type, strategy);
    };

    let registerResult: unknown;
    try {
      registerResult = originalRegister({ strapi });
    } catch (error) {
      authService.register = originalAuthRegister;
      throw error;
    }

    if (registerResult && typeof (registerResult as Promise<unknown>).finally === 'function') {
      return (registerResult as Promise<unknown>).finally(() => {
        authService.register = originalAuthRegister;
      });
    }

    authService.register = originalAuthRegister;
    return registerResult;
  };
}

export default (plugin: Record<string, any>) => {
  wrapAuthController(plugin);
  wrapPluginRegister(plugin);
  return plugin;
};
