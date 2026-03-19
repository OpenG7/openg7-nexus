import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { NotificationStore } from '@app/core/observability/notification.store';
import { UserAlertRecord } from '@app/core/services/user-alerts-api.service';
import {
  FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
  UserAlertsService,
} from '@app/core/user-alerts.service';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, firstValueFrom } from 'rxjs';

import { FeedItem } from '../models/feed.models';
import { AlertUpdateQueueService } from '../services/alert-update-queue.service';
import { FeedConnectionMatchService } from '../services/feed-connection-match.service';
import { FeedRealtimeService } from '../services/feed-realtime.service';

import { FeedAlertDetailPage } from './feed-alert-detail.page';

class FeedRealtimeServiceMock {
  readonly items = signal<readonly FeedItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly connectionState = {
    connected: signal(true).asReadonly(),
    reconnecting: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
  };

  readonly findItemById = jasmine.createSpy('findItemById');
  readonly reload = jasmine.createSpy('reload');
}

class StoreMock {
  private readonly provincesSig = signal([
    { id: 'on', name: 'Ontario' },
    { id: 'qc', name: 'Quebec' },
  ]);
  private readonly sectorsSig = signal([
    { id: 'energy', name: 'Energy' },
  ]);

  readonly selectSignal = jasmine
    .createSpy('selectSignal')
    .and.returnValues(this.provincesSig.asReadonly(), this.sectorsSig.asReadonly());
}

class AlertUpdateQueueServiceMock {
  readonly queueUpdate = jasmine.createSpy('queueUpdate').and.returnValue({
    id: 'alert-update-1',
    alertId: 'alert-001',
    alertTitle: 'Ice storm risk on Ontario transmission lines',
    route: '/feed/alerts/alert-001',
    reason: 'correction',
    summary: 'Environment Canada raised the icing threshold.',
    sourceUrl: 'https://weather.gc.ca',
    createdAt: '2026-03-10T20:00:00.000Z',
    status: 'pending',
  });
  readonly latestPendingForAlert = jasmine.createSpy('latestPendingForAlert').and.returnValue(null);
}

class UserAlertsServiceMock {
  private readonly entriesSig = signal<UserAlertRecord[]>([]);
  private readonly pendingBySourceSig = signal<Record<string, boolean>>({});

  readonly entries = this.entriesSig.asReadonly();
  readonly refresh = jasmine.createSpy('refresh');
  readonly create = jasmine.createSpy('create').and.callFake(async (_payload: Record<string, unknown>) => {
    if (this.createResult.status === 'created' && this.createResult.entry) {
      this.entriesSig.update((current) => [this.createResult.entry!, ...current]);
    }
    return this.createResult;
  });

  createResult: {
    status: 'created' | 'duplicate' | 'pending' | 'unauthenticated' | 'invalid' | 'error';
    entry: UserAlertRecord | null;
    errorKey: string | null;
  } = {
    status: 'created',
    entry: buildSubscriptionAlertRecord('alert-001'),
    errorKey: null,
  };

  setEntries(entries: UserAlertRecord[]): void {
    this.entriesSig.set(entries);
  }

  hasSource(sourceType: string | null | undefined, sourceId: string | null | undefined): boolean {
    return this.entriesSig().some(
      (entry) => entry.sourceType === sourceType && entry.sourceId === sourceId
    );
  }

  isSourcePending(sourceType: string | null | undefined, sourceId: string | null | undefined): boolean {
    return Boolean(this.pendingBySourceSig()[`${sourceType ?? ''}::${sourceId ?? ''}`]);
  }

  setPending(sourceType: string, sourceId: string, pending: boolean): void {
    const key = `${sourceType}::${sourceId}`;
    this.pendingBySourceSig.update((current) => {
      const next = { ...current };
      if (pending) {
        next[key] = true;
      } else {
        delete next[key];
      }
      return next;
    });
  }
}

