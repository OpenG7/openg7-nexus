import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  NgZone,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { finalize } from 'rxjs';

import {
  ADMIN_AI_PROVIDER_OPTIONS,
  AdminAiProvider,
  resolveAdminAiProviderOption,
} from '../data-access/admin-ai-providers';
import {
  AdminOpsCodexDispatchResponse,
  AdminOpsCodexScope,
  AdminOpsSecuritySnapshot,
  AdminOpsService,
  AdminOpsSnapshot,
} from '../data-access/admin-ops.service';

type AdminOpsProvenanceId = 'health' | 'backups' | 'imports' | 'security';

interface AdminOpsProvenanceEntry {
  readonly id: AdminOpsProvenanceId;
  readonly label: string;
  readonly route: string;
  readonly generatedAt: string;
}

interface AdminOpsDiagnosticItem {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly tone: 'ready' | 'warning' | 'offline' | 'neutral';
}

type AdminOpsAiIgnitionModule = AdminOpsSecuritySnapshot['aiKeys'][number];

const ADMIN_OPS_PROVENANCE_CONFIG: ReadonlyArray<{
  readonly id: AdminOpsProvenanceId;
  readonly label: string;
  readonly route: string;
}> = [
  { id: 'health', label: 'API health', route: '/api/admin/ops/health' },
  { id: 'backups', label: 'Backups', route: '/api/admin/ops/backups' },
  { id: 'imports', label: 'Imports', route: '/api/admin/ops/imports' },
  { id: 'security', label: 'Security', route: '/api/admin/ops/security' },
];

const ADMIN_OPS_CODEX_SCOPES: readonly AdminOpsCodexScope[] = [
  'openg7-org',
  'strapi',
  'packages-contracts',
  'packages-tooling',
  'repository-root',
];

const ADMIN_OPS_CODEX_EFFORTS = ['low', 'medium', 'high'] as const;
const ADMIN_OPS_REFRESH_INTERVAL_MS = 30_000;
const ADMIN_OPS_LIVE_TICK_INTERVAL_MS = 1_000;

