import { Buffer } from 'buffer';

import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_URL } from '../config/environment.tokens';
import { HttpClientService } from '../http/http-client.service';
import { CryptoService } from '../security/crypto.service';

import { AuthResponse } from './auth.types';

export type OidcProvider = 'microsoft' | 'google';

export interface OidcCallbackResult {
  auth: AuthResponse;
  redirectUrl: string;
}

interface OidcHandshake {
  provider: OidcProvider;
  state: string;
  nonce: string;
  codeVerifier: string;
  redirectUrl: string;
  callbackUrl: string;
  createdAt: number;
}

const HANDSHAKE_KEY = 'og7:oidc:handshake';
const HANDSHAKE_TTL = 5 * 60 * 1000; // 5 minutes

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/auth ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Oidc ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns OidcService gérée par le framework.
 */
export class OidcService {
  private readonly apiUrl = (inject(API_URL, { optional: true }) ?? '').replace(/\/$/, '');
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClientService);
  private readonly crypto = inject(CryptoService);

  private readonly storage: Storage | null = this.resolveStorage();
  private memoryHandshake: OidcHandshake | null = null;

  /**
   * Contexte : Called by login components when the user selects an external identity provider.
   * Raison d’être : Prepares the PKCE handshake, persists state and redirects to the provider’s authorize endpoint.
   * @param provider Identifier of the OIDC provider to use.
   * @param redirectUrl Optional post-login redirect target.
   * @returns Promise resolved once the browser navigation has been initiated.
   */
  async startSignIn(provider: OidcProvider, redirectUrl?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const state = this.generateRandomString(32);
    const nonce = this.generateRandomString(32);
    const codeVerifier = this.generateRandomString(96);
    const callbackUrl = this.buildCallbackUrl();
    const normalizedRedirect = this.normalizeRedirectUrl(redirectUrl);

    try {
      const codeChallenge = await this.buildCodeChallenge(codeVerifier);

      const handshake: OidcHandshake = {
        provider,
        state,
        nonce,
        codeVerifier,
        redirectUrl: normalizedRedirect,
        callbackUrl,
        createdAt: Date.now(),
      };

      this.saveHandshake(handshake);

      const target = this.buildAuthorizeUrl(provider, {
        state,
        nonce,
        codeChallenge,
        redirectUri: callbackUrl,
      });

      window.location.assign(target);
    } catch (error) {
      this.clearHandshake();
      throw error;
    }
  }

  /**
   * Contexte : Invoked on the `/auth/callback` route once the identity provider redirects back.
   * Raison d’être : Validates the handshake, exchanges the code for tokens and returns the auth payload.
   * @returns Promise resolving with the authentication response and redirect destination.
   */
  async handleCallback(): Promise<OidcCallbackResult> {
    if (!isPlatformBrowser(this.platformId)) {
      throw new Error('OIDC callback is only available in the browser.');
    }

    const handshake = this.loadHandshake();
    if (!handshake) {
      throw new Error('No OIDC authorization request was found.');
    }

    if (Date.now() - handshake.createdAt > HANDSHAKE_TTL) {
      this.clearHandshake();
      throw new Error('The OIDC authorization request has expired.');
    }

    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      const description = params.get('error_description');
      this.clearHandshake();
      this.stripCallbackParams();
      throw new Error(description || error);
    }

    const code = params.get('code');
    const state = params.get('state');

    if (!code) {
      this.clearHandshake();
      this.stripCallbackParams();
      throw new Error('Missing authorization code.');
    }

    if (!state || state !== handshake.state) {
      this.clearHandshake();
      this.stripCallbackParams();
      throw new Error('Invalid OIDC state.');
    }

    const payload = {
      code,
      state,
      nonce: handshake.nonce,
      codeVerifier: handshake.codeVerifier,
      redirectUri: handshake.callbackUrl,
    };

    try {
      const auth = await firstValueFrom(
        this.http.post<AuthResponse>(`/auth/oidc/${handshake.provider}/callback`, payload),
      );

      return {
        auth,
        redirectUrl: this.normalizeRedirectUrl(handshake.redirectUrl),
      };
    } finally {
      this.clearHandshake();
      this.stripCallbackParams();
    }
  }

  private resolveStorage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    try {
      return window.sessionStorage;
    } catch {
      return null;
    }
  }

  private saveHandshake(handshake: OidcHandshake): void {
    this.memoryHandshake = handshake;
    if (!this.storage) {
      return;
    }

    try {
      this.storage.setItem(HANDSHAKE_KEY, JSON.stringify(handshake));
    } catch {
      // If the storage quota is exceeded or unavailable we fallback to memory.
    }
  }

  private loadHandshake(): OidcHandshake | null {
    if (this.storage) {
      const raw = this.storage.getItem(HANDSHAKE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as OidcHandshake;
          parsed.redirectUrl = this.normalizeRedirectUrl(parsed.redirectUrl);
          this.memoryHandshake = parsed;
          if (this.storage) {
            try {
              this.storage.setItem(HANDSHAKE_KEY, JSON.stringify(parsed));
            } catch {
              // Ignore storage quota or availability issues while keeping the in-memory copy.
            }
          }
          return parsed;
        } catch {
          this.storage.removeItem(HANDSHAKE_KEY);
        }
      }
    }

    if (this.memoryHandshake) {
      const normalized = this.normalizeRedirectUrl(this.memoryHandshake.redirectUrl);
      if (this.memoryHandshake.redirectUrl !== normalized) {
        this.memoryHandshake = { ...this.memoryHandshake, redirectUrl: normalized };
      }
      return this.memoryHandshake;
    }

    return null;
  }

  private clearHandshake(): void {
    if (this.storage) {
      this.storage.removeItem(HANDSHAKE_KEY);
    }
    this.memoryHandshake = null;
  }

  private stripCallbackParams(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!window.history.replaceState) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('session_state');
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    const query = url.searchParams.toString();
    const clean = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
    const title = typeof document !== 'undefined' ? document.title : '';
    window.history.replaceState({}, title, clean);
  }

  private normalizeRedirectUrl(target?: string): string {
    if (!target) {
      return '/';
    }

    const trimmed = target.trim();
    if (!trimmed) {
      return '/';
    }

    if (this.isExternalRedirect(trimmed)) {
      return '/';
    }

    const sanitized = `/${trimmed.replace(/^\/+/, '')}`;
    return sanitized === '//' ? '/' : sanitized;
  }

  private isExternalRedirect(candidate: string): boolean {
    if (candidate.startsWith('//')) {
      return true;
    }

    return /^[a-z][a-z0-9+.-]*:/i.test(candidate);
  }

  private buildAuthorizeUrl(
    provider: OidcProvider,
    params: { state: string; nonce: string; codeChallenge: string; redirectUri: string },
  ): string {
    const search = new URLSearchParams({
      state: params.state,
      nonce: params.nonce,
      code_challenge: params.codeChallenge,
      code_challenge_method: 'S256',
      redirect_uri: params.redirectUri,
    });

    const path = `/auth/oidc/${provider}`;
    if (!this.apiUrl) {
      return `${path}?${search.toString()}`;
    }
    return `${this.apiUrl}${path}?${search.toString()}`;
  }

  private buildCallbackUrl(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '/auth/callback';
    }

    const base =
      typeof document !== 'undefined' && document.baseURI
        ? document.baseURI
        : window.location.origin;
    const url = new URL('auth/callback', base);
    return url.toString();
  }

  private generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    const cryptoRef = globalThis.crypto;
    if (!cryptoRef?.getRandomValues) {
      throw new Error('Secure random generator is unavailable.');
    }
    cryptoRef.getRandomValues(array);
    let result = '';
    for (const value of array) {
      result += charset[value % charset.length];
    }
    return result;
  }

  private async buildCodeChallenge(verifier: string): Promise<string> {
    const digest = await this.crypto.digest(verifier);
    return this.base64UrlEncode(new Uint8Array(digest));
  }

  private base64UrlEncode(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }

    const base64 =
      typeof btoa === 'function' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');

    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}
