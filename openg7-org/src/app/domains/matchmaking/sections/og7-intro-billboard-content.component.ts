import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  PLATFORM_ID,
  Signal,
  TemplateRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ConnectionAttachment,
  ConnectionDraft,
  IncotermCode,
  TransportMode,
} from '@app/core/models/connection';
import { OpportunityMatch, normalizeConfidencePercent } from '@app/core/models/opportunity';
import { FinancingBanner, PartnerProfile } from '@app/core/models/partner-profile';
import { AnalyticsService } from '@app/core/observability/analytics.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { PartnerProfileService } from '@app/core/services/partner-profile.service';
import { ShareResult, ShareService } from '@app/core/services/share.service';
import {
  IntroStepperDefaults,
  Og7IntroStepId,
  Og7IntroStepperComponent,
} from '@app/domains/matchmaking/og7-mise-en-relation/og7-intro-stepper.component';
import { Og7ComplianceChecklistComponent } from '@app/shared/components/connection/og7-compliance-checklist/og7-compliance-checklist.component';
import { Og7MeetingSchedulerComponent } from '@app/shared/components/connection/og7-meeting-scheduler/og7-meeting-scheduler.component';
import { Og7CtaRailComponent } from '@app/shared/components/cta/og7-cta-rail.component';
import { Og7FinancingBannerComponent } from '@app/shared/components/financing/og7-financing-banner.component';
import { Og7IncotermsRibbonComponent } from '@app/shared/components/logistics/og7-incoterms-ribbon.component';
import { Og7ScoreboardPipelineComponent } from '@app/shared/components/pipeline/og7-scoreboard-pipeline.component';
import {
  selectConnectionCreating,
  selectPipelineSteps,
  selectPipelineStart,
  selectConnectionError,
  selectCurrentStage,
  selectDraftsByMatch,
  selectSubmissionsByMatch,
  selectAttachments,
  selectMeetingSlots,
} from '@app/state';
import { AppState } from '@app/state/app.state';
import { ConnectionsActions } from '@app/store/connections/connections.actions';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { EMPTY, catchError, finalize, of, switchMap, tap } from 'rxjs';

