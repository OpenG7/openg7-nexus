import { PLATFORM_ID } from '@angular/core';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth/auth.service';
import {
  CreateIndicatorAlertRulePayload,
  IndicatorAlertRulesService,
} from './indicator-alert-rules.service';

describe('IndicatorAlertRulesService', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let userState: ReturnType<typeof signal<{ id: string } | null>>;

  const createService = () => TestBed.inject(IndicatorAlertRulesService);

  beforeEach(() => {
    authState = signal(false);
    userState = signal<{ id: string } | null>(null);

    clearIndicatorAlertRuleStorage();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: computed(() => authState()),
            user: userState.asReadonly(),
          } as Pick<AuthService, 'isAuthenticated' | 'user'>,
        },
        { provide: PLATFORM_ID, useValue: 'browser' },
      ],
    });
  });

  afterEach(() => {
    clearIndicatorAlertRuleStorage();
  });

  it('creates and restores rules for the current user', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const service = createService();
    const created = service.create(createPayload());

    expect(service.entries().length).toBe(1);
    expect(service.entries()[0]?.id).toBe(created.id);

    service.refresh();

    expect(service.entries().length).toBe(1);
    expect(service.entries()[0]?.indicatorTitle).toBe('Spot electricity price up 12 percent');
  });

  it('keeps rules partitioned by user id', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const service = createService();
    service.create(createPayload({ indicatorId: 'indicator-1' }));

    userState.set({ id: 'user-2' });
    service.refresh();
    expect(service.entries()).toEqual([]);

    userState.set({ id: 'user-1' });
    service.refresh();
    expect(service.entries().length).toBe(1);
    expect(service.entries()[0]?.indicatorId).toBe('indicator-1');
  });

  it('toggles active state and removes rules', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const service = createService();
    const created = service.create(createPayload());

    service.setActive(created.id, false);
    expect(service.entries()[0]?.active).toBeFalse();

    service.remove(created.id);
    expect(service.entries()).toEqual([]);
  });

  it('reports active rules for a given indicator id', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const service = createService();
    const activeRule = service.create(createPayload({ indicatorId: 'indicator-1' }));
    service.create(createPayload({ indicatorId: 'indicator-2' }));

    expect(service.hasActiveRuleForIndicator('indicator-1')).toBeTrue();
    expect(service.findActiveRuleForIndicator('indicator-1')?.id).toBe(activeRule.id);
    expect(service.hasActiveRuleForIndicator('indicator-3')).toBeFalse();

    service.setActive(activeRule.id, false);
    expect(service.hasActiveRuleForIndicator('indicator-1')).toBeFalse();
    expect(service.findActiveRuleForIndicator('indicator-1')).toBeNull();
  });
});

function createPayload(
  patch: Partial<CreateIndicatorAlertRulePayload> = {}
): CreateIndicatorAlertRulePayload {
  return {
    indicatorId: 'indicator-spot-ontario',
    indicatorTitle: 'Spot electricity price up 12 percent',
    thresholdDirection: 'gt',
    thresholdValue: 25,
    window: '24h',
    frequency: 'hourly',
    notifyDelta: true,
    note: 'Watch evening peak',
    route: '/feed/indicators/indicator-spot-ontario',
    ...patch,
  };
}

function clearIndicatorAlertRuleStorage(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('og7.indicator-alert-rules.v1')) {
      localStorage.removeItem(key);
    }
  }
}
