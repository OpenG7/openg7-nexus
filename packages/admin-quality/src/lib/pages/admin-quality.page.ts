import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import {
  ADMIN_AI_PROVIDER_OPTIONS,
  AdminAiProvider,
  isAdminAiProvider,
  resolveAdminAiProviderOption,
} from '../data-access/admin-ai-providers';
import {
  AdminOpsCodexDispatchResponse,
  AdminOpsCodexScope,
  AdminOpsAiProofSnapshot,
  AdminOpsSecuritySnapshot,
} from '../data-access/admin-ops.service';
import {
  AdminQualityMatrixBucket,
  AdminQualityMatrixEntry,
  AdminQualityMatrixPilotActionType,
  AdminQualityMatrixPilotBucket,
  AdminQualityMatrixPilotPriority,
  AdminQualityMatrixPriority,
  AdminQualityMatrixSignalDispatchState,
  AdminQualityMatrixRecalculationScope,
  AdminQualityMatrixRecalculationEntry,
  AdminQualityMatrixRecalculationResult,
  AdminQualityMatrixRecalculationSnapshot,
  AdminQualityMatrixSnapshot,
  AdminQualityMatrixSourceStatus,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';
import { AdminQualityMissionDecisionRecord } from '../data-access/admin-quality-mission-decisions.service';
import {
  ADMIN_QUALITY_MATRIX_PORT,
  ADMIN_QUALITY_MISSION_DECISIONS_PORT,
  ADMIN_QUALITY_NOTIFICATIONS,
  ADMIN_QUALITY_OPS_PORT,
  ADMIN_QUALITY_ROUTE_CONFIG,
} from '../data-access/admin-quality.ports';
import {
  AdminQualityWorkspaceDrawerComponent,
  AdminQualityWorkspaceSurface,
} from '../feature/admin-quality-workspace-drawer.component';

import {
  AdminNavigationPillItem,
  AdminNavigationPillsComponent,
} from './admin-navigation-pills.component';
import {
  AdminQualityActionIntent,
  AdminQualityActionRecord,
  AdminQualityActionStateCoverage,
  AdminQualityActionStatus,
  AdminQualityActionTrigger,
  buildActionRegistry,
  buildUndocumentedDiscoveredActions,
} from './admin-quality-action-registry';
import {
  AdminQualityComboboxComponent,
  AdminQualityComboboxOption,
} from './admin-quality-combobox.component';
import {
  AdminQualityCommandMetric,
  AdminQualityCommandScopeSummary,
  AdminQualityCommandRailComponent,
} from './admin-quality-command-rail.component';
import {
  AdminQualityCoverageMatrixComponent,
  AdminQualityCoverageSignalId,
  AdminQualityCoverageSignalSelection,
  AdminQualityCoverageSignalTrace,
} from './admin-quality-coverage-matrix.component';
import { AdminQualityDelegationPlan, buildDelegationPlan } from './admin-quality-delegation';
import { AdminQualityDomainIconComponent } from './admin-quality-domain-icon.component';
import {
  AdminQualityMissionActionDescriptor,
  AdminQualityMissionActionTone,
  AdminQualityMissionControlAction,
  AdminQualityMissionControlActionEvent,
  missionActionDescriptors,
  resolveMissionAction,
} from './admin-quality-mission-actions';
import {
  AdminQualityMissionControlState,
  AdminQualityMissionDecisionMap,
  AdminQualityMissionRecommendation,
  AdminQualityMissionStatus,
  AdminQualityMissionTimelineStatus,
  buildMissionControl,
} from './admin-quality-mission-control';
import {
  AdminQualityMissionProofDisplay,
  AdminQualityMissionProviderComparisonEntry,
} from './admin-quality-mission-control.component';
import {
  AdminQualityMissionQuotaSummary,
  AdminQualityMissionTask,
  buildMissionTasks,
  summarizeMissionQuota,
} from './admin-quality-mission-task-planner';

type FilterValue<T extends string> = 'all' | T;
type AdminQualityLegacyInspectionSurface = 'delegation' | 'actions';
type AdminQualityMissionDecisionSyncStatus = 'local' | 'syncing' | 'server' | 'unavailable';
type AdminQualityAiOpsSyncStatus = 'loading' | 'ready' | 'unavailable';
type AdminQualityAiOpsModule = AdminOpsSecuritySnapshot['aiKeys'][number];
type AdminQualityAiProofModule = AdminOpsAiProofSnapshot['providers'][number];
type AdminQualityAiTelemetryState = 'live' | 'degraded' | 'syncing' | 'offline';
type AdminQualityMissionHudSection = 'coverage' | 'mission' | 'workspace';
type AdminQualityMissionHudAmbientTone = 'nominal' | 'syncing' | 'warning' | 'critical';
type AdminQualityMissionRadarEchoIntensity = 'low' | 'medium' | 'high';
type AdminQualityMissionRadarLockReason = 'manual-targeting' | 'section-pulse' | 'proof-surge';
type AdminQualityMissionRadarTimelineKind = 'lock' | 'action' | 'proof';
type AdminQualityBuildNowTone = 'review' | 'build' | 'proof' | 'blocked';
type AdminQualityConsoleSurface = 'context' | 'ai' | 'queue' | 'workspace';
type AdminQualityMissionRadarSignalTone =
  | 'manual'
  | 'pulse'
  | 'proof'
  | AdminQualityMissionActionTone;
interface AdminQualityConsoleSurfaceOption {
  readonly id: AdminQualityConsoleSurface;
  readonly label: string;
  readonly detail: string;
  readonly iconLabel: string;
}
interface AdminQualityActiveFilterChip {
  readonly id: string;
  readonly label: string;
}
interface AdminQualityBuildNowItem {
  readonly entryId: string;
  readonly domain: string;
  readonly actionLabel: string;
  readonly reasonLabel: string;
  readonly reasonTags: readonly string[];
  readonly summarySentence: string;
  readonly automationLabel: string;
  readonly automationDetail: string;
  readonly detail: string;
  readonly nextMove: string;
  readonly readinessLabel: string;
  readonly score: number;
  readonly tone: AdminQualityBuildNowTone;
}
interface AdminQualityBuildNowGroup {
  readonly tone: AdminQualityBuildNowTone;
  readonly label: string;
  readonly count: number;
  readonly active: boolean;
}
interface AdminQualityMissionRadarEchoPoint {
  readonly id: AdminQualityMissionHudSection;
  readonly label: string;
  readonly shortLabel: string;
  readonly metricLabel: string;
  readonly leftPercent: number;
  readonly topPercent: number;
  readonly left: string;
  readonly top: string;
  readonly intensity: AdminQualityMissionRadarEchoIntensity;
  readonly active: boolean;
  readonly pulsing: boolean;
}
interface AdminQualityMissionRadarLockHistoryEntry {
  readonly sequence: number;
  readonly id: AdminQualityMissionHudSection;
  readonly kind: AdminQualityMissionRadarTimelineKind;
  readonly stateLabel: string;
  readonly reason?: AdminQualityMissionRadarLockReason;
  readonly action?: AdminQualityMissionControlAction;
  readonly actionTone?: AdminQualityMissionActionTone;
  readonly detailLabel?: string;
}
interface AdminQualityMissionRadarLockDisplayEntry extends AdminQualityMissionRadarLockHistoryEntry {
  readonly label: string;
  readonly metricLabel: string;
  readonly proofStream: AdminQualityMissionRadarEchoIntensity;
  readonly reasonLabel: string;
  readonly kindLabel: string;
  readonly signalTone: AdminQualityMissionRadarSignalTone;
  readonly detailLabel: string;
}
interface AdminQualityMissionHudTimelineStep {
  readonly id: string;
  readonly label: string;
  readonly shortLabel: string;
  readonly status: AdminQualityMissionTimelineStatus;
}
interface AdminQualityPersistedViewState {
  readonly search?: string;
  readonly selectedDomain?: FilterValue<string>;
  readonly selectedPriority?: FilterValue<AdminQualityMatrixPriority>;
  readonly selectedE2EStatus?: FilterValue<AdminQualityMatrixStatus>;
  readonly selectedBucket?: FilterValue<AdminQualityMatrixBucket>;
  readonly selectedEntryId?: string | null;
  readonly selectedActionId?: string | null;
  readonly selectedMissionId?: string | null;
  readonly activeConsoleSurface?: AdminQualityConsoleSurface;
  readonly activeWorkspaceSurface?: AdminQualityWorkspaceSurface;
  readonly selectedAiProvider?: AdminAiProvider;
  readonly missionHudExpanded?: boolean;
  readonly inspectionSurface?: AdminQualityLegacyInspectionSurface;
  readonly signalDelegationTraces?: Record<string, AdminQualityCoverageSignalTrace>;
}

interface AdminQualityWorkspaceSignalContext {
  readonly signalId: AdminQualityCoverageSignalId;
  readonly shortLabel: string;
  readonly label: string;
  readonly headline: string;
  readonly detail: string;
  readonly observedGap: string;
  readonly nextMove: string;
  readonly recommendedAction: string;
  readonly recommendations: readonly string[];
  readonly attention: boolean;
}

interface AdminQualityMatrixRecalculationHighlight {
  readonly label: string;
  readonly value: string;
}

interface AdminQualityMatrixRecalculationScopeOption {
  readonly id: AdminQualityMatrixRecalculationScope;
  readonly label: string;
}

const MATRIX_RECALCULATION_SCOPE_OPTIONS: readonly AdminQualityMatrixRecalculationScopeOption[] = [
  { id: 'refresh-required', label: 'Entrees a piloter' },
  { id: 'selected-entry', label: 'Entree active' },
  { id: 'all', label: 'Toute la matrice' },
];
const MATRIX_RECALCULATION_SCOPE_SELECT_OPTIONS: readonly AdminQualityComboboxOption[] =
  MATRIX_RECALCULATION_SCOPE_OPTIONS.map((option) => ({
    value: option.id,
    label: option.label,
  }));
const PRIORITY_FILTER_OPTIONS: readonly AdminQualityComboboxOption[] = [
  { value: 'all', label: 'Priorite' },
  { value: 'haute', label: 'Priorite : Haute' },
  { value: 'moyenne', label: 'Priorite : Moyenne' },
  { value: 'basse', label: 'Priorite : Basse' },
];
const E2E_FILTER_OPTIONS: readonly AdminQualityComboboxOption[] = [
  { value: 'all', label: 'E2E' },
  { value: 'oui', label: 'E2E : Oui' },
  { value: 'partiel', label: 'E2E : Partiel' },
  { value: 'non', label: 'E2E : Non' },
  { value: 'hors MVP', label: 'E2E : Hors MVP' },
];
const BUCKET_FILTER_OPTIONS: readonly AdminQualityComboboxOption[] = [
  { value: 'all', label: 'Gestion' },
  { value: 'covered', label: 'Gestion : Couvert' },
  { value: 'proof-gap', label: 'Gestion : Preuve a renforcer' },
  { value: 'product-gap', label: 'Gestion : Produit d abord' },
  { value: 'scope-limit', label: 'Gestion : Hors scope courant' },
];

const MISSION_CONTROL_STORAGE_KEY = 'og7.admin-quality.mission-control.v1';
const VIEW_STATE_STORAGE_KEY = 'og7.admin-quality.view-state.v1';
const ADMIN_QUALITY_AI_OPS_REFRESH_INTERVAL_MS = 30_000;
const ADMIN_QUALITY_LIVE_TICK_INTERVAL_MS = 1_000;

@Component({
  standalone: true,
  selector: 'og7-admin-quality-page',
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    AdminQualityComboboxComponent,
    AdminNavigationPillsComponent,
    AdminQualityCommandRailComponent,
    AdminQualityCoverageMatrixComponent,
    AdminQualityDomainIconComponent,
    AdminQualityWorkspaceDrawerComponent,
  ],
  templateUrl: './admin-quality.page.html',
  styles: [
    `
      :host {
        display: block;
      }

      .og7-cockpit-surface {
        isolation: isolate;
        --og7-cockpit-accent: rgba(34, 211, 238, 0.2);
        --og7-cockpit-accent-strong: rgba(34, 211, 238, 0.4);
        --og7-cockpit-secondary: rgba(56, 189, 248, 0.16);
        --og7-cockpit-outline: rgba(34, 211, 238, 0.18);
        --og7-cockpit-glow: rgba(34, 211, 238, 0.26);
        --og7-cockpit-sweep: rgba(103, 232, 249, 0.38);
        --og7-cockpit-band: rgba(34, 211, 238, 0.22);
        --og7-cockpit-sweep-duration: 16s;
      }

      .og7-cockpit-surface::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        box-shadow:
          inset 0 0 0 1px var(--og7-cockpit-outline),
          0 0 46px -28px var(--og7-cockpit-glow);
        opacity: 0.95;
        transition:
          box-shadow 420ms ease,
          opacity 420ms ease;
      }

      .og7-admin-quality-shell::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at 12% 18%, rgba(56, 189, 248, 0.18), transparent 22%),
          radial-gradient(circle at 84% 16%, rgba(14, 165, 233, 0.16), transparent 18%),
          radial-gradient(circle at 74% 82%, rgba(34, 197, 94, 0.12), transparent 22%),
          linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0) 44%);
        pointer-events: none;
      }

      .og7-admin-quality-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        box-shadow:
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          inset 0 -120px 160px rgba(2, 6, 23, 0.18);
        pointer-events: none;
      }

      .og7-admin-quality-surface {
        position: relative;
        overflow: hidden;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
        box-shadow: 0 22px 56px -42px rgba(15, 23, 42, 0.22);
      }

      .og7-admin-quality-surface::before {
        content: '';
        position: absolute;
        inset: 0;
        background:
          radial-gradient(circle at top right, rgba(56, 189, 248, 0.08), transparent 22%),
          linear-gradient(180deg, rgba(255, 255, 255, 0.32), rgba(255, 255, 255, 0));
        pointer-events: none;
      }

      .og7-admin-quality-surface::after {
        content: '';
        position: absolute;
        inset: auto 1.5rem 0 1.5rem;
        height: 3.75rem;
        background: radial-gradient(circle at center, rgba(34, 197, 94, 0.08), transparent 68%);
        filter: blur(18px);
        pointer-events: none;
      }

      .og7-admin-quality-motion-rise {
        opacity: 0;
        transform: translateY(12px) scale(0.985);
        animation: og7-admin-quality-rise 620ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }

      .og7-console-map-beacon {
        --og7-console-beacon-rgb: 34, 211, 238;
        animation: og7-console-map-heartbeat 1.9s cubic-bezier(0.18, 0.84, 0.28, 1) infinite;
        filter: saturate(1.08);
      }

      .og7-console-map-beacon::before,
      .og7-console-map-beacon::after {
        content: '';
        position: absolute;
        inset: -0.45rem;
        border-radius: 9999px;
        background: radial-gradient(
          circle,
          rgba(var(--og7-console-beacon-rgb), 0.48) 0%,
          rgba(var(--og7-console-beacon-rgb), 0.22) 28%,
          transparent 70%
        );
        opacity: 0;
        transform: scale(0.32);
        pointer-events: none;
      }

      .og7-console-map-beacon::before {
        animation: og7-console-map-heart-glow 1.9s cubic-bezier(0.18, 0.84, 0.28, 1) infinite;
      }

      .og7-console-map-beacon::after {
        animation: og7-console-map-heart-glow 1.9s cubic-bezier(0.18, 0.84, 0.28, 1) infinite;
        animation-delay: 180ms;
        inset: -0.72rem;
      }

      .og7-console-map-beacon--emerald {
        --og7-console-beacon-rgb: 52, 211, 153;
        animation-delay: 620ms;
      }

      .og7-console-map-beacon--emerald::before {
        animation-delay: 620ms;
      }

      .og7-console-map-beacon--emerald::after {
        animation-delay: 800ms;
      }

      .og7-cockpit-sync-band {
        background: linear-gradient(
          90deg,
          transparent,
          var(--og7-cockpit-band),
          var(--og7-cockpit-accent-strong),
          var(--og7-cockpit-band),
          transparent
        );
        opacity: 0.9;
        transition:
          background 420ms ease,
          opacity 420ms ease,
          transform 420ms ease;
      }

      .og7-radar-sweep {
        animation: og7-mission-radar-sweep var(--og7-cockpit-sweep-duration) linear infinite;
        background: conic-gradient(
          from 0deg,
          transparent 0deg,
          transparent 308deg,
          var(--og7-cockpit-sweep) 332deg,
          rgba(255, 255, 255, 0.05) 340deg,
          transparent 360deg
        );
        mix-blend-mode: screen;
        opacity: 0.62;
        transform-origin: center;
        transition: opacity 420ms ease;
        -webkit-mask: radial-gradient(
          circle at center,
          transparent 0 18%,
          black 35%,
          black 74%,
          transparent 100%
        );
        mask: radial-gradient(
          circle at center,
          transparent 0 18%,
          black 35%,
          black 74%,
          transparent 100%
        );
      }

      .og7-radar-sweep[data-og7-mode='lock'] {
        animation:
          og7-mission-radar-sweep var(--og7-cockpit-sweep-duration) linear infinite,
          og7-radar-lock-sweep 1.8s ease-in-out infinite;
      }

      .og7-radar-sweep[data-og7-mode='action'] {
        animation:
          og7-mission-radar-sweep calc(var(--og7-cockpit-sweep-duration) * 0.82) linear infinite,
          og7-radar-action-sweep 1.25s steps(3, end) infinite;
      }

      .og7-radar-sweep[data-og7-mode='proof'] {
        animation:
          og7-mission-radar-sweep calc(var(--og7-cockpit-sweep-duration) * 0.68) linear infinite,
          og7-radar-proof-sweep 1.45s ease-in-out infinite;
      }

      [data-og7-radar-motion='static'] .og7-radar-sweep {
        animation: none !important;
        display: none;
        opacity: 0 !important;
      }

      [data-og7-radar-motion='static'] [data-og7='admin-quality-mission-control-radar'] {
        background:
          radial-gradient(circle at 18% 18%, rgba(34, 211, 238, 0.1), transparent 24%),
          radial-gradient(circle at 82% 16%, rgba(96, 165, 250, 0.08), transparent 22%),
          linear-gradient(180deg, rgba(15, 23, 42, 0.16), rgba(2, 6, 23, 0.04)) !important;
        opacity: 0.48 !important;
      }

      [data-og7-radar-motion='static'] .og7-radar-trail-line,
      [data-og7-radar-motion='static'] .og7-radar-acquisition-ring,
      [data-og7-radar-motion='static'] [data-og7='admin-quality-mission-control-radar-echo'],
      [data-og7-radar-motion='static'] [data-og7='admin-quality-mission-control-radar-echo'] span {
        animation: none !important;
      }

      @keyframes og7-mission-radar-sweep {
        from {
          transform: rotate(0deg);
        }

        to {
          transform: rotate(360deg);
        }
      }

      @keyframes og7-admin-quality-rise {
        0% {
          opacity: 0;
          transform: translateY(12px) scale(0.985);
        }

        100% {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes og7-console-map-heartbeat {
        0%,
        100% {
          opacity: 0.72;
          transform: scale(1);
        }

        10% {
          opacity: 1;
          transform: scale(1.95);
        }

        18% {
          transform: scale(1.15);
        }

        28% {
          opacity: 1;
          transform: scale(1.62);
        }

        44% {
          opacity: 0.78;
          transform: scale(1);
        }
      }

      @keyframes og7-console-map-heart-glow {
        0%,
        100% {
          opacity: 0;
          transform: scale(0.28);
        }

        10% {
          opacity: 0.78;
          transform: scale(0.72);
        }

        30% {
          opacity: 0.34;
          transform: scale(1.38);
        }

        52% {
          opacity: 0;
          transform: scale(1.74);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .og7-console-map-beacon,
        .og7-console-map-beacon::before,
        .og7-console-map-beacon::after {
          animation: none;
        }
      }

      @keyframes og7-radar-lock-sweep {
        0%,
        100% {
          opacity: 0.5;
          filter: saturate(0.9);
        }

        50% {
          opacity: 0.74;
          filter: saturate(1.08);
        }
      }

      @keyframes og7-radar-action-sweep {
        0%,
        100% {
          opacity: 0.58;
          filter: brightness(0.94);
        }

        45% {
          opacity: 0.86;
          filter: brightness(1.12);
        }
      }

      @keyframes og7-radar-proof-sweep {
        0%,
        100% {
          opacity: 0.6;
          filter: saturate(0.95) brightness(0.98);
        }

        40% {
          opacity: 0.92;
          filter: saturate(1.18) brightness(1.08);
        }
      }

      .og7-radar-trail-line {
        transition:
          opacity 360ms ease,
          stroke-width 360ms ease,
          filter 360ms ease,
          stroke-dasharray 360ms ease;
      }

      .og7-radar-trail-line[data-og7-active='true'] {
        filter: drop-shadow(0 0 6px var(--og7-cockpit-glow));
      }

      .og7-radar-trail-line[data-og7-pulse='true'] {
        animation: og7-radar-trail-pulse 980ms ease-out;
      }

      .og7-radar-acquisition-ring {
        transition:
          opacity 320ms ease,
          transform 320ms ease,
          border-color 320ms ease,
          box-shadow 320ms ease;
      }

      .og7-radar-acquisition-ring[data-og7-active='true'] {
        animation: og7-radar-acquisition-spin 5.2s linear infinite;
      }

      .og7-radar-acquisition-ring[data-og7-pulse='true'] {
        animation:
          og7-radar-acquisition-spin 5.2s linear infinite,
          og7-radar-acquisition-pulse 920ms ease-out;
      }

      .og7-radar-lock-focus-shell {
        position: relative;
      }

      .og7-radar-lock-focus-shell::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        pointer-events: none;
        box-shadow: inset 0 0 0 1px transparent;
        opacity: 0;
        transition:
          opacity 280ms ease,
          box-shadow 280ms ease,
          transform 280ms ease;
      }

      .og7-radar-lock-focus-shell[data-og7-lock-focus='true']::after {
        opacity: 1;
        box-shadow:
          inset 0 0 0 1px var(--og7-cockpit-accent-strong),
          0 0 0 1px color-mix(in srgb, var(--og7-cockpit-accent-strong) 45%, transparent),
          0 0 34px -18px var(--og7-cockpit-glow);
      }

      @keyframes og7-radar-trail-pulse {
        0% {
          opacity: 0.24;
          stroke-dashoffset: 18;
        }

        45% {
          opacity: 0.96;
          stroke-dashoffset: 0;
        }

        100% {
          opacity: 0.62;
          stroke-dashoffset: -12;
        }
      }

      @keyframes og7-radar-acquisition-spin {
        from {
          transform: rotate(0deg) scale(1);
        }

        to {
          transform: rotate(360deg) scale(1);
        }
      }

      @keyframes og7-radar-acquisition-pulse {
        0% {
          opacity: 0.3;
          transform: scale(0.9);
        }

        50% {
          opacity: 0.95;
          transform: scale(1.05);
        }

        100% {
          opacity: 0.78;
          transform: scale(1);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityPage implements OnInit, AfterViewInit {
  private readonly service = inject(ADMIN_QUALITY_MATRIX_PORT);
  private readonly opsService = inject(ADMIN_QUALITY_OPS_PORT);
  private readonly missionDecisionService = inject(ADMIN_QUALITY_MISSION_DECISIONS_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notifications = inject(ADMIN_QUALITY_NOTIFICATIONS);
  private readonly routeConfig = inject(ADMIN_QUALITY_ROUTE_CONFIG);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private aiOpsRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private liveTickTimer: ReturnType<typeof setInterval> | null = null;
  private readonly syncingSignalGuidanceTrackingIds = new Set<string>();
  private missionHudSectionObserver: IntersectionObserver | null = null;
  private missionHudSectionPulseTimer: ReturnType<typeof setTimeout> | null = null;
  private missionControlPanelFocusTimer: ReturnType<typeof setTimeout> | null = null;
  private missionControlRadarLockSequence = 0;
  private pendingMissionControlLockReason: AdminQualityMissionRadarLockReason | null = null;
  private readonly missionHudSectionOrder: readonly AdminQualityMissionHudSection[] = [
    'coverage',
    'mission',
    'workspace',
  ];

  @ViewChild('coverageSection') private coverageSection?: ElementRef<HTMLElement>;
  @ViewChild('workspaceSection') private workspaceSection?: ElementRef<HTMLElement>;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<AdminQualityMatrixSnapshot | null>(null);
  readonly recalculatingMatrix = signal(false);
  readonly applyingMatrixProposal = signal(false);
  readonly matrixRecalculation = signal<AdminQualityMatrixRecalculationSnapshot | null>(null);
  readonly matrixRecalculationScope =
    signal<AdminQualityMatrixRecalculationScope>('refresh-required');

  readonly search = signal('');
  readonly selectedDomain = signal<FilterValue<string>>('all');
  readonly selectedPriority = signal<FilterValue<AdminQualityMatrixPriority>>('all');
  readonly selectedE2EStatus = signal<FilterValue<AdminQualityMatrixStatus>>('all');
  readonly selectedBucket = signal<FilterValue<AdminQualityMatrixBucket>>('all');
  readonly selectedEntryId = signal<string | null>(null);
  readonly selectedActionId = signal<string | null>(null);
  readonly selectedMissionId = signal<string | null>(null);
  readonly selectedSignalContext = signal<AdminQualityWorkspaceSignalContext | null>(null);
  readonly selectedSignalDraftPrompt = signal('');
  readonly selectedSignalRecommendationsDraft = signal('');
  readonly signalDelegationTraces = signal<Record<string, AdminQualityCoverageSignalTrace>>({});
  readonly workspaceOpen = signal(false);
  readonly activeConsoleSurface = signal<AdminQualityConsoleSurface>('context');
  readonly activeWorkspaceSurface = signal<AdminQualityWorkspaceSurface>('delegation');
  readonly selectedAiProvider = signal<AdminAiProvider>('codex');
  readonly missionHudExpanded = signal(true);
  readonly missionHudActiveSection = signal<AdminQualityMissionHudSection>('coverage');
  readonly missionControlFocusedPanel = signal<AdminQualityMissionHudSection | null>(null);
  readonly missionHudPulsingSection = signal<AdminQualityMissionHudSection | null>(null);
  readonly aiOpsSecurityStatus = signal<AdminQualityAiOpsSyncStatus>('loading');
  readonly aiOpsSecurity = signal<AdminOpsSecuritySnapshot | null>(null);
  readonly aiOpsProofStatus = signal<AdminQualityAiOpsSyncStatus>('loading');
  readonly aiOpsProofs = signal<AdminOpsAiProofSnapshot | null>(null);
  readonly aiOpsSecurityRefreshing = signal(false);
  readonly aiOpsSecurityDegraded = signal(false);
  readonly aiOpsLiveNow = signal(Date.now());
  readonly aiOpsLastSuccessfulRefreshAt = signal<number | null>(null);
  readonly aiDispatchingMissionId = signal<string | null>(null);
  readonly aiDispatchingSelectedSignal = signal(false);
  readonly missionDecisions = signal<AdminQualityMissionDecisionMap>({});
  readonly missionDecisionRecords = signal<readonly AdminQualityMissionDecisionRecord[]>([]);
  readonly missionDecisionSyncStatus = signal<AdminQualityMissionDecisionSyncStatus>('local');
  readonly missionDecisionSyncMessage = signal(
    'Decisions conservees localement jusqu a la synchronisation serveur.',
  );
  readonly speaking = signal(false);
  private readonly viewStateReady = signal(false);
  readonly actionStateKeys: readonly (keyof AdminQualityActionStateCoverage)[] = [
    'loading',
    'success',
    'error',
    'offline',
    'permission',
  ];
  readonly aiProviders = ADMIN_AI_PROVIDER_OPTIONS;
  readonly adminCircuitItems: readonly AdminNavigationPillItem[] = [
    { id: 'moderation', label: 'Moderation', routerLink: this.routeConfig.adminHome },
    { id: 'ops', label: 'Owner Ops', routerLink: this.routeConfig.adminOps },
    { id: 'quality', label: 'QA Matrix', routerLink: this.routeConfig.adminQuality, active: true },
  ];
  readonly sectionNavItems: readonly AdminNavigationPillItem[] = [
    { id: 'filters', label: 'Filters', href: '#admin-quality-filters', active: true },
    { id: 'coverage', label: 'Coverage', href: '#admin-quality-coverage' },
    { id: 'mission', label: 'Mission control', href: '#admin-quality-mission' },
    { id: 'workspace', label: 'Workspace', href: '#admin-quality-workspace' },
  ];
  readonly consoleSurfaceOptions: readonly AdminQualityConsoleSurfaceOption[] = [
    { id: 'context', label: 'Contexte', detail: 'Domaine actif', iconLabel: 'CX' },
    { id: 'ai', label: 'IA', detail: 'Pilotage', iconLabel: 'AI' },
    { id: 'queue', label: 'Queue', detail: 'Matrice', iconLabel: 'Q' },
    { id: 'workspace', label: 'Workspace', detail: 'Mission et preuves', iconLabel: 'WS' },
  ];
  readonly matrixRecalculationScopeSelectOptions = MATRIX_RECALCULATION_SCOPE_SELECT_OPTIONS;
  readonly priorityFilterOptions = PRIORITY_FILTER_OPTIONS;
  readonly e2eFilterOptions = E2E_FILTER_OPTIONS;
  readonly bucketFilterOptions = BUCKET_FILTER_OPTIONS;
  readonly activeConsoleSurfaceOption = computed(
    () =>
      this.consoleSurfaceOptions.find((surface) => surface.id === this.activeConsoleSurface()) ??
      this.consoleSurfaceOptions[0],
  );
  readonly consoleMissionActions = computed<readonly AdminQualityMissionActionDescriptor[]>(() => {
    const mission = this.selectedMission();
    return mission ? missionActionDescriptors(mission.status) : [];
  });
  readonly selectedAiProviderOption = computed(() =>
    resolveAdminAiProviderOption(this.selectedAiProvider()),
  );
  readonly selectedAiProviderLabel = computed(() => this.selectedAiProviderOption().label);
  readonly selectedAiProviderCaption = computed(() => this.selectedAiProviderOption().caption);
  readonly selectedAiProviderModel = computed(() => this.selectedAiProviderOption().defaultModel);
  readonly aiProviderSelectOptions = computed<readonly AdminQualityComboboxOption[]>(() =>
    this.aiProviders.map((provider) => ({
      value: provider.id,
      label: provider.label,
    })),
  );
  readonly missionHudSectionOptions: readonly {
    readonly id: AdminQualityMissionHudSection;
    readonly label: string;
    readonly shortLabel: string;
    readonly iconLabel: string;
  }[] = [
    { id: 'coverage', label: 'Coverage matrix', shortLabel: 'Coverage', iconLabel: 'CV' },
    { id: 'mission', label: 'Mission Control', shortLabel: 'Mission', iconLabel: 'MS' },
    { id: 'workspace', label: 'Workspace deck', shortLabel: 'Workspace', iconLabel: 'WK' },
  ];
  readonly selectedAiOpsModule = computed<AdminQualityAiOpsModule | null>(
    () =>
      this.aiOpsSecurity()?.aiKeys.find(
        (module) => module.provider === this.selectedAiProvider(),
      ) ?? null,
  );
  readonly selectedAiProofModule = computed<AdminQualityAiProofModule | null>(
    () =>
      this.aiOpsProofs()?.providers.find(
        (module) => module.provider === this.selectedAiProvider(),
      ) ?? null,
  );
  readonly selectedAiDispatchReady = computed(() => {
    const module = this.selectedAiOpsModule();
    return Boolean(module?.dispatchEnabled && module.keyInserted && module.state === 'ready');
  });
  readonly selectedAiDispatchStatusLabel = computed(() => {
    if (this.aiOpsSecurityStatus() === 'loading') {
      return 'Verification Ops...';
    }
    if (this.aiOpsSecurityStatus() === 'unavailable') {
      return 'Ops indisponible';
    }

    const module = this.selectedAiOpsModule();
    if (!module) {
      return 'Module non detecte';
    }
    if (module.state === 'unsupported') {
      return 'Module non supporte';
    }
    if (module.state === 'scan-unavailable') {
      return 'Scan indisponible';
    }
    if (module.state === 'offline' && module.keyInserted) {
      return 'Cle locale';
    }
    if (!module.keyInserted) {
      return 'Cle manquante';
    }
    if (!module.dispatchEnabled) {
      return 'Dispatch desactive';
    }
    return 'Ops pret';
  });
  readonly selectedAiDispatchStatusDetail = computed(() => {
    if (this.aiOpsSecurityStatus() === 'loading') {
      return 'Lecture du cockpit Ops avant lancement.';
    }
    if (this.aiOpsSecurityStatus() === 'unavailable') {
      return 'Impossible de verifier /api/admin/ops/security depuis cette session.';
    }

    const module = this.selectedAiOpsModule();
    if (!module) {
      return 'Aucun module Ops ne correspond au provider selectionne.';
    }

    return `${module.note} Workflow: ${module.workflow}.`;
  });
  readonly selectedAiDispatchWorkflow = computed(
    () => this.selectedAiOpsModule()?.workflow ?? 'workflow non detecte',
  );
  readonly selectedAiDispatching = computed(
    () => this.aiDispatchingMissionId() === this.selectedMission()?.id,
  );
  readonly selectedAiProofDisplay = computed<AdminQualityMissionProofDisplay | null>(() => {
    const proof = this.selectedAiProofModule();
    const provider = this.selectedAiProviderLabel();

    if (!proof) {
      return {
        state: 'unavailable',
        label: `${provider} proof feed unavailable`,
        summary: 'No GitHub workflow proof has been observed for the active provider yet.',
        detail: 'Waiting for the first workflow run to surface a real proof package.',
        artifactCount: 0,
        artifactLabel: '0 artifact(s)',
        runLabel: 'No workflow run detected',
        runUrl: null,
        pullRequestLabel: 'No pull request detected',
        pullRequestUrl: null,
      };
    }

    const runNumber =
      proof.run?.number != null ? `Run #${proof.run.number}` : 'Latest workflow run';
    const runMoment = proof.run?.updatedAt
      ? `Updated ${this.formatAiTelemetryRelative(new Date(proof.run.updatedAt).getTime())}.`
      : `Watching ${proof.workflow}.`;
    const pullRequestLabel = proof.pullRequest
      ? `PR #${proof.pullRequest.number ?? 'n/a'} · ${proof.pullRequest.title}`
      : 'No pull request detected';

    return {
      state: proof.state,
      label: this.aiProofStateLabel(proof.state),
      summary: proof.summary,
      detail: runMoment,
      artifactCount: proof.artifacts.length,
      artifactLabel: `${proof.artifacts.length} artifact(s)`,
      runLabel: runNumber,
      runUrl: proof.run?.url ?? null,
      pullRequestLabel,
      pullRequestUrl: proof.pullRequest?.url ?? null,
    };
  });
  readonly aiProviderComparison = computed<readonly AdminQualityMissionProviderComparisonEntry[]>(
    () =>
      this.aiProviders.map((providerOption) => {
        const opsModule =
          this.aiOpsSecurity()?.aiKeys.find((module) => module.provider === providerOption.id) ??
          null;
        const proofModule =
          this.aiOpsProofs()?.providers.find((module) => module.provider === providerOption.id) ??
          null;
        const opsState: AdminQualityMissionProviderComparisonEntry['opsState'] = !opsModule
          ? 'constrained'
          : opsModule.state === 'unsupported'
            ? 'unsupported'
            : opsModule.dispatchEnabled && opsModule.keyInserted && opsModule.state === 'ready'
              ? 'armed'
              : 'constrained';

        return {
          provider: providerOption.id,
          label: providerOption.label,
          selected: providerOption.id === this.selectedAiProvider(),
          opsState,
          opsLabel:
            opsState === 'armed'
              ? 'Ops armed'
              : opsState === 'unsupported'
                ? 'Unsupported'
                : 'Ops constrained',
          opsDetail: opsModule?.note ?? 'No Ops module detected for this provider.',
          workflow: opsModule?.workflow ?? providerOption.id,
          proofState: proofModule?.state ?? 'unavailable',
          proofLabel: this.aiProofStateLabel(proofModule?.state ?? 'unavailable'),
          proofDetail: proofModule?.summary ?? 'No workflow proof package detected yet.',
          artifactCount: proofModule?.artifacts.length ?? 0,
          pullRequestLabel: proofModule?.pullRequest
            ? `PR #${proofModule.pullRequest.number ?? 'n/a'}`
            : 'No PR yet',
        };
      }),
  );
  readonly selectedAiTelemetryState = computed<AdminQualityAiTelemetryState>(() => {
    if (this.aiOpsSecurityStatus() === 'loading' || this.aiOpsSecurityRefreshing()) {
      return 'syncing';
    }

    if (!this.aiOpsSecurity()) {
      return 'offline';
    }

    const lastRefreshAt = this.aiOpsLastSuccessfulRefreshAt();
    if (lastRefreshAt == null) {
      return this.aiOpsSecurityDegraded() ? 'degraded' : 'offline';
    }

    const ageMs = this.aiOpsLiveNow() - lastRefreshAt;
    if (this.aiOpsSecurityDegraded() || ageMs > ADMIN_QUALITY_AI_OPS_REFRESH_INTERVAL_MS * 2) {
      return 'degraded';
    }

    return 'live';
  });
  readonly selectedAiTelemetryLabel = computed(() => {
    switch (this.selectedAiTelemetryState()) {
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
  readonly selectedAiTelemetryDetail = computed(() => {
    const lastRefreshAt = this.aiOpsLastSuccessfulRefreshAt();
    if (this.selectedAiTelemetryState() === 'offline') {
      return 'Waiting for Ops security feed.';
    }

    if (this.selectedAiTelemetryState() === 'syncing') {
      return lastRefreshAt == null
        ? 'Bootstrapping the Ops telemetry feed.'
        : `Last stable sync ${this.formatAiTelemetryRelative(lastRefreshAt)}.`;
    }

    if (lastRefreshAt == null) {
      return 'Awaiting refresh cadence.';
    }

    const countdownSeconds = this.aiOpsRefreshCountdownSeconds();
    if (countdownSeconds === 0) {
      return `Last sync ${this.formatAiTelemetryRelative(lastRefreshAt)}. Next sweep pending...`;
    }

    return `Last sync ${this.formatAiTelemetryRelative(lastRefreshAt)}. Next sweep in ${countdownSeconds}s.`;
  });
  readonly missionHudSectionLabel = computed(() => {
    const section = this.missionHudSectionOptions.find(
      (option) => option.id === this.missionHudActiveSection(),
    );
    return section?.label ?? 'Coverage matrix';
  });
  readonly missionHudCompactSummary = computed(() => {
    const proof = this.selectedAiProofDisplay();
    return [
      this.selectedAiDispatchStatusLabel(),
      this.selectedAiTelemetryLabel(),
      proof?.label ?? 'Proof unavailable',
    ].join(' · ');
  });
  readonly missionCockpitToneKey = computed(() => this.selectedAiProvider());
  readonly missionCockpitStyleVars = computed<Record<string, string>>(() => {
    switch (this.selectedAiProvider()) {
      case 'claude':
        return {
          '--og7-cockpit-accent': 'rgba(251, 191, 36, 0.22)',
          '--og7-cockpit-accent-strong': 'rgba(251, 191, 36, 0.42)',
          '--og7-cockpit-secondary': 'rgba(251, 146, 60, 0.18)',
          '--og7-cockpit-outline': 'rgba(251, 191, 36, 0.2)',
          '--og7-cockpit-glow': 'rgba(251, 191, 36, 0.28)',
          '--og7-cockpit-sweep': 'rgba(253, 224, 71, 0.38)',
          '--og7-cockpit-band': 'rgba(251, 146, 60, 0.24)',
          '--og7-cockpit-sweep-duration': this.resolveMissionRadarSweepDuration(),
        };
      case 'gemini':
        return {
          '--og7-cockpit-accent': 'rgba(163, 230, 53, 0.2)',
          '--og7-cockpit-accent-strong': 'rgba(163, 230, 53, 0.4)',
          '--og7-cockpit-secondary': 'rgba(34, 197, 94, 0.16)',
          '--og7-cockpit-outline': 'rgba(163, 230, 53, 0.18)',
          '--og7-cockpit-glow': 'rgba(132, 204, 22, 0.26)',
          '--og7-cockpit-sweep': 'rgba(190, 242, 100, 0.34)',
          '--og7-cockpit-band': 'rgba(74, 222, 128, 0.22)',
          '--og7-cockpit-sweep-duration': this.resolveMissionRadarSweepDuration(),
        };
      case 'copilot':
        return {
          '--og7-cockpit-accent': 'rgba(96, 165, 250, 0.2)',
          '--og7-cockpit-accent-strong': 'rgba(96, 165, 250, 0.4)',
          '--og7-cockpit-secondary': 'rgba(59, 130, 246, 0.16)',
          '--og7-cockpit-outline': 'rgba(96, 165, 250, 0.18)',
          '--og7-cockpit-glow': 'rgba(59, 130, 246, 0.24)',
          '--og7-cockpit-sweep': 'rgba(147, 197, 253, 0.32)',
          '--og7-cockpit-band': 'rgba(96, 165, 250, 0.22)',
          '--og7-cockpit-sweep-duration': this.resolveMissionRadarSweepDuration(),
        };
      default:
        return {
          '--og7-cockpit-accent': 'rgba(34, 211, 238, 0.2)',
          '--og7-cockpit-accent-strong': 'rgba(34, 211, 238, 0.42)',
          '--og7-cockpit-secondary': 'rgba(56, 189, 248, 0.16)',
          '--og7-cockpit-outline': 'rgba(34, 211, 238, 0.18)',
          '--og7-cockpit-glow': 'rgba(34, 211, 238, 0.26)',
          '--og7-cockpit-sweep': 'rgba(103, 232, 249, 0.38)',
          '--og7-cockpit-band': 'rgba(56, 189, 248, 0.22)',
          '--og7-cockpit-sweep-duration': this.resolveMissionRadarSweepDuration(),
        };
    }
  });
  readonly missionControlRadarLatestSignal =
    computed<AdminQualityMissionRadarLockDisplayEntry | null>(
      () => this.missionControlRadarLockLog()[0] ?? null,
    );
  readonly missionControlShellStyleVars = computed<Record<string, string>>(() => ({
    ...this.missionCockpitStyleVars(),
    ...this.missionControlRadarSignalStyleVars(
      this.missionControlRadarLatestSignal()?.signalTone ?? null,
    ),
  }));
  readonly missionControlRadarEchoPoints = computed<readonly AdminQualityMissionRadarEchoPoint[]>(
    () => {
      const positions: Record<
        AdminQualityMissionHudSection,
        { leftPercent: number; topPercent: number }
      > = {
        coverage: { leftPercent: 18, topPercent: 28 },
        mission: { leftPercent: 66, topPercent: 36 },
        workspace: { leftPercent: 34, topPercent: 76 },
      };

      const coverageCount = this.filteredEntries().length;
      const missionTaskCount = this.selectedMissionTasks().length;
      const workspaceCount = this.selectedWorkspaceCount();
      const metrics: Record<
        AdminQualityMissionHudSection,
        {
          count: number;
          total: number;
          metricLabel: string;
          intensity: AdminQualityMissionRadarEchoIntensity;
        }
      > = {
        coverage: {
          count: coverageCount,
          total: this.totalDomains(),
          metricLabel: `${coverageCount}/${this.totalDomains()}`,
          intensity: this.resolveRadarEchoIntensity(
            coverageCount,
            this.totalDomains(),
            8,
            0.75,
            3,
            0.35,
          ),
        },
        mission: {
          count: missionTaskCount,
          total: Math.max(missionTaskCount, 1),
          metricLabel: `${missionTaskCount} task(s)`,
          intensity:
            this.selectedMissionRequiredUnits() >= 50 || missionTaskCount >= 6
              ? 'high'
              : this.selectedMissionRequiredUnits() >= 20 || missionTaskCount >= 3
                ? 'medium'
                : 'low',
        },
        workspace: {
          count: workspaceCount,
          total: Math.max(this.selectedEntryActions().length, 1),
          metricLabel: `${workspaceCount} surface(s)`,
          intensity: this.resolveRadarEchoIntensity(
            workspaceCount,
            Math.max(this.selectedEntryActions().length, 1),
            3,
            0.75,
            2,
            0.4,
          ),
        },
      };

      return this.missionHudSectionOptions.map((section) => ({
        id: section.id,
        label: section.label,
        shortLabel: section.shortLabel,
        metricLabel: metrics[section.id].metricLabel,
        leftPercent: positions[section.id].leftPercent,
        topPercent: positions[section.id].topPercent,
        left: `${positions[section.id].leftPercent}%`,
        top: `${positions[section.id].topPercent}%`,
        intensity: metrics[section.id].intensity,
        active: this.missionHudActiveSection() === section.id,
        pulsing: this.missionHudSectionPulse(section.id),
      }));
    },
  );
  readonly missionControlRadarLockHistory = signal<
    readonly AdminQualityMissionRadarLockHistoryEntry[]
  >([]);
  readonly missionControlProofStreamIntensity = computed<AdminQualityMissionRadarEchoIntensity>(
    () => {
      const proof = this.selectedAiProofDisplay();
      if (!proof) {
        return 'low';
      }

      if (
        (proof.state === 'completed' && proof.artifactCount >= 2) ||
        (proof.state === 'in-progress' && proof.artifactCount >= 1)
      ) {
        return 'high';
      }

      if (
        proof.state === 'in-progress' ||
        proof.state === 'completed' ||
        proof.state === 'queued' ||
        proof.artifactCount >= 1
      ) {
        return 'medium';
      }

      return 'low';
    },
  );
  readonly missionControlRadarLockLog = computed<
    readonly AdminQualityMissionRadarLockDisplayEntry[]
  >(() => {
    const points = this.missionControlRadarEchoPoints();
    const proofStream = this.missionControlProofStreamIntensity();

    return this.missionControlRadarLockHistory().map((entry) => {
      const point = points.find((candidate) => candidate.id === entry.id);
      const fallback = this.missionHudSectionOptions.find((option) => option.id === entry.id);

      return {
        ...entry,
        label: point?.label ?? fallback?.label ?? 'Unknown sector',
        metricLabel: point?.metricLabel ?? 'No metric',
        proofStream,
        reasonLabel: this.missionControlTimelineReasonLabel(entry),
        kindLabel: this.missionControlTimelineKindLabel(entry.kind),
        signalTone: this.missionControlTimelineSignalTone(entry),
        detailLabel:
          entry.detailLabel ??
          (point?.label || fallback?.label
            ? `${entry.stateLabel} ${point?.label ?? fallback?.label}`
            : entry.stateLabel),
      };
    });
  });
  readonly missionHudAmbientTone = computed<AdminQualityMissionHudAmbientTone>(() => {
    const proof = this.selectedAiProofDisplay();
    const telemetry = this.selectedAiTelemetryState();
    const missionStatus = this.selectedMission()?.status ?? 'proposed';

    if (missionStatus === 'blocked' || missionStatus === 'rejected' || proof?.state === 'failed') {
      return 'critical';
    }

    if (telemetry === 'syncing' || proof?.state === 'in-progress') {
      return 'syncing';
    }

    if (telemetry === 'degraded' || telemetry === 'offline' || !this.selectedAiDispatchReady()) {
      return 'warning';
    }

    return 'nominal';
  });
  readonly availableCodexQuotaUnits = computed(() =>
    this.selectedAiDispatchReady() ? this.selectedMissionRequiredUnits() : 0,
  );

  readonly entries = computed(() => this.snapshot()?.entries ?? []);
  readonly matrixSourceStatus = computed<AdminQualityMatrixSourceStatus | null>(
    () => this.snapshot()?.sourceStatus ?? null,
  );
  readonly matrixSourceMessage = computed(() => this.snapshot()?.sourceMessage ?? null);
  readonly actionRegistry = computed(() => buildActionRegistry(this.entries()));
  readonly undocumentedActions = computed(() => buildUndocumentedDiscoveredActions(this.entries()));

  readonly domainOptions = computed(() => {
    const options = new Set(this.entries().map((entry) => entry.domain));
    return [
      'all',
      ...Array.from(options).sort((left, right) => left.localeCompare(right, 'fr-CA')),
    ];
  });
  readonly domainFilterOptions = computed<readonly AdminQualityComboboxOption[]>(() =>
    this.domainOptions().map((option) => ({
      value: option,
      label: option === 'all' ? 'Domaine' : option,
    })),
  );

  readonly filteredEntries = computed(() => {
    const query = this.search().trim().toLocaleLowerCase('fr-CA');

    return [...this.entries()]
      .filter((entry) => {
        if (this.selectedDomain() !== 'all' && entry.domain !== this.selectedDomain()) {
          return false;
        }
        if (this.selectedPriority() !== 'all' && entry.priority !== this.selectedPriority()) {
          return false;
        }
        if (this.selectedE2EStatus() !== 'all' && entry.e2eStatus !== this.selectedE2EStatus()) {
          return false;
        }
        if (this.selectedBucket() !== 'all' && entry.managementBucket !== this.selectedBucket()) {
          return false;
        }
        if (!query) {
          return true;
        }

        const haystack = [
          entry.domain,
          entry.need,
          entry.observedGap,
          entry.nextMove,
          ...entry.evidence,
        ]
          .join(' ')
          .toLocaleLowerCase('fr-CA');

        return haystack.includes(query);
      })
      .sort((left, right) => this.compareEntries(left, right));
  });

  readonly totalDomains = computed(() => this.entries().length);
  readonly provedCount = computed(
    () => this.entries().filter((entry) => entry.e2eStatus === 'oui').length,
  );
  readonly filteredProvedCount = computed(
    () => this.filteredEntries().filter((entry) => entry.e2eStatus === 'oui').length,
  );
  readonly proofGapCount = computed(
    () =>
      this.entries().filter(
        (entry) =>
          entry.e2eStatus !== 'oui' &&
          !entry.needsProductWorkFirst &&
          entry.managementBucket === 'proof-gap',
      ).length,
  );
  readonly filteredProofGapCount = computed(
    () =>
      this.filteredEntries().filter(
        (entry) =>
          entry.e2eStatus !== 'oui' &&
          !entry.needsProductWorkFirst &&
          entry.managementBucket === 'proof-gap',
      ).length,
  );
  readonly productWorkCount = computed(
    () =>
      this.entries().filter((entry) => entry.e2eStatus !== 'oui' && entry.needsProductWorkFirst)
        .length,
  );
  readonly filteredProductWorkCount = computed(
    () =>
      this.filteredEntries().filter(
        (entry) => entry.e2eStatus !== 'oui' && entry.needsProductWorkFirst,
      ).length,
  );
  readonly highPriorityGapCount = computed(
    () =>
      this.entries().filter((entry) => entry.e2eStatus !== 'oui' && entry.priority === 'haute')
        .length,
  );
  readonly filteredHighPriorityGapCount = computed(
    () =>
      this.filteredEntries().filter(
        (entry) => entry.e2eStatus !== 'oui' && entry.priority === 'haute',
      ).length,
  );
  readonly latestCompletedMissionDecisionByEntryId = computed(() => {
    const latestByEntryId = new Map<string, AdminQualityMissionDecisionRecord>();

    for (const decision of this.missionDecisionRecords()) {
      if (decision.status !== 'done' || !decision.entryId) {
        continue;
      }

      const current = latestByEntryId.get(decision.entryId);
      const nextTimestamp = this.missionDecisionUpdatedAt(decision);
      const currentTimestamp = current ? this.missionDecisionUpdatedAt(current) : null;

      if (!current || (nextTimestamp ?? 0) > (currentTimestamp ?? 0)) {
        latestByEntryId.set(decision.entryId, decision);
      }
    }

    return latestByEntryId;
  });
  readonly matrixRefreshRequiredEntryIds = computed<readonly string[]>(() =>
    this.entries()
      .filter((entry) => this.entryNeedsMatrixRefresh(entry))
      .map((entry) => entry.id),
  );
  readonly matrixRefreshRequiredCount = computed(() => this.matrixRefreshRequiredEntryIds().length);
  readonly filteredMatrixRefreshRequiredCount = computed(
    () => this.filteredEntries().filter((entry) => this.entryNeedsMatrixRefresh(entry)).length,
  );
  readonly buildNowAllItems = computed<readonly AdminQualityBuildNowItem[]>(() =>
    this.entries()
      .map((entry) => this.buildNowItem(entry))
      .filter((item): item is AdminQualityBuildNowItem => item !== null)
      .sort(
        (left, right) =>
          right.score - left.score || left.domain.localeCompare(right.domain, 'fr-CA'),
      ),
  );
  readonly buildNowItems = computed<readonly AdminQualityBuildNowItem[]>(() =>
    this.buildNowAllItems().slice(0, 3),
  );
  readonly buildNowPrimaryAction = computed<AdminQualityBuildNowItem | null>(
    () => this.buildNowItems()[0] ?? null,
  );
  readonly buildNowGroups = computed<readonly AdminQualityBuildNowGroup[]>(() => {
    const items = this.buildNowAllItems();
    const groups: readonly { readonly tone: AdminQualityBuildNowTone; readonly label: string }[] = [
      { tone: 'build', label: 'A construire' },
      { tone: 'proof', label: 'A prouver' },
      { tone: 'review', label: 'A relire' },
      { tone: 'blocked', label: 'Bloques' },
    ];

    return groups.map((group) => {
      const count = items.filter((item) => item.tone === group.tone).length;
      return {
        ...group,
        count,
        active: count > 0,
      };
    });
  });
  readonly matrixRecalculationScopeOptions = MATRIX_RECALCULATION_SCOPE_OPTIONS;
  readonly selectedMatrixRecalculationEntry = computed<AdminQualityMatrixRecalculationEntry | null>(
    () => {
      const entry = this.selectedEntry();
      const recalculation = this.matrixRecalculation();
      if (!entry || !recalculation) {
        return null;
      }

      return recalculation.entries.find((item) => item.entryId === entry.id) ?? null;
    },
  );
  readonly matrixRecalculationHighlights = computed<
    readonly AdminQualityMatrixRecalculationHighlight[]
  >(() => {
    const recalculation = this.matrixRecalculation();
    if (!recalculation) {
      return [];
    }

    return [
      {
        label: 'Analysees',
        value: String(recalculation.summary.analyzedCount),
      },
      {
        label: 'Propositions',
        value: String(recalculation.summary.proposalCount),
      },
      {
        label: 'Bloquees',
        value: String(recalculation.summary.blockedCount),
      },
      {
        label: 'Sans changement',
        value: String(recalculation.summary.unchangedCount),
      },
      {
        label: 'A piloter',
        value: String(
          recalculation.entries.filter((entry) => this.isMatrixPilotActionable(entry)).length,
        ),
      },
    ];
  });
  readonly matrixPilotBacklogEntries = computed<readonly AdminQualityMatrixRecalculationEntry[]>(
    () => {
      const recalculation = this.matrixRecalculation();
      if (!recalculation) {
        return [];
      }

      return [...recalculation.entries]
        .filter((entry) => entry.pilot.priority !== 'later')
        .sort((left, right) => {
          const priorityDelta =
            this.matrixPilotPriorityRank(right.pilot.priority) -
            this.matrixPilotPriorityRank(left.pilot.priority);
          if (priorityDelta !== 0) {
            return priorityDelta;
          }

          return right.pilot.score - left.pilot.score;
        })
        .slice(0, 6);
    },
  );
  readonly selectedMatrixProposalApplyReady = computed(() =>
    Boolean(
      this.selectedMatrixRecalculationEntry()?.result === 'proposal-review-required' &&
      this.selectedMatrixRecalculationEntry()?.proposed,
    ),
  );
  readonly selectedMatrixRecalculationRecommendations = computed<readonly string[]>(() => {
    const entry = this.selectedMatrixRecalculationEntry();
    return entry ? this.matrixRecalculationRecommendations(entry) : [];
  });
  readonly commandScopeSummary = computed<AdminQualityCommandScopeSummary>(() => ({
    activeDomains: this.filteredEntries().length,
    totalDomains: this.totalDomains(),
    filtered: this.hasActiveFilters(),
    activeFilterCount: this.activeFilterChips().length,
    selectedDomain: this.selectedEntry()?.domain ?? null,
  }));
  readonly commandMetrics = computed<readonly AdminQualityCommandMetric[]>(() => [
    {
      id: 'total-domains',
      label: 'Domaines visibles',
      activeValue: this.filteredEntries().length,
      totalValue: this.totalDomains(),
      detail: this.hasActiveFilters()
        ? 'Perimetre courant de la console.'
        : 'Portefeuille complet actuellement visible.',
      accent: 'slate',
    },
    {
      id: 'proved-domains',
      label: 'Prouves',
      activeValue: this.filteredProvedCount(),
      totalValue: this.provedCount(),
      detail: 'Flux critiques deja couverts dans le scope courant.',
      accent: 'emerald',
    },
    {
      id: 'proof-gap-domains',
      label: 'Preuve QA suivante',
      activeValue: this.filteredProofGapCount(),
      totalValue: this.proofGapCount(),
      detail: 'Peut avancer sans travail produit additionnel.',
      accent: 'sky',
    },
    {
      id: 'product-work-domains',
      label: 'Produit d abord',
      activeValue: this.filteredProductWorkCount(),
      totalValue: this.productWorkCount(),
      detail: 'Doit gagner une surface avant la preuve QA.',
      accent: 'indigo',
    },
    {
      id: 'matrix-refresh-domains',
      label: 'Matrice a relire',
      activeValue: this.filteredMatrixRefreshRequiredCount(),
      totalValue: this.matrixRefreshRequiredCount(),
      detail: 'Missions cloturees apres la derniere revue de matrice.',
      accent: 'indigo',
    },
    {
      id: 'high-priority-gaps',
      label: 'Gaps critiques',
      activeValue: this.filteredHighPriorityGapCount(),
      totalValue: this.highPriorityGapCount(),
      detail: 'A surveiller en premier dans le scope actif.',
      accent: 'rose',
    },
  ]);
  readonly totalRegisteredActions = computed(() => this.actionRegistry().length);
  readonly provedActionsCount = computed(
    () => this.actionRegistry().filter((action) => action.status === 'proved').length,
  );
  readonly actionsNeedingCompletionCount = computed(
    () => this.actionRegistry().filter((action) => action.status === 'needs-completion').length,
  );
  readonly detectedActionsCount = computed(
    () =>
      this.actionRegistry().filter((action) => action.sourceDetected).length +
      this.undocumentedActions().length,
  );
  readonly unmappedActionsCount = computed(() => this.undocumentedActions().length);

  readonly hasActiveFilters = computed(
    () =>
      Boolean(this.search().trim()) ||
      this.selectedDomain() !== 'all' ||
      this.selectedPriority() !== 'all' ||
      this.selectedE2EStatus() !== 'all' ||
      this.selectedBucket() !== 'all',
  );
  readonly activeFilterChips = computed<readonly AdminQualityActiveFilterChip[]>(() => {
    const chips: AdminQualityActiveFilterChip[] = [];
    const search = this.search().trim();

    if (search) {
      chips.push({ id: 'search', label: `Recherche : ${search}` });
    }
    if (this.selectedDomain() !== 'all') {
      chips.push({ id: 'domain', label: `Domaine : ${this.selectedDomain()}` });
    }
    if (this.selectedPriority() !== 'all') {
      const priority = this.selectedPriority() as AdminQualityMatrixPriority;
      chips.push({ id: 'priority', label: `Priorite : ${this.priorityLabel(priority)}` });
    }
    if (this.selectedE2EStatus() !== 'all') {
      const e2eStatus = this.selectedE2EStatus() as AdminQualityMatrixStatus;
      chips.push({ id: 'e2e', label: `E2E : ${this.statusLabel(e2eStatus)}` });
    }
    if (this.selectedBucket() !== 'all') {
      const bucket = this.selectedBucket() as AdminQualityMatrixBucket;
      chips.push({ id: 'bucket', label: `Gestion : ${this.bucketLabel(bucket)}` });
    }

    return chips;
  });
  readonly selectedEntry = computed<AdminQualityMatrixEntry | null>(() => {
    const filtered = this.filteredEntries();
    if (!filtered.length) {
      return null;
    }

    const selectedId = this.selectedEntryId();
    return filtered.find((entry) => entry.id === selectedId) ?? filtered[0];
  });
  readonly selectedDelegation = computed<AdminQualityDelegationPlan | null>(() => {
    const entry = this.selectedEntry();
    return entry ? buildDelegationPlan(entry) : null;
  });
  readonly selectedSignalDelegationTrace = computed<AdminQualityCoverageSignalTrace | null>(() => {
    const entry = this.selectedEntry();
    return entry ? (this.signalDelegationTraces()[entry.id] ?? null) : null;
  });
  readonly selectedSignalServerDispatchState =
    computed<AdminQualityMatrixSignalDispatchState | null>(() => {
      const entry = this.selectedEntry();
      const signalContext = this.selectedSignalContext();
      if (!entry || !signalContext) {
        return null;
      }

      return entry.signalDispatch[signalContext.signalId] ?? null;
    });
  readonly selectedSignalDispatchReady = computed(() => {
    if (!this.selectedAiDispatchReady()) {
      return false;
    }

    const serverState = this.selectedSignalServerDispatchState();
    const trace = this.selectedSignalDelegationTrace();
    if (serverState?.pending) {
      return false;
    }

    return !this.isOptimisticSignalConfirmationPending(serverState, trace);
  });
  readonly selectedSignalDispatchBlockedMessage = computed(() => {
    const signalContext = this.selectedSignalContext();
    if (!signalContext) {
      return null;
    }

    if (!this.selectedAiDispatchReady()) {
      return this.selectedAiDispatchBlockedMessage();
    }

    const serverState = this.selectedSignalServerDispatchState();
    const trace = this.selectedSignalDelegationTrace();
    if (serverState?.pending || this.isOptimisticSignalConfirmationPending(serverState, trace)) {
      return `${signalContext.label} est deja delegue a ${trace?.provider ?? this.selectedAiProviderLabel()}. Le bouton reste verrouille jusqu'a reception d'une confirmation serveur plus recente (merge, preuve retournee ou cloture).`;
    }

    if (this.selectedSignalDispatchReady()) {
      return null;
    }

    return this.selectedAiDispatchBlockedMessage();
  });
  readonly selectedEntryActions = computed<readonly AdminQualityActionRecord[]>(() => {
    const entry = this.selectedEntry();
    const actions = this.actionRegistry();
    return entry ? actions.filter((action) => action.entryId === entry.id) : [];
  });
  readonly qaQueuePreviewItems = computed<readonly AdminQualityMatrixEntry[]>(() =>
    this.filteredEntries().slice(0, 3),
  );
  readonly actionPreviewItems = computed<readonly AdminQualityActionRecord[]>(() =>
    this.selectedEntryActions().slice(0, 2),
  );
  readonly selectedWorkspaceTitle = computed(() => {
    switch (this.activeWorkspaceSurface()) {
      case 'qaQueue':
        return 'admin.quality.workspace.surfaces.qaQueue.title';
      case 'actions':
        return 'admin.quality.workspace.surfaces.actions.title';
      default:
        return 'admin.quality.workspace.surfaces.delegation.title';
    }
  });
  readonly selectedWorkspaceSubtitle = computed(() => {
    switch (this.activeWorkspaceSurface()) {
      case 'qaQueue':
        return 'admin.quality.workspace.surfaces.qaQueue.subtitle';
      case 'actions':
        return 'admin.quality.workspace.surfaces.actions.subtitle';
      default:
        return 'admin.quality.workspace.surfaces.delegation.subtitle';
    }
  });
  readonly selectedWorkspaceCount = computed(() => {
    switch (this.activeWorkspaceSurface()) {
      case 'qaQueue':
        return this.filteredEntries().length;
      case 'actions':
        return this.selectedEntryActions().length;
      default:
        return this.selectedDelegation() ? 1 : 0;
    }
  });
  readonly selectedAction = computed<AdminQualityActionRecord | null>(() => {
    const actions = this.selectedEntryActions();
    if (!actions.length) {
      return null;
    }

    const selectedId = this.selectedActionId();
    return actions.find((action) => action.id === selectedId) ?? actions[0];
  });
  readonly selectedEntryUndocumentedActions = computed(() => {
    const entry = this.selectedEntry();
    const actions = this.undocumentedActions();
    return entry ? actions.filter((action) => action.entryId === entry.id) : [];
  });
  readonly missionControl = computed<AdminQualityMissionControlState | null>(() => {
    const entry = this.selectedEntry();
    const plan = this.selectedDelegation();
    return entry && plan ? buildMissionControl(entry, plan, this.missionDecisions()) : null;
  });
  readonly missionHudTimelineSteps = computed<readonly AdminQualityMissionHudTimelineStep[]>(() =>
    (this.missionControl()?.timeline ?? []).map((step) => ({
      ...step,
      shortLabel: this.missionHudTimelineShortLabel(step.id),
    })),
  );
  readonly activeMissionHudTimelineStep = computed<AdminQualityMissionHudTimelineStep | null>(
    () => {
      const steps = this.missionHudTimelineSteps();
      return steps[this.activeMissionHudTimelineIndex(steps)] ?? null;
    },
  );
  readonly selectedMission = computed<AdminQualityMissionRecommendation | null>(() => {
    const recommendations = this.missionControl()?.recommendations ?? [];
    if (!recommendations.length) {
      return null;
    }

    const selectedId = this.selectedMissionId();
    return (
      recommendations.find((recommendation) => recommendation.id === selectedId) ??
      recommendations[0]
    );
  });
  readonly selectedMissionTasks = computed<readonly AdminQualityMissionTask[]>(() => {
    const mission = this.selectedMission();
    const difficulty = this.selectedDelegation()?.difficulty;
    return mission && difficulty ? buildMissionTasks(mission, difficulty) : [];
  });
  readonly selectedMissionRequiredUnits = computed(() =>
    this.selectedMissionTasks().reduce((sum, task) => sum + task.estimatedUnits, 0),
  );
  readonly selectedMissionQuotaSummary = computed<AdminQualityMissionQuotaSummary | null>(() => {
    const tasks = this.selectedMissionTasks();
    return tasks.length ? summarizeMissionQuota(tasks, this.availableCodexQuotaUnits()) : null;
  });
  readonly canStartSelectedMission = computed(
    () => this.selectedAiDispatchReady() && !this.selectedAiDispatching(),
  );

  constructor() {
    effect(() => {
      this.syncVisibleState();
    });

    effect(() => {
      this.persistViewState();
    });

    let previousSection: AdminQualityMissionHudSection | null = null;
    effect(() => {
      const currentSection = this.missionHudActiveSection();
      const lockReason = this.pendingMissionControlLockReason ?? 'section-pulse';
      if (previousSection === null) {
        this.recordMissionControlLock(currentSection, 'Locked', lockReason);
      } else if (previousSection !== currentSection) {
        this.triggerMissionHudSectionPulse(currentSection);
        this.recordMissionControlLock(currentSection, 'Acquiring', lockReason);
      }
      this.pendingMissionControlLockReason = null;
      previousSection = currentSection;
    });

    let previousProofSignature: string | null = null;
    effect(() => {
      const proof = this.selectedAiProofDisplay();
      const signature = proof
        ? `${proof.state}:${proof.runLabel}:${proof.artifactCount}:${proof.pullRequestLabel}`
        : 'none';

      if (
        signature !== previousProofSignature &&
        proof &&
        (proof.state === 'completed' || proof.state === 'in-progress')
      ) {
        if (previousProofSignature !== null) {
          this.recordMissionControlProofEvent(this.missionHudActiveSection(), proof.label);
        }
      }

      previousProofSignature = signature;
    });
  }

  ngOnInit(): void {
    this.restoreViewState();
    this.restoreMissionDecisions();
    this.loadMissionDecisionsFromServer();
    this.loadAiDispatchReadiness(false);
    this.viewStateReady.set(true);
    this.ngZone.runOutsideAngular(() => {
      this.aiOpsRefreshTimer = setInterval(
        () => this.ngZone.run(() => this.loadAiDispatchReadiness(true)),
        ADMIN_QUALITY_AI_OPS_REFRESH_INTERVAL_MS,
      );
      this.liveTickTimer = setInterval(
        () => this.ngZone.run(() => this.aiOpsLiveNow.set(Date.now())),
        ADMIN_QUALITY_LIVE_TICK_INTERVAL_MS,
      );
    });
    this.destroyRef.onDestroy(() => {
      this.stopMissionVoice(false);
      if (this.aiOpsRefreshTimer) {
        clearInterval(this.aiOpsRefreshTimer);
      }
      if (this.liveTickTimer) {
        clearInterval(this.liveTickTimer);
      }
      this.missionHudSectionObserver?.disconnect();
      if (this.missionHudSectionPulseTimer) {
        clearTimeout(this.missionHudSectionPulseTimer);
      }
    });

    this.loadMatrixSnapshot();
  }

  recalculateMatrix(): void {
    this.requestMatrixRecalculation(this.matrixRecalculationScope(), true);
  }

  setMatrixRecalculationScope(event: Event): void {
    this.setMatrixRecalculationScopeValue((event.target as HTMLSelectElement | null)?.value ?? '');
  }

  setMatrixRecalculationScopeValue(value: string): void {
    if (value === 'refresh-required' || value === 'selected-entry' || value === 'all') {
      this.matrixRecalculationScope.set(value);
    }
  }

  applySelectedMatrixProposal(): void {
    const recalculationEntry = this.selectedMatrixRecalculationEntry();
    if (
      !recalculationEntry ||
      recalculationEntry.result !== 'proposal-review-required' ||
      !recalculationEntry.proposed ||
      this.applyingMatrixProposal()
    ) {
      return;
    }

    this.applyingMatrixProposal.set(true);
    this.service
      .applyMatrixProposal(recalculationEntry.entryId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.applyingMatrixProposal.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.notifications.success(`Proposition appliquee pour ${result.entry.domain}.`, {
            source: 'admin-quality',
          });
          this.loadMatrixSnapshot(false);
          this.requestMatrixRecalculation(this.matrixRecalculationScope(), false);
        },
        error: (error: unknown) => {
          this.notifications.error(this.resolveMatrixLoadError(error), {
            source: 'admin-quality',
          });
        },
      });
  }

  private requestMatrixRecalculation(
    scope: AdminQualityMatrixRecalculationScope,
    notify = true,
  ): void {
    if (this.loading() || this.recalculatingMatrix()) {
      return;
    }

    const entryId = scope === 'selected-entry' ? (this.selectedEntry()?.id ?? null) : null;
    if (scope === 'selected-entry' && !entryId) {
      this.notifications.error('Aucune entree active a recalculer.', {
        source: 'admin-quality',
      });
      return;
    }

    this.recalculatingMatrix.set(true);
    this.service
      .recalculateMatrix(scope, entryId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.recalculatingMatrix.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.matrixRecalculation.set(result);
          if (notify) {
            this.notifications.success(this.matrixRecalculationSuccessMessage(result), {
              source: 'admin-quality',
            });
            this.loadMatrixSnapshot(false);
          }
        },
        error: (error: unknown) => {
          this.notifications.error(this.resolveMatrixLoadError(error), {
            source: 'admin-quality',
          });
        },
      });
  }

  private isMatrixPilotActionable(entry: AdminQualityMatrixRecalculationEntry): boolean {
    return entry.pilot.priority !== 'later';
  }

  private matrixPilotPriorityRank(priority: AdminQualityMatrixPilotPriority): number {
    switch (priority) {
      case 'now':
        return 4;
      case 'blocked':
        return 3;
      case 'next':
        return 2;
      default:
        return 1;
    }
  }

  private matrixRecalculationSuccessMessage(
    result: AdminQualityMatrixRecalculationSnapshot,
  ): string {
    const pilotCount = result.entries.filter((entry) => this.isMatrixPilotActionable(entry)).length;

    return `Plan QA genere: ${result.summary.analyzedCount} entree(s) analysee(s), ${pilotCount} a piloter, ${result.summary.proposalCount} proposition(s), ${result.summary.blockedCount} blocage(s).`;
  }

  private loadMatrixSnapshot(markLoading = true): void {
    if (markLoading) {
      this.loading.set(true);
    }

    this.service
      .loadMatrix()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          this.snapshot.set(snapshot);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (error: unknown) => {
          this.error.set(this.resolveMatrixLoadError(error));
          this.loading.set(false);
        },
      });
  }

  private resolveMatrixLoadError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const explicitMessage = this.extractHttpErrorMessage(error);
      if (error.status === 401) {
        return 'Session admin expiree. Reconnectez-vous puis relancez le recalcul de la matrice QA.';
      }
      if (error.status === 403) {
        if (
          explicitMessage &&
          !['forbidden', 'owner.ops.forbidden'].includes(explicitMessage.toLowerCase())
        ) {
          return explicitMessage;
        }
        return 'Acces refuse a la matrice QA. Connectez-vous avec un compte web Owner ou Admin.';
      }
      if (explicitMessage) {
        return explicitMessage;
      }
      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return 'Impossible de charger la matrice QA.';
  }

  private extractHttpErrorMessage(error: HttpErrorResponse): string | null {
    if (typeof error.error === 'string' && error.error.trim()) {
      return error.error.trim();
    }

    if (error.error && typeof error.error === 'object') {
      const message = (error.error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return message.trim();
      }
    }

    return null;
  }

  ngAfterViewInit(): void {
    this.registerMissionHudScrollSpy();
  }

  setSearch(event: Event): void {
    this.stopVoiceForContextChange();
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.search.set(value);
  }

  setDomainFilter(event: Event): void {
    this.setDomainFilterValue((event.target as HTMLSelectElement | null)?.value ?? 'all');
  }

  setDomainFilterValue(value: string): void {
    this.stopVoiceForContextChange();
    this.selectedDomain.set((value || 'all') as FilterValue<string>);
  }

  setPriorityFilter(event: Event): void {
    this.setPriorityFilterValue((event.target as HTMLSelectElement | null)?.value ?? 'all');
  }

  setPriorityFilterValue(value: string): void {
    this.stopVoiceForContextChange();
    this.selectedPriority.set((value || 'all') as FilterValue<AdminQualityMatrixPriority>);
  }

  setE2EFilter(event: Event): void {
    this.setE2EFilterValue((event.target as HTMLSelectElement | null)?.value ?? 'all');
  }

  setE2EFilterValue(value: string): void {
    this.stopVoiceForContextChange();
    this.selectedE2EStatus.set((value || 'all') as FilterValue<AdminQualityMatrixStatus>);
  }

  setBucketFilter(event: Event): void {
    this.setBucketFilterValue((event.target as HTMLSelectElement | null)?.value ?? 'all');
  }

  setBucketFilterValue(value: string): void {
    this.stopVoiceForContextChange();
    this.selectedBucket.set((value || 'all') as FilterValue<AdminQualityMatrixBucket>);
  }

  setAiProvider(event: Event): void {
    this.setAiProviderValue((event.target as HTMLSelectElement | null)?.value ?? '');
  }

  setAiProviderValue(value: string): void {
    this.stopVoiceForContextChange();
    if (!isAdminAiProvider(value)) {
      return;
    }

    this.selectedAiProvider.set(value);
  }

  resetFilters(): void {
    this.stopVoiceForContextChange();
    this.search.set('');
    this.selectedDomain.set('all');
    this.selectedPriority.set('all');
    this.selectedE2EStatus.set('all');
    this.selectedBucket.set('all');
  }

  selectEntry(entry: AdminQualityMatrixEntry): void {
    this.stopVoiceForContextChange();
    this.selectedEntryId.set(entry.id);
    this.selectedActionId.set(null);
    this.selectedMissionId.set(null);
    this.selectedSignalContext.set(null);
    this.selectedSignalDraftPrompt.set('');
    this.selectedSignalRecommendationsDraft.set('');
  }

  selectMatrixEntry(entryId: string): void {
    const entry = this.entries().find((candidate) => candidate.id === entryId);
    if (entry) {
      this.selectEntry(entry);
    }
  }

  selectBuildNowItem(item: AdminQualityBuildNowItem): void {
    const entry = this.entries().find((candidate) => candidate.id === item.entryId);
    if (!entry) {
      return;
    }

    this.resetFilters();
    this.selectEntry(entry);
    this.openWorkspace(item.tone === 'proof' || item.tone === 'review' ? 'delegation' : 'qaQueue');
  }

  recalculateBuildNowItem(item: AdminQualityBuildNowItem): void {
    const entry = this.entries().find((candidate) => candidate.id === item.entryId);
    if (!entry) {
      return;
    }

    this.resetFilters();
    this.selectEntry(entry);
    this.matrixRecalculationScope.set('selected-entry');
    this.requestMatrixRecalculation('selected-entry');
  }

  createBuildNowMission(item: AdminQualityBuildNowItem): void {
    const entry = this.entries().find((candidate) => candidate.id === item.entryId);
    if (!entry) {
      return;
    }

    this.resetFilters();
    this.selectEntry(entry);

    const recommendation = this.missionControl()?.recommendations.find(
      (candidate) => candidate.kind === 'core',
    );
    if (!recommendation) {
      this.notifications.error('Aucune mission principale disponible pour ce chantier.', {
        source: 'admin-quality',
      });
      return;
    }

    this.updateMissionStatus(
      recommendation,
      'approved',
      `Mission creee pour ${entry.domain}: ${item.actionLabel}.`,
    );
    this.setMissionHudSection('mission', 'manual-targeting');
  }

  selectCoverageSignal(selection: AdminQualityCoverageSignalSelection): void {
    this.stopVoiceForContextChange();
    const signalContext = this.buildWorkspaceSignalContext(selection);
    const plan = buildDelegationPlan(selection.entry);
    this.selectedEntryId.set(selection.entry.id);
    this.selectedActionId.set(null);
    this.selectedMissionId.set(null);
    this.selectedSignalContext.set(signalContext);
    this.selectedSignalRecommendationsDraft.set(signalContext.recommendations.join('\n'));
    this.selectedSignalDraftPrompt.set(
      this.buildSignalDispatchTask(selection.entry, plan, signalContext),
    );
    this.activeWorkspaceSurface.set('delegation');
    this.workspaceOpen.set(true);
    this.setMissionHudSection('workspace', 'manual-targeting');
  }

  isSelected(entry: AdminQualityMatrixEntry): boolean {
    return this.selectedEntry()?.id === entry.id;
  }

  selectAction(action: AdminQualityActionRecord): void {
    this.stopVoiceForContextChange();
    this.selectedActionId.set(action.id);
    this.selectedSignalContext.set(null);
    this.selectedSignalDraftPrompt.set('');
    this.selectedSignalRecommendationsDraft.set('');
    this.activeWorkspaceSurface.set('actions');
    this.workspaceOpen.set(true);
  }

  isActionSelected(action: AdminQualityActionRecord): boolean {
    return this.selectedAction()?.id === action.id;
  }

  selectMission(recommendation: AdminQualityMissionRecommendation): void {
    this.stopVoiceForContextChange();
    this.selectedMissionId.set(recommendation.id);
  }

  openWorkspace(surface: AdminQualityWorkspaceSurface = this.activeWorkspaceSurface()): void {
    this.stopVoiceForContextChange();
    this.activeConsoleSurface.set('workspace');
    this.activeWorkspaceSurface.set(surface);
    this.workspaceOpen.set(true);
    this.setMissionHudSection('workspace', 'manual-targeting');
  }

  closeWorkspace(): void {
    this.workspaceOpen.set(false);
  }

  setActiveWorkspaceSurface(surface: AdminQualityWorkspaceSurface): void {
    this.stopVoiceForContextChange();
    this.activeConsoleSurface.set('workspace');
    this.activeWorkspaceSurface.set(surface);
  }

  activateConsoleSurface(
    surface: AdminQualityConsoleSurface,
    workspaceSurface?: AdminQualityWorkspaceSurface,
  ): void {
    this.stopVoiceForContextChange();
    this.activeConsoleSurface.set(surface);

    if (workspaceSurface) {
      this.activeWorkspaceSurface.set(workspaceSurface);
    } else if (surface === 'queue') {
      this.activeWorkspaceSurface.set('qaQueue');
    }

    if (surface === 'workspace') {
      this.setMissionHudSection('workspace', 'manual-targeting');
    }
  }

  updateSelectedSignalPrompt(value: string): void {
    this.selectedSignalDraftPrompt.set(value);
  }

  updateSelectedSignalRecommendations(value: string): void {
    this.selectedSignalRecommendationsDraft.set(value);

    const signalContext = this.selectedSignalContext();
    const entry = this.selectedEntry();
    const plan = this.selectedDelegation();
    if (!signalContext) {
      return;
    }

    const nextContext: AdminQualityWorkspaceSignalContext = {
      ...signalContext,
      recommendations: this.parseRecommendationDraft(value),
    };

    this.selectedSignalContext.set(nextContext);

    if (entry && plan) {
      this.selectedSignalDraftPrompt.set(this.buildSignalDispatchTask(entry, plan, nextContext));
    }
  }

  dispatchSelectedSignalFromWorkspace(): void {
    const signalContext = this.selectedSignalContext();
    const entry = this.selectedEntry();
    const plan = this.selectedDelegation();
    if (!signalContext || !entry || !plan) {
      return;
    }

    if (!this.selectedSignalDispatchReady()) {
      this.notifications.error(
        this.selectedSignalDispatchBlockedMessage() ?? this.selectedAiDispatchBlockedMessage(),
        {
          source: 'admin-quality',
        },
      );
      return;
    }

    this.aiDispatchingSelectedSignal.set(true);

    this.opsService
      .dispatchCodexWorkflow({
        provider: this.selectedAiProvider(),
        task:
          this.selectedSignalDraftPrompt().trim() ||
          this.buildSignalDispatchTask(entry, plan, signalContext),
        scope: this.resolveCodexScope(plan.targetFiles),
        baseBranch: 'main',
        draftPr: true,
        model: this.selectedAiProviderModel(),
        effort: null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.aiDispatchingSelectedSignal.set(false)),
      )
      .subscribe({
        next: (result) => {
          this.persistSignalRecommendationTrace(entry, plan, signalContext, result);
          this.recordSignalDelegationTrace(entry.id, signalContext);
          this.notifications.info(
            `${this.selectedAiProviderLabel()} queued via ${result.workflow} on ${result.ref}.`,
            { source: 'admin-quality' },
          );
          this.loadAiDispatchReadiness(true);
        },
        error: (error: unknown) => {
          this.notifications.error(this.resolveOpsDispatchError(error), {
            source: 'admin-quality',
          });
        },
      });
  }

  toggleMissionHud(): void {
    this.missionHudExpanded.update((value) => !value);
  }

  setMissionHudSection(
    section: AdminQualityMissionHudSection,
    reason: AdminQualityMissionRadarLockReason = 'manual-targeting',
  ): void {
    this.pendingMissionControlLockReason = reason;
    this.missionHudActiveSection.set(section);
    if (section === 'workspace') {
      this.activeConsoleSurface.set('workspace');
    }
  }

  scrollMissionHudToSection(section: AdminQualityMissionHudSection): void {
    this.setMissionHudSection(section, 'manual-targeting');

    if (!this.isBrowser) {
      return;
    }

    const element = this.resolveMissionHudSectionElement(section)?.nativeElement;
    if (element && typeof element.scrollIntoView === 'function') {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  focusMissionControlLockEntry(section: AdminQualityMissionHudSection): void {
    if (section === 'workspace') {
      this.openWorkspace();
      return;
    }

    this.scrollMissionHudToSection(section);
  }

  handleMissionAction(event: AdminQualityMissionControlActionEvent): void {
    const launchesDelegation = event.action === 'auto-delegate';
    const resolution = resolveMissionAction(event.action, event.recommendation);
    if (!resolution) {
      return;
    }

    this.stopVoiceForContextChange();
    this.recordMissionControlAction(event);

    if (resolution.kind === 'reset') {
      this.resetMission(event.recommendation, resolution.message);
      return;
    }

    if (launchesDelegation && resolution.status === 'in-progress') {
      this.dispatchSelectedMission(event.recommendation, resolution.message);
      return;
    }

    this.updateMissionStatus(event.recommendation, resolution.status, resolution.message);
  }

  matrixSourceLabel(status: AdminQualityMatrixSourceStatus): string {
    switch (status) {
      case 'fallback':
        return 'Fallback';
      case 'stale':
        return 'A verifier';
      default:
        return 'A jour';
    }
  }

  matrixSourceClasses(status: AdminQualityMatrixSourceStatus): string {
    switch (status) {
      case 'fallback':
        return 'border-rose-300/32 bg-rose-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'stale':
        return 'border-amber-300/32 bg-amber-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      default:
        return 'border-emerald-300/32 bg-emerald-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
    }
  }

  matrixRecalculationResultLabel(result: AdminQualityMatrixRecalculationResult): string {
    switch (result) {
      case 'proposal-review-required':
        return 'Proposition';
      case 'blocked-insufficient-proof':
        return 'Preuve insuffisante';
      case 'blocked-conflicting-signals':
        return 'Signaux en conflit';
      default:
        return 'Sans changement';
    }
  }

  matrixRecalculationResultClasses(result: AdminQualityMatrixRecalculationResult): string {
    switch (result) {
      case 'proposal-review-required':
        return 'border-sky-300/25 bg-sky-400/12 text-sky-100';
      case 'blocked-insufficient-proof':
      case 'blocked-conflicting-signals':
        return 'border-amber-300/25 bg-amber-400/12 text-amber-50';
      default:
        return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100';
    }
  }

  matrixRecalculationConfidenceLabel(confidence: 'low' | 'medium' | 'high'): string {
    switch (confidence) {
      case 'high':
        return 'Confiance haute';
      case 'medium':
        return 'Confiance moyenne';
      default:
        return 'Confiance basse';
    }
  }

  matrixRecalculationScopeLabel(scope: 'refresh-required' | 'selected-entry' | 'all'): string {
    switch (scope) {
      case 'all':
        return 'Portee complete';
      case 'selected-entry':
        return 'Entree ciblee';
      default:
        return 'Entrees a piloter';
    }
  }

  matrixPilotPriorityLabel(priority: AdminQualityMatrixPilotPriority): string {
    switch (priority) {
      case 'now':
        return 'A lancer maintenant';
      case 'next':
        return 'Prochain lot';
      case 'blocked':
        return 'Bloque';
      default:
        return 'Plus tard';
    }
  }

  matrixPilotBucketLabel(bucket: AdminQualityMatrixPilotBucket): string {
    switch (bucket) {
      case 'ready-to-close':
        return 'Pret a cloturer';
      case 'needs-proof':
        return 'Preuve requise';
      case 'needs-product-call':
        return 'Decision produit';
      case 'blocked-by-api':
        return 'Contrat API';
      default:
        return 'Pret a developper';
    }
  }

  matrixPilotActionLabel(actionType: AdminQualityMatrixPilotActionType): string {
    switch (actionType) {
      case 'implement-feature':
        return 'Implementer';
      case 'add-test':
        return 'Ajouter une preuve';
      case 'fix-proof-gap':
        return 'Combler la preuve';
      case 'update-contract':
        return 'Mettre a jour le contrat';
      case 'review-product-scope':
        return 'Arbitrer le scope';
      case 'close-entry':
        return 'Cloturer la ligne';
      default:
        return 'Valider';
    }
  }

  matrixPilotPriorityClasses(priority: AdminQualityMatrixPilotPriority): string {
    switch (priority) {
      case 'now':
        return 'border-emerald-300/25 bg-emerald-400/12 text-emerald-50';
      case 'blocked':
        return 'border-amber-300/25 bg-amber-400/12 text-amber-50';
      case 'next':
        return 'border-cyan-300/25 bg-cyan-400/12 text-cyan-50';
      default:
        return 'border-white/10 bg-white/5 text-slate-200';
    }
  }

  matrixRecalculationFactualLabel(
    label: keyof AdminQualityMatrixRecalculationEntry['factualSignals'],
  ): string {
    switch (label) {
      case 'reviewedAt':
        return 'Derniere revue';
      case 'repoSignalAt':
        return 'Signal repo';
      case 'repoSignalCommit':
        return 'Commit';
      case 'repoSignalSource':
        return 'Source';
      default:
        return 'Decision mission';
    }
  }

  matrixCoverageDeltaLabel(
    current: AdminQualityMatrixStatus | AdminQualityMatrixBucket,
    proposed: AdminQualityMatrixStatus | AdminQualityMatrixBucket,
  ): string {
    return current === proposed ? String(current) : `${current} -> ${proposed}`;
  }

  matrixRecalculationRecommendations(
    entry: AdminQualityMatrixRecalculationEntry,
  ): readonly string[] {
    switch (entry.result) {
      case 'proposal-review-required':
        return [
          'Tu devrais garder la matrice en etat courant tant qu un humain n a pas valide la proposition.',
          entry.proposed?.needsProductWorkFirst
            ? 'Tu devrais laisser la matrice en partiel ou etat voisin tant que le produit n etend pas officiellement le scope attendu.'
            : 'Tu devrais appliquer la proposition seulement si le signal repo et la decision mission confirment vraiment cette promotion.',
          'Tu devrais relancer le recalcul apres application pour verifier qu il ne reste plus de proposition ouverte.',
        ];
      case 'blocked-insufficient-proof':
        return [
          'Tu devrais laisser la matrice au niveau courant tant qu il n existe pas de preuve executable ou de validation humaine plus recente.',
          'Tu ne devrais pas promouvoir la couverture sur la seule base d un merge ou d un signal repo.',
          'Tu devrais demander une preuve ciblee avant toute promotion de statut.',
        ];
      case 'blocked-conflicting-signals':
        return [
          'Tu devrais arbitrer manuellement les signaux avant toute application.',
          'Tu devrais garder la matrice dans son etat actuel tant que les preuves se contredisent.',
          'Tu devrais ouvrir une revue operateur pour clarifier quelle preuve fait foi.',
        ];
      default:
        return [
          'Tu devrais conserver la matrice en l etat tant qu aucun signal plus fort ne justifie une promotion.',
          'Tu peux traiter ce point comme stable pour le scope actuellement prouve.',
        ];
    }
  }

  missionDecisionSyncLabel(status: AdminQualityMissionDecisionSyncStatus): string {
    switch (status) {
      case 'server':
        return 'Missions serveur';
      case 'syncing':
        return 'Sync missions...';
      case 'unavailable':
        return 'Missions locales';
      default:
        return 'Missions locales';
    }
  }

  missionDecisionSyncClasses(status: AdminQualityMissionDecisionSyncStatus): string {
    switch (status) {
      case 'server':
        return 'border-emerald-300/32 bg-emerald-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'syncing':
        return 'border-sky-300/32 bg-sky-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'unavailable':
        return 'border-amber-300/32 bg-amber-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      default:
        return 'border-white/16 bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
    }
  }

  missionHudStatusLabel(status: AdminQualityMissionStatus): string {
    switch (status) {
      case 'approved':
        return 'Prete';
      case 'in-progress':
        return 'En execution';
      case 'proof-returned':
        return 'Preuve revenue';
      case 'done':
        return 'Validee';
      case 'deferred':
        return 'Differee';
      case 'rejected':
        return 'Rejetee';
      case 'blocked':
        return 'Bloquee';
      default:
        return 'En attente';
    }
  }

  missionHudStatusClasses(status: AdminQualityMissionStatus): string {
    switch (status) {
      case 'approved':
        return 'border-sky-300/32 bg-sky-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'in-progress':
        return 'border-emerald-300/32 bg-emerald-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'proof-returned':
        return 'border-amber-300/32 bg-amber-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'done':
      case 'deferred':
        return 'border-white/16 bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      case 'rejected':
      case 'blocked':
        return 'border-rose-300/32 bg-rose-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
      default:
        return 'border-violet-300/32 bg-violet-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]';
    }
  }

  missionHudConfidencePercent(value: AdminQualityMissionRecommendation['confidence']): number {
    return value === 'High' ? 88 : 72;
  }

  missionHudConfidenceRingBackground(
    value: AdminQualityMissionRecommendation['confidence'],
  ): string {
    const percent = this.missionHudConfidencePercent(value);
    const degrees = `${Math.round(percent * 3.6)}deg`;
    const color = value === 'High' ? 'rgba(34,197,94,0.96)' : 'rgba(245,158,11,0.96)';
    return `conic-gradient(${color} 0deg ${degrees}, rgba(148,163,184,0.14) ${degrees} 360deg)`;
  }

  missionHudConfidenceClasses(value: AdminQualityMissionRecommendation['confidence']): string {
    return value === 'High'
      ? 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100'
      : 'border-amber-400/25 bg-amber-400/12 text-amber-100';
  }

  missionHudImpactClasses(value: AdminQualityMissionRecommendation['impact']): string {
    switch (value) {
      case 'High':
        return 'border-rose-400/25 bg-rose-400/12 text-rose-100';
      case 'Low':
        return 'border-white/12 bg-white/5 text-slate-200';
      default:
        return 'border-amber-400/25 bg-amber-400/12 text-amber-100';
    }
  }

  missionHudTelemetryClasses(status: AdminQualityAiTelemetryState): string {
    switch (status) {
      case 'live':
        return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100';
      case 'degraded':
        return 'border-amber-400/25 bg-amber-400/12 text-amber-100';
      case 'syncing':
        return 'border-sky-400/25 bg-sky-400/12 text-sky-100';
      default:
        return 'border-white/12 bg-white/5 text-slate-200';
    }
  }

  missionHudSectionClasses(section: AdminQualityMissionHudSection): string {
    if (this.missionHudActiveSection() === section) {
      return this.missionHudSectionPulse(section)
        ? 'border-cyan-300/45 bg-cyan-400/18 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.18),0_0_22px_rgba(34,211,238,0.18)] animate-pulse'
        : 'border-cyan-300/35 bg-cyan-400/14 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]';
    }

    return 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/8';
  }

  consoleSurfaceClasses(surface: AdminQualityConsoleSurface): string {
    if (this.activeConsoleSurface() === surface) {
      return 'border-cyan-300/35 bg-cyan-400/14 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]';
    }

    return 'border-white/10 bg-white/5 text-slate-300 hover:border-white/18 hover:bg-white/8';
  }

  consoleMissionActionLabel(action: AdminQualityMissionActionDescriptor): string {
    if (action.action === 'auto-delegate') {
      return this.selectedAiDispatching()
        ? 'Dispatch...'
        : `Lancer ${this.selectedAiProviderLabel()}`;
    }

    return action.label;
  }

  consoleMissionActionClasses(tone: AdminQualityMissionActionTone): string {
    switch (tone) {
      case 'primary':
        return 'border-sky-400/35 bg-sky-400/14 text-sky-50 hover:bg-sky-400/20';
      case 'secondary':
        return 'border-amber-400/30 bg-amber-400/12 text-amber-100 hover:bg-amber-400/18';
      case 'danger':
        return 'border-rose-400/30 bg-rose-400/12 text-rose-100 hover:bg-rose-400/18';
      case 'success':
        return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-100 hover:bg-emerald-400/18';
      default:
        return 'border-white/12 bg-white/5 text-slate-100 hover:bg-white/8';
    }
  }

  consoleMissionActionIconLabel(action: AdminQualityMissionControlAction): string {
    switch (action) {
      case 'approve':
        return 'OK';
      case 'auto-delegate':
        return 'GO';
      case 'defer':
        return 'DF';
      case 'block':
        return 'BL';
      case 'reset':
        return 'RS';
      case 'return-proof':
        return 'PF';
      case 'complete':
        return 'CL';
      default:
        return 'OP';
    }
  }

  isConsoleMissionActionBlocked(
    action: AdminQualityMissionControlAction,
    mission: AdminQualityMissionRecommendation,
  ): boolean {
    return (
      action === 'auto-delegate' &&
      this.selectedMission()?.id === mission.id &&
      Boolean(this.selectedMissionQuotaSummary()) &&
      !this.canStartSelectedMission()
    );
  }

  isConsoleMissionActionDisabled(
    action: AdminQualityMissionControlAction,
    mission: AdminQualityMissionRecommendation,
  ): boolean {
    return this.isConsoleMissionActionBlocked(action, mission) && action !== 'auto-delegate';
  }

  triggerConsoleMissionAction(
    action: AdminQualityMissionControlAction,
    mission: AdminQualityMissionRecommendation,
  ): void {
    this.handleMissionAction({ action, recommendation: mission });
  }

  missionHudAmbientOverlayClasses(): string {
    switch (this.missionHudAmbientTone()) {
      case 'critical':
        return 'bg-[radial-gradient(circle_at_top_right,rgba(251,113,133,0.22),transparent_26%),radial-gradient(circle_at_14%_18%,rgba(251,191,36,0.12),transparent_18%),linear-gradient(135deg,rgba(127,29,29,0.12),transparent_55%)]';
      case 'syncing':
        return 'bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.2),transparent_24%),radial-gradient(circle_at_18%_18%,rgba(125,211,252,0.16),transparent_22%),linear-gradient(135deg,rgba(14,116,144,0.14),transparent_55%)] animate-pulse';
      case 'warning':
        return 'bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.18),transparent_24%),radial-gradient(circle_at_18%_18%,rgba(56,189,248,0.1),transparent_18%),linear-gradient(135deg,rgba(120,53,15,0.12),transparent_55%)]';
      default:
        return 'bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_24%),radial-gradient(circle_at_18%_18%,rgba(16,185,129,0.1),transparent_18%),linear-gradient(135deg,rgba(8,47,73,0.18),transparent_58%)]';
    }
  }

  missionHudSectionPulse(section: AdminQualityMissionHudSection): boolean {
    return this.missionHudPulsingSection() === section;
  }

  missionControlShellClasses(): string {
    switch (this.selectedAiProvider()) {
      case 'claude':
        return 'border-amber-300/25 bg-[linear-gradient(180deg,rgba(28,14,7,0.92),rgba(21,10,8,0.9))] shadow-[0_34px_90px_-58px_rgba(251,191,36,0.42)]';
      case 'gemini':
        return 'border-lime-300/20 bg-[linear-gradient(180deg,rgba(18,22,7,0.92),rgba(9,16,14,0.9))] shadow-[0_34px_90px_-58px_rgba(132,204,22,0.36)]';
      case 'copilot':
        return 'border-blue-300/20 bg-[linear-gradient(180deg,rgba(8,16,34,0.92),rgba(8,14,26,0.9))] shadow-[0_34px_90px_-58px_rgba(96,165,250,0.34)]';
      default:
        return 'border-cyan-300/20 bg-[linear-gradient(180deg,rgba(4,14,30,0.92),rgba(6,16,28,0.9))] shadow-[0_34px_90px_-58px_rgba(34,211,238,0.34)]';
    }
  }

  missionControlRadarClasses(): string {
    const tone = this.missionHudAmbientTone();

    switch (this.selectedAiProvider()) {
      case 'claude':
        return tone === 'critical'
          ? 'bg-[radial-gradient(circle_at_20%_24%,rgba(251,113,133,0.24),transparent_20%),radial-gradient(circle_at_80%_22%,rgba(251,191,36,0.2),transparent_22%),repeating-radial-gradient(circle_at_center,rgba(251,191,36,0.14)_0,rgba(251,191,36,0.14)_2px,transparent_2px,transparent_42px)]'
          : 'bg-[radial-gradient(circle_at_20%_24%,rgba(251,191,36,0.22),transparent_20%),radial-gradient(circle_at_80%_22%,rgba(251,146,60,0.16),transparent_22%),repeating-radial-gradient(circle_at_center,rgba(251,191,36,0.12)_0,rgba(251,191,36,0.12)_2px,transparent_2px,transparent_42px)]';
      case 'gemini':
        return tone === 'critical'
          ? 'bg-[radial-gradient(circle_at_18%_26%,rgba(248,113,113,0.2),transparent_18%),radial-gradient(circle_at_82%_24%,rgba(132,204,22,0.16),transparent_20%),repeating-radial-gradient(circle_at_center,rgba(163,230,53,0.12)_0,rgba(163,230,53,0.12)_2px,transparent_2px,transparent_40px)]'
          : 'bg-[radial-gradient(circle_at_18%_26%,rgba(163,230,53,0.18),transparent_18%),radial-gradient(circle_at_82%_24%,rgba(34,197,94,0.14),transparent_20%),repeating-radial-gradient(circle_at_center,rgba(163,230,53,0.12)_0,rgba(163,230,53,0.12)_2px,transparent_2px,transparent_40px)]';
      case 'copilot':
        return tone === 'critical'
          ? 'bg-[radial-gradient(circle_at_18%_22%,rgba(248,113,113,0.2),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(96,165,250,0.18),transparent_20%),linear-gradient(135deg,rgba(59,130,246,0.1)_0%,transparent_48%,rgba(96,165,250,0.1)_100%)]'
          : 'bg-[radial-gradient(circle_at_18%_22%,rgba(96,165,250,0.18),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.14),transparent_20%),linear-gradient(135deg,rgba(59,130,246,0.1)_0%,transparent_48%,rgba(96,165,250,0.1)_100%)]';
      default:
        return tone === 'critical'
          ? 'bg-[radial-gradient(circle_at_18%_22%,rgba(248,113,113,0.2),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.16),transparent_20%),repeating-radial-gradient(circle_at_center,rgba(34,211,238,0.1)_0,rgba(34,211,238,0.1)_2px,transparent_2px,transparent_38px)]'
          : 'bg-[radial-gradient(circle_at_18%_22%,rgba(34,211,238,0.18),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.14),transparent_20%),repeating-radial-gradient(circle_at_center,rgba(34,211,238,0.1)_0,rgba(34,211,238,0.1)_2px,transparent_2px,transparent_38px)]';
    }
  }

  missionControlProviderLightClasses(): string {
    switch (this.selectedAiProvider()) {
      case 'claude':
        return 'bg-[linear-gradient(90deg,transparent,rgba(251,191,36,0.18),rgba(251,146,60,0.2),transparent)]';
      case 'gemini':
        return 'bg-[linear-gradient(90deg,transparent,rgba(163,230,53,0.16),rgba(34,197,94,0.18),transparent)]';
      case 'copilot':
        return 'bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.16),rgba(59,130,246,0.18),transparent)]';
      default:
        return 'bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.16),rgba(56,189,248,0.18),transparent)]';
    }
  }

  missionControlRadarEchoClasses(point: AdminQualityMissionRadarEchoPoint): string {
    if (point.active) {
      return point.pulsing
        ? 'border-white/40 bg-white/18 text-white shadow-[0_0_0_1px_var(--og7-cockpit-accent-strong),0_0_22px_var(--og7-cockpit-glow)] animate-pulse'
        : 'border-white/30 bg-white/14 text-white shadow-[0_0_0_1px_var(--og7-cockpit-accent),0_0_18px_var(--og7-cockpit-glow)]';
    }

    switch (point.intensity) {
      case 'high':
        return 'border-white/16 bg-slate-950/55 text-slate-200 hover:border-white/24 hover:bg-white/10';
      case 'medium':
        return 'border-white/12 bg-slate-950/45 text-slate-300 hover:border-white/20 hover:bg-white/8';
      default:
        return 'border-white/10 bg-slate-950/35 text-slate-400 hover:border-white/16 hover:bg-white/7';
    }
  }

  missionControlRadarEchoRingClasses(point: AdminQualityMissionRadarEchoPoint): string {
    if (point.active) {
      return point.pulsing
        ? 'border-[var(--og7-cockpit-accent-strong)] opacity-100 scale-100 animate-ping'
        : 'border-[var(--og7-cockpit-accent)] opacity-90 scale-100';
    }

    return 'border-white/10 opacity-60 scale-95';
  }

  missionControlRadarEchoLabelClasses(point: AdminQualityMissionRadarEchoPoint): string {
    return point.active ? 'text-white' : 'text-slate-400';
  }

  missionControlRadarTrailOpacity(point: AdminQualityMissionRadarEchoPoint): string {
    if (point.pulsing) {
      return '0.96';
    }

    if (point.active) {
      return point.intensity === 'high' ? '0.7' : point.intensity === 'medium' ? '0.56' : '0.42';
    }

    return point.intensity === 'high' ? '0.18' : point.intensity === 'medium' ? '0.12' : '0.08';
  }

  missionControlRadarTrailWidth(point: AdminQualityMissionRadarEchoPoint): string {
    if (point.pulsing || point.intensity === 'high') {
      return '2.4';
    }

    return point.intensity === 'medium' ? '1.8' : '1.3';
  }

  missionControlRadarTrailDasharray(point: AdminQualityMissionRadarEchoPoint): string {
    return point.pulsing ? '10 7' : point.active ? '7 6' : '4 8';
  }

  missionControlRadarTrailEndpointRadius(point: AdminQualityMissionRadarEchoPoint): string {
    return point.intensity === 'high' ? '4.2' : point.intensity === 'medium' ? '3.4' : '2.8';
  }

  missionControlRadarMetricClasses(point: AdminQualityMissionRadarEchoPoint): string {
    if (point.active) {
      return 'text-white/80';
    }

    return point.intensity === 'high' ? 'text-slate-200/75' : 'text-slate-400';
  }

  missionControlContactLogEntryClasses(index: number): string {
    if (index === 0) {
      return 'border-[var(--og7-cockpit-accent)] bg-white/10 text-slate-100';
    }

    if (index === 1) {
      return 'border-white/10 bg-slate-950/38 text-slate-300 opacity-90';
    }

    return 'border-white/10 bg-slate-950/28 text-slate-400 opacity-70';
  }

  missionControlContactLogAge(index: number): 'current' | 'recent' | 'stale' {
    if (index === 0) {
      return 'current';
    }

    return index === 1 ? 'recent' : 'stale';
  }

  missionControlContactLogTimeClasses(index: number): string {
    switch (this.missionControlContactLogAge(index)) {
      case 'recent':
        return 'border-white/10 bg-slate-950/60 text-slate-300 opacity-85';
      case 'stale':
        return 'border-white/8 bg-slate-950/45 text-slate-400 opacity-70';
      default:
        return 'border-white/10 bg-slate-950/70 text-slate-200';
    }
  }

  missionControlContactLogSignalClasses(signalTone: AdminQualityMissionRadarSignalTone): string {
    switch (signalTone) {
      case 'proof':
      case 'success':
        return 'border-emerald-400/25 bg-emerald-400/12 text-emerald-100';
      case 'manual':
      case 'primary':
        return 'border-sky-400/25 bg-sky-400/12 text-sky-100';
      case 'secondary':
        return 'border-violet-400/25 bg-violet-400/12 text-violet-100';
      case 'danger':
        return 'border-rose-400/25 bg-rose-400/12 text-rose-100';
      case 'neutral':
        return 'border-white/12 bg-white/5 text-slate-200';
      default:
        return 'border-amber-400/25 bg-amber-400/12 text-amber-100';
    }
  }

  missionControlPanelFocused(section: AdminQualityMissionHudSection): boolean {
    return this.missionControlFocusedPanel() === section;
  }

  missionControlRadarSignalTone(): AdminQualityMissionRadarSignalTone | 'idle' {
    return this.missionControlRadarLatestSignal()?.signalTone ?? 'idle';
  }

  missionControlDisplaySignalTone(): AdminQualityMissionRadarSignalTone {
    const signalTone = this.missionControlRadarSignalTone();
    return signalTone === 'idle' ? 'pulse' : signalTone;
  }

  missionControlRadarSweepMode(): AdminQualityMissionRadarTimelineKind | 'idle' {
    return this.missionControlRadarLatestSignal()?.kind ?? 'idle';
  }

  missionControlTimelineSlotLabel(index: number): string {
    return index === 0 ? 'T+0' : `T-${index}`;
  }

  missionControlTimelineCadenceLabel(index: number): string {
    return index === 0 ? 'now' : `${index} hop${index > 1 ? 's' : ''} ago`;
  }

  private missionControlTimelineKindLabel(kind: AdminQualityMissionRadarTimelineKind): string {
    switch (kind) {
      case 'action':
        return 'Action';
      case 'proof':
        return 'Proof';
      default:
        return 'Lock';
    }
  }

  private missionControlTimelineReasonLabel(
    entry: AdminQualityMissionRadarLockHistoryEntry,
  ): string {
    if (entry.kind === 'action') {
      return this.missionControlActionLabel(entry.action ?? 'approve');
    }

    if (entry.kind === 'proof') {
      return 'Proof surge';
    }

    return this.missionControlLockReasonLabel(entry.reason ?? 'section-pulse');
  }

  private missionControlTimelineSignalTone(
    entry: AdminQualityMissionRadarLockHistoryEntry,
  ): AdminQualityMissionRadarSignalTone {
    if (entry.kind === 'action') {
      return entry.actionTone ?? 'primary';
    }

    if (entry.kind === 'proof') {
      return 'proof';
    }

    switch (entry.reason) {
      case 'manual-targeting':
        return 'manual';
      case 'proof-surge':
        return 'proof';
      default:
        return 'pulse';
    }
  }

  private missionControlRadarSignalStyleVars(
    signalTone: AdminQualityMissionRadarSignalTone | null,
  ): Record<string, string> {
    switch (signalTone) {
      case 'proof':
      case 'success':
        return {
          '--og7-cockpit-accent': 'rgba(52, 211, 153, 0.24)',
          '--og7-cockpit-accent-strong': 'rgba(16, 185, 129, 0.44)',
          '--og7-cockpit-outline': 'rgba(52, 211, 153, 0.22)',
          '--og7-cockpit-glow': 'rgba(16, 185, 129, 0.34)',
          '--og7-cockpit-sweep': 'rgba(110, 231, 183, 0.4)',
          '--og7-cockpit-band': 'rgba(52, 211, 153, 0.26)',
        };
      case 'manual':
      case 'primary':
        return {
          '--og7-cockpit-accent': 'rgba(59, 130, 246, 0.24)',
          '--og7-cockpit-accent-strong': 'rgba(96, 165, 250, 0.44)',
          '--og7-cockpit-outline': 'rgba(96, 165, 250, 0.22)',
          '--og7-cockpit-glow': 'rgba(59, 130, 246, 0.3)',
          '--og7-cockpit-sweep': 'rgba(147, 197, 253, 0.38)',
          '--og7-cockpit-band': 'rgba(96, 165, 250, 0.26)',
        };
      case 'secondary':
        return {
          '--og7-cockpit-accent': 'rgba(168, 85, 247, 0.22)',
          '--og7-cockpit-accent-strong': 'rgba(192, 132, 252, 0.42)',
          '--og7-cockpit-outline': 'rgba(192, 132, 252, 0.2)',
          '--og7-cockpit-glow': 'rgba(168, 85, 247, 0.3)',
          '--og7-cockpit-sweep': 'rgba(216, 180, 254, 0.36)',
          '--og7-cockpit-band': 'rgba(192, 132, 252, 0.24)',
        };
      case 'danger':
        return {
          '--og7-cockpit-accent': 'rgba(244, 63, 94, 0.24)',
          '--og7-cockpit-accent-strong': 'rgba(251, 113, 133, 0.44)',
          '--og7-cockpit-outline': 'rgba(251, 113, 133, 0.2)',
          '--og7-cockpit-glow': 'rgba(244, 63, 94, 0.32)',
          '--og7-cockpit-sweep': 'rgba(253, 164, 175, 0.36)',
          '--og7-cockpit-band': 'rgba(251, 113, 133, 0.24)',
        };
      case 'neutral':
        return {
          '--og7-cockpit-accent': 'rgba(148, 163, 184, 0.22)',
          '--og7-cockpit-accent-strong': 'rgba(203, 213, 225, 0.36)',
          '--og7-cockpit-outline': 'rgba(148, 163, 184, 0.18)',
          '--og7-cockpit-glow': 'rgba(148, 163, 184, 0.24)',
          '--og7-cockpit-sweep': 'rgba(226, 232, 240, 0.32)',
          '--og7-cockpit-band': 'rgba(148, 163, 184, 0.2)',
        };
      case 'pulse':
        return {
          '--og7-cockpit-accent': 'rgba(245, 158, 11, 0.22)',
          '--og7-cockpit-accent-strong': 'rgba(251, 191, 36, 0.42)',
          '--og7-cockpit-outline': 'rgba(251, 191, 36, 0.2)',
          '--og7-cockpit-glow': 'rgba(245, 158, 11, 0.28)',
          '--og7-cockpit-sweep': 'rgba(253, 224, 71, 0.38)',
          '--og7-cockpit-band': 'rgba(251, 191, 36, 0.24)',
        };
      default:
        return {};
    }
  }

  missionControlRadarOpacity(): string {
    switch (this.missionControlProofStreamIntensity()) {
      case 'high':
        return '1';
      case 'medium':
        return '0.88';
      default:
        return '0.72';
    }
  }

  missionControlRadarSweepOpacity(): string {
    switch (this.missionControlProofStreamIntensity()) {
      case 'high':
        return '0.82';
      case 'medium':
        return '0.7';
      default:
        return '0.56';
    }
  }

  missionControlRadarFieldOpacity(): string {
    switch (this.missionControlProofStreamIntensity()) {
      case 'high':
        return '1';
      case 'medium':
        return '0.92';
      default:
        return '0.82';
    }
  }

  missionControlRadarSweepSpeed(): 'slow' | 'nominal' | 'fast' | 'alert' {
    switch (this.missionHudAmbientTone()) {
      case 'critical':
        return 'alert';
      case 'syncing':
        return 'fast';
      case 'warning':
        return 'slow';
      default:
        return 'nominal';
    }
  }

  missionControlRadarAcquisitionRingClasses(point: AdminQualityMissionRadarEchoPoint): string {
    if (!point.active) {
      return 'border-transparent opacity-0 scale-90';
    }

    return point.pulsing
      ? 'border-[var(--og7-cockpit-accent-strong)] opacity-95 scale-100 shadow-[0_0_22px_var(--og7-cockpit-glow)]'
      : 'border-[var(--og7-cockpit-accent)] opacity-80 scale-100 shadow-[0_0_16px_var(--og7-cockpit-glow)]';
  }

  private resolveRadarEchoIntensity(
    count: number,
    total: number,
    highCount: number,
    highRatio: number,
    mediumCount: number,
    mediumRatio: number,
  ): AdminQualityMissionRadarEchoIntensity {
    const safeTotal = Math.max(total, 1);
    const ratio = count / safeTotal;

    if (count >= highCount || ratio >= highRatio) {
      return 'high';
    }

    if (count >= mediumCount || ratio >= mediumRatio) {
      return 'medium';
    }

    return 'low';
  }

  private resolveMissionRadarSweepDuration(): string {
    switch (this.missionHudAmbientTone()) {
      case 'critical':
        return '7.5s';
      case 'syncing':
        return '11s';
      case 'warning':
        return '20s';
      default:
        return '16s';
    }
  }

  missionHudTimelineMarkerClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'border-emerald-300/35 bg-emerald-400/22 text-emerald-50 shadow-[0_0_18px_rgba(52,211,153,0.2)]';
      case 'current':
        return 'border-cyan-300/45 bg-cyan-400/22 text-cyan-50 shadow-[0_0_0_5px_rgba(34,211,238,0.12),0_0_24px_rgba(34,211,238,0.28)]';
      default:
        return 'border-white/10 bg-slate-950/72 text-slate-400';
    }
  }

  missionHudTimelineConnectorClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'bg-linear-to-r from-emerald-300 via-cyan-300 to-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.22)]';
      case 'current':
        return 'bg-linear-to-r from-cyan-300 to-white/12';
      default:
        return 'bg-white/10';
    }
  }

  missionHudTimelineTextClasses(status: AdminQualityMissionTimelineStatus): string {
    switch (status) {
      case 'done':
        return 'text-slate-100';
      case 'current':
        return 'text-white';
      default:
        return 'text-slate-500';
    }
  }

  missionHudTimelineMarkerText(status: AdminQualityMissionTimelineStatus, index: number): string {
    return status === 'done' ? 'OK' : `${index + 1}`;
  }

  private missionHudTimelineShortLabel(id: string): string {
    switch (id) {
      case 'analysis':
        return 'Analyse';
      case 'approval':
        return 'Validation';
      case 'execution':
        return 'Execution';
      case 'review':
        return 'Preuve';
      case 'closure':
        return 'Cloture';
      default:
        return id;
    }
  }

  private activeMissionHudTimelineIndex(
    steps: readonly AdminQualityMissionHudTimelineStep[],
  ): number {
    const currentIndex = steps.findIndex((step) => step.status === 'current');
    if (currentIndex >= 0) {
      return currentIndex;
    }

    for (let index = steps.length - 1; index >= 0; index -= 1) {
      if (steps[index]?.status === 'done') {
        return index;
      }
    }

    return 0;
  }

  actionStatusLabel(status: AdminQualityActionStatus): string {
    switch (status) {
      case 'proved':
        return 'Prouvee';
      case 'documented':
        return 'Documentee';
      default:
        return 'A completer';
    }
  }

  actionStatusClasses(status: AdminQualityActionStatus): string {
    switch (status) {
      case 'proved':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'documented':
        return 'border-sky-200 bg-sky-50 text-sky-700';
      default:
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
  }

  actionIntentLabel(intent: AdminQualityActionIntent): string {
    switch (intent) {
      case 'navigation':
        return 'Navigation';
      case 'workflow':
        return 'Workflow';
      case 'mutation':
        return 'Mutation';
      case 'sharing':
        return 'Partage';
      case 'export':
        return 'Export';
      default:
        return 'Moderation';
    }
  }

  actionTriggerLabel(trigger: AdminQualityActionTrigger): string {
    switch (trigger) {
      case 'link':
        return 'Lien';
      case 'submit':
        return 'Submit';
      case 'menu':
        return 'Menu';
      default:
        return 'Bouton';
    }
  }

  actionStateLabel(key: keyof AdminQualityActionStateCoverage): string {
    switch (key) {
      case 'loading':
        return 'Loading';
      case 'success':
        return 'Succes';
      case 'error':
        return 'Erreur';
      case 'offline':
        return 'Offline';
      default:
        return 'Permission';
    }
  }

  actionStateClasses(enabled: boolean): string {
    return enabled
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-slate-200 bg-slate-100 text-slate-500';
  }

  async copyCodexPrompt(plan: AdminQualityDelegationPlan): Promise<void> {
    await this.copyText(plan.codexPrompt, 'Brief AI copie.');
  }

  async copyIssue(plan: AdminQualityDelegationPlan): Promise<void> {
    const payload = `${plan.issueTitle}\n\n${plan.issueBody}`;
    await this.copyText(payload, 'Issue GitHub copiee.');
  }

  delegationModeLabel(plan: AdminQualityDelegationPlan): string {
    switch (plan.mode) {
      case 'hardening':
        return 'Hardening';
      case 'product-closure':
        return 'Product closure';
      case 'scope-cadrage':
        return 'Scope cadrage';
      default:
        return 'QA proof';
    }
  }

  delegationModeClasses(plan: AdminQualityDelegationPlan): string {
    switch (plan.mode) {
      case 'hardening':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'product-closure':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'scope-cadrage':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  private resetMission(recommendation: AdminQualityMissionRecommendation, message: string): void {
    const next = { ...this.missionDecisions() };
    delete next[recommendation.id];
    this.missionDecisions.set(next);
    this.persistMissionDecisions();
    this.deleteMissionDecisionFromServer(recommendation);
    this.notifications.info(message, { source: 'admin-quality' });
  }

  async speakMissionControl(state: AdminQualityMissionControlState): Promise<void> {
    if (!this.isBrowser || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.notifications.info('Synthese vocale indisponible dans ce navigateur.', {
        source: 'admin-quality',
      });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(state.spokenBriefing);
    utterance.lang = 'fr-CA';
    utterance.rate = 0.98;
    utterance.pitch = 1;
    utterance.onend = () => this.speaking.set(false);
    utterance.onerror = () => {
      this.speaking.set(false);
      this.notifications.error("Impossible de lire l'analyse AI.", { source: 'admin-quality' });
    };

    window.speechSynthesis.cancel();
    this.speaking.set(true);
    window.speechSynthesis.speak(utterance);
    this.notifications.info('Analyse AI lue a voix haute.', { source: 'admin-quality' });
  }

  stopMissionVoice(notify = true): void {
    if (!this.isBrowser || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    window.speechSynthesis.cancel();
    const wasSpeaking = this.speaking();
    this.speaking.set(false);

    if (notify && wasSpeaking) {
      this.notifications.info('Lecture vocale arretee.', { source: 'admin-quality' });
    }
  }

  statusLabel(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'Oui';
      case 'partiel':
        return 'Partiel';
      case 'hors MVP':
        return 'Hors MVP';
      default:
        return 'Non';
    }
  }

  priorityLabel(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'Haute';
      case 'basse':
        return 'Basse';
      default:
        return 'Moyenne';
    }
  }

  bucketLabel(bucket: AdminQualityMatrixBucket): string {
    switch (bucket) {
      case 'covered':
        return 'Couvert';
      case 'product-gap':
        return 'Produit d abord';
      case 'scope-limit':
        return 'Hors scope courant';
      default:
        return 'Preuve a renforcer';
    }
  }

  statusClasses(status: AdminQualityMatrixStatus): string {
    switch (status) {
      case 'oui':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'partiel':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'hors MVP':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }
  }

  priorityClasses(priority: AdminQualityMatrixPriority): string {
    switch (priority) {
      case 'haute':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'basse':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-amber-200 bg-amber-50 text-amber-700';
    }
  }

  bucketClasses(bucket: AdminQualityMatrixBucket): string {
    switch (bucket) {
      case 'covered':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'product-gap':
        return 'border-indigo-200 bg-indigo-50 text-indigo-700';
      case 'scope-limit':
        return 'border-slate-200 bg-slate-100 text-slate-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  readinessLabel(entry: AdminQualityMatrixEntry): string {
    if (this.entryNeedsMatrixRefresh(entry)) {
      return 'Refresh matrice';
    }
    if (entry.e2eStatus === 'oui') {
      return 'Prouve';
    }
    if (entry.needsProductWorkFirst) {
      return 'Produit d abord';
    }
    return 'Pret pour preuve QA';
  }

  readinessClasses(entry: AdminQualityMatrixEntry): string {
    if (this.entryNeedsMatrixRefresh(entry)) {
      return 'border-rose-200 bg-rose-50 text-rose-700';
    }
    if (entry.e2eStatus === 'oui') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (entry.needsProductWorkFirst) {
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    }
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  buildNowToneClasses(tone: AdminQualityBuildNowTone): string {
    switch (tone) {
      case 'review':
        return 'border-rose-300/35 bg-rose-400/12 text-rose-50';
      case 'build':
        return 'border-indigo-300/30 bg-indigo-400/12 text-indigo-50';
      case 'blocked':
        return 'border-amber-300/35 bg-amber-400/12 text-amber-50';
      default:
        return 'border-sky-300/30 bg-sky-400/12 text-sky-50';
    }
  }

  buildNowPulseClasses(tone: AdminQualityBuildNowTone): string {
    switch (tone) {
      case 'review':
        return 'bg-rose-300 shadow-[0_0_22px_rgba(251,113,133,0.38)]';
      case 'build':
        return 'bg-indigo-300 shadow-[0_0_22px_rgba(129,140,248,0.36)]';
      case 'blocked':
        return 'bg-amber-300 shadow-[0_0_22px_rgba(252,211,77,0.38)]';
      default:
        return 'bg-cyan-300 shadow-[0_0_22px_rgba(103,232,249,0.38)]';
    }
  }

  buildNowAutomationClasses(item: AdminQualityBuildNowItem): string {
    switch (item.tone) {
      case 'proof':
        return 'border-emerald-300/30 bg-emerald-400/12 text-emerald-50';
      case 'blocked':
        return 'border-amber-300/35 bg-amber-400/12 text-amber-50';
      default:
        return 'border-white/12 bg-white/7 text-slate-100';
    }
  }

  buildNowGroupClasses(group: AdminQualityBuildNowGroup): string {
    const base = group.active
      ? this.buildNowToneClasses(group.tone)
      : 'border-white/10 bg-white/5 text-slate-500';
    return `${base} ${group.active ? '' : 'opacity-70'}`.trim();
  }

  private buildNowItem(entry: AdminQualityMatrixEntry): AdminQualityBuildNowItem | null {
    const refreshRequired = this.entryNeedsMatrixRefresh(entry);
    const needsConstruction = entry.e2eStatus !== 'oui' || refreshRequired;
    if (!needsConstruction || entry.managementBucket === 'scope-limit') {
      return null;
    }

    const statusGap = 3 - this.statusRank(entry.e2eStatus);
    const score =
      (refreshRequired ? 90 : 0) +
      this.priorityRank(entry.priority) * 18 +
      statusGap * 16 +
      (entry.needsProductWorkFirst ? 22 : 0) +
      (entry.managementBucket === 'proof-gap' ? 18 : 0) +
      (entry.managementBucket === 'product-gap' ? 12 : 0);
    const reasonTags = [
      refreshRequired ? 'Signal recent' : null,
      entry.priority === 'haute' ? 'Haute priorite' : null,
      entry.e2eStatus !== 'oui' ? `E2E ${this.statusLabel(entry.e2eStatus)}` : null,
      entry.managementBucket === 'proof-gap' ? 'Preuve manquante' : null,
      entry.needsProductWorkFirst || entry.managementBucket === 'product-gap'
        ? 'Surface a construire'
        : null,
    ].filter((value): value is string => Boolean(value));
    const automation = this.buildNowAutomation(entry, refreshRequired);

    if (refreshRequired) {
      return {
        entryId: entry.id,
        domain: entry.domain,
        actionLabel: 'Relire la matrice',
        reasonLabel: 'Signal recent',
        reasonTags,
        summarySentence: this.buildNowSummarySentence(entry, 'Relire la matrice', reasonTags),
        automationLabel: automation.label,
        automationDetail: automation.detail,
        detail: entry.repoSignalSummary || entry.observedGap || entry.need,
        nextMove: entry.nextMove,
        readinessLabel: this.readinessLabel(entry),
        score,
        tone: 'review',
      };
    }

    if (entry.needsProductWorkFirst || entry.managementBucket === 'product-gap') {
      return {
        entryId: entry.id,
        domain: entry.domain,
        actionLabel: 'Construire la surface',
        reasonLabel: this.priorityLabel(entry.priority),
        reasonTags,
        summarySentence: this.buildNowSummarySentence(entry, 'Construire la surface', reasonTags),
        automationLabel: automation.label,
        automationDetail: automation.detail,
        detail: entry.observedGap || entry.need,
        nextMove: entry.nextMove,
        readinessLabel: this.readinessLabel(entry),
        score,
        tone: 'build',
      };
    }

    if (entry.managementBucket === 'covered') {
      return null;
    }

    return {
      entryId: entry.id,
      domain: entry.domain,
      actionLabel: 'Produire la preuve',
      reasonLabel: this.priorityLabel(entry.priority),
      reasonTags,
      summarySentence: this.buildNowSummarySentence(entry, 'Produire la preuve', reasonTags),
      automationLabel: automation.label,
      automationDetail: automation.detail,
      detail: entry.observedGap || entry.need,
      nextMove: entry.nextMove,
      readinessLabel: this.readinessLabel(entry),
      score,
      tone: 'proof',
    };
  }

  private buildNowAutomation(
    entry: AdminQualityMatrixEntry,
    refreshRequired: boolean,
  ): { readonly label: string; readonly detail: string } {
    if (entry.managementBucket === 'scope-limit') {
      return {
        label: 'Bloque scope',
        detail: 'Le perimetre doit etre arbitre avant execution.',
      };
    }

    if (refreshRequired) {
      return {
        label: 'Decision humaine',
        detail: 'Le signal recent doit etre relu avant promotion.',
      };
    }

    if (entry.needsProductWorkFirst || entry.managementBucket === 'product-gap') {
      return {
        label: 'Decision humaine',
        detail: 'La surface produit doit etre tranchee avant delegation.',
      };
    }

    return {
      label: 'Automatisable',
      detail: 'Le prompt et les preuves attendues peuvent etre delegues.',
    };
  }

  private buildNowSummarySentence(
    entry: AdminQualityMatrixEntry,
    actionLabel: string,
    reasonTags: readonly string[],
  ): string {
    const reasons = reasonTags.length ? reasonTags.join(', ') : this.readinessLabel(entry);
    return `La matrice recommande de ${actionLabel.toLowerCase()} car ${reasons.toLowerCase()} ressortent sur ce domaine.`;
  }

  private compareEntries(left: AdminQualityMatrixEntry, right: AdminQualityMatrixEntry): number {
    return (
      Number(this.entryNeedsMatrixRefresh(right)) - Number(this.entryNeedsMatrixRefresh(left)) ||
      this.priorityRank(right.priority) - this.priorityRank(left.priority) ||
      this.statusRank(left.e2eStatus) - this.statusRank(right.e2eStatus) ||
      left.domain.localeCompare(right.domain, 'fr-CA') ||
      left.need.localeCompare(right.need, 'fr-CA')
    );
  }

  entryNeedsMatrixRefresh(entry: AdminQualityMatrixEntry): boolean {
    const reviewedAtDeadline = Date.parse(`${entry.reviewedAt}T23:59:59.999Z`);
    if (Number.isNaN(reviewedAtDeadline)) {
      return true;
    }

    const repoSignalTimestamp = entry.repoSignalAt ? Date.parse(entry.repoSignalAt) : Number.NaN;
    if (Number.isFinite(repoSignalTimestamp) && repoSignalTimestamp > reviewedAtDeadline) {
      return true;
    }

    const latestCompletedDecision = this.latestCompletedMissionDecisionByEntryId().get(entry.id);
    if (!latestCompletedDecision) {
      return false;
    }

    const decisionTimestamp = this.missionDecisionUpdatedAt(latestCompletedDecision);
    if (decisionTimestamp == null) {
      return false;
    }

    return decisionTimestamp > reviewedAtDeadline;
  }

  private priorityRank(priority: AdminQualityMatrixPriority): number {
    switch (priority) {
      case 'haute':
        return 3;
      case 'moyenne':
        return 2;
      default:
        return 1;
    }
  }

  private statusRank(status: AdminQualityMatrixStatus): number {
    switch (status) {
      case 'non':
        return 0;
      case 'partiel':
        return 1;
      case 'hors MVP':
        return 2;
      default:
        return 3;
    }
  }

  private updateMissionStatus(
    recommendation: AdminQualityMissionRecommendation,
    status: AdminQualityMissionStatus,
    message: string,
  ): void {
    this.missionDecisions.set({
      ...this.missionDecisions(),
      [recommendation.id]: status,
    });
    this.upsertMissionDecisionRecord(
      this.buildMissionDecisionRecord(recommendation, status, message),
    );
    this.persistMissionDecisions();
    this.selectedMissionId.set(
      this.resolveMissionSelectionAfterStatusChange(recommendation.id, status),
    );
    this.saveMissionDecisionToServer(recommendation, status, message);
    this.notifications.success(message, { source: 'admin-quality' });
  }

  private resolveMissionSelectionAfterStatusChange(
    recommendationId: string,
    status: AdminQualityMissionStatus,
  ): string {
    if (status !== 'done') {
      return recommendationId;
    }

    const recommendations = this.missionControl()?.recommendations ?? [];
    if (!recommendations.length) {
      return recommendationId;
    }

    const currentIndex = recommendations.findIndex(
      (recommendation) => recommendation.id === recommendationId,
    );
    if (currentIndex === -1) {
      return recommendationId;
    }

    const nextOpenRecommendation = recommendations
      .slice(currentIndex + 1)
      .find((recommendation) => recommendation.status !== 'done');
    if (nextOpenRecommendation) {
      return nextOpenRecommendation.id;
    }

    const previousOpenRecommendation = recommendations
      .slice(0, currentIndex)
      .find((recommendation) => recommendation.status !== 'done');
    return previousOpenRecommendation?.id ?? recommendationId;
  }

  private loadAiDispatchReadiness(silent: boolean): void {
    if (silent && this.aiOpsSecurity()) {
      this.aiOpsSecurityRefreshing.set(true);
    } else {
      this.aiOpsSecurityRefreshing.set(false);
      this.aiOpsSecurityStatus.set('loading');
      this.aiOpsProofStatus.set('loading');
    }

    forkJoin({
      security: this.opsService.getSecurity().pipe(catchError(() => of(null))),
      proofs: this.opsService.getAiProofs().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ security, proofs }) => {
          if (security) {
            this.aiOpsSecurity.set(security);
            this.aiOpsSecurityStatus.set('ready');
            this.aiOpsSecurityDegraded.set(false);
            this.aiOpsLastSuccessfulRefreshAt.set(Date.now());
          } else if (this.aiOpsSecurity()) {
            this.aiOpsSecurityDegraded.set(true);
            this.aiOpsSecurityStatus.set('ready');
          } else {
            this.aiOpsSecurity.set(null);
            this.aiOpsSecurityStatus.set('unavailable');
          }

          if (proofs) {
            this.aiOpsProofs.set(proofs);
            this.aiOpsProofStatus.set('ready');
            this.syncSignalGuidanceTrackingFromProofs();
          } else if (!this.aiOpsProofs()) {
            this.aiOpsProofStatus.set('unavailable');
          }

          this.aiOpsSecurityRefreshing.set(false);
        },
        error: () => {
          this.aiOpsSecurityRefreshing.set(false);
          this.aiOpsSecurity.set(null);
          this.aiOpsSecurityStatus.set('unavailable');
          this.aiOpsProofStatus.set('unavailable');
        },
      });
  }

  private aiOpsRefreshCountdownSeconds(): number {
    const lastRefreshAt = this.aiOpsLastSuccessfulRefreshAt();
    if (lastRefreshAt == null) {
      return 0;
    }

    const elapsedMs = this.aiOpsLiveNow() - lastRefreshAt;
    const remainingMs = Math.max(0, ADMIN_QUALITY_AI_OPS_REFRESH_INTERVAL_MS - elapsedMs);
    return Math.ceil(remainingMs / 1000);
  }

  private formatAiTelemetryRelative(timestampMs: number): string {
    const deltaMs = Math.max(0, this.aiOpsLiveNow() - timestampMs);
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

  private dispatchSelectedMission(
    recommendation: AdminQualityMissionRecommendation,
    successMessage: string,
  ): void {
    if (!this.selectedAiDispatchReady()) {
      this.notifications.error(this.selectedAiDispatchBlockedMessage(), {
        source: 'admin-quality',
      });
      return;
    }

    if (!this.confirmAiDispatch(recommendation)) {
      return;
    }

    this.aiDispatchingMissionId.set(recommendation.id);

    this.opsService
      .dispatchCodexWorkflow({
        provider: this.selectedAiProvider(),
        task: recommendation.operatorPrompt,
        scope: this.resolveCodexScope(recommendation.targetFiles),
        baseBranch: 'main',
        draftPr: true,
        model: this.selectedAiProviderModel(),
        effort: null,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.aiDispatchingMissionId() === recommendation.id) {
            this.aiDispatchingMissionId.set(null);
          }
        }),
      )
      .subscribe({
        next: (result) => {
          this.updateMissionStatus(recommendation, 'in-progress', successMessage);
          this.notifications.info(
            `${this.selectedAiProviderLabel()} queued via ${result.workflow} on ${result.ref}.`,
            { source: 'admin-quality' },
          );
          this.loadAiDispatchReadiness(true);
        },
        error: (error: unknown) => {
          this.notifications.error(this.resolveOpsDispatchError(error), {
            source: 'admin-quality',
          });
        },
      });
  }

  private confirmAiDispatch(recommendation: AdminQualityMissionRecommendation): boolean {
    if (!this.isBrowser || typeof window === 'undefined' || typeof window.confirm !== 'function') {
      return true;
    }

    return window.confirm(
      [
        `Lancer ${this.selectedAiProviderLabel()} depuis la console de pilotage ?`,
        '',
        recommendation.title,
        `Workflow: ${this.selectedAiDispatchWorkflow()}`,
      ].join('\n'),
    );
  }

  private selectedAiDispatchBlockedMessage(): string {
    const provider = this.selectedAiProviderLabel();
    const status = this.selectedAiDispatchStatusLabel();
    const module = this.selectedAiOpsModule();

    if (this.aiOpsSecurityStatus() === 'unavailable') {
      return `Impossible de verifier l'etat Ops avant de lancer ${provider}. Ouvrez Ops et retentez apres verification.`;
    }

    if (!module) {
      return `${provider} n'est pas pret pour le dispatch: ${status}. Aucun module Ops n'est detecte pour ce provider.`;
    }

    if (!module.dispatchEnabled) {
      return `${provider} est bloque: activez le flag de dispatch dans strapi/.env (${module.provider === 'codex' ? 'OPS_CODEX_DISPATCH_ENABLED=true' : `OPS_AI_${module.provider.toUpperCase()}_DISPATCH_ENABLED=true`}) puis redemarrez Strapi.`;
    }

    if (module.keyInserted && module.state === 'offline') {
      return `${provider} voit seulement une cle locale. Ajoutez aussi le secret GitHub ${module.secretName ?? 'requis'} et un token GitHub de dispatch dans strapi/.env avant de relancer ${module.workflow}.`;
    }

    if (!module.keyInserted) {
      return `${provider} n'est pas pret pour le dispatch: ${status}. Ajoutez ${module.secretName ?? 'la cle provider'} puis reessayez.`;
    }

    return `${provider} n'est pas pret pour le dispatch: ${status}. Verifiez la cle et le flag dans Ops.`;
  }

  private resolveOpsDispatchError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const payload = error.error;
      if (payload && typeof payload === 'object') {
        const nestedMessage = (payload as { error?: { message?: unknown }; message?: unknown })
          .error?.message;
        if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
          return nestedMessage;
        }
        const message = (payload as { message?: unknown }).message;
        if (typeof message === 'string' && message.trim()) {
          return message;
        }
      }
      if (typeof payload === 'string' && payload.trim()) {
        return payload;
      }
      if (error.message.trim()) {
        return error.message;
      }
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return `${this.selectedAiProviderLabel()} dispatch failed. Review Ops before retrying.`;
  }

  private buildWorkspaceSignalContext(
    selection: AdminQualityCoverageSignalSelection,
  ): AdminQualityWorkspaceSignalContext {
    const entry = selection.entry;
    const observedGap = entry.observedGap || entry.need;
    const nextMove = entry.nextMove || 'Clarifier la prochaine preuve attendue avant delegation.';

    switch (selection.signalId) {
      case 'summary':
        return {
          signalId: selection.signalId,
          shortLabel: selection.shortLabel,
          label: selection.label,
          headline: `Synthese ${this.statusLabel(entry.summaryStatus).toLowerCase()} sur ${entry.domain}.`,
          detail: observedGap,
          observedGap,
          nextMove,
          recommendedAction: nextMove,
          recommendations: this.buildSignalRecommendations(
            selection.signalId,
            entry,
            observedGap,
            nextMove,
          ),
          attention: selection.attention,
        };
      case 'business':
        return {
          signalId: selection.signalId,
          shortLabel: selection.shortLabel,
          label: selection.label,
          headline: `Couverture metier ${this.statusLabel(entry.businessStatus).toLowerCase()}.`,
          detail: `Besoin suivi: ${entry.need}`,
          observedGap,
          nextMove,
          recommendedAction:
            'Verifier que la delegation preserve bien le parcours metier cible et sa valeur produit.',
          recommendations: this.buildSignalRecommendations(
            selection.signalId,
            entry,
            observedGap,
            nextMove,
          ),
          attention: selection.attention,
        };
      case 'implementation':
        return {
          signalId: selection.signalId,
          shortLabel: selection.shortLabel,
          label: selection.label,
          headline: `Implementation ${this.statusLabel(entry.implementationStatus).toLowerCase()}.`,
          detail: `Le correctif doit cibler la surface code et les hooks de preuve relies a ${entry.domain}.`,
          observedGap,
          nextMove,
          recommendedAction:
            'Concentrer Codex sur les fichiers du plan et une validation etroite de la surface touchee.',
          recommendations: this.buildSignalRecommendations(
            selection.signalId,
            entry,
            observedGap,
            nextMove,
          ),
          attention: selection.attention,
        };
      case 'e2e':
        return {
          signalId: selection.signalId,
          shortLabel: selection.shortLabel,
          label: selection.label,
          headline: `Preuve E2E ${this.statusLabel(entry.e2eStatus).toLowerCase()}.`,
          detail: entry.evidence.length
            ? `Preuves actuelles: ${entry.evidence.join(', ')}`
            : 'Aucune preuve E2E n est encore rattachee a cette entree.',
          observedGap,
          nextMove,
          recommendedAction:
            'Demander une preuve executable ou une regression ciblee avant arbitrage final.',
          recommendations: this.buildSignalRecommendations(
            selection.signalId,
            entry,
            observedGap,
            nextMove,
          ),
          attention: selection.attention,
        };
      case 'readiness':
        return {
          signalId: selection.signalId,
          shortLabel: selection.shortLabel,
          label: selection.label,
          headline: this.entryNeedsMatrixRefresh(entry)
            ? 'Refresh matrice requis avant delegation.'
            : `Gestion actuelle: ${this.bucketLabel(entry.managementBucket)}.`,
          detail: this.entryNeedsMatrixRefresh(entry)
            ? `La derniere revue (${entry.reviewedAt}) ne couvre plus l etat courant de cette surface.`
            : `Bucket courant: ${this.bucketLabel(entry.managementBucket)}.`,
          observedGap,
          nextMove,
          recommendedAction: this.entryNeedsMatrixRefresh(entry)
            ? 'Rafraichir la preuve ou la decision QA puis deleguer sur une base stabilisee.'
            : 'Confirmer que la delegation correspond bien au bucket de gestion avant lancement.',
          recommendations: this.buildSignalRecommendations(
            selection.signalId,
            entry,
            observedGap,
            nextMove,
          ),
          attention: selection.attention,
        };
      case 'priority':
      default:
        return {
          signalId: selection.signalId,
          shortLabel: selection.shortLabel,
          label: selection.label,
          headline: `Priorite ${this.priorityLabel(entry.priority).toLowerCase()}.`,
          detail: `Action suivante: ${entry.nextMove}`,
          observedGap,
          nextMove,
          recommendedAction:
            'Utiliser ce signal pour confirmer l ordre de delegation et le niveau de preuve attendu.',
          recommendations: this.buildSignalRecommendations(
            selection.signalId,
            entry,
            observedGap,
            nextMove,
          ),
          attention: selection.attention,
        };
    }
  }

  private buildSignalRecommendations(
    signalId: AdminQualityCoverageSignalId,
    entry: AdminQualityMatrixEntry,
    observedGap: string,
    nextMove: string,
  ): readonly string[] {
    const scopeGuard = entry.needsProductWorkFirst
      ? 'Tu devrais laisser la matrice en etat partiel ou voisin tant que le scope produit n annonce pas officiellement cette extension.'
      : 'Tu devrais laisser la matrice a son niveau courant tant qu une preuve executable ou une decision plus recente n existe pas.';

    switch (signalId) {
      case 'summary':
        return [
          scopeGuard,
          `Tu devrais traiter ce point comme un ecart encadre: ${observedGap}.`,
          `Tu devrais utiliser ce prochain mouvement comme condition de sortie: ${nextMove}.`,
        ];
      case 'business':
        return [
          'Tu devrais verifier que le besoin metier cible reste bien dans le perimetre officiellement attendu.',
          'Tu devrais eviter de demander plus de preuve si les branches riches ne sont pas encore exigees par le produit.',
          `Tu devrais garder comme cap operateur: ${nextMove}.`,
        ];
      case 'implementation':
        return [
          'Tu devrais limiter la delegation aux fichiers et hooks de preuve relies a la surface touchee.',
          'Tu ne devrais pas promouvoir l implementation sans validation etroite du slice modifie.',
          `Tu devrais resorber d abord l ecart observe: ${observedGap}.`,
        ];
      case 'e2e':
        return [
          'Tu devrais demander une preuve executable avant de promouvoir la couverture E2E.',
          'Tu devrais laisser la matrice en partiel si seules des branches secondaires restent sans preuve forte.',
          `Tu devrais aligner la prochaine preuve attendue sur: ${nextMove}.`,
        ];
      case 'readiness':
        return [
          this.entryNeedsMatrixRefresh(entry)
            ? 'Tu devrais rafraichir la preuve ou la decision avant de lancer une nouvelle delegation.'
            : 'Tu devrais verifier que le bucket de gestion correspond toujours a la realite du domaine.',
          'Tu devrais eviter de recalculer ou deleguer sur une base stale.',
          `Tu devrais garder la prochaine action visible: ${nextMove}.`,
        ];
      case 'priority':
      default:
        return [
          'Tu devrais utiliser cette priorite pour ordonner le traitement, pas pour sur-promouvoir la couverture.',
          scopeGuard,
          `Tu devrais garder l action suivante comme reference operateur: ${nextMove}.`,
        ];
    }
  }

  private buildSignalDispatchTask(
    entry: AdminQualityMatrixEntry,
    plan: AdminQualityDelegationPlan,
    signalContext: AdminQualityWorkspaceSignalContext,
  ): string {
    return [
      plan.codexPrompt,
      '',
      `Signal focus: ${signalContext.shortLabel} - ${signalContext.label}`,
      `Headline: ${signalContext.headline}`,
      `Detail: ${signalContext.detail}`,
      `Observed gap: ${signalContext.observedGap}`,
      `Next move: ${signalContext.nextMove}`,
      `Recommended action: ${signalContext.recommendedAction}`,
      `Recommendations:`,
      ...signalContext.recommendations.map((item, index) => `${index + 1}. ${item}`),
    ].join('\n');
  }

  private persistSignalRecommendationTrace(
    entry: AdminQualityMatrixEntry,
    plan: AdminQualityDelegationPlan,
    signalContext: AdminQualityWorkspaceSignalContext,
    dispatch: AdminOpsCodexDispatchResponse,
  ): void {
    const task =
      this.selectedSignalDraftPrompt().trim() ||
      this.buildSignalDispatchTask(entry, plan, signalContext);
    const recommendationId = `${entry.id}::signal-guidance::${signalContext.signalId}`;
    const message = `Recommendations validated for ${signalContext.label}; dispatch queued via ${dispatch.workflow} on ${dispatch.ref}.`;
    const now = new Date().toISOString();

    const record: AdminQualityMissionDecisionRecord = {
      recommendationId,
      entryId: entry.id,
      kind: 'governance',
      status: 'approved',
      title: `Signal guidance validated - ${entry.domain}`,
      message,
      operatorPrompt: task,
      metadata: {
        traceType: 'signal-guidance',
        signalId: signalContext.signalId,
        signalLabel: signalContext.label,
        shortLabel: signalContext.shortLabel,
        observedGap: signalContext.observedGap,
        nextMove: signalContext.nextMove,
        recommendedAction: signalContext.recommendedAction,
        recommendations: signalContext.recommendations,
        provider: dispatch.selectedProvider,
        workflow: dispatch.workflow,
        ref: dispatch.ref,
        owner: dispatch.owner,
        repo: dispatch.repo,
        baseBranch: dispatch.request.baseBranch,
        dispatchRequestedAt: dispatch.requestedAt,
        targetFiles: plan.targetFiles,
        validationCommands: plan.commands,
      },
      decidedByUserId: null,
      createdAt: now,
      updatedAt: now,
    };

    this.upsertMissionDecisionRecord(record);
    this.missionDecisionSyncStatus.set('syncing');
    this.missionDecisionSyncMessage.set('Synchronisation de la validation des recommandations...');

    this.missionDecisionService
      .saveDecision({
        recommendationId,
        entryId: entry.id,
        kind: 'governance',
        status: 'approved',
        title: record.title ?? '',
        message,
        operatorPrompt: task,
        metadata: record.metadata,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => {
          this.upsertMissionDecisionRecord(saved);
          this.missionDecisionSyncStatus.set('server');
          this.missionDecisionSyncMessage.set(
            'Validation des recommandations synchronisee cote serveur.',
          );
          this.loadMatrixSnapshot(false);
        },
        error: () => {
          this.missionDecisionSyncStatus.set('unavailable');
          this.missionDecisionSyncMessage.set(
            'Validation des recommandations conservee localement; synchronisation serveur impossible.',
          );
          this.notifications.info(
            'Recommandations validees gardees localement; serveur mission indisponible.',
            { source: 'admin-quality' },
          );
        },
      });
  }

  private syncSignalGuidanceTrackingFromProofs(): void {
    const proofs = this.aiOpsProofs();
    if (!proofs?.providers.length) {
      return;
    }

    for (const record of this.missionDecisionRecords()) {
      const metadata = record.metadata ?? {};
      if (metadata['traceType'] !== 'signal-guidance') {
        continue;
      }

      if (this.syncingSignalGuidanceTrackingIds.has(record.recommendationId)) {
        continue;
      }

      const provider = isAdminAiProvider(metadata['provider']) ? metadata['provider'] : null;
      const workflow =
        typeof metadata['workflow'] === 'string' && metadata['workflow'].trim()
          ? metadata['workflow']
          : null;
      if (!provider || !workflow) {
        continue;
      }

      const proof = proofs.providers.find(
        (candidate) => candidate.provider === provider && candidate.workflow === workflow,
      );
      if (!proof) {
        continue;
      }

      const nextMetadata = this.buildSignalGuidanceProofTrackingMetadata(record, proof);
      if (!nextMetadata) {
        continue;
      }

      this.syncingSignalGuidanceTrackingIds.add(record.recommendationId);
      this.missionDecisionService
        .saveDecision({
          recommendationId: record.recommendationId,
          entryId: record.entryId,
          kind: record.kind,
          status: record.status,
          title: record.title ?? '',
          message: record.message ?? '',
          operatorPrompt: record.operatorPrompt ?? '',
          metadata: nextMetadata,
        })
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => this.syncingSignalGuidanceTrackingIds.delete(record.recommendationId)),
        )
        .subscribe({
          next: (saved) => {
            this.upsertMissionDecisionRecord(saved);
            this.persistMissionDecisions();
            this.loadMatrixSnapshot(false);
          },
          error: () => undefined,
        });
    }
  }

  private buildSignalGuidanceProofTrackingMetadata(
    record: AdminQualityMissionDecisionRecord,
    proof: AdminQualityAiProofModule,
  ): Record<string, unknown> | null {
    const metadata = record.metadata ?? {};
    const requestedAt =
      this.signalGuidanceMetadataString(metadata, 'dispatchRequestedAt') ?? record.updatedAt;
    const requestedTimestamp = this.parseTimestamp(requestedAt);
    const proofRunUpdatedTimestamp = this.parseTimestamp(proof.run?.updatedAt ?? null);
    const proofMergedTimestamp = this.parseTimestamp(proof.pullRequest?.mergedAt ?? null);

    if (
      requestedTimestamp != null &&
      proofRunUpdatedTimestamp != null &&
      proofRunUpdatedTimestamp <= requestedTimestamp &&
      proofMergedTimestamp != null &&
      proofMergedTimestamp <= requestedTimestamp
    ) {
      return null;
    }

    const currentProofBranch = this.signalGuidanceMetadataString(metadata, 'proofBranch');
    const currentPullRequestNumber = this.signalGuidanceMetadataNumber(
      metadata,
      'proofPullRequestNumber',
    );
    const nextProofBranch = proof.pullRequest?.branch ?? proof.run?.branch ?? currentProofBranch;
    const nextPullRequestNumber = proof.pullRequest?.number ?? currentPullRequestNumber;

    if (currentProofBranch && nextProofBranch && currentProofBranch !== nextProofBranch) {
      return null;
    }

    if (
      currentPullRequestNumber != null &&
      nextPullRequestNumber != null &&
      currentPullRequestNumber !== nextPullRequestNumber
    ) {
      return null;
    }

    if (
      requestedTimestamp != null &&
      proofRunUpdatedTimestamp != null &&
      proofRunUpdatedTimestamp <= requestedTimestamp &&
      proofMergedTimestamp == null
    ) {
      return null;
    }

    const nextMetadata: Record<string, unknown> = {
      ...metadata,
      dispatchRequestedAt: requestedAt,
      proofProvider: proof.provider,
      proofWorkflow: proof.workflow,
      proofBranch: nextProofBranch,
      proofRunId: proof.run?.id ?? null,
      proofRunNumber: proof.run?.number ?? null,
      proofRunBranch: proof.run?.branch ?? null,
      proofRunStatus: proof.run?.status ?? null,
      proofRunConclusion: proof.run?.conclusion ?? null,
      proofRunCreatedAt: proof.run?.createdAt ?? null,
      proofRunUpdatedAt: proof.run?.updatedAt ?? null,
      proofPullRequestNumber: nextPullRequestNumber,
      proofPullRequestUrl: proof.pullRequest?.url ?? null,
      proofPullRequestState: proof.pullRequest?.state ?? null,
      proofPullRequestBranch: proof.pullRequest?.branch ?? nextProofBranch,
      proofPullRequestMerged: Boolean(proof.pullRequest?.merged),
      proofPullRequestMergedAt: proof.pullRequest?.mergedAt ?? null,
    };

    return this.signalGuidanceProofTrackingSignature(metadata) ===
      this.signalGuidanceProofTrackingSignature(nextMetadata)
      ? null
      : nextMetadata;
  }

  private signalGuidanceProofTrackingSignature(metadata: Record<string, unknown>): string {
    return JSON.stringify({
      dispatchRequestedAt: this.signalGuidanceMetadataString(metadata, 'dispatchRequestedAt'),
      proofProvider: this.signalGuidanceMetadataString(metadata, 'proofProvider'),
      proofWorkflow: this.signalGuidanceMetadataString(metadata, 'proofWorkflow'),
      proofBranch: this.signalGuidanceMetadataString(metadata, 'proofBranch'),
      proofRunId: this.signalGuidanceMetadataNumber(metadata, 'proofRunId'),
      proofRunNumber: this.signalGuidanceMetadataNumber(metadata, 'proofRunNumber'),
      proofRunBranch: this.signalGuidanceMetadataString(metadata, 'proofRunBranch'),
      proofRunStatus: this.signalGuidanceMetadataString(metadata, 'proofRunStatus'),
      proofRunConclusion: this.signalGuidanceMetadataString(metadata, 'proofRunConclusion'),
      proofRunCreatedAt: this.signalGuidanceMetadataString(metadata, 'proofRunCreatedAt'),
      proofRunUpdatedAt: this.signalGuidanceMetadataString(metadata, 'proofRunUpdatedAt'),
      proofPullRequestNumber: this.signalGuidanceMetadataNumber(metadata, 'proofPullRequestNumber'),
      proofPullRequestUrl: this.signalGuidanceMetadataString(metadata, 'proofPullRequestUrl'),
      proofPullRequestState: this.signalGuidanceMetadataString(metadata, 'proofPullRequestState'),
      proofPullRequestBranch: this.signalGuidanceMetadataString(metadata, 'proofPullRequestBranch'),
      proofPullRequestMerged: this.signalGuidanceMetadataBoolean(
        metadata,
        'proofPullRequestMerged',
      ),
      proofPullRequestMergedAt: this.signalGuidanceMetadataString(
        metadata,
        'proofPullRequestMergedAt',
      ),
    });
  }

  private signalGuidanceMetadataString(
    metadata: Record<string, unknown>,
    key: string,
  ): string | null {
    const value = metadata[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private signalGuidanceMetadataNumber(
    metadata: Record<string, unknown>,
    key: string,
  ): number | null {
    const value = metadata[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  }

  private signalGuidanceMetadataBoolean(
    metadata: Record<string, unknown>,
    key: string,
  ): boolean | null {
    const value = metadata[key];
    return typeof value === 'boolean' ? value : null;
  }

  private parseTimestamp(value: string | null | undefined): number | null {
    if (!value) {
      return null;
    }

    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private parseRecommendationDraft(value: string): readonly string[] {
    return value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private recordSignalDelegationTrace(
    entryId: string,
    signalContext: AdminQualityWorkspaceSignalContext,
  ): void {
    const trace: AdminQualityCoverageSignalTrace = {
      signalId: signalContext.signalId,
      shortLabel: signalContext.shortLabel,
      label: signalContext.label,
      provider: this.selectedAiProviderLabel(),
      requestedAt: new Date().toISOString(),
    };

    this.signalDelegationTraces.update((current) => ({
      ...current,
      [entryId]: trace,
    }));
  }

  private isOptimisticSignalConfirmationPending(
    serverState: AdminQualityMatrixSignalDispatchState | null,
    trace: AdminQualityCoverageSignalTrace | null,
  ): boolean {
    if (!trace) {
      return false;
    }

    if (!serverState) {
      return true;
    }

    if (serverState.pending) {
      return true;
    }

    const localRequestedAt = Date.parse(trace.requestedAt);
    const serverRequestedAt = serverState.requestedAt
      ? Date.parse(serverState.requestedAt)
      : Number.NaN;
    if (
      Number.isFinite(localRequestedAt) &&
      (!Number.isFinite(serverRequestedAt) || localRequestedAt > serverRequestedAt)
    ) {
      return true;
    }

    return false;
  }

  private aiProofStateLabel(state: AdminQualityAiProofModule['state']): string {
    switch (state) {
      case 'completed':
        return 'Proof package ready';
      case 'in-progress':
        return 'Proof pipeline active';
      case 'queued':
        return 'Proof pipeline queued';
      case 'failed':
        return 'Proof pipeline failed';
      default:
        return 'Proof feed unavailable';
    }
  }

  private loadMissionDecisionsFromServer(): void {
    this.missionDecisionSyncStatus.set('syncing');
    this.missionDecisionSyncMessage.set('Synchronisation des decisions de mission...');

    this.missionDecisionService
      .loadDecisions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          const next: Record<string, AdminQualityMissionStatus> = {};
          for (const decision of snapshot.decisions) {
            if (decision.recommendationId && this.isMissionStatus(decision.status)) {
              next[decision.recommendationId] = decision.status;
            }
          }

          this.missionDecisions.set(next);
          this.missionDecisionRecords.set(snapshot.decisions);
          this.persistMissionDecisions();
          this.syncSignalGuidanceTrackingFromProofs();
          this.missionDecisionSyncStatus.set('server');
          this.missionDecisionSyncMessage.set(
            `${snapshot.decisions.length} decision(s) de mission synchronisee(s).`,
          );
        },
        error: () => {
          this.missionDecisionSyncStatus.set('unavailable');
          this.missionDecisionSyncMessage.set(
            'Serveur mission indisponible; les decisions restent conservees localement.',
          );
        },
      });
  }

  private saveMissionDecisionToServer(
    recommendation: AdminQualityMissionRecommendation,
    status: AdminQualityMissionStatus,
    message: string,
  ): void {
    this.missionDecisionSyncStatus.set('syncing');
    this.missionDecisionSyncMessage.set('Synchronisation de la decision de mission...');

    this.missionDecisionService
      .saveDecision({
        recommendationId: recommendation.id,
        entryId: this.recommendationEntryId(recommendation),
        kind: recommendation.kind,
        status,
        title: recommendation.title,
        message,
        operatorPrompt: recommendation.operatorPrompt,
        metadata: {
          confidence: recommendation.confidence,
          impact: recommendation.impact,
          suggestedOwner: recommendation.suggestedOwner,
          targetFiles: recommendation.targetFiles,
          validationCommands: recommendation.validationCommands,
        },
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (record) => {
          this.upsertMissionDecisionRecord(record);
          this.missionDecisionSyncStatus.set('server');
          this.missionDecisionSyncMessage.set('Decision de mission synchronisee cote serveur.');
        },
        error: () => {
          this.missionDecisionSyncStatus.set('unavailable');
          this.missionDecisionSyncMessage.set(
            'Decision sauvegardee localement; synchronisation serveur impossible.',
          );
          this.notifications.info('Decision gardee localement; serveur mission indisponible.', {
            source: 'admin-quality',
          });
        },
      });
  }

  private deleteMissionDecisionFromServer(recommendation: AdminQualityMissionRecommendation): void {
    this.missionDecisionSyncStatus.set('syncing');
    this.missionDecisionSyncMessage.set('Synchronisation de la reinitialisation de mission...');

    this.missionDecisionService
      .deleteDecision(recommendation.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.removeMissionDecisionRecord(recommendation.id);
          this.missionDecisionSyncStatus.set('server');
          this.missionDecisionSyncMessage.set('Mission reinitialisee cote serveur.');
        },
        error: () => {
          this.missionDecisionSyncStatus.set('unavailable');
          this.missionDecisionSyncMessage.set(
            'Mission reinitialisee localement; synchronisation serveur impossible.',
          );
          this.notifications.info(
            'Mission reinitialisee localement; serveur mission indisponible.',
            {
              source: 'admin-quality',
            },
          );
        },
      });
  }

  private recommendationEntryId(recommendation: AdminQualityMissionRecommendation): string {
    return recommendation.id.split('::')[0] ?? recommendation.id;
  }

  private buildMissionDecisionRecord(
    recommendation: AdminQualityMissionRecommendation,
    status: AdminQualityMissionStatus,
    message: string,
  ): AdminQualityMissionDecisionRecord {
    const now = new Date().toISOString();

    return {
      recommendationId: recommendation.id,
      entryId: this.recommendationEntryId(recommendation),
      kind: recommendation.kind,
      status,
      title: recommendation.title,
      message,
      operatorPrompt: recommendation.operatorPrompt,
      metadata: {
        confidence: recommendation.confidence,
        impact: recommendation.impact,
        suggestedOwner: recommendation.suggestedOwner,
        targetFiles: recommendation.targetFiles,
        validationCommands: recommendation.validationCommands,
      },
      decidedByUserId: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  private upsertMissionDecisionRecord(record: AdminQualityMissionDecisionRecord): void {
    this.missionDecisionRecords.update((records) => {
      const next = records.filter(
        (existingRecord) => existingRecord.recommendationId !== record.recommendationId,
      );
      return [record, ...next];
    });
  }

  private removeMissionDecisionRecord(recommendationId: string): void {
    this.missionDecisionRecords.update((records) =>
      records.filter((record) => record.recommendationId !== recommendationId),
    );
  }

  private missionDecisionUpdatedAt(record: AdminQualityMissionDecisionRecord): number | null {
    const timestamp = Date.parse(record.updatedAt ?? record.createdAt ?? '');
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  private async copyText(value: string, successMessage: string): Promise<void> {
    if (!this.isBrowser) {
      return;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        this.legacyCopy(value);
      }
      this.notifications.success(successMessage, { source: 'admin-quality' });
    } catch {
      try {
        this.legacyCopy(value);
        this.notifications.success(successMessage, { source: 'admin-quality' });
      } catch {
        this.notifications.error("Impossible de copier l'action de delegation.", {
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
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);

    if (!ok) {
      throw new Error('copy_failed');
    }
  }

  private restoreMissionDecisions(): void {
    if (!this.isBrowser || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const rawValue = localStorage.getItem(MISSION_CONTROL_STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      const next: Record<string, AdminQualityMissionStatus> = {};

      for (const [key, value] of Object.entries(parsed)) {
        if (this.isMissionStatus(value)) {
          next[key] = value;
        }
      }

      this.missionDecisions.set(next);
    } catch {
      localStorage.removeItem(MISSION_CONTROL_STORAGE_KEY);
    }
  }

  private persistMissionDecisions(): void {
    if (!this.isBrowser || typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(MISSION_CONTROL_STORAGE_KEY, JSON.stringify(this.missionDecisions()));
    } catch {
      this.notifications.error('Impossible de persister le pilotage local des missions.', {
        source: 'admin-quality',
      });
    }
  }

  private isMissionStatus(value: unknown): value is AdminQualityMissionStatus {
    return (
      value === 'proposed' ||
      value === 'approved' ||
      value === 'in-progress' ||
      value === 'proof-returned' ||
      value === 'done' ||
      value === 'deferred' ||
      value === 'rejected' ||
      value === 'blocked'
    );
  }

  private syncVisibleState(): void {
    if (!this.viewStateReady() || !this.snapshot()) {
      return;
    }

    const selectedDomain = this.selectedDomain();
    if (
      selectedDomain !== 'all' &&
      !this.entries().some((entry) => entry.domain === selectedDomain)
    ) {
      this.selectedDomain.set('all');
      return;
    }

    const entryId = this.selectedEntry()?.id ?? null;
    if (entryId !== this.selectedEntryId()) {
      this.selectedEntryId.set(entryId);
      this.selectedActionId.set(null);
      this.selectedMissionId.set(null);
      this.selectedSignalContext.set(null);
      this.selectedSignalDraftPrompt.set('');
      return;
    }

    const actionId = this.selectedAction()?.id ?? null;
    if (actionId !== this.selectedActionId()) {
      this.selectedActionId.set(actionId);
      return;
    }

    const missionId = this.selectedMission()?.id ?? null;
    if (missionId !== this.selectedMissionId()) {
      this.selectedMissionId.set(missionId);
    }
  }

  private stopVoiceForContextChange(): void {
    if (this.speaking()) {
      this.stopMissionVoice(false);
    }
  }

  private restoreViewState(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      const rawValue = localStorage.getItem(VIEW_STATE_STORAGE_KEY);
      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as AdminQualityPersistedViewState;

      if (typeof parsed.search === 'string') {
        this.search.set(parsed.search);
      }
      if (typeof parsed.selectedDomain === 'string') {
        this.selectedDomain.set(parsed.selectedDomain || 'all');
      }
      if (this.isPriorityFilterValue(parsed.selectedPriority)) {
        this.selectedPriority.set(parsed.selectedPriority);
      }
      if (this.isStatusFilterValue(parsed.selectedE2EStatus)) {
        this.selectedE2EStatus.set(parsed.selectedE2EStatus);
      }
      if (this.isBucketFilterValue(parsed.selectedBucket)) {
        this.selectedBucket.set(parsed.selectedBucket);
      }
      if (parsed.selectedEntryId === null || typeof parsed.selectedEntryId === 'string') {
        this.selectedEntryId.set(parsed.selectedEntryId);
      }
      if (parsed.selectedActionId === null || typeof parsed.selectedActionId === 'string') {
        this.selectedActionId.set(parsed.selectedActionId);
      }
      if (parsed.selectedMissionId === null || typeof parsed.selectedMissionId === 'string') {
        this.selectedMissionId.set(parsed.selectedMissionId);
      }
      if (isAdminAiProvider(parsed.selectedAiProvider)) {
        this.selectedAiProvider.set(parsed.selectedAiProvider);
      }
      if (typeof parsed.missionHudExpanded === 'boolean') {
        this.missionHudExpanded.set(parsed.missionHudExpanded);
      }
      if (this.isConsoleSurface(parsed.activeConsoleSurface)) {
        this.activeConsoleSurface.set(parsed.activeConsoleSurface);
      }
      if (this.isWorkspaceSurface(parsed.activeWorkspaceSurface)) {
        this.activeWorkspaceSurface.set(parsed.activeWorkspaceSurface);
      } else if (this.isLegacyInspectionSurface(parsed.inspectionSurface)) {
        this.activeWorkspaceSurface.set(parsed.inspectionSurface);
      }
      if (parsed.signalDelegationTraces && typeof parsed.signalDelegationTraces === 'object') {
        this.signalDelegationTraces.set(parsed.signalDelegationTraces);
      }
    } catch {
      localStorage.removeItem(VIEW_STATE_STORAGE_KEY);
    }
  }

  private persistViewState(): void {
    if (!this.viewStateReady() || typeof localStorage === 'undefined' || !this.snapshot()) {
      return;
    }

    const state: AdminQualityPersistedViewState = {
      search: this.search(),
      selectedDomain: this.selectedDomain(),
      selectedPriority: this.selectedPriority(),
      selectedE2EStatus: this.selectedE2EStatus(),
      selectedBucket: this.selectedBucket(),
      selectedEntryId: this.selectedEntryId(),
      selectedActionId: this.selectedActionId(),
      selectedMissionId: this.selectedMissionId(),
      activeConsoleSurface: this.activeConsoleSurface(),
      activeWorkspaceSurface: this.activeWorkspaceSurface(),
      selectedAiProvider: this.selectedAiProvider(),
      missionHudExpanded: this.missionHudExpanded(),
      signalDelegationTraces: this.signalDelegationTraces(),
    };

    try {
      localStorage.setItem(VIEW_STATE_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore local persistence failures to avoid noisy toasts during passive navigation.
    }
  }

  private isPriorityFilterValue(value: unknown): value is FilterValue<AdminQualityMatrixPriority> {
    return value === 'all' || value === 'haute' || value === 'moyenne' || value === 'basse';
  }

  private isStatusFilterValue(value: unknown): value is FilterValue<AdminQualityMatrixStatus> {
    return (
      value === 'all' ||
      value === 'oui' ||
      value === 'partiel' ||
      value === 'non' ||
      value === 'hors MVP'
    );
  }

  private isBucketFilterValue(value: unknown): value is FilterValue<AdminQualityMatrixBucket> {
    return (
      value === 'all' ||
      value === 'covered' ||
      value === 'proof-gap' ||
      value === 'product-gap' ||
      value === 'scope-limit'
    );
  }

  private isWorkspaceSurface(value: unknown): value is AdminQualityWorkspaceSurface {
    return value === 'qaQueue' || value === 'delegation' || value === 'actions';
  }

  private isConsoleSurface(value: unknown): value is AdminQualityConsoleSurface {
    return value === 'context' || value === 'ai' || value === 'queue' || value === 'workspace';
  }

  private isLegacyInspectionSurface(value: unknown): value is AdminQualityLegacyInspectionSurface {
    return value === 'delegation' || value === 'actions';
  }

  private registerMissionHudScrollSpy(): void {
    if (!this.isBrowser || typeof IntersectionObserver === 'undefined') {
      return;
    }

    const sections = this.missionHudSectionOrder
      .map(
        (section) =>
          [section, this.resolveMissionHudSectionElement(section)?.nativeElement] as const,
      )
      .filter((entry): entry is readonly [AdminQualityMissionHudSection, HTMLElement] =>
        Boolean(entry[1]),
      );

    if (!sections.length) {
      return;
    }

    const ratios = new Map<AdminQualityMissionHudSection, number>();
    this.missionHudSectionObserver?.disconnect();
    this.missionHudSectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const section = sections.find(([, element]) => element === entry.target)?.[0];
          if (!section) {
            continue;
          }
          ratios.set(section, entry.isIntersecting ? entry.intersectionRatio : 0);
        }

        const nextSection = this.missionHudSectionOrder.reduce<AdminQualityMissionHudSection>(
          (best, section) => {
            const score = ratios.get(section) ?? 0;
            const bestScore = ratios.get(best) ?? 0;
            return score > bestScore ? section : best;
          },
          this.missionHudActiveSection(),
        );

        this.setMissionHudSection(nextSection, 'section-pulse');
      },
      {
        root: null,
        threshold: [0.2, 0.45, 0.7],
        rootMargin: '-18% 0px -50% 0px',
      },
    );

    for (const [, element] of sections) {
      this.missionHudSectionObserver.observe(element);
    }
  }

  private resolveMissionHudSectionElement(
    section: AdminQualityMissionHudSection,
  ): ElementRef<HTMLElement> | undefined {
    switch (section) {
      case 'mission':
        return undefined;
      case 'workspace':
        return this.workspaceSection;
      default:
        return this.coverageSection;
    }
  }

  private triggerMissionHudSectionPulse(section: AdminQualityMissionHudSection): void {
    this.missionHudPulsingSection.set(section);
    if (this.missionHudSectionPulseTimer) {
      clearTimeout(this.missionHudSectionPulseTimer);
    }
    this.missionHudSectionPulseTimer = setTimeout(() => {
      this.missionHudPulsingSection.set(null);
      this.missionHudSectionPulseTimer = null;
    }, 950);
  }

  private recordMissionControlLock(
    section: AdminQualityMissionHudSection,
    stateLabel: 'Locked' | 'Acquiring',
    reason: AdminQualityMissionRadarLockReason,
  ): void {
    this.focusMissionControlPanel(section);
    const entry: AdminQualityMissionRadarLockHistoryEntry = {
      sequence: ++this.missionControlRadarLockSequence,
      id: section,
      kind: 'lock',
      stateLabel,
      reason,
      detailLabel: `${stateLabel} ${this.missionControlSectionLabel(section)}`,
    };
    this.missionControlRadarLockHistory.update((history) => [entry, ...history].slice(0, 5));
  }

  private missionControlLockReasonLabel(reason: AdminQualityMissionRadarLockReason): string {
    switch (reason) {
      case 'proof-surge':
        return 'Proof surge';
      case 'manual-targeting':
        return 'Manual targeting';
      default:
        return 'Section pulse';
    }
  }

  private missionControlActionLabel(action: AdminQualityMissionControlAction): string {
    switch (action) {
      case 'approve':
        return 'Approve';
      case 'auto-delegate':
        return 'Delegate';
      case 'defer':
        return 'Defer';
      case 'block':
        return 'Block';
      case 'reset':
        return 'Reset';
      case 'return-proof':
        return 'Return proof';
      case 'complete':
        return 'Complete';
      default:
        return 'Action';
    }
  }

  private missionControlActionTone(
    action: AdminQualityMissionControlAction,
  ): AdminQualityMissionActionTone {
    switch (action) {
      case 'auto-delegate':
        return 'secondary';
      case 'block':
        return 'danger';
      case 'defer':
      case 'reset':
        return 'neutral';
      case 'return-proof':
        return 'success';
      default:
        return 'primary';
    }
  }

  private missionControlSectionLabel(section: AdminQualityMissionHudSection): string {
    return (
      this.missionHudSectionOptions.find((option) => option.id === section)?.label ??
      'Coverage matrix'
    );
  }

  private recordMissionControlAction(event: AdminQualityMissionControlActionEvent): void {
    this.focusMissionControlPanel('mission');
    const entry: AdminQualityMissionRadarLockHistoryEntry = {
      sequence: ++this.missionControlRadarLockSequence,
      id: 'mission',
      kind: 'action',
      stateLabel: this.missionControlActionLabel(event.action),
      action: event.action,
      actionTone: this.missionControlActionTone(event.action),
      detailLabel: `${this.missionControlActionLabel(event.action)} · ${event.recommendation.title}`,
    };
    this.missionControlRadarLockHistory.update((history) => [entry, ...history].slice(0, 5));
  }

  private recordMissionControlProofEvent(
    section: AdminQualityMissionHudSection,
    proofLabel: string,
  ): void {
    this.focusMissionControlPanel(section);
    const entry: AdminQualityMissionRadarLockHistoryEntry = {
      sequence: ++this.missionControlRadarLockSequence,
      id: section,
      kind: 'proof',
      stateLabel: 'Proof pulse',
      detailLabel: `${proofLabel} · ${this.missionControlSectionLabel(section)}`,
    };
    this.missionControlRadarLockHistory.update((history) => [entry, ...history].slice(0, 5));
  }

  private focusMissionControlPanel(section: AdminQualityMissionHudSection): void {
    this.missionControlFocusedPanel.set(section);
    if (this.missionControlPanelFocusTimer) {
      clearTimeout(this.missionControlPanelFocusTimer);
    }
    this.ngZone.runOutsideAngular(() => {
      this.missionControlPanelFocusTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.missionControlFocusedPanel.set(null);
          this.missionControlPanelFocusTimer = null;
        });
      }, 1800);
    });
  }

  private resolveCodexScope(targetFiles: readonly string[]): AdminOpsCodexScope {
    if (targetFiles.length && targetFiles.every((file) => file.startsWith('strapi/'))) {
      return 'strapi';
    }
    if (targetFiles.some((file) => file.startsWith('packages/contracts/'))) {
      return 'packages-contracts';
    }
    if (targetFiles.some((file) => file.startsWith('packages/tooling/'))) {
      return 'packages-tooling';
    }
    if (targetFiles.some((file) => file.startsWith('openg7-org/'))) {
      return 'openg7-org';
    }
    return 'repository-root';
  }
}