@Component({
  standalone: true,
  selector: 'og7-admin-ops-page',
  imports: [CommonModule],
  templateUrl: './admin-ops.page.html',
  styles: [
    `
      :host {
        display: block;
      }

      .og7-ignition-module {
        opacity: 0;
        transform: translateY(12px) scale(0.985);
        animation: og7-console-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      .og7-ignition-module::after {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(
          120deg,
          transparent 0%,
          rgba(255, 255, 255, 0.08) 48%,
          transparent 100%
        );
        opacity: 0;
        transform: translateX(-115%);
        animation: og7-console-sheen 5.8s ease-in-out infinite;
        pointer-events: none;
      }

      .og7-ignition-key {
        transform-origin: 48px 32px;
      }

      .og7-ignition-key--inserted {
        animation:
          og7-key-seat 720ms cubic-bezier(0.2, 0.9, 0.2, 1) both,
          og7-key-hum 3.6s ease-in-out 720ms infinite;
      }

      .og7-ignition-indicator--ready {
        animation: og7-ready-pulse 2.4s ease-in-out infinite;
      }

      .og7-ignition-indicator--scan {
        animation: og7-scan-pulse 2.8s linear infinite;
      }

      .og7-live-heartbeat {
        animation: og7-live-heartbeat 1.8s ease-in-out infinite;
      }

      .og7-live-heartbeat--degraded {
        animation: og7-live-degraded 2.4s ease-in-out infinite;
      }

      .og7-live-heartbeat--syncing {
        animation: og7-live-syncing 1.2s linear infinite;
      }

      @keyframes og7-console-rise {
        0% {
          opacity: 0;
          transform: translateY(12px) scale(0.985);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes og7-console-sheen {
        0%,
        22% {
          opacity: 0;
          transform: translateX(-115%);
        }

        30% {
          opacity: 1;
        }

        44% {
          opacity: 0;
          transform: translateX(115%);
        }

        100% {
          opacity: 0;
          transform: translateX(115%);
        }
      }

      @keyframes og7-key-seat {
        0% {
          transform: translateY(-50%) rotate(6deg) scale(0.92);
        }

        55% {
          transform: translateY(-50%) rotate(-21deg) scale(1.02);
        }

        100% {
          transform: translateY(-50%) rotate(-18deg) scale(1);
        }
      }

      @keyframes og7-key-hum {
        0%,
        100% {
          filter: brightness(1);
        }

        50% {
          filter: brightness(1.12);
        }
      }

      @keyframes og7-ready-pulse {
        0%,
        100% {
          transform: scale(1);
          box-shadow:
            0 0 0 rgba(74, 222, 128, 0.18),
            0 0 18px rgba(74, 222, 128, 0.42);
        }

        50% {
          transform: scale(1.08);
          box-shadow:
            0 0 0 8px rgba(74, 222, 128, 0.08),
            0 0 24px rgba(74, 222, 128, 0.7);
        }
      }

      @keyframes og7-scan-pulse {
        0%,
        100% {
          opacity: 0.82;
          transform: scale(0.96);
        }

        50% {
          opacity: 1;
          transform: scale(1.08);
        }
      }

      @keyframes og7-live-heartbeat {
        0%,
        100% {
          transform: scale(1);
          box-shadow: 0 0 0 rgba(34, 197, 94, 0.14);
        }

        50% {
          transform: scale(1.1);
          box-shadow: 0 0 0 8px rgba(34, 197, 94, 0.1);
        }
      }

      @keyframes og7-live-degraded {
        0%,
        100% {
          opacity: 0.72;
          transform: scale(0.96);
        }

        50% {
          opacity: 1;
          transform: scale(1.06);
        }
      }

      @keyframes og7-live-syncing {
        0% {
          transform: scale(0.9);
          opacity: 0.55;
        }

        50% {
          transform: scale(1.14);
          opacity: 1;
        }

        100% {
          transform: scale(0.9);
          opacity: 0.55;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminOpsPage implements OnInit {
  private readonly service = inject(AdminOpsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly notifications = injectNotificationStore();
  private readonly route = inject(ActivatedRoute);
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private liveTickTimer: ReturnType<typeof setInterval> | null = null;

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<AdminOpsSnapshot | null>(null);
  readonly liveNow = signal(Date.now());
  readonly lastSuccessfulRefreshAt = signal<number | null>(null);
  readonly dispatchProvider = signal<AdminAiProvider>('codex');
  readonly codexTask = signal('');
  readonly codexScope = signal<AdminOpsCodexScope>('openg7-org');
  readonly codexBaseBranch = signal('main');
  readonly codexDraftPr = signal(true);
  readonly codexModel = signal('');
  readonly codexEffort = signal('');
  readonly codexSubmitting = signal(false);
  readonly codexError = signal<string | null>(null);
  readonly codexResult = signal<AdminOpsCodexDispatchResponse | null>(null);
  readonly dispatchProviders = ADMIN_AI_PROVIDER_OPTIONS;
  readonly codexScopes = ADMIN_OPS_CODEX_SCOPES;
  readonly codexEfforts = ADMIN_OPS_CODEX_EFFORTS;
  readonly dispatchProviderOption = computed(() =>
    resolveAdminAiProviderOption(this.dispatchProvider()),
  );
  readonly dispatchProviderLabel = computed(() => this.dispatchProviderOption().label);
  readonly dispatchProviderCaption = computed(() => this.dispatchProviderOption().caption);
  readonly dispatchRoutesThroughCodex = computed(() => this.dispatchProvider() !== 'codex');

  readonly canDispatchCodex = computed(() => {
    return (
      this.codexTask().trim().length > 0 &&
      this.codexBaseBranch().trim().length > 0 &&
      !this.codexSubmitting()
    );
  });

  readonly lastUpdated = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return null;
    }
    const values = [
      snapshot.health.generatedAt,
      snapshot.backups.generatedAt,
      snapshot.imports.generatedAt,
      snapshot.security.generatedAt,
    ]
      .map((entry) => new Date(entry).getTime())
      .filter((entry) => Number.isFinite(entry));
    if (!values.length) {
      return null;
    }
    return new Date(Math.max(...values)).toISOString();
  });

  readonly provenanceEntries = computed<readonly AdminOpsProvenanceEntry[]>(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return [];
    }

    return ADMIN_OPS_PROVENANCE_CONFIG.map((entry) => ({
      ...entry,
      generatedAt: snapshot[entry.id].generatedAt,
    }));
  });

  readonly provenanceState = computed<'fresh' | 'preserved-last-good' | null>(() => {
    if (!this.snapshot()) {
      return null;
    }

    return this.error() ? 'preserved-last-good' : 'fresh';
  });

  readonly provenanceMessage = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return null;
    }

    if (this.error()) {
      return 'Showing the last successful snapshot while the latest refresh failed.';
    }

    return 'Each block lists the API source and snapshot timestamp currently displayed.';
  });

  readonly aiIgnitionModules = computed<readonly AdminOpsAiIgnitionModule[]>(() => {
    return this.snapshot()?.security.aiKeys ?? [];
  });
  readonly selectedAiDiagnosticModule = computed<AdminOpsAiIgnitionModule | null>(() => {
    return (
      this.aiIgnitionModules().find((module) => module.provider === this.dispatchProvider()) ?? null
    );
  });
  readonly aiDiagnosticItems = computed<readonly AdminOpsDiagnosticItem[]>(() => {
    const module = this.selectedAiDiagnosticModule();
    if (!module) {
      return [];
    }

    return [
      {
        id: 'workflow',
        label: 'Workflow lane',
        value: module.workflow,
        tone: module.dispatchEnabled ? 'ready' : 'warning',
      },
      {
        id: 'socket',
        label: 'Secret socket',
        value: module.secretName ?? 'No socket exposed',
        tone: module.secretName ? 'neutral' : 'warning',
      },
      {
        id: 'key',
        label: 'Key insertion',
        value: module.keyInserted ? 'Inserted and detected' : 'Missing from control plane',
        tone: module.keyInserted ? 'ready' : 'offline',
      },
      {
        id: 'dispatch',
        label: 'Dispatch gate',
        value: module.dispatchEnabled ? 'Enabled for operator launch' : 'Standby / disabled',
        tone: module.dispatchEnabled ? 'ready' : 'warning',
      },
    ];
  });
  readonly aiDiagnosticActionLabel = computed(() => {
    const module = this.selectedAiDiagnosticModule();
    if (!module) {
      return 'Diagnostics unavailable';
    }
    switch (module.state) {
      case 'ready':
        return 'Run a dispatch and review the returning PR/proof package.';
      case 'scan-unavailable':
        return 'Restore GitHub secret scanning before trusting this bay.';
      case 'unsupported':
        return 'Keep this provider in observation mode until a stable automation runner exists.';
      default:
        return module.secretName
          ? `Insert ${module.secretName} and re-arm the workflow gate.`
          : 'Finish wiring a secret socket and workflow before launch.';
    }
  });

  readonly liveTelemetryState = computed<'live' | 'degraded' | 'syncing' | 'offline'>(() => {
    if (this.loading() || this.refreshing()) {
      return 'syncing';
    }

    if (!this.snapshot()) {
      return 'offline';
    }

    const lastRefreshAt = this.lastSuccessfulRefreshAt();
    if (lastRefreshAt == null) {
      return this.error() ? 'degraded' : 'offline';
    }

    const ageMs = this.liveNow() - lastRefreshAt;
    if (this.error() || ageMs > ADMIN_OPS_REFRESH_INTERVAL_MS * 2) {
      return 'degraded';
    }

    return 'live';
  });

  readonly liveTelemetryLabel = computed(() => {
    switch (this.liveTelemetryState()) {
      case 'live':
        return 'Live pulse nominal';
      case 'degraded':
        return 'Telemetry degraded';
      case 'syncing':
        return 'Sync in progress';
      default:
        return 'Console offline';
    }
  });

  readonly liveTelemetryDetail = computed(() => {
    const lastRefreshAt = this.lastSuccessfulRefreshAt();
    if (this.liveTelemetryState() === 'offline') {
      return 'Waiting for the first control-plane sync.';
    }

    if (this.liveTelemetryState() === 'syncing') {
      return lastRefreshAt == null
        ? 'Bootstrapping the cockpit feed.'
        : `Last stable sync ${this.formatRelativeFromNow(lastRefreshAt)}.`;
    }

    const refreshCountdown = this.nextRefreshCountdownSeconds();
    if (lastRefreshAt == null) {
      return 'Awaiting refresh cadence.';
    }

    return `Last sync ${this.formatRelativeFromNow(lastRefreshAt)}. Next sweep in ${refreshCountdown}s.`;
  });

  ngOnInit(): void {
    this.applyCodexRoutePrefill();
    this.fetchSnapshot(false);
    this.ngZone.runOutsideAngular(() => {
      this.refreshTimer = setInterval(
        () => this.ngZone.run(() => this.fetchSnapshot(true)),
        ADMIN_OPS_REFRESH_INTERVAL_MS,
      );
      this.liveTickTimer = setInterval(
        () => this.ngZone.run(() => this.liveNow.set(Date.now())),
        ADMIN_OPS_LIVE_TICK_INTERVAL_MS,
      );
    });
    this.destroyRef.onDestroy(() => {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer);
      }
      if (this.liveTickTimer) {
        clearInterval(this.liveTickTimer);
      }
    });
  }

  refresh(): void {
    this.fetchSnapshot(true);
  }

  updateCodexTask(value: string): void {
    this.codexTask.set(value);
    this.codexError.set(null);
  }

  updateDispatchProvider(value: string): void {
    const normalizedProvider = value.trim().toLowerCase();
    if (!this.dispatchProviders.some((provider) => provider.id === normalizedProvider)) {
      return;
    }

    const previousModel = resolveAdminAiProviderOption(this.dispatchProvider()).defaultModel;
    const nextProvider = normalizedProvider as AdminAiProvider;
    const nextOption = resolveAdminAiProviderOption(nextProvider);
    const currentModel = this.codexModel().trim();

    this.dispatchProvider.set(nextProvider);
    if (!currentModel || currentModel === previousModel) {
      this.codexModel.set(nextOption.defaultModel);
    }
    this.codexError.set(null);
  }

  selectAiDiagnostic(provider: AdminAiProvider): void {
    this.updateDispatchProvider(provider);
  }

  updateCodexScope(value: string): void {
    if (ADMIN_OPS_CODEX_SCOPES.includes(value as AdminOpsCodexScope)) {
      this.codexScope.set(value as AdminOpsCodexScope);
      this.codexError.set(null);
    }
  }

  updateCodexBaseBranch(value: string): void {
    this.codexBaseBranch.set(value);
    this.codexError.set(null);
  }

  updateCodexDraftPr(checked: boolean): void {
    this.codexDraftPr.set(checked);
  }

  updateCodexModel(value: string): void {
    this.codexModel.set(value);
  }

  updateCodexEffort(value: string): void {
    this.codexEffort.set(value);
  }

  dispatchCodexWorkflow(): void {
    const task = this.codexTask().trim();
    const baseBranch = this.codexBaseBranch().trim();
    if (!task) {
      this.codexError.set(
        'Describe the task you want to delegate before dispatching the selected AI.',
      );
      return;
    }
    if (!baseBranch) {
      this.codexError.set('Choose a target base branch before dispatching the selected AI.');
      return;
    }

    this.codexSubmitting.set(true);
    this.codexError.set(null);
    this.codexResult.set(null);

    this.service
      .dispatchCodexWorkflow({
        provider: this.dispatchProvider(),
        task,
        scope: this.codexScope(),
        baseBranch,
        draftPr: this.codexDraftPr(),
        model: this.codexModel().trim() || null,
        effort: this.codexEffort().trim() || null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.codexSubmitting.set(false);
        }),
      )
      .subscribe({
        next: (result) => {
          this.codexResult.set(result);
          this.notifications.success(
            `${this.dispatchProviderLabel()} request queued. Review the upcoming PR before merging.`,
            {
              source: 'admin-ops',
            },
          );
        },
        error: (error: unknown) => {
          const message = this.resolveError(error);
          this.codexError.set(message);
          this.notifications.error(message, { source: 'admin-ops' });
        },
      });
  }

  formatBytes(bytes: number | null | undefined): string {
    if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
      return '0 B';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(1)} ${units[unitIndex]}`;
  }

  formatDuration(seconds: number | null | undefined): string {
    if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) {
      return '0m';
    }
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  }

  formatSessionTimeout(milliseconds: number | null): string {
    if (milliseconds == null) {
      return 'Disabled';
    }
    if (milliseconds < 60_000) {
      return `${Math.round(milliseconds / 1000)}s`;
    }
    const minutes = Math.floor(milliseconds / 60_000);
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  trackBackupFile = (_: number, file: { name: string }) => file.name;
  trackImportEntry = (_: number, item: { id: string }) => item.id;
  trackSource = (_: number, item: { source: string }) => item.source;
  trackProvenanceEntry = (_: number, item: AdminOpsProvenanceEntry) => item.id;
  trackAiIgnitionModule = (_: number, module: AdminOpsAiIgnitionModule) =>
    `${module.provider}:${module.secretName ?? 'socket'}`;

  aiIgnitionRevealDelay(index: number): number {
    return 90 + index * 110;
  }

  isAiIgnitionReady(module: AdminOpsAiIgnitionModule): boolean {
    return module.state === 'ready';
  }

  isAiIgnitionOffline(module: AdminOpsAiIgnitionModule): boolean {
    return module.state === 'offline';
  }

  isAiIgnitionUnknown(module: AdminOpsAiIgnitionModule): boolean {
    return module.state === 'scan-unavailable';
  }

  isAiIgnitionUnsupported(module: AdminOpsAiIgnitionModule): boolean {
    return module.state === 'unsupported';
  }

  isAiDiagnosticSelected(module: AdminOpsAiIgnitionModule): boolean {
    return this.selectedAiDiagnosticModule()?.provider === module.provider;
  }

  diagnosticToneClasses(tone: AdminOpsDiagnosticItem['tone']): string {
    switch (tone) {
      case 'ready':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'warning':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      case 'offline':
        return 'border-rose-400/25 bg-rose-400/10 text-rose-100';
      default:
        return 'border-white/10 bg-white/5 text-slate-100';
    }
  }

  isLiveTelemetry(state: 'live' | 'degraded' | 'syncing' | 'offline'): boolean {
    return this.liveTelemetryState() === state;
  }

  nextRefreshCountdownSeconds(): number {
    const lastRefreshAt = this.lastSuccessfulRefreshAt();
    if (lastRefreshAt == null) {
      return 0;
    }

    const elapsedMs = this.liveNow() - lastRefreshAt;
    const remainingMs = Math.max(0, ADMIN_OPS_REFRESH_INTERVAL_MS - elapsedMs);
    return Math.ceil(remainingMs / 1000);
  }

  private fetchSnapshot(silent: boolean): void {
    if (silent) {
      this.refreshing.set(true);
    } else {
      this.loading.set(true);
    }
    this.error.set(null);

    this.service
      .getSnapshot()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.loading.set(false);
          this.refreshing.set(false);
        }),
      )
      .subscribe({
        next: (snapshot) => {
          this.snapshot.set(snapshot);
          this.lastSuccessfulRefreshAt.set(Date.now());
        },
        error: (error: unknown) => {
          this.error.set(this.resolveError(error));
        },
      });
  }

  private formatRelativeFromNow(timestampMs: number): string {
    const deltaMs = Math.max(0, this.liveNow() - timestampMs);
    const seconds = Math.floor(deltaMs / 1000);
    if (seconds < 5) {
      return 'just now';
    }
    if (seconds < 60) {
      return `${seconds}s ago`;
    }
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  private resolveError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Access denied. This dashboard is restricted to owner/admin accounts.';
      }
      if (typeof error.error === 'string' && error.error.trim()) {
        return error.error;
      }
      if (error.error && typeof error.error === 'object') {
        const message = (error.error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
    }
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    if (error && typeof error === 'object') {
      const payload = error as { error?: unknown; message?: unknown };
      if (typeof payload.message === 'string' && payload.message.trim()) {
        return payload.message;
      }
      if (payload.error && typeof payload.error === 'object') {
        const message = (payload.error as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      if (typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error;
      }
    }
    return 'Unable to load operations data.';
  }

  private applyCodexRoutePrefill(): void {
    const params = this.route.snapshot.queryParamMap;
    const provider =
      params.get('aiProvider') ?? params.get('provider') ?? params.get('codexProvider');
    const task = params.get('codexTask') ?? params.get('task');
    const scope = params.get('codexScope') ?? params.get('scope');
    const baseBranch = params.get('codexBaseBranch') ?? params.get('baseBranch');
    const draftPr = params.get('codexDraftPr') ?? params.get('draftPr');
    const model = params.get('codexModel') ?? params.get('model');
    const effort = params.get('codexEffort') ?? params.get('effort');

    const normalizedProvider = provider?.trim().toLowerCase() ?? null;
    if (
      normalizedProvider &&
      this.dispatchProviders.some((candidate) => candidate.id === normalizedProvider)
    ) {
      this.dispatchProvider.set(normalizedProvider as AdminAiProvider);
    }
    if (task?.trim()) {
      this.codexTask.set(task);
    }
    if (scope) {
      this.updateCodexScope(scope);
    }
    if (baseBranch?.trim()) {
      this.codexBaseBranch.set(baseBranch);
    }
    if (draftPr != null) {
      this.codexDraftPr.set(draftPr !== 'false');
    }
    if (model != null) {
      this.codexModel.set(model);
    } else if (
      normalizedProvider &&
      this.dispatchProviders.some((candidate) => candidate.id === normalizedProvider)
    ) {
      this.codexModel.set(
        resolveAdminAiProviderOption(normalizedProvider as AdminAiProvider).defaultModel,
      );
    }
    if (effort != null) {
      this.codexEffort.set(effort);
    }

    if (task?.trim() || params.get('codexSource') === 'admin-quality') {
      this.notifications.info(
        `${this.dispatchProviderLabel()} dispatch prefilled from the quality cockpit.`,
        {
          source: 'admin-ops',
        },
      );
    }
  }
}
