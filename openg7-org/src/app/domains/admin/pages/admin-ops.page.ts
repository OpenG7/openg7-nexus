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
import {
  ADMIN_AI_PROVIDER_OPTIONS,
  AdminAiProvider,
  resolveAdminAiProviderOption,
} from '@openg7/admin-ai/admin-ai-providers';
import { AdminNavigationPillsComponent } from '@openg7/admin-quality';
import type { AdminNavigationPillItem } from '@openg7/admin-quality';
import { finalize } from 'rxjs';

import {
  AdminOpsBackupFile,
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

interface AdminOpsCommandMetric {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly detail: string;
  readonly tone: 'ready' | 'warning' | 'offline' | 'neutral';
  readonly anchor: string;
}

interface AdminOpsAttentionItem {
  readonly id: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly tone: 'critical' | 'warning' | 'info';
  readonly anchor: string;
  readonly cta: string;
}

interface AdminOpsSecurityActionItem {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly cta: string;
  readonly href: string;
  readonly tone: 'ready' | 'warning' | 'offline';
}

type AdminOpsAiIgnitionModule = AdminOpsSecuritySnapshot['aiKeys'][number];
type AdminOpsControlPlaneKey = AdminOpsSecuritySnapshot['controlPlaneKeys'][number];
type AdminOpsImportEntry = AdminOpsSnapshot['imports']['recent'][number];

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
  imports: [CommonModule, AdminNavigationPillsComponent],
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

      .og7-admin-ops-hero-grid {
        position: relative;
      }

      .og7-admin-ops-hero-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 12% 18%, rgba(16, 185, 129, 0.18), transparent 22%),
          radial-gradient(circle at 86% 14%, rgba(250, 204, 21, 0.14), transparent 18%),
          radial-gradient(circle at 72% 86%, rgba(14, 165, 233, 0.14), transparent 24%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 46%);
        pointer-events: none;
      }

      .og7-admin-ops-hero-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 -120px 160px rgba(2, 6, 23, 0.16);
        pointer-events: none;
      }

      .og7-admin-ops-hero-grid::before {
        content: '';
        position: absolute;
        inset: 0;
        background-image:
          linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px);
        background-size: 72px 72px;
        mask-image: linear-gradient(180deg, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.18));
        pointer-events: none;
      }

      .og7-admin-ops-command-card {
        position: relative;
        overflow: hidden;
      }

      .og7-admin-ops-command-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(255, 255, 255, 0.16), transparent 30%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0));
        opacity: 0.94;
        pointer-events: none;
      }

      .og7-admin-ops-surface {
        position: relative;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
        box-shadow: 0 22px 56px -42px rgba(15, 23, 42, 0.22);
      }

      .og7-admin-ops-surface::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(56, 189, 248, 0.08), transparent 22%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0));
        pointer-events: none;
      }

      .og7-admin-ops-surface::after {
        content: '';
        position: absolute;
        inset: auto 1.5rem 0 1.5rem;
        height: 3.75rem;
        background: radial-gradient(circle at center, rgba(14, 165, 233, 0.08), transparent 68%);
        filter: blur(18px);
        pointer-events: none;
      }

      .og7-admin-ops-signal-card::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(255, 255, 255, 0));
        pointer-events: none;
      }

      .og7-admin-ops-motion-rise {
        opacity: 0;
        transform: translateY(12px) scale(0.985);
        animation: og7-admin-ops-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      .og7-admin-ops-command-card::after {
        content: '';
        position: absolute;
        inset: auto 1rem 0.85rem 1rem;
        height: 1px;
        background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(148, 163, 184, 0.3), rgba(255, 255, 255, 0));
        pointer-events: none;
      }

      .og7-admin-ops-attention-card {
        position: relative;
        overflow: hidden;
      }

      .og7-admin-ops-attention-card::before {
        content: '';
        position: absolute;
        inset: 0 auto 0 0;
        width: 3px;
        background: currentColor;
        opacity: 0.72;
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

      @keyframes og7-admin-ops-rise {
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
  readonly backupSearch = signal('');
  readonly backupSort = signal<'modified-desc' | 'size-desc' | 'name-asc'>('modified-desc');
  readonly selectedImportStatus = signal('all');
  readonly importSearch = signal('');
  readonly importSort = signal<'latest-desc' | 'name-asc' | 'status-asc'>('latest-desc');
  readonly codexSubmitting = signal(false);
  readonly codexError = signal<string | null>(null);
  readonly codexResult = signal<AdminOpsCodexDispatchResponse | null>(null);
  readonly dispatchProviders = ADMIN_AI_PROVIDER_OPTIONS;
  readonly codexScopes = ADMIN_OPS_CODEX_SCOPES;
  readonly codexEfforts = ADMIN_OPS_CODEX_EFFORTS;
  readonly adminCircuitItems: readonly AdminNavigationPillItem[] = [
    { id: 'moderation', label: 'Moderation', routerLink: '/admin' },
    { id: 'ops', label: 'Owner Ops', routerLink: '/admin/ops', active: true },
    { id: 'quality', label: 'QA Matrix', routerLink: '/admin/quality' },
  ];
  readonly sectionNavItems: readonly AdminNavigationPillItem[] = [
    { id: 'overview', label: 'Overview', href: '#ops-overview-signals', active: true },
    { id: 'dispatch', label: 'Dispatch', href: '#ops-dispatch' },
    { id: 'provenance', label: 'Provenance', href: '#ops-provenance' },
    { id: 'backups', label: 'Backups', href: '#ops-backups' },
    { id: 'imports', label: 'Imports', href: '#ops-imports' },
    { id: 'security', label: 'Security', href: '#ops-security' },
  ];
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
  readonly controlPlaneKeys = computed<readonly AdminOpsControlPlaneKey[]>(() => {
    return this.snapshot()?.security.controlPlaneKeys ?? [];
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

  readonly commandMetrics = computed<readonly AdminOpsCommandMetric[]>(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return [];
    }

    const importsQuiet = !snapshot.imports.lastImportAt || snapshot.imports.importsLast24h === 0;
    const blockedUsers = snapshot.security.users.blocked;

    return [
      {
        id: 'health',
        label: 'Platform health',
        value: snapshot.health.status === 'ok' ? 'Operational' : 'Degraded',
        detail: `${this.formatDuration(snapshot.health.runtime.uptimeSeconds)} uptime · Node ${snapshot.health.runtime.nodeVersion}`,
        tone: snapshot.health.status === 'ok' ? 'ready' : 'warning',
        anchor: 'ops-overview-signals',
      },
      {
        id: 'backups',
        label: 'Backup posture',
        value:
          snapshot.backups.status === 'ok'
            ? 'Protected'
            : snapshot.backups.status === 'warning'
              ? 'Needs review'
              : 'Disabled',
        detail: snapshot.backups.lastBackupAt
          ? `Last backup ${this.formatRelativeFromNow(new Date(snapshot.backups.lastBackupAt).getTime())}`
          : 'No backup detected yet',
        tone:
          snapshot.backups.status === 'ok'
            ? 'ready'
            : snapshot.backups.status === 'warning'
              ? 'warning'
              : 'offline',
        anchor: 'ops-backups',
      },
      {
        id: 'imports',
        label: 'Import velocity',
        value: `${snapshot.imports.importsLast24h} in 24h`,
        detail: importsQuiet
          ? 'No recent import wave detected'
          : `${snapshot.imports.importedCompanies} companies imported in current scan`,
        tone: importsQuiet ? 'warning' : 'neutral',
        anchor: 'ops-imports',
      },
      {
        id: 'security',
        label: 'Security posture',
        value: `${snapshot.security.sessions.active} active sessions`,
        detail: `${blockedUsers} blocked users · ${snapshot.security.moderation.pendingCompanies} moderation queue`,
        tone: blockedUsers > 0 || snapshot.security.moderation.pendingCompanies > 0 ? 'warning' : 'ready',
        anchor: 'ops-security',
      },
    ];
  });

  readonly attentionItems = computed<readonly AdminOpsAttentionItem[]>(() => {
    const snapshot = this.snapshot();
    const items: AdminOpsAttentionItem[] = [];

    if (this.liveTelemetryState() === 'degraded') {
      items.push({
        id: 'telemetry',
        eyebrow: 'Telemetry',
        title: 'The cockpit is no longer fully fresh.',
        body: this.error()
          ? 'The latest refresh failed. Operators are currently looking at the last known good state.'
          : 'Refresh cadence slipped past the expected window. Investigate the control-plane feed.',
        tone: 'critical',
        anchor: 'ops-provenance',
        cta: 'Review provenance',
      });
    }

    if (snapshot) {
      if (snapshot.backups.status !== 'ok') {
        items.push({
          id: 'backups',
          eyebrow: 'Resilience',
          title: 'Backup coverage needs operator attention.',
          body: snapshot.backups.lastBackupAt
            ? `Latest backup is ${this.formatRelativeFromNow(new Date(snapshot.backups.lastBackupAt).getTime())}. Validate retention and file generation.`
            : 'No backup timestamp is available. Confirm the backup scheduler and storage target.',
          tone: snapshot.backups.status === 'warning' ? 'warning' : 'critical',
          anchor: 'ops-backups',
          cta: 'Open backup files',
        });
      }

      if (snapshot.security.moderation.pendingCompanies > 0) {
        items.push({
          id: 'moderation',
          eyebrow: 'Moderation',
          title: 'The moderation queue is waiting on owner action.',
          body: `${snapshot.security.moderation.pendingCompanies} pending companies can still affect the public catalog and downstream trust signals.`,
          tone: 'warning',
          anchor: 'ops-security',
          cta: 'Review security controls',
        });
      }

      const unavailableAiModules = snapshot.security.aiKeys.filter(
        (module) => module.state !== 'ready',
      ).length;
      if (unavailableAiModules > 0) {
        items.push({
          id: 'dispatch',
          eyebrow: 'Dispatch',
          title: 'Not every AI dispatch lane is armed.',
          body: `${unavailableAiModules} provider bay${unavailableAiModules > 1 ? 's are' : ' is'} still unavailable or only partially wired for owner launch.`,
          tone: 'info',
          anchor: 'ops-dispatch',
          cta: 'Inspect dispatch bays',
        });
      }
    }

    return items.slice(0, 3);
  });

  readonly heroRecommendation = computed(() => {
    const attention = this.attentionItems()[0];
    if (attention) {
      return `${attention.eyebrow}: ${attention.title}`;
    }

    return 'All primary operating signals are inside tolerance. Use dispatch only after reviewing the latest evidence trail.';
  });
  readonly importStatusOptions = computed<readonly string[]>(() => {
    const statuses = new Set<string>();
    for (const entry of this.snapshot()?.imports.recent ?? []) {
      statuses.add(entry.status);
    }
    return ['all', ...Array.from(statuses).sort((left, right) => left.localeCompare(right))];
  });
  readonly filteredImportEntries = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return [];
    }

    const selectedStatus = this.selectedImportStatus();
    if (selectedStatus === 'all') {
      return snapshot.imports.recent;
    }

    return snapshot.imports.recent.filter((entry) => entry.status === selectedStatus);
  });
  readonly filteredBackupFiles = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return [];
    }

    const query = this.backupSearch().trim().toLowerCase();
    const sort = this.backupSort();
    const files = snapshot.backups.files.filter((file) => {
      if (!query) {
        return true;
      }

      return file.name.toLowerCase().includes(query);
    });

    return [...files].sort((left, right) => {
      if (sort === 'name-asc') {
        return left.name.localeCompare(right.name);
      }
      if (sort === 'size-desc') {
        return right.sizeBytes - left.sizeBytes;
      }
      return new Date(right.modifiedAt).getTime() - new Date(left.modifiedAt).getTime();
    });
  });
  readonly filteredSortedImportEntries = computed(() => {
    const query = this.importSearch().trim().toLowerCase();
    const sort = this.importSort();
    const entries = this.filteredImportEntries().filter((entry) => {
      if (!query) {
        return true;
      }

      return [entry.name, entry.businessId ?? '', entry.source ?? '', entry.status]
        .some((value) => value.toLowerCase().includes(query));
    });

    return [...entries].sort((left, right) => {
      if (sort === 'name-asc') {
        return left.name.localeCompare(right.name);
      }
      if (sort === 'status-asc') {
        return left.status.localeCompare(right.status);
      }

      const leftTimestamp = new Date(left.importedAt ?? left.updatedAt ?? 0).getTime();
      const rightTimestamp = new Date(right.importedAt ?? right.updatedAt ?? 0).getTime();
      return rightTimestamp - leftTimestamp;
    });
  });
  readonly hasBackupFilters = computed(
    () => this.backupSearch().trim().length > 0 || this.backupSort() !== 'modified-desc',
  );
  readonly hasImportFilters = computed(
    () =>
      this.importSearch().trim().length > 0 ||
      this.importSort() !== 'latest-desc' ||
      this.selectedImportStatus() !== 'all',
  );
  readonly backupSummary = computed(() => {
    const files = this.filteredBackupFiles();
    let fresh = 0;
    let aging = 0;
    let stale = 0;

    for (const file of files) {
      const severity = this.backupFileSeverity(file);
      if (severity === 'fresh') {
        fresh += 1;
      } else if (severity === 'aging') {
        aging += 1;
      } else {
        stale += 1;
      }
    }

    return {
      visible: files.length,
      fresh,
      aging,
      stale,
    };
  });
  readonly importSummary = computed(() => {
    const entries = this.filteredSortedImportEntries();
    let stable = 0;
    let monitor = 0;
    let actionNeeded = 0;

    for (const entry of entries) {
      const severity = this.importEntrySeverity(entry);
      if (severity === 'ready') {
        stable += 1;
      } else if (severity === 'warning') {
        monitor += 1;
      } else {
        actionNeeded += 1;
      }
    }

    return {
      visible: entries.length,
      stable,
      monitor,
      actionNeeded,
    };
  });
  readonly backupFreshnessLabel = computed(() => {
    const lastBackupAt = this.snapshot()?.backups.lastBackupAt;
    if (!lastBackupAt) {
      return 'No backup timestamp';
    }

    return this.formatRelativeFromNow(new Date(lastBackupAt).getTime());
  });
  readonly backupOperatorAction = computed(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return 'Wait for the next snapshot before validating the resilience posture.';
    }

    if (snapshot.backups.status === 'ok') {
      return 'Retention and latest backup are within tolerance. Validate file inventory before making intrusive changes.';
    }

    if (snapshot.backups.status === 'warning') {
      return 'Review the latest files and provenance trail before trusting the current restore posture.';
    }

    return 'Backups look disabled or unavailable. Treat this environment as high-risk until storage and schedule are restored.';
  });
  readonly securityActionItems = computed<readonly AdminOpsSecurityActionItem[]>(() => {
    const snapshot = this.snapshot();
    if (!snapshot) {
      return [];
    }

    return [
      {
        id: 'moderation',
        title: 'Moderation queue',
        body: `${snapshot.security.moderation.pendingCompanies} pending companies are waiting for owner adjudication.`,
        cta: 'Open moderation queue',
        href: '/admin',
        tone: snapshot.security.moderation.pendingCompanies > 0 ? 'warning' : 'ready',
      },
      {
        id: 'sessions',
        title: 'Session review',
        body: `${snapshot.security.sessions.active} active sessions across ${snapshot.security.sessions.usersWithActiveSessions} user accounts.`,
        cta: 'Review auth policy',
        href: '#ops-security',
        tone: snapshot.security.sessions.revoked > 0 ? 'warning' : 'ready',
      },
      {
        id: 'uploads',
        title: 'Upload safety',
        body: snapshot.security.uploads.safetyEnabled
          ? `Guard enabled · max ${this.formatBytes(snapshot.security.uploads.maxFileSizeBytes)}`
          : 'Upload safety guard is disabled.',
        cta: 'Inspect security controls',
        href: '#ops-security',
        tone: snapshot.security.uploads.safetyEnabled ? 'ready' : 'offline',
      },
    ];
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

  updateImportStatus(value: string): void {
    if (value === 'all' || this.importStatusOptions().includes(value)) {
      this.selectedImportStatus.set(value);
    }
  }

  updateBackupSearch(value: string): void {
    this.backupSearch.set(value);
  }

  updateBackupSort(value: string): void {
    if (value === 'modified-desc' || value === 'size-desc' || value === 'name-asc') {
      this.backupSort.set(value);
    }
  }

  resetBackupFilters(): void {
    this.backupSearch.set('');
    this.backupSort.set('modified-desc');
  }

  updateImportSearch(value: string): void {
    this.importSearch.set(value);
  }

  updateImportSort(value: string): void {
    if (value === 'latest-desc' || value === 'name-asc' || value === 'status-asc') {
      this.importSort.set(value);
    }
  }

  resetImportFilters(): void {
    this.selectedImportStatus.set('all');
    this.importSearch.set('');
    this.importSort.set('latest-desc');
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
  trackControlPlaneKey = (_: number, key: AdminOpsControlPlaneKey) => key.id;

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

  controlPlaneKeyClasses(key: AdminOpsControlPlaneKey): string {
    switch (key.state) {
      case 'ready':
        return 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100';
      case 'scan-unavailable':
        return 'border-amber-400/25 bg-amber-400/10 text-amber-100';
      default:
        return 'border-slate-300/20 bg-slate-900/70 text-slate-100';
    }
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

  commandMetricClasses(tone: AdminOpsCommandMetric['tone']): string {
    switch (tone) {
      case 'ready':
        return 'border-emerald-300/38 bg-[linear-gradient(180deg,rgba(6,78,59,0.6),rgba(6,95,70,0.22))] text-white shadow-[0_24px_70px_-38px_rgba(16,185,129,0.5)]';
      case 'warning':
        return 'border-amber-300/40 bg-[linear-gradient(180deg,rgba(120,53,15,0.58),rgba(120,53,15,0.18))] text-white shadow-[0_24px_70px_-38px_rgba(245,158,11,0.42)]';
      case 'offline':
        return 'border-rose-300/38 bg-[linear-gradient(180deg,rgba(127,29,29,0.62),rgba(127,29,29,0.2))] text-white shadow-[0_24px_70px_-38px_rgba(244,63,94,0.45)]';
      default:
        return 'border-cyan-300/28 bg-[linear-gradient(180deg,rgba(8,47,73,0.62),rgba(14,116,144,0.18))] text-white shadow-[0_24px_70px_-38px_rgba(56,189,248,0.35)]';
    }
  }

  commandMetricToneLabel(tone: AdminOpsCommandMetric['tone']): string {
    switch (tone) {
      case 'ready':
        return 'Stable';
      case 'warning':
        return 'Review';
      case 'offline':
        return 'Critical';
      default:
        return 'Monitor';
    }
  }

  commandMetricBadgeClasses(tone: AdminOpsCommandMetric['tone']): string {
    switch (tone) {
      case 'ready':
        return 'border-emerald-100/28 bg-emerald-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      case 'warning':
        return 'border-amber-100/28 bg-amber-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      case 'offline':
        return 'border-rose-100/28 bg-rose-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      default:
        return 'border-cyan-100/28 bg-cyan-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
    }
  }

  overviewSignalCardClasses(tone: 'ready' | 'warning' | 'offline' | 'neutral'): string {
    switch (tone) {
      case 'ready':
        return 'border-emerald-200/85 bg-[linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.86))] text-slate-950 shadow-[0_24px_64px_-40px_rgba(16,185,129,0.38)]';
      case 'warning':
        return 'border-amber-200/90 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(254,240,138,0.28))] text-slate-950 shadow-[0_24px_64px_-40px_rgba(245,158,11,0.34)]';
      case 'offline':
        return 'border-rose-200/90 bg-[linear-gradient(180deg,rgba(255,241,242,0.98),rgba(254,205,211,0.3))] text-slate-950 shadow-[0_24px_64px_-40px_rgba(244,63,94,0.34)]';
      default:
        return 'border-sky-200/90 bg-[linear-gradient(180deg,rgba(240,249,255,0.98),rgba(224,242,254,0.86))] text-slate-950 shadow-[0_24px_64px_-40px_rgba(14,165,233,0.28)]';
    }
  }

  overviewSignalBadgeClasses(tone: 'ready' | 'warning' | 'offline' | 'neutral'): string {
    switch (tone) {
      case 'ready':
        return 'border-emerald-400/55 bg-emerald-500/16 text-emerald-950';
      case 'warning':
        return 'border-amber-400/55 bg-amber-500/16 text-amber-950';
      case 'offline':
        return 'border-rose-400/55 bg-rose-500/16 text-rose-950';
      default:
        return 'border-sky-400/55 bg-sky-500/16 text-sky-950';
    }
  }

  overviewSignalToneLabel(tone: 'ready' | 'warning' | 'offline' | 'neutral'): string {
    switch (tone) {
      case 'ready':
        return 'Nominal';
      case 'warning':
        return 'Watch';
      case 'offline':
        return 'Escalate';
      default:
        return 'Tracking';
    }
  }

  healthSignalTone(snapshot: AdminOpsSnapshot): 'ready' | 'warning' {
    return snapshot.health.status === 'ok' ? 'ready' : 'warning';
  }

  backupSignalTone(snapshot: AdminOpsSnapshot): 'ready' | 'warning' | 'offline' {
    if (snapshot.backups.status === 'ok') {
      return 'ready';
    }
    if (snapshot.backups.status === 'warning') {
      return 'warning';
    }
    return 'offline';
  }

  importSignalTone(snapshot: AdminOpsSnapshot): 'warning' | 'neutral' {
    return !snapshot.imports.lastImportAt || snapshot.imports.importsLast24h === 0
      ? 'warning'
      : 'neutral';
  }

  securitySignalTone(snapshot: AdminOpsSnapshot): 'ready' | 'warning' {
    return snapshot.security.users.blocked > 0 || snapshot.security.moderation.pendingCompanies > 0
      ? 'warning'
      : 'ready';
  }

  attentionItemClasses(tone: AdminOpsAttentionItem['tone']): string {
    switch (tone) {
      case 'critical':
        return 'border-rose-300/38 bg-[linear-gradient(180deg,rgba(127,29,29,0.58),rgba(127,29,29,0.18))] text-white shadow-[0_22px_70px_-38px_rgba(244,63,94,0.42)]';
      case 'warning':
        return 'border-amber-300/38 bg-[linear-gradient(180deg,rgba(120,53,15,0.58),rgba(120,53,15,0.16))] text-white shadow-[0_22px_70px_-38px_rgba(245,158,11,0.38)]';
      default:
        return 'border-cyan-300/34 bg-[linear-gradient(180deg,rgba(8,47,73,0.58),rgba(14,116,144,0.18))] text-white shadow-[0_22px_70px_-38px_rgba(56,189,248,0.34)]';
    }
  }

  attentionItemBadgeClasses(tone: AdminOpsAttentionItem['tone']): string {
    switch (tone) {
      case 'critical':
        return 'border-rose-100/28 bg-rose-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      case 'warning':
        return 'border-amber-100/28 bg-amber-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
      default:
        return 'border-cyan-100/28 bg-cyan-200/20 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]';
    }
  }

  securityActionClasses(tone: AdminOpsSecurityActionItem['tone']): string {
    switch (tone) {
      case 'ready':
        return 'border-emerald-200 bg-emerald-50 text-emerald-900';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-900';
      default:
        return 'border-rose-200 bg-rose-50 text-rose-900';
    }
  }

  backupFileSeverity(file: AdminOpsBackupFile): 'fresh' | 'aging' | 'stale' {
    const ageMs = this.liveNow() - new Date(file.modifiedAt).getTime();
    const ageHours = ageMs / 3_600_000;
    if (ageHours <= 24) {
      return 'fresh';
    }
    if (ageHours <= 72) {
      return 'aging';
    }
    return 'stale';
  }

  backupFileSeverityLabel(file: AdminOpsBackupFile): string {
    switch (this.backupFileSeverity(file)) {
      case 'fresh':
        return 'Fresh';
      case 'aging':
        return 'Aging';
      default:
        return 'Stale';
    }
  }

  backupFileSeverityClasses(file: AdminOpsBackupFile): string {
    switch (this.backupFileSeverity(file)) {
      case 'fresh':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'aging':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      default:
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
  }

  importEntrySeverity(entry: AdminOpsImportEntry): 'ready' | 'warning' | 'offline' {
    const normalized = entry.status.trim().toLowerCase();
    if (/(failed|error|rejected|blocked)/.test(normalized)) {
      return 'offline';
    }
    if (/(imported|complete|completed|approved|ok|success)/.test(normalized)) {
      return 'ready';
    }
    return 'warning';
  }

  importEntrySeverityLabel(entry: AdminOpsImportEntry): string {
    switch (this.importEntrySeverity(entry)) {
      case 'ready':
        return 'Stable';
      case 'offline':
        return 'Action needed';
      default:
        return 'Monitor';
    }
  }

  importEntrySeverityClasses(entry: AdminOpsImportEntry): string {
    switch (this.importEntrySeverity(entry)) {
      case 'ready':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'offline':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
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
