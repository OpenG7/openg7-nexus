import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

import {
  EnvironmentConfig,
  ContentSecurityPolicyConfig,
  HomeFeedPanelLimitsConfig,
} from '../../../environments/environment';
import {
  createRuntimeConfigSnapshot,
  normalizeRuntimeSource,
  readRuntimeConfigFromProcessEnv,
  RuntimeConfigKey,
} from '../../../runtime-config/runtime-config';

import { AuthMode, FeatureFlags } from './environment.tokens';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/config ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Runtime Config ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns RuntimeConfigService gérée par le framework.
 */
export class RuntimeConfigService {
  private readonly configSnapshot: EnvironmentConfig;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    if (isPlatformBrowser(platformId)) {
      const runtimeConfig =
        typeof window !== 'undefined'
          ? (window as Window & { __OG7_CONFIG__?: unknown }).__OG7_CONFIG__
          : undefined;
      const normalizedSource = normalizeRuntimeSource(runtimeConfig);

      if (Object.keys(normalizedSource).length > 0) {
        this.configSnapshot = createRuntimeConfigSnapshot(normalizedSource);
        return;
      }
    }

    this.configSnapshot = createRuntimeConfigSnapshot(readRuntimeConfigFromProcessEnv());
  }

  /**
   * Contexte : Queried by HTTP services whenever they need the base API endpoint resolved at runtime.
   * Raison d’être : Abstracts how the API URL is provided (SSR env vs. browser boot config) to keep consumers agnostic.
   * @returns The resolved API base URL string.
   */
  apiUrl(): string {
    return this.read('API_URL');
  }

  /**
   * Contexte : Used by HTTP clients that attach bearer tokens to outgoing Strapi calls.
   * Raison d’être : Centralises retrieval of the runtime API token so interceptors stay lightweight.
   * @returns The configured API token or null when anonymous access applies.
   */
  apiToken(): string | null {
    return this.read('API_TOKEN');
  }

  /**
   * Contexte : Checked by the custom HTTP client before sending cross-origin requests.
   * Raison d’être : Propagates the runtime decision on whether credentials must accompany API calls.
   * @returns True when the platform should send cookies with API requests.
   */
  apiWithCredentials(): boolean {
    return this.read('API_WITH_CREDENTIALS');
  }

  /**
   * Contexte : Accessed by the homepage preview flow to build authenticated preview calls.
   * Raison d’être : Exposes the optional preview token without leaking runtime-config plumbing to feature modules.
   * @returns The preview token string or null when preview is disabled.
   */
  homepagePreviewToken(): string | null {
    return this.read('HOMEPAGE_PREVIEW_TOKEN');
  }

  /**
   * Contexte : Used by i18n loaders to resolve the static translation asset prefix.
   * Raison d’être : Keeps environment-specific translation roots configurable without touching feature code.
   * @returns The base path for translation assets.
   */
  i18nPrefix(): string {
    return this.read('I18N_PREFIX');
  }

  homeFeedPanelLimits(): HomeFeedPanelLimitsConfig {
    return this.read('HOME_FEED_PANEL_LIMITS');
  }

  /**
   * Contexte : Consulted by feature toggles that must know which capabilities are active.
   * Raison d’être : Serves the feature flag dictionary captured at bootstrap for reactive consumers.
   * @returns The immutable feature flag mapping.
   */
  featureFlags(): FeatureFlags {
    return this.read('FEATURE_FLAGS');
  }

  /**
   * Contexte : Evaluated by auth configuration helpers to expose the correct login surface.
   * Raison d’être : Provides the selected authentication mode (local, SSO, hybrid) from runtime configuration.
   * @returns The current authentication mode.
   */
  authMode(): AuthMode {
    return this.read('AUTH_MODE');
  }

  /**
   * Contexte : Consumed by observability services that forward notifications to external webhooks.
   * Raison d’être : Exposes the configured webhook endpoint without duplicating env parsing in each consumer.
   * @returns The webhook URL or null if email delivery should remain local only.
   */
  notificationWebhookUrl(): string | null {
    return this.read('NOTIFICATION_WEBHOOK_URL');
  }

  /**
   * Contexte : Used by analytics emitters when deciding where to POST telemetry events.
   * Raison d’être : Supplies the optional analytics endpoint sourced from runtime overrides.
   * @returns The analytics ingestion endpoint or null when disabled.
   */
  analyticsEndpoint(): string | null {
    return this.read('ANALYTICS_ENDPOINT');
  }

  /**
   * Contexte : Enforced by the CSP meta service during SSR to generate HTTP headers.
   * Raison d’être : Provides the resolved Content Security Policy directives captured from configuration.
   * @returns The CSP configuration snapshot.
   */
  contentSecurityPolicy(): ContentSecurityPolicyConfig {
    return this.read('CONTENT_SECURITY_POLICY');
  }

  /**
   * Contexte : Exposed to diagnostics components needing an immutable view of all runtime settings.
   * Raison d’être : Returns a defensive copy of the runtime configuration so callers can inspect it safely.
   * @returns A deep-cloned environment configuration snapshot.
   */
  snapshot(): EnvironmentConfig {
    return {
      ...this.configSnapshot,
      FEATURE_FLAGS: { ...this.configSnapshot.FEATURE_FLAGS },
      HOME_FEED_PANEL_LIMITS: { ...this.configSnapshot.HOME_FEED_PANEL_LIMITS },
      CONTENT_SECURITY_POLICY: {
        scriptSrc: [...this.configSnapshot.CONTENT_SECURITY_POLICY.scriptSrc],
        styleSrc: [...this.configSnapshot.CONTENT_SECURITY_POLICY.styleSrc],
        imgSrc: [...this.configSnapshot.CONTENT_SECURITY_POLICY.imgSrc],
        fontSrc: [...this.configSnapshot.CONTENT_SECURITY_POLICY.fontSrc],
        connectSrc: [...this.configSnapshot.CONTENT_SECURITY_POLICY.connectSrc],
      },
    };
  }

  private read<K extends RuntimeConfigKey>(key: K): EnvironmentConfig[K] {
    return this.configSnapshot[key];
  }
}
