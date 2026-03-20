import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { RuntimeConfigService } from './runtime-config.service';

describe('RuntimeConfigService', () => {
  const browserWindow = window as Window & { __OG7_CONFIG__?: unknown };
  const processRef = globalThis as { process?: { env?: Record<string, string | undefined> } };
  const hadProcess = Object.prototype.hasOwnProperty.call(processRef, 'process');
  const originalProcess = processRef.process;
  const originalEnv = originalProcess?.env ? { ...originalProcess.env } : undefined;
  const originalRuntimeConfig = browserWindow.__OG7_CONFIG__;

  afterEach(() => {
    if (originalRuntimeConfig === undefined) {
      delete browserWindow.__OG7_CONFIG__;
    } else {
      browserWindow.__OG7_CONFIG__ = originalRuntimeConfig;
    }

    if (hadProcess) {
      processRef.process = originalProcess;
      if (originalProcess) {
        originalProcess.env = { ...(originalEnv ?? {}) };
      }
      return;
    }

    delete processRef.process;
  });

  it('prefers the browser runtime manifest when available', () => {
    browserWindow.__OG7_CONFIG__ = {
      API_URL: 'https://browser.example/api',
      I18N_PREFIX: '/browser/i18n/',
      HOME_FEED_PANEL_LIMITS: {
        alerts: 5,
        opportunities: 6,
        indicators: 7,
      },
      FEATURE_FLAGS: {
        experimentalMap: true,
      },
    };

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }, RuntimeConfigService],
    });

    const service = TestBed.inject(RuntimeConfigService);

    expect(service.apiUrl()).toBe('https://browser.example/api');
    expect(service.i18nPrefix()).toBe('/browser/i18n/');
    expect(service.homeFeedPanelLimits()).toEqual({
      alerts: 5,
      opportunities: 6,
      indicators: 7,
    });
    expect(service.featureFlags()).toEqual(
      jasmine.objectContaining({
        experimentalMap: true,
      })
    );
  });

  it('falls back to process.env on the server', () => {
    if (!processRef.process) {
      Object.defineProperty(processRef, 'process', {
        value: { env: {} as Record<string, string | undefined> },
        writable: true,
        configurable: true,
      });
    }

    processRef.process!.env = {
      ...(originalEnv ?? {}),
      API_URL: 'https://ssr.example/api',
      I18N_PREFIX: '/ssr/i18n/',
      HOME_FEED_PANEL_LIMITS: '{"alerts":8,"opportunities":9,"indicators":10}',
      FEATURE_FLAGS: '{"ssrOnly":true}',
    };

    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }, RuntimeConfigService],
    });

    const service = TestBed.inject(RuntimeConfigService);

    expect(service.apiUrl()).toBe('https://ssr.example/api');
    expect(service.i18nPrefix()).toBe('/ssr/i18n/');
    expect(service.homeFeedPanelLimits()).toEqual({
      alerts: 8,
      opportunities: 9,
      indicators: 10,
    });
    expect(service.featureFlags()).toEqual(
      jasmine.objectContaining({
        ssrOnly: true,
      })
    );
  });
});