class FeedConnectionMatchServiceMock {
  readonly resolveDraftConnectionMatchId = jasmine
    .createSpy('resolveDraftConnectionMatchId')
    .and.resolveTo(73);
}

function createAlertItem(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-01-20T10:05:00.000Z',
    type: 'ALERT',
    sectorId: 'energy',
    title: 'Ice storm risk on Ontario transmission lines',
    summary: 'Ice accretion above 15 mm is expected on key Ontario corridors.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'BOTH',
    urgency: 3,
    credibility: 2,
    tags: ['ice', 'grid', 'ontario'],
    source: {
      kind: 'GOV',
      label: 'Environment Canada',
    },
    ...overrides,
  };
}

function createOpportunityItem(id: string, overrides: Partial<FeedItem> = {}): FeedItem {
  return {
    id,
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-01-20T10:05:00.000Z',
    type: 'REQUEST',
    sectorId: 'energy',
    title: `Linked opportunity ${id}`,
    summary: 'Emergency sourcing opportunity for energy operators.',
    fromProvinceId: 'qc',
    toProvinceId: 'on',
    mode: 'IMPORT',
    urgency: 2,
    credibility: 2,
    tags: ['ice', 'grid'],
    source: {
      kind: 'PARTNER',
      label: 'Hydro Export',
    },
    ...overrides,
  };
}

function buildSubscriptionAlertRecord(alertId: string): UserAlertRecord {
  return {
    id: `user-alert-${alertId}`,
    title: 'Alert subscription: Ice storm risk on Ontario transmission lines',
    message: 'You subscribed to updates for Ice storm risk on Ontario transmission lines.',
    severity: 'info',
    sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
    sourceId: alertId,
    metadata: {
      route: `/feed/alerts/${alertId}`,
      kind: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
    },
    isRead: false,
    readAt: null,
    createdAt: '2026-03-10T20:00:00.000Z',
    updatedAt: '2026-03-10T20:00:00.000Z',
  };
}

