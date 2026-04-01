import { Buffer } from 'buffer';

import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

import { CryptoService } from './crypto.service';

interface StoredTokenEnvelope {
  cipher: string;
  expiresAt: number | null;
  createdAt: number;
}

interface ParsedStoredToken {
  cipher: string;
  expiresAt: number | null;
  legacy: boolean;
}

interface StorageResolution {
  primary: Storage | null;
  legacy: Storage | null;
}

@Injectable({ providedIn: 'root' })
/**
 * Contexte : InjectÃ© via Angular DI par les autres briques du dossier Â« core/security Â».
 * Raison dâ€™Ãªtre : Centralise la logique mÃ©tier et les appels nÃ©cessaires autour de Â« Token Storage Â».
 * @param dependencies DÃ©pendances injectÃ©es automatiquement par Angular.
 * @returns TokenStorageService gÃ©rÃ©e par le framework.
 */
export class TokenStorageService {
  private readonly storageKey = 'auth_token';
  private readonly sessionFallbackStorageKey = 'auth_token_session_fallback';
  private readonly defaultTtlMs = 1000 * 60 * 60 * 12;
  private memoryToken: string | null = null;
  private memoryExpiresAt: number | null = null;
  private readonly storage: Storage | null;
  private readonly legacyStorage: Storage | null;
  private readonly sessionFallbackStorage: Storage | null;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    private readonly crypto: CryptoService
  ) {
    const resolution = this.resolveStorage(platformId);
    this.storage = resolution.primary;
    this.legacyStorage = resolution.legacy;
    this.sessionFallbackStorage = isPlatformBrowser(platformId)
      ? this.tryGetStorage('sessionStorage')
      : null;
  }

  /**
   * Contexte : Called during bootstrap and HTTP interception to retrieve the persisted auth token.
   * Raison dâ€™Ãªtre : Decodes encrypted auth data with TTL validation while handling legacy payloads.
   * @returns Promise resolving with the stored token or null when absent/expired.
   */
  async getToken(): Promise<string | null> {
    if (this.canUsePersistentStorage()) {
      const persisted = await this.readPersistentToken();
      if (persisted) {
        return persisted;
      }
    }

    const sessionFallback = this.readSessionFallbackToken();
    if (sessionFallback) {
      return sessionFallback;
    }

    if (this.isExpired(this.memoryExpiresAt)) {
      this.memoryToken = null;
      this.memoryExpiresAt = null;
      return null;
    }

    return this.memoryToken;
  }

  /**
   * Contexte : Used after login flows to persist the freshly issued auth token.
   * Raison dâ€™Ãªtre : Encrypts and stores the token in persistent browser storage when possible, falling back to memory.
   * @param token JWT or opaque token to persist.
   * @returns Promise resolved when the token has been stored.
   */
  async setToken(token: string): Promise<void> {
    const expiresAt = this.resolveExpiry(token);

    if (this.canUsePersistentStorage()) {
      try {
        const encrypted = await this.crypto.encrypt(token);
        const payload: StoredTokenEnvelope = {
          cipher: encrypted,
          expiresAt,
          createdAt: Date.now(),
        };
        this.storage!.setItem(this.storageKey, JSON.stringify(payload));
        this.legacyStorage?.removeItem(this.storageKey);
        this.sessionFallbackStorage?.setItem(this.sessionFallbackStorageKey, token);
        this.memoryToken = null;
        this.memoryExpiresAt = null;
        return;
      } catch {
        this.storage!.removeItem(this.storageKey);
        this.legacyStorage?.removeItem(this.storageKey);
        this.crypto.clearSessionKey();
      }
    }

    this.memoryToken = token;
    this.memoryExpiresAt = expiresAt;
    this.sessionFallbackStorage?.setItem(this.sessionFallbackStorageKey, token);
  }

  /**
   * Contexte : Triggered on logout or session expiration handlers.
   * Raison dâ€™Ãªtre : Wipes both persisted and in-memory tokens while clearing the crypto key material.
   * @returns Promise resolved once the storage has been cleared.
   */
  async clear(): Promise<void> {
    this.storage?.removeItem(this.storageKey);
    this.legacyStorage?.removeItem(this.storageKey);
    this.sessionFallbackStorage?.removeItem(this.sessionFallbackStorageKey);
    this.crypto.clearSessionKey();
    this.memoryToken = null;
    this.memoryExpiresAt = null;
  }

  private canUsePersistentStorage(): boolean {
    return Boolean(this.storage) && this.crypto.isSupported;
  }

  private async readPersistentToken(): Promise<string | null> {
    const primaryRaw = this.storage?.getItem(this.storageKey);
    const legacyRaw = this.legacyStorage?.getItem(this.storageKey);
    const raw = primaryRaw ?? legacyRaw;
    if (!raw) {
      return null;
    }

    const sourceStorage =
      primaryRaw != null ? this.storage : legacyRaw != null ? this.legacyStorage : null;
    if (!sourceStorage) {
      return null;
    }

    const parsed = this.parseStoredToken(raw);
    try {
      const token = await this.crypto.decrypt(parsed.cipher);
      const expiresAt = parsed.expiresAt ?? this.resolveExpiry(token);
      if (this.isExpired(expiresAt)) {
        await this.clear();
        return null;
      }

      if (sourceStorage !== this.storage || parsed.legacy) {
        await this.setToken(token);
      }

      return token;
    } catch {
      sourceStorage.removeItem(this.storageKey);
      if (sourceStorage !== this.storage) {
        this.storage?.removeItem(this.storageKey);
      }
      this.crypto.clearSessionKey();
      return null;
    }
  }

  private resolveExpiry(token: string): number {
    const jwtExp = this.extractJwtExpiry(token);
    if (jwtExp !== null) {
      return jwtExp;
    }
    return Date.now() + this.defaultTtlMs;
  }

  private extractJwtExpiry(token: string): number | null {
    try {
      const segments = token.split('.');
      if (segments.length < 2) {
        return null;
      }
      const payload = this.decodeJwtSegment(segments[1]);
      const parsed = JSON.parse(payload) as { exp?: unknown };
      if (typeof parsed.exp === 'number' && Number.isFinite(parsed.exp) && parsed.exp > 0) {
        return Math.round(parsed.exp * 1000);
      }
      return null;
    } catch {
      return null;
    }
  }

  private decodeJwtSegment(segment: string): string {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    if (typeof atob === 'function') {
      return atob(padded);
    }
    return Buffer.from(padded, 'base64').toString('utf-8');
  }

  private parseStoredToken(raw: string): ParsedStoredToken {
    try {
      const parsed = JSON.parse(raw) as Partial<StoredTokenEnvelope>;
      if (typeof parsed.cipher === 'string' && parsed.cipher.trim().length > 0) {
        const expiresAt =
          typeof parsed.expiresAt === 'number' && Number.isFinite(parsed.expiresAt)
            ? parsed.expiresAt
            : null;
        return {
          cipher: parsed.cipher,
          expiresAt,
          legacy: false,
        };
      }
    } catch {
      // Legacy format: raw encrypted token string.
    }

    return {
      cipher: raw,
      expiresAt: null,
      legacy: true,
    };
  }

  private isExpired(expiresAt: number | null): boolean {
    return typeof expiresAt === 'number' && Number.isFinite(expiresAt) && Date.now() >= expiresAt;
  }

  private readSessionFallbackToken(): string | null {
    const storage = this.sessionFallbackStorage;
    if (!storage) {
      return null;
    }

    const token = storage.getItem(this.sessionFallbackStorageKey);
    if (!token) {
      return null;
    }

    const expiresAt = this.resolveExpiry(token);
    if (this.isExpired(expiresAt)) {
      storage.removeItem(this.sessionFallbackStorageKey);
      return null;
    }

    return token;
  }

  private resolveStorage(platformId: object): StorageResolution {
    if (!isPlatformBrowser(platformId)) {
      return { primary: null, legacy: null };
    }

    const local = this.tryGetStorage('localStorage');
    const session = this.tryGetStorage('sessionStorage');
    if (local) {
      return { primary: local, legacy: session };
    }

    return { primary: session, legacy: null };
  }

  private tryGetStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
    try {
      return window[kind];
    } catch {
      return null;
    }
  }
}
