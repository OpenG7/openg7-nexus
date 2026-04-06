import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Signal,
  TemplateRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OpportunityMatch, normalizeConfidencePercent } from '@app/core/models/opportunity';
import {
  FinancingBanner,
  PartnerAddress,
  PartnerProfile,
  PartnerTrustRecord,
  PartnerVerificationSource,
  PartnerVerificationStatus,
} from '@app/core/models/partner-profile';
import { parsePartnerSelection } from '@app/core/models/partner-selection';
import { PartnerProfileService } from '@app/core/services/partner-profile.service';
import { Og7IntroStepperComponent } from '@app/domains/matchmaking/og7-mise-en-relation/og7-intro-stepper.component';
import { PartnerQuickActionsComponent } from '@app/domains/partners/partners/ui/partner-quick-actions.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { of, switchMap } from 'rxjs';

import { Og7DualQrPanelComponent } from '../qr/og7-dual-qr-panel.component';
type PartnerDetailsTab = 'details' | 'collaboration' | 'qr';
let nextPanelId = 0;

@Component({
  selector: 'og7-partner-details-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule, PartnerQuickActionsComponent, Og7DualQrPanelComponent, Og7IntroStepperComponent],
  templateUrl: './partner-details-panel.component.html',
  styleUrls: ['./partner-details-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'og7-partner-panel-host',
  },
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/partner » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Partner Details Panel ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PartnerDetailsPanelComponent gérée par le framework.
 */
export class PartnerDetailsPanelComponent {
  private readonly service = inject(PartnerProfileService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);

  private readonly tablistRef = viewChild<ElementRef<HTMLElement>>('tablist');

  readonly primaryTemplate = input<TemplateRef<unknown> | null>(null);
  readonly ctaRailTemplate = input<TemplateRef<unknown> | null>(null);
  readonly pipelineTemplate = input<TemplateRef<unknown> | null>(null);
  readonly incotermsTemplate = input<TemplateRef<unknown> | null>(null);
  readonly financingTemplate = input<TemplateRef<unknown> | null>(null);
  readonly complianceTemplate = input<TemplateRef<unknown> | null>(null);
  readonly schedulerTemplate = input<TemplateRef<unknown> | null>(null);
  readonly ctaContentAvailable = input<boolean | null>(null);
  readonly pipelineContentAvailable = input<boolean | null>(null);
  readonly incotermsContentAvailable = input<boolean | null>(null);
  readonly financingContentAvailable = input<boolean | null>(null);
  readonly complianceContentAvailable = input<boolean | null>(null);
  readonly schedulerContentAvailable = input<boolean | null>(null);

  readonly selectedPartnerId = input<Signal<string | null> | null>(null);
  readonly confidencePercent = input(0);
  readonly buyerLink = input<string | null>(null);
  readonly supplierLink = input<string | null>(null);
  readonly matchContext = input<OpportunityMatch | null>(null);
  readonly financingContext = input<FinancingBanner | null>(null);
  readonly closed = output<void>();
  readonly download = output<PartnerProfile>();
  readonly share = output<PartnerProfile>();
  readonly introductionRequested = output<PartnerProfile>();

  protected readonly headingId = `og7-partner-panel-title-${++nextPanelId}`;
  protected readonly detailsPanelId = `${this.headingId}-details-panel`;
  protected readonly collaborationPanelId = `${this.headingId}-collaboration-panel`;
  protected readonly qrPanelId = `${this.headingId}-qr-panel`;
  protected readonly detailsTabId = `${this.headingId}-tab-details`;
  protected readonly collaborationTabId = `${this.headingId}-tab-collaboration`;
  protected readonly qrTabId = `${this.headingId}-tab-qr`;

  private readonly selectedValue = computed(() => {
    const source = this.selectedPartnerId();
    return source ? source() : null;
  });

  protected readonly open = computed(() => Boolean(this.selectedValue()));
  protected readonly loading = signal(false);
  protected readonly profile = signal<PartnerProfile | null>(null);
  protected readonly activeTab = signal<PartnerDetailsTab>('details');
  protected readonly tabOrder = computed<PartnerDetailsTab[]>(() => {
    const tabs: PartnerDetailsTab[] = ['details'];
    if (this.hasCollaborationContent()) {
      tabs.push('collaboration');
    }
    if (this.hasQrLinks()) {
      tabs.push('qr');
    }
    return tabs;
  });
  protected readonly activeTabIndex = computed(() => {
    const order = this.tabOrder();
    const index = order.indexOf(this.activeTab());
    return index >= 0 ? index : 0;
  });
  protected readonly tabMetrics = computed(() => {
    const order = this.tabOrder();
    return {
      count: order.length || 1,
      index: this.activeTabIndex(),
    };
  });
  private readonly locale = signal<'en' | 'fr'>(this.resolveLocale(this.translate.currentLang));

  protected readonly selectedPartner = computed(() => this.profile());
  protected readonly partnerScore = computed(() => {
    const match = this.matchContext();
    if (match) {
      return normalizeConfidencePercent(match.confidence);
    }
    const raw = this.confidencePercent();
    if (!Number.isFinite(raw)) {
      return 0;
    }
    const normalized = raw > 1 ? raw / 100 : raw;
    return normalizeConfidencePercent(normalized);
  });

  protected readonly partnerRole = computed(() => this.selectedPartner()?.role ?? null);
  protected readonly partnerRoleLabelKey = computed(() => {
    const role = this.partnerRole();
    if (role === 'buyer') {
      return 'introBillboard.buyerLabel';
    }
    if (role === 'supplier') {
      return 'introBillboard.supplierLabel';
    }
    return null;
  });

  protected readonly partnerProvince = computed(() => {
    const partner = this.selectedPartner();
    return partner?.province ?? partner?.address?.province ?? null;
  });

  protected readonly partnerProvinceLabelKey = computed(() => {
    const province = this.partnerProvince();
    return province ? `provinces.${province}` : null;
  });

  protected readonly partnerDisplayName = computed(() => this.selectedPartner()?.displayName ?? null);
  protected readonly partnerLegalName = computed(() => this.selectedPartner()?.legalName ?? null);
  protected readonly partnerQuickActionsName = computed(
    () => this.partnerDisplayName() ?? this.partnerLegalName()
  );
  protected readonly partnerQuickActionsId = computed(() => {
    const id = this.selectedPartner()?.id;
    return id != null ? String(id) : null;
  });
  protected readonly partnerQuickActionsMatchId = computed(() => {
    const match = this.matchContext();
    return match ? String(match.id) : null;
  });
  protected readonly partnerLogo = computed(() => this.selectedPartner()?.logoUrl ?? null);
  protected readonly partnerRegistrations = computed(() => this.selectedPartner()?.registrationIds ?? []);
  protected readonly partnerLeadership = computed(() => this.selectedPartner()?.leadership ?? []);
  protected readonly partnerSocials = computed(() => this.selectedPartner()?.socials ?? []);
  protected readonly partnerAddress = computed<PartnerAddress | null>(() => this.selectedPartner()?.address ?? null);
  protected readonly partnerVerificationStatus = computed<PartnerVerificationStatus>(() => {
    const status = this.selectedPartner()?.verificationStatus;
    return status === 'verified' ||
      status === 'pending' ||
      status === 'correctionRequested' ||
      status === 'rejected' ||
      status === 'suspended'
      ? status
      : 'unverified';
  });
  protected readonly partnerVerificationStatusKey = computed(
    () => `partner.panel.verification.status.${this.partnerVerificationStatus()}`
  );
  protected readonly partnerTrustScore = computed(() => {
    const score = this.selectedPartner()?.trustScore;
    if (score == null) {
      return null;
    }
    if (!Number.isFinite(score)) {
      return null;
    }
    const normalized = score > 1 ? score / 100 : score;
    return normalizeConfidencePercent(normalized);
  });
  protected readonly partnerVerificationSources = computed<PartnerVerificationSource[]>(
    () => [...(this.selectedPartner()?.verificationSources ?? [])]
  );
  protected readonly partnerTrustHistory = computed<PartnerTrustRecord[]>(() => {
    const history = this.selectedPartner()?.trustHistory ?? [];
    return [...history].sort((a, b) => {
      const aTime = Date.parse(a.occurredAt ?? '');
      const bTime = Date.parse(b.occurredAt ?? '');
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return 0;
      }
      if (Number.isNaN(aTime)) {
        return 1;
      }
      if (Number.isNaN(bTime)) {
        return -1;
      }
      return bTime - aTime;
    });
  });
  protected readonly partnerTrustHistoryPreview = computed(() => this.partnerTrustHistory().slice(0, 3));
  protected readonly partnerTrustHistoryHasMore = computed(
    () => this.partnerTrustHistory().length > this.partnerTrustHistoryPreview().length
  );
  protected readonly partnerLatestReviewEntry = computed(
    () => {
      const reviewTrail = [...(this.selectedPartner()?.trustHistory ?? [])].reverse();
      return (
        reviewTrail.find((record) => record.type === 'evaluation' && Boolean(record.notes?.trim())) ??
        reviewTrail.find((record) => record.type === 'evaluation') ??
        null
      );
    }
  );
  protected readonly partnerMission = computed(() => {
    const mission = this.selectedPartner()?.mission;
    if (!mission) {
      return '';
    }
    const locale = this.locale();
    return mission[locale] ?? mission.en ?? mission.fr ?? '';
  });
  protected readonly partnerHighlights = computed(() => this.selectedPartner()?.highlights ?? []);
  protected readonly partnerContacts = computed(() => {
    const partner = this.selectedPartner();
    if (!partner) {
      return [] as Array<{ label: string; href?: string }>;
    }
    const contacts: Array<{ label: string; href?: string }> = [];
    if (partner.phone) {
      contacts.push({ label: partner.phone, href: `tel:${partner.phone}` });
    }
    if (partner.email) {
      contacts.push({ label: partner.email, href: `mailto:${partner.email}` });
    }
    if (partner.website) {
      contacts.push({ label: partner.website, href: partner.website });
    }
    return contacts;
  });

  protected readonly hasQrLinks = computed(() => Boolean(this.buyerLink()) || Boolean(this.supplierLink()));

  constructor() {
    toObservable(this.selectedValue)
      .pipe(
        switchMap((selection) => {
          if (!selection) {
            this.loading.set(false);
            this.profile.set(null);
            return of<PartnerProfile | null>(null);
          }

          const parsed = parsePartnerSelection(selection);
          if (!parsed || !parsed.id) {
            this.loading.set(false);
            this.profile.set(null);
            return of<PartnerProfile | null>(null);
          }

          this.loading.set(true);
          this.profile.set(null);
          return this.service.getProfile(parsed.id, parsed.role);
        }),
        takeUntilDestroyed()
      )
      .subscribe((profile) => {
        this.profile.set(profile);
        this.loading.set(false);
        this.activeTab.set('details');
      });

    const translateSub = this.translate.onLangChange.subscribe((event) => {
      this.locale.set(this.resolveLocale(event.lang));
    });

    this.destroyRef.onDestroy(() => {
      translateSub.unsubscribe();
    });

    effect(() => {
      const order = this.tabOrder();
      const current = this.activeTab();
      if (!order.length) {
        this.activeTab.set('details');
        return;
      }
      if (!order.includes(current)) {
        this.activeTab.set(order[0]);
      }
    });

  }

  protected triggerDownload(): void {
    const profile = this.profile();
    if (profile) {
      this.download.emit(profile);
    }
  }

  protected triggerShare(): void {
    const profile = this.profile();
    if (profile) {
      this.share.emit(profile);
    }
  }

  protected triggerIntroductionRequest(): void {
    const profile = this.profile();
    if (profile) {
      this.introductionRequested.emit(profile);
    }
  }

  protected switchTab(tab: PartnerDetailsTab): void {
    if (!this.tabOrder().includes(tab)) {
      return;
    }
    if (tab === 'qr' && !this.hasQrLinks()) {
      return;
    }
    this.activeTab.set(tab);
  }

  protected tabSelected(tab: PartnerDetailsTab): boolean {
    return this.activeTab() === tab;
  }

  protected hasCtaContent(): boolean {
    if (!this.primaryTemplate() && !this.ctaRailTemplate()) {
      return false;
    }
    const availability = this.ctaContentAvailable();
    return availability ?? true;
  }

  protected hasPipelineContent(): boolean {
    if (!this.pipelineTemplate()) {
      return false;
    }
    const availability = this.pipelineContentAvailable();
    return availability ?? true;
  }

  protected hasIncotermsContent(): boolean {
    if (!this.incotermsTemplate()) {
      return false;
    }
    const availability = this.incotermsContentAvailable();
    return availability ?? true;
  }

  protected hasFinancingContent(): boolean {
    if (!this.financingTemplate()) {
      return false;
    }
    const availability = this.financingContentAvailable();
    if (availability != null) {
      return availability;
    }
    return Boolean(this.financingContext());
  }

  protected hasComplianceContent(): boolean {
    if (!this.complianceTemplate()) {
      return false;
    }
    const availability = this.complianceContentAvailable();
    return availability ?? true;
  }

  protected hasSchedulerContent(): boolean {
    if (!this.schedulerTemplate()) {
      return false;
    }
    const availability = this.schedulerContentAvailable();
    return availability ?? true;
  }

  protected hasCollaborationContent(): boolean {
    return (
      this.hasCtaContent() ||
      this.hasPipelineContent() ||
      this.hasIncotermsContent() ||
      this.hasFinancingContent() ||
      this.hasComplianceContent() ||
      this.hasSchedulerContent()
    );
  }

  protected handleTabKeydown(event: KeyboardEvent): void {
    const order = this.tabOrder();
    if (!order.length) {
      return;
    }

    let targetIndex: number | null = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'Right':
        targetIndex = (this.activeTabIndex() + 1) % order.length;
        break;
      case 'ArrowLeft':
      case 'Left':
        targetIndex = (this.activeTabIndex() - 1 + order.length) % order.length;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = order.length - 1;
        break;
      default:
        return;
    }

    const nextTab = order[targetIndex];
    if (!nextTab) {
      return;
    }

    event.preventDefault();
    this.switchTab(nextTab);
    queueMicrotask(() => this.focusTabButton(nextTab));
  }

  private focusTabButton(tab: PartnerDetailsTab): void {
    const host = this.tablistRef()?.nativeElement;
    if (!host) {
      return;
    }

    const targetId = this.resolveTabId(tab);
    if (!targetId) {
      return;
    }

    const button = host.querySelector<HTMLElement>(`#${targetId}`);
    button?.focus();
  }

  private resolveTabId(tab: PartnerDetailsTab): string | null {
    switch (tab) {
      case 'details':
        return this.detailsTabId;
      case 'collaboration':
        return this.collaborationTabId;
      case 'qr':
        return this.qrTabId;
      default:
        return null;
    }
  }

  protected verificationStatusClass(status: PartnerVerificationStatus): string {
    switch (status) {
      case 'verified':
        return 'bg-emerald-500/15 text-emerald-700 border border-emerald-200';
      case 'pending':
        return 'bg-amber-500/15 text-amber-700 border border-amber-200';
      case 'correctionRequested':
        return 'bg-orange-500/15 text-orange-700 border border-orange-200';
      case 'rejected':
        return 'bg-rose-500/15 text-rose-700 border border-rose-200';
      case 'suspended':
        return 'bg-rose-500/15 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-200/60 text-slate-600 border border-slate-200';
    }
  }

  protected verificationSourceStatusClass(status: PartnerVerificationSource['status']): string {
    switch (status) {
      case 'validated':
        return 'bg-emerald-500/10 text-emerald-700';
      case 'revoked':
        return 'bg-rose-500/10 text-rose-700';
      default:
        return 'bg-amber-500/10 text-amber-700';
    }
  }

  protected verificationSourceTypeKey(type: PartnerVerificationSource['type']): string {
    return `partner.panel.verification.sourceTypes.${type}`;
  }

  protected trustHistoryTypeKey(type: PartnerTrustRecord['type']): string {
    return `partner.panel.verification.history.types.${type}`;
  }

  protected trustHistoryDirectionKey(direction: PartnerTrustRecord['direction']): string {
    return `partner.panel.verification.history.direction.${direction ?? 'inbound'}`;
  }

  protected formatDate(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }
    const timestamp = Date.parse(value);
    if (Number.isNaN(timestamp)) {
      return value;
    }
    const formatter = new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium' });
    return formatter.format(timestamp);
  }

  protected formatScore(value: number | null | undefined): string | null {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return null;
    }
    return `${Math.max(0, Math.min(100, Math.round(value)))}%`;
  }

  protected partnerInitials(name: string): string {
    if (!name) {
      return '';
    }
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }
    return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
  }

  protected close(): void {
    this.closed.emit();
  }

  resolveCountryLabel(country: string | null | undefined): string | null {
    if (!country) {
      return null;
    }
    const trimmed = country.trim();
    if (!trimmed) {
      return null;
    }
    if (/^[A-Za-z]{2}$/.test(trimmed)) {
      const code = trimmed.toUpperCase();
      const translated = this.translate.instant(`countries.${code}`);
      return translated !== `countries.${code}` ? translated : code;
    }
    return trimmed;
  }

  private resolveLocale(lang: string | null | undefined): 'en' | 'fr' {
    if (!lang) {
      return 'en';
    }
    const lower = lang.toLowerCase();
    return lower.startsWith('fr') ? 'fr' : 'en';
  }
}