function seedAlertDetailTranslations(translate: TranslateService): void {
  translate.setTranslation('en', {
    feed: {
      sourceUnknown: 'Unknown source',
      alert: {
        detail: {
          ontario: 'Ontario',
          unknownSector: 'Unspecified sector',
          routeUnknown: 'Interprovincial corridor',
          justNow: 'just now',
          minutesAgo: '{{ count }} min ago',
          hoursAgo: '{{ count }} h ago',
          severity: {
            low: 'Low EN',
            medium: 'Medium EN',
            high: 'High EN',
          },
          confidence: {
            possible: 'Possible EN',
            probable: 'Probable EN',
            high: 'High confidence EN',
          },
          windows: {
            short: '12-36h EN',
            medium: '24-48h EN',
            long: '48-72h EN',
          },
          summaryPointSource: 'Reported by {{ source }}.',
          summaryPointRoute: 'Relevant route: {{ route }}.',
          summaryPointTags: 'Signals: {{ tags }}.',
          impactSeverity: 'Estimated severity: {{ severity }}.',
          impactConfidence: 'Confidence level: {{ confidence }}.',
          impactWindow: 'Monitoring window: {{ window }}.',
          infrastructureSector: 'Relevant operating scope: {{ sector }}.',
          infrastructureSource: 'Primary reporting source: {{ source }}.',
          indicatorSeverity: 'Severity',
          indicatorConfidence: 'Confidence',
          indicatorRecency: 'Recency',
          updateReportedBy: 'Initial report published by {{ source }}.',
          recoVerifySource: 'Confirm the latest advisory from {{ source }} before acting.',
          recoTrackUpdates: 'Subscribe to track new updates and queue changes.',
          recoAssessRoute: 'Review internal exposure on {{ route }}.',
          relatedIndicatorsEmpty: 'No indicators yet.',
          relatedAlertsEmpty: 'No alerts yet.',
          relatedOpportunitiesEmpty: 'No opportunities yet.',
          shareCopied: 'Copied EN',
          shareUnavailable: 'Share unavailable EN',
          errorTitle: 'Unavailable EN',
          errorBody: 'Retry EN',
          retry: 'Retry EN',
          subscription: {
            status: {
              success: 'Subscription saved EN',
              duplicate: 'Already subscribed EN',
              pending: 'Pending subscription EN',
              invalid: 'Invalid subscription EN',
              errorGeneric: 'Subscription failed EN',
            },
          },
          timeline: {
            reported: 'Reported',
            confirmed: 'Last confirmed',
            monitoring: 'Monitoring',
            monitoringValue: 'Active monitoring over {{ window }}',
          },
        },
      },
    },
    sectors: {
      energy: 'Energy',
    },
  }, true);

  translate.setTranslation('fr', {
    feed: {
      sourceUnknown: 'Source inconnue',
      alert: {
        detail: {
          ontario: 'Ontario',
          unknownSector: 'Secteur non precise',
          routeUnknown: 'Corridor interprovincial',
          justNow: 'a l instant',
          minutesAgo: 'il y a {{ count }} min',
          hoursAgo: 'il y a {{ count }} h',
          severity: {
            low: 'Faible FR',
            medium: 'Moyenne FR',
            high: 'Elevee FR',
          },
          confidence: {
            possible: 'Possible FR',
            probable: 'Probable FR',
            high: 'Forte confiance FR',
          },
          windows: {
            short: '12-36h FR',
            medium: '24-48h FR',
            long: '48-72h FR',
          },
          summaryPointSource: 'Signalement publie par {{ source }}.',
          summaryPointRoute: 'Trajet concerne : {{ route }}.',
          summaryPointTags: 'Signaux : {{ tags }}.',
          impactSeverity: 'Severite estimee : {{ severity }}.',
          impactConfidence: 'Niveau de confiance : {{ confidence }}.',
          impactWindow: 'Fenetre de suivi : {{ window }}.',
          infrastructureSector: 'Perimetre operationnel concerne : {{ sector }}.',
          infrastructureSource: 'Source principale de signalement : {{ source }}.',
          indicatorSeverity: 'Severite',
          indicatorConfidence: 'Confiance',
          indicatorRecency: 'Recence',
          updateReportedBy: 'Signalement initial publie par {{ source }}.',
          recoVerifySource: 'Verifier le dernier avis de {{ source }} avant d agir.',
          recoTrackUpdates: 'S abonner pour suivre les mises a jour et changements en file.',
          recoAssessRoute: 'Evaluer l exposition interne sur {{ route }}.',
          relatedIndicatorsEmpty: 'Aucun indicateur.',
          relatedAlertsEmpty: 'Aucune alerte.',
          relatedOpportunitiesEmpty: 'Aucune opportunite.',
          shareCopied: 'Copie FR',
          shareUnavailable: 'Partage indisponible FR',
          errorTitle: 'Indisponible FR',
          errorBody: 'Reessayez FR',
          retry: 'Reessayer FR',
          subscription: {
            status: {
              success: 'Abonnement enregistre FR',
              duplicate: 'Deja abonne FR',
              pending: 'Abonnement en attente FR',
              invalid: 'Abonnement invalide FR',
              errorGeneric: 'Erreur abonnement FR',
            },
          },
          timeline: {
            reported: 'Signalee',
            confirmed: 'Derniere confirmation',
            monitoring: 'Suivi',
            monitoringValue: 'Surveillance active sur {{ window }}',
          },
        },
      },
    },
    sectors: {
      energy: 'Energie',
    },
  }, true);
}

