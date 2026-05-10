import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { defer, from, Observable } from 'rxjs';

import { PartnerProfile } from '../models/partner-profile';

export type ShareResult = 'shared' | 'copied';

export interface ShareRequest {
  readonly title?: string;
  readonly text?: string;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Share ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ShareService gérée par le framework.
 */
export class ShareService {
  private readonly browser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.browser = isPlatformBrowser(platformId);
  }

  /**
   * Contexte : Used by UI share buttons to invoke the native Web Share API when available.
   * Raison d’être : Normalises share behaviour across browsers, falling back to clipboard when necessary.
   * @param url Target URL to share or copy.
   * @param request Optional metadata such as title or text.
   * @returns Promise resolving with the method used (shared or copied).
   */
  async share(url: string, request?: ShareRequest): Promise<ShareResult> {
    if (!this.browser) {
      throw new Error('share_unavailable');
    }

    const globalRef = typeof globalThis !== 'undefined' ? globalThis : undefined;
    const navigatorRef: Navigator | undefined =
      typeof navigator !== 'undefined'
        ? navigator
        : (globalRef as { navigator?: Navigator | undefined })?.navigator;

    if (!navigatorRef) {
      throw new Error('share_unavailable');
    }

    const shareData: ShareData = {
      ...(request ?? {}),
      url,
    };

    try {
      if (typeof navigatorRef.share === 'function') {
        await navigatorRef.share(shareData);
        return 'shared';
      }

      if (navigatorRef.clipboard && typeof navigatorRef.clipboard.writeText === 'function') {
        await navigatorRef.clipboard.writeText(url);
        return 'copied';
      }
    } catch (error) {
      throw error instanceof Error ? error : new Error('share_failed');
    }

    throw new Error('share_unsupported');
  }

  /**
   * Contexte : Triggered by partner profile pages to share the current profile link.
   * Raison d’être : Builds a stable partner URL and forwards the share request via {@link share}.
   * @param profile Partner profile to share.
   * @returns Observable emitting the share result once completed.
   */
  sharePartnerProfile(profile: PartnerProfile): Observable<ShareResult> {
    return defer(() => {
      const origin = this.resolveOrigin();
      const shareUrl = new URL(`/partners/${profile.id}?role=${profile.role}`, origin).toString();
      const title = profile.displayName ?? profile.legalName;
      return from(this.share(shareUrl, { title }));
    });
  }

  private resolveOrigin(): string {
    if (!this.browser) {
      throw new Error('share_unavailable');
    }

    const globalRef: typeof globalThis | undefined =
      typeof globalThis !== 'undefined' ? globalThis : undefined;
    const locationRef: Location | undefined =
      typeof window !== 'undefined'
        ? window.location
        : (globalRef as { location?: Location | undefined })?.location;

    if (locationRef?.origin) {
      return locationRef.origin;
    }

    throw new Error('share_unavailable');
  }
}
