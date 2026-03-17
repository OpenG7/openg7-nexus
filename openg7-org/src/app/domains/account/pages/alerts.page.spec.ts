import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  IndicatorAlertRuleRecord,
  IndicatorAlertRulesService,
} from '@app/core/indicator-alert-rules.service';
import { UserAlertRecord } from '@app/core/services/user-alerts-api.service';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { TranslateModule } from '@ngx-translate/core';

import { AlertsPage } from './alerts.page';

class UserAlertsServiceMock {
  private readonly entriesSig = signal<UserAlertRecord[]>([]);
  readonly loading = signal(false).asReadonly();
  readonly generating = signal(false).asReadonly();
  readonly markAllReadPending = signal(false).asReadonly();
  readonly clearReadPending = signal(false).asReadonly();
  readonly error = signal<string | null>(null).asReadonly();
  readonly entries = this.entriesSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);
  readonly unreadCount = computed(() => this.entriesSig().filter((entry) => !entry.isRead).length);
  readonly pendingById = signal<Record<string, boolean>>({}).asReadonly();

  readonly refresh = jasmine.createSpy('refresh');
  readonly generateFromSavedSearches = jasmine.createSpy('generateFromSavedSearches');
  readonly markAllRead = jasmine.createSpy('markAllRead');
  readonly clearRead = jasmine.createSpy('clearRead');
  readonly markRead = jasmine.createSpy('markRead');
  readonly remove = jasmine.createSpy('remove');

  setEntries(entries: UserAlertRecord[]): void {
    this.entriesSig.set(entries);
  }
}

class IndicatorAlertRulesServiceMock {
  private readonly entriesSig = signal<IndicatorAlertRuleRecord[]>([]);
  readonly entries = this.entriesSig.asReadonly();
  readonly hasEntries = computed(() => this.entriesSig().length > 0);

  readonly refresh = jasmine.createSpy('refresh');
  readonly create = jasmine.createSpy('create');
  readonly setActive = jasmine.createSpy('setActive');
  readonly remove = jasmine.createSpy('remove');

  setEntries(entries: IndicatorAlertRuleRecord[]): void {
    this.entriesSig.set(entries);
  }
}

describe('AlertsPage', () => {
  let alerts: UserAlertsServiceMock;
  let indicatorRules: IndicatorAlertRulesServiceMock;

  beforeEach(async () => {
    alerts = new UserAlertsServiceMock();
    indicatorRules = new IndicatorAlertRulesServiceMock();

    alerts.setEntries([
      {
        id: 'user-alert-1',
        title: 'Ontario market alert',
        message: 'Spot electricity prices rose by 12%.',
        severity: 'warning',
        sourceType: 'saved-search',
        sourceId: 'saved-search-1',
        metadata: null,
        isRead: false,
        readAt: null,
        createdAt: '2026-02-01T10:00:00.000Z',
        updatedAt: '2026-02-01T10:00:00.000Z',
      },
    ]);

    indicatorRules.setEntries([
      {
        id: 'indicator-rule-1',
        indicatorId: 'indicator-spot-ontario',
        indicatorTitle: 'Spot electricity price up 12 percent',
        thresholdDirection: 'gt',
        thresholdValue: 25,
        window: '24h',
        frequency: 'hourly',
        notifyDelta: true,
        note: 'Watch evening peak',
        route: '/feed/indicators/indicator-spot-ontario',
        active: true,
        createdAt: '2026-02-01T10:05:00.000Z',
        updatedAt: '2026-02-01T10:05:00.000Z',
      },
    ]);

    await TestBed.configureTestingModule({
      imports: [AlertsPage, TranslateModule.forRoot()],
      providers: [
        { provide: UserAlertsService, useValue: alerts },
        { provide: IndicatorAlertRulesService, useValue: indicatorRules },
      ],
    }).compileComponents();
  });

  it('renders the indicator alert rules section', () => {
    const fixture = TestBed.createComponent(AlertsPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const item = root.querySelector('[data-og7=\"indicator-alert-rule-item\"]');

    expect(item).not.toBeNull();
    expect(root.textContent).toContain('Spot electricity price up 12 percent');
  });
});
