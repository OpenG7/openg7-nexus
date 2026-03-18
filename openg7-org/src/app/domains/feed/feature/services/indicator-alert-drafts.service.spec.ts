import { PLATFORM_ID, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@app/core/auth/auth.service';

import { IndicatorAlertDraftsService } from './indicator-alert-drafts.service';

function clearIndicatorAlertDraftStorage(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  const keys = Object.keys(localStorage);
  for (const key of keys) {
    if (key.startsWith('og7.indicator-alert-drafts.v1')) {
      localStorage.removeItem(key);
    }
  }
}

describe('IndicatorAlertDraftsService', () => {
  let authState: ReturnType<typeof signal<boolean>>;
  let userState: ReturnType<typeof signal<{ id: string } | null>>;

  beforeEach(() => {
    authState = signal(false);
    userState = signal<{ id: string } | null>(null);

    clearIndicatorAlertDraftStorage();

    TestBed.configureTestingModule({
      providers: [
        IndicatorAlertDraftsService,
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
    clearIndicatorAlertDraftStorage();
  });

  it('persists drafts per authenticated user and indicator id', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const service = TestBed.inject(IndicatorAlertDraftsService);
    service.save('indicator-001', {
      thresholdDirection: 'gt',
      thresholdValue: 18,
      window: '24h',
      frequency: 'hourly',
      notifyDelta: true,
      note: 'Watch evening spike',
    });

    service.refresh();

    expect(service.draftForIndicator('indicator-001')).toEqual({
      thresholdDirection: 'gt',
      thresholdValue: 18,
      window: '24h',
      frequency: 'hourly',
      notifyDelta: true,
      note: 'Watch evening spike',
    });
  });

  it('keeps drafts isolated by user and supports clearing them', () => {
    authState.set(true);
    userState.set({ id: 'user-1' });

    const service = TestBed.inject(IndicatorAlertDraftsService);
    service.save('indicator-001', {
      thresholdDirection: 'lt',
      thresholdValue: 9,
      window: '1h',
      frequency: 'instant',
      notifyDelta: false,
      note: 'Watch drop',
    });

    userState.set({ id: 'user-2' });
    service.refresh();
    expect(service.draftForIndicator('indicator-001')).toBeNull();

    userState.set({ id: 'user-1' });
    service.refresh();
    expect(service.draftForIndicator('indicator-001')).not.toBeNull();

    service.clear('indicator-001');
    expect(service.draftForIndicator('indicator-001')).toBeNull();
  });
});
