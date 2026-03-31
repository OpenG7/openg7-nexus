import { Buffer } from 'buffer';

import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : InjectÃ© via Angular DI par les autres briques du dossier Â« core/security Â».
 * Raison dâ€™Ãªtre : Centralise la logique mÃ©tier et les appels nÃ©cessaires autour de Â« Crypto Â».
 * @param dependencies DÃ©pendances injectÃ©es automatiquement par Angular.
 * @returns CryptoService gÃ©rÃ©e par le framework.
 */
export class CryptoService {
  private readonly subtle = globalThis.crypto?.subtle ?? null;
  private readonly keyStorageKey = 'auth_crypto_key';
  private readonly ivLength = 12;
  private keyPromise: Promise<CryptoKey | null> | null = null;

  /**
   * Contexte : Checked by token storage before attempting to use browser crypto APIs.
   * Raison dâ€™Ãªtre : Quickly detects whether the environment can perform AES-GCM operations with persisted keys.
   * @returns True when SubtleCrypto and secure randomness are available.
   */
  get isSupported(): boolean {
    const crypto = globalThis.crypto;
    return Boolean(this.subtle) && Boolean(crypto) && typeof crypto.getRandomValues === 'function';
  }

  /**
   * Contexte : Used during PKCE and OIDC flows to hash verifiers before sending them to the identity provider.
   * Raison dâ€™Ãªtre : Provides a promise-based helper that wraps SubtleCrypto.digest with encoding safeguards.
   * @param message Arbitrary string to hash using SHA-256.
   * @returns Promise resolving with the digest bytes.
   */
  async digest(message: string): Promise<ArrayBuffer> {
    if (!this.subtle) {
      throw new Error('SubtleCrypto not available');
    }
    const data = new TextEncoder().encode(message);
    return this.subtle.digest('SHA-256', data);
  }

  /**
   * Contexte : Invoked by the token storage when persisting sensitive tokens client-side.
   * Raison dâ€™Ãªtre : Encrypts the token payload with AES-GCM before writing to browser storage.
   * @param value Plain text value to encrypt.
   * @returns Promise resolving with a base64-encoded cipher string.
   */
  async encrypt(value: string): Promise<string> {
    if (!this.isSupported) {
      throw new Error('SubtleCrypto not available');
    }
    const key = await this.ensureKey();
    if (!key) {
      throw new Error('Unable to initialise encryption key');
    }
    const crypto = globalThis.crypto as Crypto;
    const iv = crypto.getRandomValues(new Uint8Array(this.ivLength));
    const encoded = new TextEncoder().encode(value);
    const cipher = await this.subtle!.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    const cipherBytes = new Uint8Array(cipher);
    const payload = new Uint8Array(iv.length + cipherBytes.length);
    payload.set(iv, 0);
    payload.set(cipherBytes, iv.length);
    return this.toBase64(payload);
  }

  /**
   * Contexte : Called during app bootstrap when restoring encrypted tokens from browser storage.
   * Raison dâ€™Ãªtre : Decrypts AES-GCM payloads produced by {@link encrypt} to retrieve the original token.
   * @param payload Base64-encoded cipher containing IV and ciphertext.
   * @returns Promise resolving with the decrypted plain text.
   */
  async decrypt(payload: string): Promise<string> {
    if (!this.isSupported) {
      throw new Error('SubtleCrypto not available');
    }
    const key = await this.ensureKey();
    if (!key) {
      throw new Error('Unable to initialise encryption key');
    }
    const bytes = this.fromBase64(payload);
    const iv = bytes.slice(0, this.ivLength);
    const data = bytes.slice(this.ivLength);
    const plaintext = await this.subtle!.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new TextDecoder().decode(plaintext);
  }

  /**
   * Contexte : Executed on logout flows to avoid leaking encryption material across sessions.
   * Raison dâ€™Ãªtre : Removes persisted AES keys and resets the in-memory cache so a fresh key is generated later.
   * @returns void
   */
  clearSessionKey(): void {
    for (const storage of this.getStorages()) {
      storage.removeItem(this.keyStorageKey);
    }
    this.keyPromise = null;
  }

  private async ensureKey(): Promise<CryptoKey | null> {
    if (!this.keyPromise) {
      this.keyPromise = this.loadOrCreateKey();
    }
    const key = await this.keyPromise;
    if (!key) {
      this.keyPromise = null;
    }
    return key;
  }

  private async loadOrCreateKey(): Promise<CryptoKey | null> {
    if (!this.subtle) {
      return null;
    }
    const storages = this.getStorages();

    for (let index = 0; index < storages.length; index += 1) {
      const storage = storages[index];
      const stored = storage.getItem(this.keyStorageKey);
      if (!stored) {
        continue;
      }
      try {
        const raw = this.fromBase64(stored);
        const rawBuffer = this.toArrayBuffer(raw);
        const key = await this.subtle.importKey('raw', rawBuffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
        if (index > 0 && storages.length > 0) {
          try {
            storages[0].setItem(this.keyStorageKey, stored);
            storage.removeItem(this.keyStorageKey);
          } catch {
            // Ignore migration failures and keep using imported key.
          }
        }
        return key;
      } catch {
        storage.removeItem(this.keyStorageKey);
      }
    }

    try {
      const crypto = globalThis.crypto as Crypto;
      const material = crypto.getRandomValues(new Uint8Array(32));
      const materialBuffer = this.toArrayBuffer(material);
      const key = await this.subtle.importKey('raw', materialBuffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
      if (storages.length > 0) {
        storages[0].setItem(this.keyStorageKey, this.toBase64(material));
      }
      material.fill(0);
      return key;
    } catch {
      return null;
    }
  }

  private getStorages(): Storage[] {
    const local = this.tryGetStorage('localStorage');
    const session = this.tryGetStorage('sessionStorage');
    if (local && session && local !== session) {
      return [local, session];
    }
    if (local) {
      return [local];
    }
    if (session) {
      return [session];
    }
    return [];
  }

  private tryGetStorage(kind: 'localStorage' | 'sessionStorage'): Storage | null {
    const candidate =
      typeof window !== 'undefined'
        ? window[kind]
        : (globalThis as { localStorage?: Storage; sessionStorage?: Storage })[kind];
    if (!candidate) {
      return null;
    }
    try {
      return candidate;
    } catch {
      return null;
    }
  }

  private toBase64(data: Uint8Array): string {
    if (typeof btoa === 'function') {
      let binary = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < data.length; index += chunkSize) {
        binary += String.fromCharCode(...data.slice(index, index + chunkSize));
      }
      return btoa(binary);
    }

    return Buffer.from(data).toString('base64');
  }

  private fromBase64(value: string): Uint8Array {
    if (typeof atob === 'function') {
      const binary = atob(value);
      const bytes = new Uint8Array(binary.length);
      for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
      }
      return bytes;
    }

    return new Uint8Array(Buffer.from(value, 'base64'));
  }

  private toArrayBuffer(data: Uint8Array): ArrayBuffer {
    const buffer = data.buffer;
    if (buffer instanceof ArrayBuffer) {
      if (data.byteOffset === 0 && data.byteLength === buffer.byteLength) {
        return buffer;
      }
      return buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
    const copy = new Uint8Array(data.byteLength);
    copy.set(data);
    return copy.buffer;
  }
}
