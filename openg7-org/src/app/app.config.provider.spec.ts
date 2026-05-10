import { TestBed } from '@angular/core/testing';

import { appConfigProvider } from './app.config.provider';
import { API_URL, FEATURE_FLAGS, I18N_PREFIX } from './core/config/environment.tokens';
import { RuntimeConfigService } from './core/config/runtime-config.service';

describe('appConfigProvider', () => {
  const runtimeConfigStub = {
    apiUrl: () => 'https://runtime.example/api',
    i18nPrefix: () => '/runtime/i18n/',
    featureFlags: () => ({ dashboard: true, billing: false }),
  } satisfies Pick<RuntimeConfigService, 'apiUrl' | 'i18nPrefix' | 'featureFlags'>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        appConfigProvider(),
        { provide: RuntimeConfigService, useValue: runtimeConfigStub },
      ],
    });
  });

  it('exposes runtime API_URL through the injection token', () => {
    const apiUrl = TestBed.inject(API_URL);
    expect(apiUrl).toBe('https://runtime.example/api');
  });

  it('exposes runtime I18N_PREFIX through the injection token', () => {
    const prefix = TestBed.inject(I18N_PREFIX);
    expect(prefix).toBe('/runtime/i18n/');
  });

  it('exposes runtime FEATURE_FLAGS through the injection token', () => {
    const flags = TestBed.inject(FEATURE_FLAGS);
    expect(flags).toEqual({ dashboard: true, billing: false });
  });
});
