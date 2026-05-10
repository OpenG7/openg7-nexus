import { InjectionToken } from '@angular/core';

export const API_URL = new InjectionToken<string>('API_URL');
export const API_WITH_CREDENTIALS = new InjectionToken<boolean>('API_WITH_CREDENTIALS');
export const API_TOKEN = new InjectionToken<string | null>('API_TOKEN');
export const HOMEPAGE_PREVIEW_TOKEN = new InjectionToken<string | null>('HOMEPAGE_PREVIEW_TOKEN');
export const I18N_PREFIX = new InjectionToken<string>('I18N_PREFIX');
export type FeatureFlags = Record<string, boolean>;
export const FEATURE_FLAGS = new InjectionToken<FeatureFlags>('FEATURE_FLAGS');

export type AuthMode = 'local-only' | 'sso-only' | 'hybrid';
export const AUTH_MODE = new InjectionToken<AuthMode>('AUTH_MODE');
export const NOTIFICATION_WEBHOOK_URL = new InjectionToken<string | null>(
  'NOTIFICATION_WEBHOOK_URL',
);
export const ANALYTICS_ENDPOINT = new InjectionToken<string | null>('ANALYTICS_ENDPOINT');
