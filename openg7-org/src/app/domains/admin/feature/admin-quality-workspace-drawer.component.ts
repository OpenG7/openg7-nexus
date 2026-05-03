import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import {
  AdminQualityMatrixBucket,
  AdminQualityMatrixEntry,
  AdminQualityMatrixRecalculationEntry,
  AdminQualityMatrixRecalculationResult,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';
import { AdminQualityActionRecord, AdminQualityActionStatus } from '../pages/admin-quality-action-registry';
import { AdminQualityDelegationPlan, AdminQualityDelegationMode } from '../pages/admin-quality-delegation';

export type AdminQualityWorkspaceSurface = 'qaQueue' | 'delegation' | 'actions';

interface AdminQualityWorkspaceSignalContext {
  readonly signalId: string;
  readonly shortLabel: string;
  readonly label: string;
  readonly headline: string;
  readonly detail: string;
  readonly recommendedAction: string;
  readonly attention: boolean;
}

const WORKSPACE_SURFACES: readonly AdminQualityWorkspaceSurface[] = ['qaQueue', 'delegation', 'actions'];

@Component({
  selector: 'og7-admin-quality-workspace-drawer',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './admin-quality-workspace-drawer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityWorkspaceDrawerComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly notifications = injectNotificationStore();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private previousFocusedElement: HTMLElement | null = null;

  readonly open = input(false);
  readonly activeSurface = input<AdminQualityWorkspaceSurface>('delegation');
  readonly selectedEntry = input<AdminQualityMatrixEntry | null>(null);
  readonly selectedSignalContext = input<AdminQualityWorkspaceSignalContext | null>(null);
  readonly selectedRecalculationEntry = input<AdminQualityMatrixRecalculationEntry | null>(null);
  readonly delegationPlan = input<AdminQualityDelegationPlan | null>(null);
  readonly editableCodexPrompt = input('');
  readonly dispatchProviderLabel = input('Codex');
  readonly dispatchReady = input(false);
  readonly dispatchSubmitting = input(false);
  readonly dispatchBlockedMessage = input<string | null>(null);
  readonly applyProposalReady = input(false);
  readonly applyProposalSubmitting = input(false);
  readonly qaQueueCount = input(0);
  readonly delegationCount = input(0);
  readonly actionsCount = input(0);
  readonly qaQueueItems = input<readonly AdminQualityMatrixEntry[]>([]);
  readonly actionItems = input<readonly AdminQualityActionRecord[]>([]);

  readonly closeRequested = output<void>();
  readonly applyProposalRequested = output<void>();
  readonly codexPromptChanged = output<string>();
  readonly codexLaunchRequested = output<void>();
  readonly surfaceChanged = output<AdminQualityWorkspaceSurface>();

  protected readonly surfaces = WORKSPACE_SURFACES;
  protected readonly dialogTitleId = 'og7-admin-quality-workspace-title';
  protected readonly dialogDescriptionId = 'og7-admin-quality-workspace-description';

  protected readonly activeSurfaceTitleKey = computed(
    () => `admin.quality.workspace.surfaces.${this.activeSurface()}.title`
  );
  protected readonly activeSurfaceSubtitleKey = computed(
    () => `admin.quality.workspace.surfaces.${this.activeSurface()}.subtitle`
  );
  protected readonly activeSurfaceCount = computed(() => this.surfaceCount(this.activeSurface()));

  constructor() {
    effect(() => {
      if (!this.open()) {
        this.restoreFocus();
        return;
      }

      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        this.previousFocusedElement = document.activeElement;
      }

      queueMicrotask(() => {
        this.panelRef()?.nativeElement.focus();
      });
    });

    this.destroyRef.onDestroy(() => this.restoreFocus());
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.open()) {
      return;
    }
    this.closeRequested.emit();
  }

  @HostListener('document:keydown.tab', ['$event'])
  protected onTabKeydown(event: Event): void {
    if (!this.open()) {
      return;
    }

    if (!(event instanceof KeyboardEvent)) {
      return;
    }

    const panel = this.panelRef()?.nativeElement;
    if (!panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((element) => !element.hasAttribute('hidden') && element.tabIndex !== -1);

    if (!focusableElements.length) {
      event.preventDefault();
      panel.focus();
      return;
    }

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last?.focus();
      return;
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  protected requestClose(): void {
    this.closeRequested.emit();
  }

  protected requestCodexLaunch(): void {
    this.codexLaunchRequested.emit();
  }

  protected requestApplyProposal(): void {
    this.applyProposalRequested.emit();
  }

  protected updateCodexPrompt(event: Event): void {
    const value = (event.target as HTMLTextAreaElement | null)?.value ?? '';
    this.codexPromptChanged.emit(value);
  }

  protected selectSurface(surface: AdminQualityWorkspaceSurface): void {
    if (surface === this.activeSurface()) {
      return;
    }
    this.surfaceChanged.emit(surface);
  }

  protected surfaceTabId(surface: AdminQualityWorkspaceSurface): string {
    return `og7-admin-quality-workspace-tab-${surface}`;
  }

  protected surfacePanelId(surface: AdminQualityWorkspaceSurface): string {
    return `og7-admin-quality-workspace-panel-${surface}`;
  }

  protected isSurfaceActive(surface: AdminQualityWorkspaceSurface): boolean {
    return this.activeSurface() === surface;
  }

  protected actionStatusKey(status: AdminQualityActionStatus): string {
    switch (status) {
      case 'proved':
        return 'admin.quality.workspace.actions.status.proved';
      case 'documented':
        return 'admin.quality.workspace.actions.status.documented';
      default:
        return 'admin.quality.workspace.actions.status.needsCompletion';
    }
  }

  protected actionStatusClasses(status: AdminQualityActionStatus): string {
    switch (status) {
      case 'proved':
        return 'border-emerald-300/20 bg-emerald-400/12 text-emerald-100';
      case 'documented':
        return 'border-sky-300/20 bg-sky-400/12 text-sky-100';
      default:
        return 'border-amber-300/25 bg-amber-400/12 text-amber-100';
    }
  }

  protected qaStatusKey(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'admin.quality.workspace.qaQueue.status.yes';
      case 'partiel':
        return 'admin.quality.workspace.qaQueue.status.partial';
      case 'hors MVP':
        return 'admin.quality.workspace.qaQueue.status.outOfScope';
      default:
        return 'admin.quality.workspace.qaQueue.status.no';
    }
  }

  protected qaStatusClasses(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'border-emerald-300/20 bg-emerald-400/12 text-emerald-100';
      case 'partiel':
        return 'border-amber-300/20 bg-amber-400/12 text-amber-100';
      case 'hors MVP':
        return 'border-white/12 bg-white/[0.05] text-slate-200';
      default:
        return 'border-rose-300/20 bg-rose-400/12 text-rose-100';
    }
  }

  protected delegationModeKey(mode: AdminQualityDelegationMode): string {
    switch (mode) {
      case 'hardening':
        return 'admin.quality.workspace.delegation.modes.hardening';
      case 'product-closure':
        return 'admin.quality.workspace.delegation.modes.productClosure';
      case 'scope-cadrage':
        return 'admin.quality.workspace.delegation.modes.scopeCadrage';
      default:
        return 'admin.quality.workspace.delegation.modes.qaProof';
    }
  }

  protected delegationModeClasses(mode: AdminQualityDelegationMode): string {
    switch (mode) {
      case 'hardening':
        return 'border-emerald-300/20 bg-emerald-400/12 text-emerald-100';
      case 'product-closure':
        return 'border-amber-300/25 bg-amber-400/14 text-amber-100';
      case 'scope-cadrage':
        return 'border-white/12 bg-white/[0.05] text-slate-100';
      default:
        return 'border-sky-300/20 bg-sky-400/12 text-sky-100';
    }
  }

  protected recalculationResultKey(result: AdminQualityMatrixRecalculationResult): string {
    switch (result) {
      case 'proposal-review-required':
        return 'admin.quality.workspace.recalculation.result.proposal';
      case 'blocked-insufficient-proof':
        return 'admin.quality.workspace.recalculation.result.insufficientProof';
      case 'blocked-conflicting-signals':
        return 'admin.quality.workspace.recalculation.result.conflictingSignals';
      default:
        return 'admin.quality.workspace.recalculation.result.unchanged';
    }
  }

  protected recalculationResultClasses(result: AdminQualityMatrixRecalculationResult): string {
    switch (result) {
      case 'proposal-review-required':
        return 'border-sky-300/20 bg-sky-400/12 text-sky-100';
      case 'blocked-insufficient-proof':
      case 'blocked-conflicting-signals':
        return 'border-amber-300/25 bg-amber-400/12 text-amber-100';
      default:
        return 'border-emerald-300/20 bg-emerald-400/12 text-emerald-100';
    }
  }

  protected recalculationConfidenceKey(confidence: 'low' | 'medium' | 'high'): string {
    switch (confidence) {
      case 'high':
        return 'admin.quality.workspace.recalculation.confidence.high';
      case 'medium':
        return 'admin.quality.workspace.recalculation.confidence.medium';
      default:
        return 'admin.quality.workspace.recalculation.confidence.low';
    }
  }

  protected recalculationFactualEntries(
    entry: AdminQualityMatrixRecalculationEntry,
  ): Array<{ readonly label: string; readonly value: string }> {
    return [
      {
        label: this.translate.instant('admin.quality.workspace.recalculation.factual.reviewedAt'),
        value: entry.factualSignals.reviewedAt ?? 'n/a',
      },
      {
        label: this.translate.instant('admin.quality.workspace.recalculation.factual.repoSignalAt'),
        value: entry.factualSignals.repoSignalAt ?? 'n/a',
      },
      {
        label: this.translate.instant('admin.quality.workspace.recalculation.factual.repoSignalCommit'),
        value: entry.factualSignals.repoSignalCommit ?? 'n/a',
      },
      {
        label: this.translate.instant('admin.quality.workspace.recalculation.factual.repoSignalSource'),
        value: entry.factualSignals.repoSignalSource ?? 'n/a',
      },
      {
        label: this.translate.instant('admin.quality.workspace.recalculation.factual.latestDecisionAt'),
        value: entry.factualSignals.latestDecisionAt ?? 'n/a',
      },
    ];
  }

  protected coverageDeltaLabel(
    current: AdminQualityMatrixStatus | AdminQualityMatrixBucket,
    proposed: AdminQualityMatrixStatus | AdminQualityMatrixBucket,
  ): string {
    return current === proposed ? String(current) : `${current} -> ${proposed}`;
  }

  protected hasGitHubIssueUrl(plan: AdminQualityDelegationPlan | null): boolean {
    return Boolean(plan?.githubIssueUrl.trim());
  }

  protected async copyBrief(plan: AdminQualityDelegationPlan): Promise<void> {
    await this.copyText(plan.codexPrompt, 'admin.quality.workspace.notifications.briefCopied');
  }

  protected async copyIssue(plan: AdminQualityDelegationPlan): Promise<void> {
    const payload = `${plan.issueTitle}\n\n${plan.issueBody}`;
    await this.copyText(payload, 'admin.quality.workspace.notifications.issueCopied');
  }

  protected openGitHubIssue(plan: AdminQualityDelegationPlan): void {
    if (!this.isBrowser || typeof window === 'undefined') {
      return;
    }

    const url = plan.githubIssueUrl.trim();
    if (!url) {
      this.notifications.info(this.translate.instant('admin.quality.workspace.notifications.githubUnavailable'), {
        source: 'admin-quality',
      });
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }

  private surfaceCount(surface: AdminQualityWorkspaceSurface): number {
    switch (surface) {
      case 'qaQueue':
        return this.qaQueueCount();
      case 'actions':
        return this.actionsCount();
      default:
        return this.delegationCount();
    }
  }

  private async copyText(value: string, successKey: string): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        this.legacyCopy(value);
      }

      this.notifications.success(this.translate.instant(successKey), { source: 'admin-quality' });
    } catch {
      try {
        this.legacyCopy(value);
        this.notifications.success(this.translate.instant(successKey), { source: 'admin-quality' });
      } catch {
        this.notifications.error(this.translate.instant('admin.quality.workspace.notifications.copyFailed'), {
          source: 'admin-quality',
        });
      }
    }
  }

  private legacyCopy(value: string): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      throw new Error('copy_unavailable');
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error('copy_failed');
    }
  }

  private restoreFocus(): void {
    this.previousFocusedElement?.focus();
    this.previousFocusedElement = null;
  }
}
