import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  EnvironmentProviders,
  InjectionToken,
  PLATFORM_ID,
  Signal,
  effect,
  inject,
  makeEnvironmentProviders,
  signal,
} from '@angular/core';

type ThemeMode = 'light' | 'dark';

export interface Og7ThemeController {
  readonly mode: Signal<ThemeMode>;
  set(mode: ThemeMode): void;
  toggle(): void;
}

export const OG7_THEME = new InjectionToken<Og7ThemeController>('OG7_THEME');

const STORAGE_KEY = 'og7-theme';

function readStoredMode(storageKey: string): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function writeStoredMode(storageKey: string, value: ThemeMode): void {
  try {
    window.localStorage.setItem(storageKey, value);
  } catch {
    /* storage optional */
  }
}

export function provideTheme(
  options: { defaultMode?: ThemeMode; storageKey?: string } = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    {
      provide: OG7_THEME,
      useFactory: () => {
        const documentRef = inject(DOCUMENT);
        const platformId = inject(PLATFORM_ID);
        const browser = isPlatformBrowser(platformId);
        const storageKey = options.storageKey ?? STORAGE_KEY;
        const defaultMode: ThemeMode = options.defaultMode ?? 'light';

        const initial: ThemeMode = browser
          ? (readStoredMode(storageKey) ?? defaultMode)
          : defaultMode;
        const mode = signal<ThemeMode>(initial);

        if (browser) {
          const root = documentRef.documentElement;
          const apply = (value: ThemeMode) => {
            root.classList.toggle('dark', value === 'dark');
            root.dataset['theme'] = value;
          };

          apply(mode());

          effect(() => {
            const value = mode();
            apply(value);
            writeStoredMode(storageKey, value);
          });
        }

        return {
          mode: mode.asReadonly(),
          set: (value: ThemeMode) => mode.set(value),
          toggle: () => mode.update((current) => (current === 'light' ? 'dark' : 'light')),
        } satisfies Og7ThemeController;
      },
    },
  ]);
}
