import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

export interface AdminQualitySpeechOptions {
  readonly lang?: string;
  readonly rate?: number;
  readonly pitch?: number;
  readonly onEnd?: () => void;
  readonly onError?: () => void;
}

@Injectable({ providedIn: 'root' })
export class AdminQualityBrowserService {
  private readonly platformId = inject(PLATFORM_ID);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readStorageItem(key: string): string | null {
    return this.storage()?.getItem(key) ?? null;
  }

  writeStorageItem(key: string, value: string): boolean {
    const storage = this.storage();
    if (!storage) {
      return false;
    }

    storage.setItem(key, value);
    return true;
  }

  removeStorageItem(key: string): void {
    this.storage()?.removeItem(key);
  }

  async copyText(value: string): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('copy_unavailable');
    }

    const clipboard = globalThis.navigator?.clipboard;
    if (clipboard?.writeText) {
      await clipboard.writeText(value);
      return;
    }

    this.copyTextLegacy(value);
  }

  speak(text: string, options: AdminQualitySpeechOptions = {}): void {
    const speech = this.speechSynthesis();
    if (!speech || typeof globalThis.SpeechSynthesisUtterance === 'undefined') {
      throw new Error('speech_unavailable');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = options.lang ?? 'fr-CA';
    utterance.rate = options.rate ?? 0.98;
    utterance.pitch = options.pitch ?? 1;
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onError?.();

    speech.cancel();
    speech.speak(utterance);
  }

  cancelSpeech(): boolean {
    const speech = this.speechSynthesis();
    if (!speech) {
      return false;
    }

    speech.cancel();
    return true;
  }

  confirm(message: string, fallback = true): boolean {
    if (!this.isBrowser || typeof globalThis.window?.confirm !== 'function') {
      return fallback;
    }

    return globalThis.window.confirm(message);
  }

  private storage(): Storage | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      return globalThis.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private copyTextLegacy(value: string): void {
    if (!this.isBrowser || typeof globalThis.document === 'undefined') {
      throw new Error('copy_unavailable');
    }

    const documentRef = globalThis.document;
    const textarea = documentRef.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    documentRef.body.appendChild(textarea);
    textarea.select();
    const ok = documentRef.execCommand('copy');
    documentRef.body.removeChild(textarea);

    if (!ok) {
      throw new Error('copy_failed');
    }
  }

  private speechSynthesis(): SpeechSynthesis | null {
    if (!this.isBrowser || typeof globalThis.window === 'undefined') {
      return null;
    }

    return globalThis.window.speechSynthesis ?? null;
  }
}