@Component({
  selector: 'og7-intro-billboard-content',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    Og7CtaRailComponent,
    Og7ScoreboardPipelineComponent,
    Og7IncotermsRibbonComponent,
    Og7FinancingBannerComponent,
    Og7ComplianceChecklistComponent,
    Og7MeetingSchedulerComponent,
    Og7IntroStepperComponent,
  ],
  templateUrl: './og7-intro-billboard-content.component.html',
  styleUrls: ['./og7-intro-billboard.view.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display: contents;',
  },
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/matchmaking/sections » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Intro Billboard Content ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7IntroBillboardContentComponent gérée par le framework.
 */
export class Og7IntroBillboardContentComponent implements AfterViewInit {
  private readonly store = inject(Store<AppState>);
  private readonly analytics = inject(AnalyticsService);
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly partnerProfiles = inject(PartnerProfileService);
  private readonly shareService = inject(ShareService);

  @ViewChild(Og7IntroStepperComponent)
  private set stepper(component: Og7IntroStepperComponent | undefined) {
    this.introStepper = component ?? null;
    if (!this.introStepper) {
      return;
    }
    if (this.pendingStepperState) {
      this.introStepper.applyDefaults(this.pendingStepperState);
    } else if (this.baselineStepperState) {
      this.introStepper.applyDefaults(this.baselineStepperState);
    } else {
      this.introStepper.resetState();
    }
    this.syncPendingFromStepper();
    if (this.queuedStepNavigation) {
      const targetStep = this.queuedStepNavigation;
      this.queuedStepNavigation = null;
      queueMicrotask(() => this.introStepper?.goToStep(targetStep));
    }
  }

  @ViewChild('primaryTemplate', { read: TemplateRef })
  public primaryTemplate: TemplateRef<unknown> | null = null;

  @ViewChild('ctaRailTemplate', { read: TemplateRef })
  public ctaRailTemplate: TemplateRef<unknown> | null = null;

  @ViewChild('pipelineTemplate', { read: TemplateRef })
  public pipelineTemplate: TemplateRef<unknown> | null = null;

  @ViewChild('incotermsTemplate', { read: TemplateRef })
  public incotermsTemplate: TemplateRef<unknown> | null = null;

  @ViewChild('financingTemplate', { read: TemplateRef })
  public financingTemplate: TemplateRef<unknown> | null = null;

  @ViewChild('complianceTemplate', { read: TemplateRef })
  public complianceTemplate: TemplateRef<unknown> | null = null;

  @ViewChild('schedulerTemplate', { read: TemplateRef })
  public schedulerTemplate: TemplateRef<unknown> | null = null;

  private introStepper: Og7IntroStepperComponent | null = null;
  private pendingStepperState: IntroStepperDefaults | null = null;
  private baselineStepperState: IntroStepperDefaults | null = null;
  private queuedStepNavigation: Og7IntroStepId | null = null;

  private lastLoggedMatchId: number | null = null;

  readonly matchSelected = input<OpportunityMatch | null>(null);
  readonly selectedPartnerId = input<Signal<string | null> | null>(null);
  readonly financingBanner = input<FinancingBanner | null>(null);
  readonly forcePanelOpen = input(false);
  readonly introductionSubmitted = output<ConnectionDraft>();
  readonly closeRequested = output<void>();

  private readonly locale = signal<'fr' | 'en'>(this.resolveLocale(this.translate.currentLang));
  private readonly buyerProfileSignal = signal<PartnerProfile | null>(null);
  private readonly supplierProfileSignal = signal<PartnerProfile | null>(null);
  private readonly downloadingProfileSignal = signal(false);
  private readonly draftsSignal = this.store.selectSignal(selectDraftsByMatch);
  private readonly submissionsSignal = this.store.selectSignal(selectSubmissionsByMatch);
  private readonly attachmentsSignal = this.store.selectSignal(selectAttachments);
  private readonly meetingSlotsSignal = this.store.selectSignal(selectMeetingSlots);

  private readonly creatingSignal = this.store.selectSignal(selectConnectionCreating);
  private readonly stepsSignal = this.store.selectSignal(selectPipelineSteps);
  private readonly pipelineStartSignal = this.store.selectSignal(selectPipelineStart);
  private readonly errorSignal = this.store.selectSignal(selectConnectionError);
  private readonly stageSignal = this.store.selectSignal(selectCurrentStage);

  protected readonly buyerProfile = computed(() => this.buyerProfileSignal());
  protected readonly supplierProfile = computed(() => this.supplierProfileSignal());
  protected readonly downloadingProfile = computed(() => this.downloadingProfileSignal());
  protected readonly creating = computed(() => this.creatingSignal());
  protected readonly pipelineSteps = computed(() => this.stepsSignal());
  protected readonly pipelineStart = computed(() => this.pipelineStartSignal());
  protected readonly connectionError = computed(() => this.errorSignal());
  protected readonly currentStage = computed(() => this.stageSignal());
  protected readonly partnerPanelOpen = computed(() => {
    if (this.forcePanelOpen()) {
      return true;
    }
    const source = this.selectedPartnerId();
    return source ? Boolean(source()) : false;
  });

  public readonly scorePercent = computed(() => {
    const match = this.matchSelected();
    return match ? normalizeConfidencePercent(match.confidence) : 0;
  });

  protected readonly matchTitle = computed(() => this.matchSelected()?.commodity ?? '');
  protected readonly subtitle = computed(() => {
    const match = this.matchSelected();
    if (!match) {
      return '';
    }
    const buyerProvince = this.translate.instant(`provinces.${match.buyer.province}`);
    const sellerProvince = this.translate.instant(`provinces.${match.seller.province}`);
    const buyerSector = this.translate.instant(`sectors.${match.buyer.sector}`);
    const sellerSector = this.translate.instant(`sectors.${match.seller.sector}`);
    return `${buyerProvince} ↔ ${sellerProvince} • ${buyerSector} / ${sellerSector}`;
  });

  protected readonly distanceText = computed(() => {
    const match = this.matchSelected();
    if (!match || match.distanceKm == null) {
      return '';
    }
    return this.translate.instant('introBillboard.distance', { value: match.distanceKm });
  });

  protected readonly co2Text = computed(() => {
    const match = this.matchSelected();
    if (!match || match.co2Estimate == null) {
      return '';
    }
    return this.translate.instant('introBillboard.co2', { value: match.co2Estimate });
  });

  public readonly savedDraft = computed(() => {
    const match = this.matchSelected();
    if (!match) {
      return null;
    }
    const drafts = this.draftsSignal();
    return drafts ? (drafts[match.id] ?? null) : null;
  });

  public readonly existingSubmission = computed(() => {
    const match = this.matchSelected();
    if (!match) {
      return null;
    }
    const submissions = this.submissionsSignal();
    return submissions ? (submissions[match.id] ?? null) : null;
  });

  public readonly hasSavedDraft = computed(() => this.savedDraft() !== null);
  public readonly hasExistingRequest = computed(() => this.existingSubmission() !== null);

  public readonly existingRequestStageKey = computed(() => {
    const stage = this.existingSubmission()?.record?.stage ?? null;
    return stage ? `introBillboard.existing.stage.${stage}` : null;
  });

  public readonly existingRequestTimestamp = computed(
    () =>
      this.existingSubmission()?.record?.updatedAt ??
      this.existingSubmission()?.record?.createdAt ??
      null,
  );

  protected readonly ndaPreviewLink = computed(() => this.resolveAttachmentPreview('nda'));
  protected readonly rfqPreviewLink = computed(() => this.resolveAttachmentPreview('rfq'));
  protected readonly successState = computed(
    () => !this.creating() && this.currentStage() !== 'intro',
  );

  public readonly buyerDeepLink = computed(() => {
    const match = this.matchSelected();
    const buyer = this.buyerProfile();
    const id = buyer?.id ?? match?.buyer.id ?? null;
    if (id == null) {
      return null;
    }
    return `/partners/${id}?role=buyer`;
  });

  public readonly supplierDeepLink = computed(() => {
    const match = this.matchSelected();
    const supplier = this.supplierProfile();
    const id = supplier?.id ?? match?.seller.id ?? null;
    if (id == null) {
      return null;
    }
    return `/partners/${id}?role=supplier`;
  });

  constructor() {
    toObservable(this.matchSelected)
      .pipe(
        switchMap((match) => {
          const id = match?.buyer.id ?? null;
          if (!id) {
            this.buyerProfileSignal.set(null);
            return of<PartnerProfile | null>(null);
          }
          return this.partnerProfiles.getProfile(String(id), 'buyer');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => this.buyerProfileSignal.set(profile));

    toObservable(this.matchSelected)
      .pipe(
        switchMap((match) => {
          const id = match?.seller.id ?? null;
          if (!id) {
            this.supplierProfileSignal.set(null);
            return of<PartnerProfile | null>(null);
          }
          return this.partnerProfiles.getProfile(String(id), 'supplier');
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((profile) => this.supplierProfileSignal.set(profile));

    effect(() => {
      const match = this.matchSelected();
      const savedDraft = this.savedDraft();
      const submission = this.existingSubmission();

      if (!match) {
        this.applyStepperDefaults(null);
        this.lastLoggedMatchId = null;
        return;
      }

      if (savedDraft) {
        this.applyStepperDefaults(savedDraft);
        this.syncSelectionsFromDefaults(savedDraft);
        this.lastLoggedMatchId = match.id;
        return;
      }

      if (submission) {
        this.applyStepperDefaults(submission.draft);
        this.syncSelectionsFromDefaults(submission.draft);
        this.lastLoggedMatchId = match.id;
        return;
      }

      if (this.lastLoggedMatchId !== match.id) {
        const defaults: IntroStepperDefaults = {
          message: this.buildPrefillIntro(match, this.locale()),
          attachments: ['nda'],
          meetingSlots: this.generateDefaultSlots(),
          transports: ['road'],
          incoterm: 'FCA',
        };
        this.applyStepperDefaults(defaults);
        this.syncSelectionsFromDefaults(defaults);
        this.analytics.emit('intro_template_loaded', { matchId: match.id }, { priority: true });
        this.lastLoggedMatchId = match.id;
      }
    });

    const sub = this.translate.onLangChange.subscribe((event) => {
      const locale = this.resolveLocale(event.lang);
      this.locale.set(locale);
      const match = this.matchSelected();
      if (!match) {
        return;
      }
      const stepper = this.introStepper;
      const touched = stepper?.messageTouched() ?? false;
      if (touched) {
        return;
      }
      const message = this.buildPrefillIntro(match, locale);

      if (stepper) {
        stepper.setIntroMessage(message, { touched: false });
        if (this.baselineStepperState) {
          this.baselineStepperState = this.cloneDefaults({
            ...this.baselineStepperState,
            message,
          });
        }
        this.syncPendingFromStepper();
        return;
      }

      if (this.baselineStepperState) {
        this.baselineStepperState = this.cloneDefaults({
          ...this.baselineStepperState,
          message,
        });
        return;
      }

      const defaults: IntroStepperDefaults = {
        message,
        attachments: ['nda'],
        meetingSlots: this.generateDefaultSlots(),
        transports: ['road'],
        incoterm: 'FCA',
      };
      this.baselineStepperState = this.cloneDefaults(defaults);
      this.pendingStepperState = null;
    });
    this.destroyRef.onDestroy(() => sub.unsubscribe());
  }

  ngAfterViewInit(): void {
    if (!this.browser) {
      return;
    }
    queueMicrotask(() => {
      const match = this.matchSelected();
      if (match) {
        this.analytics.emit('billboard_viewed', { matchId: match.id }, { priority: true });
      } else {
        this.analytics.emit('billboard_viewed', {}, { priority: true });
      }
    });
  }

  protected onIntroChange(_value: string): void {
    if (!this.introStepper) {
      return;
    }
    this.syncPendingFromStepper();
  }

  protected handleNdaChange(selected: boolean): void {
    this.updateAttachmentsThroughStepper('nda', selected);
  }

  protected handleRfqChange(selected: boolean): void {
    this.updateAttachmentsThroughStepper('rfq', selected);
  }

  protected handleSlotsUpdated(slots: readonly string[]): void {
    const stepper = this.introStepper;
    const sanitized = stepper ? stepper.setMeetingSlots(slots) : this.sanitizeSlots(slots);
    if (stepper) {
      this.syncPendingFromStepper();
    }
    this.store.dispatch(ConnectionsActions.meetingSlotsUpdated({ slots: sanitized }));
  }

  protected handleComplianceShortcut(): void {
    this.navigateStepper('compliance');
  }

  protected handleSchedulerShortcut(): void {
    this.navigateStepper('scheduler');
  }

  protected handleTransportsChange(modes: TransportMode[]): void {
    const stepper = this.introStepper;
    if (!stepper) {
      return;
    }
    stepper.setTransports(modes);
    this.syncPendingFromStepper();
  }

  protected handleIncotermChange(code: IncotermCode | null): void {
    const stepper = this.introStepper;
    if (!stepper) {
      return;
    }
    stepper.setIncoterm(code);
    this.syncPendingFromStepper();
  }

  protected handleFinancingCta(url: string): void {
    this.analytics.emit('financing_cta_clicked', { url }, { priority: true });
  }

  private navigateStepper(step: Og7IntroStepId): void {
    const stepper = this.introStepper;
    if (stepper) {
      stepper.goToStep(step);
      return;
    }
    this.queuedStepNavigation = step;
  }

  public sendIntroduction(): void {
    const stepper = this.introStepper;
    const match = this.matchSelected();
    const buyer = this.buyerProfile();
    const supplier = this.supplierProfile();

    if (!match || !buyer || !supplier) {
      this.notifications.error(this.translate.instant('introBillboard.missingProfiles'), {
        source: 'matches',
        metadata: { step: 'profiles' },
      });
      return;
    }

    if (!stepper) {
      this.notifications.error(this.translate.instant('introBillboard.pipelineIncomplete'), {
        source: 'matches',
        metadata: { step: 'pipeline' },
      });
      return;
    }

    if (!stepper.messageReady()) {
      stepper.touchMessage();
      this.notifications.error(this.translate.instant('introBillboard.messageIncomplete'), {
        source: 'matches',
        metadata: { step: 'introduction' },
      });
      return;
    }

    if (!stepper.complianceReady()) {
      this.notifications.error(this.translate.instant('introBillboard.complianceIncomplete'), {
        source: 'matches',
        metadata: { step: 'compliance' },
      });
      return;
    }

    if (!stepper.schedulerReady()) {
      this.notifications.error(this.translate.instant('introBillboard.schedulerIncomplete'), {
        source: 'matches',
        metadata: { step: 'scheduler' },
      });
      return;
    }

    if (!stepper.logisticsReady()) {
      this.notifications.error(this.translate.instant('introBillboard.logisticsIncomplete'), {
        source: 'matches',
        metadata: { step: 'logistics' },
      });
      return;
    }

    if (!stepper.pipelineReady()) {
      this.notifications.error(this.translate.instant('introBillboard.pipelineIncomplete'), {
        source: 'matches',
        metadata: { step: 'pipeline' },
      });
      return;
    }

    const draft: ConnectionDraft = {
      matchId: match.id,
      buyerProfile: buyer,
      supplierProfile: supplier,
      introMessage: stepper.messageValue().trim(),
      attachments: [...stepper.attachmentsSelected()],
      meetingSlots: [...stepper.meetingSlots()],
      logistics: {
        transports: [...stepper.selectedTransports()],
        incoterm: stepper.selectedIncoterm(),
      },
      locale: this.locale(),
    };

    this.introductionSubmitted.emit(draft);
    this.store.dispatch(ConnectionsActions.createConnection({ draft }));
  }

  public handleIntroductionRequest(profile: PartnerProfile): void {
    if (this.canSendIntroduction()) {
      this.analytics.emit(
        'partner_intro_requested',
        { id: profile.id, role: profile.role },
        { priority: true },
      );
    }
    this.sendIntroduction();
  }

  public handleShare(profile: PartnerProfile): void {
    if (!this.browser) {
      return;
    }
    const metadata = { action: 'share-profile', profileId: profile.id } as const;
    this.shareService
      .sharePartnerProfile(profile)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result: ShareResult) => {
          this.notifications.success(this.translate.instant('introBillboard.shareSuccess'), {
            source: 'matches',
            metadata: { ...metadata, strategy: result },
          });
          this.analytics.emit(
            'partner_card_share',
            { id: profile.id, role: profile.role, result },
            { priority: true },
          );
        },
        error: (error: unknown) => {
          this.notifications.error(this.translate.instant('introBillboard.shareError'), {
            source: 'matches',
            metadata: { ...metadata, error },
          });
        },
      });
  }

  public handleDownload(profile: PartnerProfile): void {
    this.analytics.emit(
      'partner_card_download',
      { id: profile.id, role: profile.role },
      { priority: true },
    );
    if (this.downloadingProfileSignal()) {
      return;
    }

    if (!this.browser) {
      this.notifications.error(this.translate.instant('introBillboard.downloadUnsupported'), {
        source: 'matches',
        metadata: { action: 'download-profile', profileId: profile?.id },
      });
      return;
    }

    const metadata = { action: 'download-profile', profileId: profile?.id } as const;
    const pendingId = this.notifications.info(
      this.translate.instant('introBillboard.downloadPending'),
      {
        source: 'matches',
        metadata,
      },
    );

    this.downloadingProfileSignal.set(true);

    this.partnerProfiles
      .downloadProfile(String(profile.id), profile.role)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((blob) => {
          this.triggerProfileDownload(blob, profile);
          this.notifications.success(this.translate.instant('introBillboard.downloadSuccess'), {
            source: 'matches',
            metadata,
          });
        }),
        catchError((error) => {
          this.notifications.error(this.translate.instant('introBillboard.downloadError'), {
            source: 'matches',
            metadata: { ...metadata, error },
          });
          return EMPTY;
        }),
        finalize(() => {
          if (pendingId) {
            this.notifications.dismiss(pendingId);
          }
          this.downloadingProfileSignal.set(false);
        }),
      )
      .subscribe();
  }

  public handlePanelClosed(): void {
    this.closeRequested.emit();
  }

  public hasCtaData(): boolean {
    const match = this.matchSelected();
    if (!match) {
      return false;
    }
    const stepper = this.introStepper;
    if (stepper) {
      if (stepper.readyToSend()) {
        return true;
      }
      if (stepper.attachmentsSelected().length > 0) {
        return true;
      }
      if (stepper.meetingSlots().length > 0) {
        return true;
      }
    }
    return this.attachmentsSignal().length > 0 || this.meetingSlotsSignal().length > 0;
  }

  public hasPipelineData(): boolean {
    if (!this.matchSelected()) {
      return false;
    }
    const steps = this.pipelineSteps();
    return steps.some((step) => step.status !== 'upcoming' || Boolean(step.timestamp));
  }

  public hasIncotermsData(): boolean {
    if (!this.matchSelected()) {
      return false;
    }
    const stepper = this.introStepper;
    if (stepper) {
      return stepper.selectedTransports().length > 0 || Boolean(stepper.selectedIncoterm());
    }
    const defaults = this.pendingStepperState ?? this.baselineStepperState;
    if (!defaults) {
      return false;
    }
    return defaults.transports.length > 0 || defaults.incoterm != null;
  }

  public hasFinancingData(): boolean {
    return Boolean(this.matchSelected()) && Boolean(this.financingBanner());
  }

  public hasComplianceData(): boolean {
    return Boolean(this.matchSelected()) && this.attachmentsSignal().length > 0;
  }

  public hasSchedulerData(): boolean {
    return Boolean(this.matchSelected()) && this.meetingSlotsSignal().length > 0;
  }

  public hasUnsavedChanges(): boolean {
    return this.pendingStepperState !== null;
  }

  public buildDraftSnapshot(): IntroStepperDefaults {
    if (this.pendingStepperState) {
      return this.cloneDefaults(this.pendingStepperState);
    }
    const stepper = this.introStepper;
    if (!stepper) {
      return this.baselineStepperState
        ? this.cloneDefaults(this.baselineStepperState)
        : this.emptyDefaults();
    }
    return {
      message: stepper.messageValue(),
      attachments: [...stepper.attachmentsSelected()],
      meetingSlots: [...stepper.meetingSlots()],
      transports: [...stepper.selectedTransports()],
      incoterm: stepper.selectedIncoterm(),
    };
  }

  public markDraftPersisted(snapshot: IntroStepperDefaults | null): void {
    this.baselineStepperState = snapshot ? this.cloneDefaults(snapshot) : null;
    this.pendingStepperState = null;
    this.syncPendingFromStepper();
  }

  public resetToBaseline(): void {
    if (this.baselineStepperState) {
      this.applyStepperDefaults(this.baselineStepperState);
    } else {
      this.applyStepperDefaults(null);
    }
  }

  public formatTimestamp(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return null;
    }
    const formatter = new Intl.DateTimeFormat(this.locale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    return formatter.format(timestamp);
  }

  protected stepperRef(): Og7IntroStepperComponent | null {
    return this.introStepper;
  }

  protected logisticsSummary(): string {
    const stepper = this.introStepper;
    if (!stepper) {
      return '';
    }
    const transports = stepper.selectedTransports();
    const incoterm = stepper.selectedIncoterm();
    const labels = transports.map((mode) =>
      this.translate.instant(`introBillboard.transport.${mode}`),
    );
    if (incoterm) {
      labels.push(this.translate.instant(`introBillboard.incoterms.${incoterm}`));
    }
    return labels.join(' • ');
  }

  private syncSelectionsFromDefaults(defaults: IntroStepperDefaults): void {
    const stepper = this.introStepper;
    const attachments = stepper?.attachmentsSelected() ?? defaults.attachments;
    const slots = stepper?.meetingSlots() ?? defaults.meetingSlots;
    this.store.dispatch(ConnectionsActions.attachmentsUpdated({ attachments }));
    this.store.dispatch(ConnectionsActions.meetingSlotsUpdated({ slots }));
  }

  private updateAttachmentsThroughStepper(key: ConnectionAttachment, enabled: boolean): void {
    const stepper = this.introStepper;
    if (!stepper) {
      return;
    }
    const updated = stepper.updateAttachment(key, enabled);
    this.syncPendingFromStepper();
    this.store.dispatch(ConnectionsActions.attachmentsUpdated({ attachments: updated }));
  }

  private sanitizeSlots(slots: readonly string[]): readonly string[] {
    const normalized: string[] = [];
    for (const slot of slots) {
      const resolved = this.normalizeSlotValue(slot);
      if (resolved && !normalized.includes(resolved)) {
        normalized.push(resolved);
      }
    }
    return normalized;
  }

  private normalizeSlotValue(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      return trimmed;
    }
    return this.formatForInput(date);
  }

  private syncPendingFromStepper(): void {
    const stepper = this.introStepper;
    if (!stepper) {
      return;
    }
    const message = stepper.messageValue();
    const attachments = [...stepper.attachmentsSelected()];
    const meetingSlots = [...stepper.meetingSlots()];
    const transports = [...stepper.selectedTransports()];
    const incoterm = stepper.selectedIncoterm();
    const hasContent =
      message.trim().length > 0 ||
      attachments.length > 0 ||
      meetingSlots.length > 0 ||
      transports.length > 0 ||
      incoterm != null;
    if (!hasContent) {
      this.pendingStepperState = null;
      return;
    }

    const snapshot: IntroStepperDefaults = {
      message,
      attachments,
      meetingSlots,
      transports,
      incoterm,
    };

    if (this.baselineStepperState && this.defaultsEqual(snapshot, this.baselineStepperState)) {
      this.pendingStepperState = null;
      return;
    }

    this.pendingStepperState = snapshot;
  }

  private applyStepperDefaults(defaults: IntroStepperDefaults | null): void {
    this.baselineStepperState = defaults ? this.cloneDefaults(defaults) : null;
    if (!this.introStepper) {
      this.pendingStepperState = null;
      return;
    }
    if (!defaults) {
      this.introStepper.resetState();
      this.pendingStepperState = null;
      return;
    }
    this.introStepper.applyDefaults(defaults);
    this.syncPendingFromStepper();
  }

  private canSendIntroduction(): boolean {
    const stepper = this.introStepper;
    if (!stepper) {
      return false;
    }
    const match = this.matchSelected();
    const buyer = this.buyerProfile();
    const supplier = this.supplierProfile();
    return Boolean(match) && Boolean(buyer) && Boolean(supplier) && stepper.readyToSend();
  }

  private buildPrefillIntro(match: OpportunityMatch, locale: 'fr' | 'en'): string {
    if (locale === 'fr') {
      const buyerName = match.buyer.name;
      const supplierName = match.seller.name;
      const commodity = match.commodity;
      return (
        `Bonjour ${buyerName},\n\nNous vous présentons ${supplierName}, un partenaire clef pour ${commodity}. ` +
        `Leur offre répond aux besoins identifiés dans votre province et respecte nos standards ESG. ` +
        `Souhaitez-vous planifier une introduction formelle cette semaine ?\n\nBien cordialement,\nÉquipe OpenG7`
      );
    }
    const buyerName = match.buyer.name;
    const supplierName = match.seller.name;
    const commodity = match.commodity;
    return (
      `Hello ${buyerName},\n\nWe would like to introduce ${supplierName}, a strategic fit for ${commodity}. ` +
      `This supplier meets compliance and ESG expectations for your province. ` +
      `Can we schedule a formal introduction call this week?\n\nWarm regards,\nOpenG7 team`
    );
  }

  private generateDefaultSlots(): readonly string[] {
    const slots: string[] = [];
    const now = new Date();
    for (let i = 1; i <= 3; i += 1) {
      const next = new Date(now.getTime());
      next.setDate(now.getDate() + i);
      next.setHours(10 + i, 0, 0, 0);
      slots.push(this.formatForInput(next));
    }
    return slots;
  }

  private cloneDefaults(defaults: IntroStepperDefaults): IntroStepperDefaults {
    return {
      message: defaults.message,
      attachments: [...defaults.attachments],
      meetingSlots: [...defaults.meetingSlots],
      transports: [...defaults.transports],
      incoterm: defaults.incoterm ?? null,
    };
  }

  private emptyDefaults(): IntroStepperDefaults {
    return {
      message: '',
      attachments: [],
      meetingSlots: [],
      transports: [],
      incoterm: null,
    };
  }

  private defaultsEqual(a: IntroStepperDefaults, b: IntroStepperDefaults): boolean {
    return (
      a.message.trim() === b.message.trim() &&
      this.arrayEqual(a.attachments, b.attachments) &&
      this.arrayEqual(a.meetingSlots, b.meetingSlots) &&
      this.arrayEqual(a.transports, b.transports) &&
      (a.incoterm ?? null) === (b.incoterm ?? null)
    );
  }

  private arrayEqual<T>(left: readonly T[], right: readonly T[]): boolean {
    if (left.length !== right.length) {
      return false;
    }
    return left.every((value, index) => value === right[index]);
  }

  private formatForInput(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private resolveLocale(lang: string | null | undefined): 'fr' | 'en' {
    if (!lang) {
      return 'en';
    }
    const lower = lang.toLowerCase();
    return lower.startsWith('fr') ? 'fr' : 'en';
  }

  private resolveAttachmentPreview(kind: ConnectionAttachment): string | null {
    const match = this.matchSelected();
    if (!match) {
      return null;
    }
    return `/cms/preview/${kind}?match=${match.id}`;
  }

  private triggerProfileDownload(blob: Blob, profile: PartnerProfile): void {
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = this.resolveDownloadFilename(blob, profile);
      anchor.rel = 'noopener';
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  private resolveDownloadFilename(blob: Blob, profile: PartnerProfile): string {
    const base = this.normalizeFilename(
      profile.displayName ?? profile.legalName ?? `partner-${profile.id}`,
    );
    const role = profile.role === 'buyer' ? 'buyer' : 'supplier';
    const extension = this.detectExtension(blob.type);
    return `${base}-${role}.${extension}`;
  }

  private normalizeFilename(source: string): string {
    const normalized = source
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (normalized) {
      return normalized;
    }
    return 'partner-profile';
  }

  private detectExtension(mime: string | undefined): string {
    if (!mime) {
      return 'bin';
    }
    if (mime.includes('pdf')) {
      return 'pdf';
    }
    if (mime.includes('zip')) {
      return 'zip';
    }
    if (mime.includes('json')) {
      return 'json';
    }
    if (mime.includes('msword')) {
      return 'doc';
    }
    if (mime.includes('spreadsheetml')) {
      return 'xlsx';
    }
    if (mime.includes('text/plain')) {
      return 'txt';
    }
    return 'bin';
  }
}
