import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

import { ANALYTICS_ENDPOINT, API_URL } from '../config/environment.tokens';
import { RbacFacadeService } from '../security/rbac.facade';

interface AnalyticsEnvelope {
  readonly event: string;
  readonly detail: Record<string, unknown>;
  readonly priority: boolean;
  readonly timestamp: string;
}

type DataLayerEntry = Record<string, unknown>;
type DataLayer = DataLayerEntry[];
type GlobalWithDataLayer = typeof globalThis & { dataLayer?: DataLayer };

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/observability ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Analytics ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AnalyticsService gérée par le framework.
 */
export class AnalyticsService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly rbac = inject(RbacFacadeService);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly apiUrl = inject(API_URL, { optional: true }) ?? '';
  private readonly explicitEndpoint = inject(ANALYTICS_ENDPOINT, { optional: true }) ?? null;
  private readonly endpoint = this.resolveEndpoint();

  private dataLayerInitialized = false;

  /**
   * Contexte : Invoked by UI components and domain services whenever an analytics event must be recorded.
   * Raison d’être : Normalises event payloads and forwards them to the data layer, custom events and optional endpoint.
   * @param eventName Identifier of the analytics event to emit.
   * @param detail Optional event payload cloned before dispatch.
   * @param options Additional behaviour flags such as priority gating.
   * @returns void
   */
  emit(
    eventName: string,
    detail?: Record<string, unknown>,
    options?: { priority?: boolean },
  ): void {
    const isPriority = options?.priority ?? false;
    if (isPriority && !this.rbac.hasPermission('premium:analytics')) {
      return;
    }

    const envelope = this.buildEnvelope(eventName, detail, isPriority);

    if (!this.browser) {
      return;
    }

    this.forwardToDataLayer(envelope);
    this.dispatchCustomEvents(envelope);
    this.forwardToEndpoint(envelope);
  }

  private buildEnvelope(
    eventName: string,
    detail: Record<string, unknown> | undefined,
    priority: boolean,
  ): AnalyticsEnvelope {
    return {
      event: eventName,
      detail: detail ? { ...detail } : {},
      priority,
      timestamp: new Date().toISOString(),
    } satisfies AnalyticsEnvelope;
  }

  private forwardToDataLayer(envelope: AnalyticsEnvelope): void {
    const layer = this.ensureDataLayer();
    if (!layer) {
      return;
    }
    layer.push({
      event: envelope.event,
      event_category: envelope.priority ? 'priority' : 'standard',
      event_detail: envelope.detail,
      event_timestamp: envelope.timestamp,
    });
  }

  private dispatchCustomEvents(envelope: AnalyticsEnvelope): void {
    const target: EventTarget | null = typeof window !== 'undefined' ? window : null;
    if (!target) {
      return;
    }
    try {
      target.dispatchEvent(
        new CustomEvent(envelope.event, {
          detail: envelope.detail,
          bubbles: false,
        }),
      );
    } catch {
      // Silently ignore dispatch errors.
    }

    try {
      target.dispatchEvent(
        new CustomEvent('og7-analytics', {
          detail: {
            event: envelope.event,
            payload: envelope.detail,
            timestamp: envelope.timestamp,
          },
          bubbles: false,
        }),
      );
    } catch {
      // Ignore secondary dispatch failures.
    }
  }

  private forwardToEndpoint(envelope: AnalyticsEnvelope): void {
    if (!this.endpoint) {
      return;
    }
    const payload = { ...envelope };
    try {
      const navigatorRef: Navigator | undefined =
        typeof navigator !== 'undefined' ? navigator : undefined;
      if (navigatorRef && typeof navigatorRef.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const accepted = navigatorRef.sendBeacon(this.endpoint, blob);
        if (accepted) {
          return;
        }
      }
    } catch {
      // Fall back to other transports if sendBeacon fails.
    }

    if (this.http) {
      this.http.post(this.endpoint, payload).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
      return;
    }

    if (typeof fetch === 'function') {
      void fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => undefined);
    }
  }

  private resolveEndpoint(): string | null {
    const explicit = this.normalizeUrl(this.explicitEndpoint);
    if (explicit) {
      return explicit;
    }
    const base = this.normalizeUrl(this.apiUrl);
    if (!base) {
      return null;
    }
    return `${base.replace(/\/$/, '')}/api/analytics/events`;
  }

  private normalizeUrl(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    if (trimmed.startsWith('/')) {
      return trimmed;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        parsed.hash = '';
        const href = parsed.toString();
        return href.endsWith('/') ? href.slice(0, -1) : href;
      }
    } catch {
      return null;
    }
    return null;
  }

  private ensureDataLayer(): DataLayer | null {
    if (!this.browser) {
      return null;
    }
    if (this.dataLayerInitialized) {
      return (globalThis as GlobalWithDataLayer).dataLayer ?? null;
    }
    const globalRef = globalThis as GlobalWithDataLayer;
    const globalLayer = globalRef.dataLayer;
    if (!Array.isArray(globalLayer)) {
      globalRef.dataLayer = [];
    }
    this.dataLayerInitialized = true;
    return globalRef.dataLayer ?? null;
  }
}