describe('FeedAlertDetailPage', () => {
  let feed: FeedRealtimeServiceMock;
  let store: StoreMock;
  let alertUpdateQueue: AlertUpdateQueueServiceMock;
  let userAlerts: UserAlertsServiceMock;
  let connectionMatcher: FeedConnectionMatchServiceMock;
  let notifications: { success: jasmine.Spy; info: jasmine.Spy; error: jasmine.Spy };
  let router: jasmine.SpyObj<Router>;
  let routeParamMap$: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let authState: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    feed = new FeedRealtimeServiceMock();
    store = new StoreMock();
    alertUpdateQueue = new AlertUpdateQueueServiceMock();
    userAlerts = new UserAlertsServiceMock();
    connectionMatcher = new FeedConnectionMatchServiceMock();
    authState = signal(true);
    notifications = {
      success: jasmine.createSpy('success'),
      info: jasmine.createSpy('info'),
      error: jasmine.createSpy('error'),
    };
    router = jasmine.createSpyObj<Router>('Router', ['navigate', 'getCurrentNavigation']);
    router.navigate.and.resolveTo(true);
    router.getCurrentNavigation.and.returnValue(null);
    Object.defineProperty(router, 'url', {
      configurable: true,
      get: () => '/feed/alerts/alert-001',
    });

    routeParamMap$ = new BehaviorSubject(convertToParamMap({ itemId: 'alert-001' }));
    const routeStub: Pick<ActivatedRoute, 'paramMap' | 'snapshot'> = {
      paramMap: routeParamMap$.asObservable(),
      snapshot: { paramMap: convertToParamMap({ itemId: 'alert-001' }) } as ActivatedRoute['snapshot'],
    };

    const item = createAlertItem('alert-001');
    feed.findItemById.and.resolveTo(item);
    feed.items.set([item]);

    await TestBed.configureTestingModule({
      imports: [FeedAlertDetailPage, TranslateModule.forRoot()],
      providers: [
        { provide: FeedRealtimeService, useValue: feed },
        { provide: Store, useValue: store },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: routeStub },
        { provide: AlertUpdateQueueService, useValue: alertUpdateQueue },
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: computed(() => authState()),
          } as Pick<AuthService, 'isAuthenticated'>,
        },
        { provide: UserAlertsService, useValue: userAlerts },
        { provide: FeedConnectionMatchService, useValue: connectionMatcher },
        { provide: NotificationStore, useValue: notifications },
      ],
    })
      .overrideComponent(FeedAlertDetailPage, {
        set: {
          imports: [],
          template: '',
        },
      })
      .compileComponents();

    const translate = TestBed.inject(TranslateService);
    seedAlertDetailTranslations(translate);
    await firstValueFrom(translate.use('en'));
  });

  it('creates a persisted subscription when subscribe action succeeds', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribed: () => boolean;
      subscribe: () => Promise<void>;
    };

    expect(component.subscribed()).toBeFalse();
    await component.subscribe();
    expect(component.subscribed()).toBeTrue();
    expect(userAlerts.create).toHaveBeenCalledWith(
      jasmine.objectContaining({
        sourceType: FEED_ALERT_SUBSCRIPTION_SOURCE_TYPE,
        sourceId: 'alert-001',
        metadata: jasmine.objectContaining({
          route: '/feed/alerts/alert-001',
        }),
      })
    );
    expect(notifications.success).toHaveBeenCalled();
  });

  it('redirects to login when subscribe is triggered while unauthenticated', async () => {
    authState.set(false);

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribed: () => boolean;
      subscribe: () => Promise<void>;
    };

    expect(component.subscribed()).toBeFalse();
    await component.subscribe();
    expect(userAlerts.create).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { redirect: '/feed/alerts/alert-001' },
    });
  });

  it('surfaces subscribe failures without flipping subscribed state', async () => {
    userAlerts.createResult = {
      status: 'error',
      entry: null,
      errorKey: 'pages.alerts.errors.create',
    };

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribed: () => boolean;
      subscribe: () => Promise<void>;
    };

    await component.subscribe();
    expect(component.subscribed()).toBeFalse();
    expect(notifications.error).toHaveBeenCalled();
  });

  it('surfaces duplicate subscriptions as informational feedback', async () => {
    userAlerts.createResult = {
      status: 'duplicate',
      entry: buildSubscriptionAlertRecord('alert-001'),
      errorKey: null,
    };

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribe: () => Promise<void>;
    };

    await component.subscribe();
    expect(notifications.info).toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('surfaces pending subscriptions as informational feedback', async () => {
    userAlerts.createResult = {
      status: 'pending',
      entry: null,
      errorKey: null,
    };

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribe: () => Promise<void>;
    };

    await component.subscribe();
    expect(notifications.info).toHaveBeenCalled();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('reflects an existing persisted subscription on load', async () => {
    userAlerts.setEntries([buildSubscriptionAlertRecord('alert-001')]);

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      subscribed: () => boolean;
    };

    expect(component.subscribed()).toBeTrue();
  });

  it('shares alert detail using clipboard fallback', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const clipboardSpy = jasmine.createSpy('writeText').and.resolveTo();
    const originalClipboard = (navigator as Navigator & { clipboard?: unknown }).clipboard;
    const originalShare = (navigator as Navigator & { share?: unknown }).share;

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: clipboardSpy },
      configurable: true,
    });
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
    });

    const component = fixture.componentInstance as unknown as {
      share: () => Promise<void>;
    };

    try {
      await component.share();
      expect(clipboardSpy).toHaveBeenCalledTimes(1);
      expect(notifications.success).toHaveBeenCalled();
    } finally {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        configurable: true,
      });
    }
  });

  it('opens the report drawer and queues a structured alert update on submit', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      reportDrawerOpen: () => boolean;
      subscribed: () => boolean;
      reportUpdate: () => void;
      handleReportSubmitted: (payload: { reason: 'correction'; summary: string; sourceUrl: string | null }) => void;
      reportSubmitState: () => 'idle' | 'submitting' | 'success' | 'error';
    };

    expect(component.reportDrawerOpen()).toBeFalse();
    expect(component.subscribed()).toBeFalse();
    component.reportUpdate();
    expect(component.reportDrawerOpen()).toBeTrue();

    component.handleReportSubmitted({
      reason: 'correction',
      summary: 'Environment Canada upgraded the ice accumulation estimate to 20 mm.',
      sourceUrl: 'https://weather.gc.ca',
    });

    expect(alertUpdateQueue.queueUpdate).toHaveBeenCalledWith({
      alertId: 'alert-001',
      alertTitle: 'Ice storm risk on Ontario transmission lines',
      route: '/feed/alerts/alert-001',
      payload: {
        reason: 'correction',
        summary: 'Environment Canada upgraded the ice accumulation estimate to 20 mm.',
        sourceUrl: 'https://weather.gc.ca',
      },
    });
    expect(component.reportSubmitState()).toBe('success');
    expect(component.subscribed()).toBeFalse();
    expect(notifications.success).toHaveBeenCalled();
  });

  it('does not queue a duplicate report once submission already succeeded', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      handleReportSubmitted: (payload: { reason: 'correction'; summary: string; sourceUrl: string | null }) => void;
    };

    const payload = {
      reason: 'correction' as const,
      summary: 'Environment Canada upgraded the ice accumulation estimate to 20 mm.',
      sourceUrl: 'https://weather.gc.ca',
    };

    component.handleReportSubmitted(payload);
    component.handleReportSubmitted(payload);

    expect(alertUpdateQueue.queueUpdate).toHaveBeenCalledTimes(1);
  });

  it('derives alert context from live item metadata instead of fixed demo sources', async () => {
    const item = {
      ...createAlertItem('alert-live-source'),
      source: {
        kind: 'COMPANY' as const,
        label: 'Hydro Ottawa',
        url: 'https://hydroottawa.com/advisories',
      },
      accessibilitySummary: 'Line crews are monitoring icing on east corridors.',
    };
    feed.findItemById.and.resolveTo(item);
    feed.items.set([item]);
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-live-source' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => {
        subtitle: string;
        sources: readonly { label: string; href?: string | null }[];
        summaryPoints: readonly string[];
      } | null;
    };

    expect(component.detailVm()?.subtitle).toContain('Hydro Ottawa');
    expect(component.detailVm()?.sources[0]).toEqual(
      jasmine.objectContaining({
        label: 'Hydro Ottawa',
        href: 'https://hydroottawa.com/advisories',
      })
    );
    expect(component.detailVm()?.summaryPoints[0]).toContain('Line crews are monitoring icing on east corridors');
  });

  it('recomputes localized labels when the active language changes', async () => {
    const translate = TestBed.inject(TranslateService);
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { severityLabel: string } | null;
    };

    expect(component.detailVm()?.severityLabel).toBe('High EN');

    await firstValueFrom(translate.use('fr'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.detailVm()?.severityLabel).toBe('Elevee FR');
  });

  it('navigates to feed with linked opportunity draft query params', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      createOpportunity: () => Promise<void>;
    };

    await component.createOpportunity();

    expect(router.navigate).toHaveBeenCalledTimes(1);
    const callArgs = router.navigate.calls.mostRecent().args;
    expect(callArgs[0]).toEqual(['/feed']);
    expect(connectionMatcher.resolveDraftConnectionMatchId).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'REQUEST',
        sectorId: 'energy',
        fromProvinceId: 'qc',
        toProvinceId: 'on',
        mode: 'IMPORT',
      })
    );
    expect(callArgs[1]?.queryParams).toEqual(
      jasmine.objectContaining({
        type: 'REQUEST',
        mode: 'IMPORT',
        draftSource: 'alert',
        draftAlertId: 'alert-001',
        draftType: 'REQUEST',
        draftMode: 'IMPORT',
        draftSectorId: 'energy',
        draftFromProvinceId: 'qc',
        draftToProvinceId: 'on',
        draftConnectionMatchId: '73',
      })
    );
    expect(notifications.success).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.objectContaining({
        source: 'feed',
        metadata: jasmine.objectContaining({
          action: 'create-linked-opportunity',
          itemId: 'alert-001',
          draftConnectionMatchId: 73,
        }),
      })
    );
  });

  it('normalizes accented tags when creating a linked opportunity draft', async () => {
    const item = {
      ...createAlertItem('alert-accented-tags'),
      tags: ['Québec', 'éolien'],
    };
    feed.findItemById.and.resolveTo(item);
    feed.items.set([item]);
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-accented-tags' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      createOpportunity: () => Promise<void>;
    };

    await component.createOpportunity();

    const callArgs = router.navigate.calls.mostRecent().args;
    expect(callArgs[1]?.queryParams?.['draftTags']).toContain('quebec');
    expect(callArgs[1]?.queryParams?.['draftTags']).toContain('eolien');
  });

  it('surfaces an error toast when linked opportunity navigation fails', async () => {
    router.navigate.and.resolveTo(false);

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      createOpportunity: () => Promise<void>;
    };

    await component.createOpportunity();

    expect(notifications.error).toHaveBeenCalledWith(
      jasmine.any(String),
      jasmine.objectContaining({
        source: 'feed',
        metadata: jasmine.objectContaining({
          action: 'create-linked-opportunity',
          itemId: 'alert-001',
        }),
      })
    );
  });

  it('navigates to associated opportunity detail', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      openRelatedOpportunity: (id: string) => void;
    };

    component.openRelatedOpportunity('opportunity-001');
    expect(router.navigate).toHaveBeenCalledWith(['/feed', 'opportunities', 'opportunity-001']);
  });

  it('returns empty related collections when no real linked entries exist', async () => {
    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => {
        relatedAlerts: readonly { id: string | null }[];
        relatedOpportunities: readonly { id: string }[];
      } | null;
    };

    expect(component.detailVm()?.relatedAlerts).toEqual([]);
    expect(component.detailVm()?.relatedOpportunities).toEqual([]);
  });

  it('ranks related entries by direct linkage and shared alert context', async () => {
    const current = createAlertItem('alert-scored');
    const sameRouteAlert = createAlertItem('alert-related-1');
    const sameSectorAlert = createAlertItem('alert-related-2', {
      fromProvinceId: 'mb',
      toProvinceId: 'sk',
      tags: ['storage'],
      title: 'Sector-only related alert',
    });
    const unrelatedAlert = createAlertItem('alert-unrelated', {
      sectorId: 'agri',
      fromProvinceId: 'bc',
      toProvinceId: 'ab',
      tags: ['grain'],
      source: { kind: 'USER', label: 'Community feed' },
      title: 'Unrelated alert',
    });
    const directOpportunity = createOpportunityItem('opportunity-direct', {
      originType: 'alert',
      originId: 'alert-scored',
      sectorId: 'manufacturing',
      fromProvinceId: 'ns',
      toProvinceId: 'nb',
      tags: ['repair'],
      title: 'Directly linked opportunity',
    });
    const contextualOpportunity = createOpportunityItem('opportunity-context', {
      title: 'Contextual opportunity',
    });
    const unrelatedOpportunity = createOpportunityItem('opportunity-unrelated', {
      sectorId: 'agri',
      fromProvinceId: 'bc',
      toProvinceId: 'ab',
      tags: ['grain'],
      source: { kind: 'USER', label: 'Marketplace post' },
      title: 'Unrelated opportunity',
    });

    feed.findItemById.and.resolveTo(current);
    feed.items.set([
      current,
      unrelatedAlert,
      sameSectorAlert,
      sameRouteAlert,
      unrelatedOpportunity,
      contextualOpportunity,
      directOpportunity,
    ]);
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-scored' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => {
        relatedAlerts: readonly { id: string | null }[];
        relatedOpportunities: readonly { id: string }[];
      } | null;
    };

    expect(component.detailVm()?.relatedAlerts.map(entry => entry.id)).toEqual([
      'alert-related-1',
      'alert-related-2',
    ]);
    expect(component.detailVm()?.relatedOpportunities.map(entry => entry.id)).toEqual([
      'opportunity-direct',
      'opportunity-context',
    ]);
  });

  it('loads alert detail by id via service fallback when feed collection is unavailable', async () => {
    const item = createAlertItem('alert-fallback');
    feed.items.set([]);
    feed.findItemById.and.resolveTo(item);
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-fallback' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { item: FeedItem } | null;
    };

    expect(feed.findItemById).toHaveBeenCalledWith('alert-fallback');
    expect(component.detailVm()?.item.id).toBe('alert-fallback');
  });

  it('marks a missing detail as not found when the lookup resolves null', async () => {
    feed.items.set([]);
    feed.findItemById.and.resolveTo(null);
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-missing' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { item: FeedItem } | null;
      notFound: () => boolean;
      retryAvailable: () => boolean;
    };

    expect(component.detailVm()).toBeNull();
    expect(component.notFound()).toBeTrue();
    expect(component.retryAvailable()).toBeFalse();
  });

  it('allows retry after a transient detail load failure', async () => {
    const item = createAlertItem('alert-retry');
    feed.items.set([]);
    feed.findItemById.and.returnValues(
      Promise.reject(new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' })),
      Promise.resolve(item)
    );
    routeParamMap$.next(convertToParamMap({ itemId: 'alert-retry' }));

    const fixture = TestBed.createComponent(FeedAlertDetailPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const component = fixture.componentInstance as unknown as {
      detailVm: () => { item: FeedItem } | null;
      retryAvailable: () => boolean;
      retry: () => void;
    };

    expect(component.detailVm()).toBeNull();
    expect(component.retryAvailable()).toBeTrue();

    component.retry();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(feed.reload).toHaveBeenCalled();
    expect(feed.findItemById).toHaveBeenCalledTimes(2);
    expect(component.detailVm()?.item.id).toBe('alert-retry');
    expect(component.retryAvailable()).toBeFalse();
  });
});
