import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject, DestroyRef } from '@angular/core';

import { ANALYTICS_ENDPOINT, API_URL } from '../config/environment.tokens';
import { RbacFacadeService } from '../security/rbac.facade';

/**
 * Registre des événements officiels pour éviter les chaînes magiques.
 */
export type AnalyticsEventName = 
  | 'login_success' 
  | 'login_failure' 
  | 'codex_dispatch_started' 
  | 'notification_read' 
  | 'linkup_status_changed'
  | 'meeting_slots_proposed'
  | 'attachment_toggled'
  | 'app_error'
  | 'auth_sso_attempt'
  | 'auth_sso_failed'
  | 'billboard_viewed'
  | 'partner_card_download'
  | 'partner_card_share'
  | 'partner_intro_requested'
  | 'financing_cta_clicked'
  | 'intro_template_loaded'
  | 'intro_draft_resumed'
  | 'feed.item.publish'
  | 'feed.item.publish.failed'
  | 'feed.item.publish.started'
  | 'feed.item.received'
  | 'feed.page.loaded'
  | 'feed_context_return_map'
  | 'feed_context_reset'
  | 'home_feed_panel_item_opened'
  | 'home_feed_panel_connect_requested'
  | 'home_feed_panel_view_all_requested'
  | 'hydrocarbon_signal_published'
  | 'hydrocarbon_signal_contact_requested'
  | 'map_open_corridor_feed'
  | 'opportunity_connect_clicked'
  | 'connection_created_success'
  | 'connection_create_failed'
  | 'importation_page_viewed'
  | 'importation_filter_updated'
  | 'importation_map_drilldown'
  | 'importation_timeline_playback'
  | 'importation_watchlist_created'
  | 'importation_export_requested'
  | 'search_performed'
  | 'search_opened'
  | 'search_typed'
  | 'search_saved'
  | 'search_save_failed'
  | 'search_save_denied'
  | 'search_autocomplete_selected'
  | 'result_impression'
  | 'empty_state_seen'
  | 'search_time_to_first_result'
  | 'result_selected'
  | 'search_callback_requested' 
  | 'meeting_confirmed'
  | 'meeting_cancelled'
  | 'filter_cleared'
  | 'filter_applied'
  | 'document_viewed'
  | 'qr_scanned_buyer'
  | 'qr_scanned_supplier';

interface AnalyticsEnvelope {
  readonly event: AnalyticsEventName | string;
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
  private readonly destroyRef = inject(DestroyRef);

  private dataLayerInitialized = false;
  private buffer: AnalyticsEnvelope[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL_MS = 2000;

  constructor() {
    if (this.browser) {
      // Flush de sécurité avant la fermeture de l'onglet
      const onUnload = () => this.flush();
      window.addEventListener('beforeunload', onUnload);
      this.destroyRef.onDestroy(() => window.removeEventListener('beforeunload', onUnload));
    }
  }

  /**
   * Contexte : Invoked by UI components and domain services whenever an analytics event must be recorded.
   * Raison d’être : Normalises event payloads and forwards them to the data layer, custom events and optional endpoint.
   * @param eventName Identifier of the analytics event to emit.
   * @param detail Optional event payload cloned before dispatch.
   * @param options Additional behaviour flags such as priority gating.
   * @returns void
   */
  emit(
    eventName: AnalyticsEventName,
    detail?: Record<string, unknown>,
    options?: { priority?: boolean },
  ): void {
    const isPriority = options?.priority === true;
    if (isPriority && !this.rbac.hasPermission('premium:analytics')) {
      return;
    }

    const envelope = this.buildEnvelope(eventName, detail, isPriority);

    if (!this.browser) {
      return;
    }

    this.forwardToDataLayer(envelope);
    this.dispatchCustomEvents(envelope);
    
    this.buffer.push(envelope);

    if (isPriority || this.buffer.length >= this.BATCH_SIZE) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => this.flush(), this.FLUSH_INTERVAL_MS);
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

  private flush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    if (this.buffer.length === 0 || !this.endpoint) {
      return;
    }

    const payload = [...this.buffer];
    this.buffer = [];

    try {
      if (this.browser && typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const accepted = navigator.sendBeacon(this.endpoint, blob);
        if (accepted) {
          return;
        }
      }
    } catch {
      // Fallback
    }

    if (this.http) {
      this.http.post(this.endpoint, payload).subscribe({
        error: (err) => console.error('Analytics batch flush failed', err)
      });
    } else if (typeof fetch === 'function') {
      void fetch(this.endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-OG7-Batch': 'true'
        },
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
