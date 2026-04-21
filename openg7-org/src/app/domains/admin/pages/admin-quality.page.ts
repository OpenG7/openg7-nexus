import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { injectNotificationStore } from '@app/core/observability/notification.store';

import {
  AdminQualityMatrixBucket,
  AdminQualityMatrixEntry,
  AdminQualityMatrixPriority,
  AdminQualityMatrixService,
  AdminQualityMatrixSnapshot,
  AdminQualityMatrixStatus,
} from '../data-access/admin-quality-matrix.service';

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
  AdminQualityCommandMetric,
  AdminQualityCommandScopeSummary,
  AdminQualityCommandRailComponent,
} from './admin-quality-command-rail.component';
import { AdminQualityCoverageMatrixComponent } from './admin-quality-coverage-matrix.component';
import { AdminQualityDelegationPlan, buildDelegationPlan } from './admin-quality-delegation';
import { AdminQualityDomainIconComponent } from './admin-quality-domain-icon.component';
import {
  AdminQualityMissionControlState,
  AdminQualityMissionDecisionMap,
  AdminQualityMissionRecommendation,
  AdminQualityMissionStatus,
  buildMissionControl,
} from './admin-quality-mission-control';
import {
  AdminQualityMissionControlActionEvent,
  resolveMissionAction,
} from './admin-quality-mission-actions';
import { AdminQualityMissionControlComponent } from './admin-quality-mission-control.component';

type FilterValue<T extends string> = 'all' | T;
type AdminQualityInspectionSurface = 'delegation' | 'actions';
interface AdminQualityActiveFilterChip {
  readonly id: string;
  readonly label: string;
}

const MISSION_CONTROL_STORAGE_KEY = 'og7.admin-quality.mission-control.v1';

@Component({
  standalone: true,
  selector: 'og7-admin-quality-page',
  imports: [
    CommonModule,
    RouterLink,
    AdminQualityCommandRailComponent,
    AdminQualityCoverageMatrixComponent,
    AdminQualityDomainIconComponent,
    AdminQualityMissionControlComponent,
  ],
  templateUrl: './admin-quality.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminQualityPage implements OnInit {
  private readonly service = inject(AdminQualityMatrixService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly notifications = injectNotificationStore();
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly snapshot = signal<AdminQualityMatrixSnapshot | null>(null);

  readonly search = signal('');
  readonly selectedDomain = signal<FilterValue<string>>('all');
  readonly selectedPriority = signal<FilterValue<AdminQualityMatrixPriority>>('all');
  readonly selectedE2EStatus = signal<FilterValue<AdminQualityMatrixStatus>>('all');
  readonly selectedBucket = signal<FilterValue<AdminQualityMatrixBucket>>('all');
  readonly selectedEntryId = signal<string | null>(null);
  readonly selectedActionId = signal<string | null>(null);
  readonly selectedMissionId = signal<string | null>(null);
  readonly inspectionSurface = signal<AdminQualityInspectionSurface>('delegation');
  readonly missionDecisions = signal<AdminQualityMissionDecisionMap>({});
  readonly speaking = signal(false);
  readonly actionStateKeys: readonly (keyof AdminQualityActionStateCoverage)[] = [
    'loading',
    'success',
    'error',
    'offline',
    'permission',
  ];

  readonly entries = computed(() => this.snapshot()?.entries ?? []);
  readonly actionRegistry = computed(() => buildActionRegistry(this.entries()));
  readonly undocumentedActions = computed(() => buildUndocumentedDiscoveredActions(this.entries()));

  readonly domainOptions = computed(() => {
    const options = new Set(this.entries().map((entry) => entry.domain));
    return ['all', ...Array.from(options).sort((left, right) => left.localeCompare(right, 'fr-CA'))];
  });

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

        const haystack = [entry.domain, entry.need, entry.observedGap, entry.nextMove, ...entry.evidence]
          .join(' ')
          .toLocaleLowerCase('fr-CA');

        return haystack.includes(query);
      })
      .sort((left, right) => this.compareEntries(left, right));
  });

  readonly totalDomains = computed(() => this.entries().length);
  readonly provedCount = computed(() => this.entries().filter((entry) => entry.e2eStatus === 'oui').length);
  readonly filteredProvedCount = computed(() => this.filteredEntries().filter((entry) => entry.e2eStatus === 'oui').length);
  readonly proofGapCount = computed(
    () =>
      this.entries().filter(
        (entry) => entry.e2eStatus !== 'oui' && !entry.needsProductWorkFirst && entry.managementBucket === 'proof-gap'
      ).length
  );
  readonly filteredProofGapCount = computed(
    () =>
      this.filteredEntries().filter(
        (entry) => entry.e2eStatus !== 'oui' && !entry.needsProductWorkFirst && entry.managementBucket === 'proof-gap'
      ).length
  );
  readonly productWorkCount = computed(
    () => this.entries().filter((entry) => entry.e2eStatus !== 'oui' && entry.needsProductWorkFirst).length
  );
  readonly filteredProductWorkCount = computed(
    () => this.filteredEntries().filter((entry) => entry.e2eStatus !== 'oui' && entry.needsProductWorkFirst).length
  );
  readonly highPriorityGapCount = computed(
    () => this.entries().filter((entry) => entry.e2eStatus !== 'oui' && entry.priority === 'haute').length
  );
  readonly filteredHighPriorityGapCount = computed(
    () => this.filteredEntries().filter((entry) => entry.e2eStatus !== 'oui' && entry.priority === 'haute').length
  );
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
      detail: this.hasActiveFilters() ? 'Perimetre courant de la console.' : 'Portefeuille complet actuellement visible.',
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
    () => this.actionRegistry().filter((action) => action.status === 'proved').length
  );
  readonly actionsNeedingCompletionCount = computed(
    () => this.actionRegistry().filter((action) => action.status === 'needs-completion').length
  );
  readonly detectedActionsCount = computed(
    () => this.actionRegistry().filter((action) => action.sourceDetected).length + this.undocumentedActions().length
  );
  readonly unmappedActionsCount = computed(() => this.undocumentedActions().length);

  readonly hasActiveFilters = computed(
    () =>
      Boolean(this.search().trim()) ||
      this.selectedDomain() !== 'all' ||
      this.selectedPriority() !== 'all' ||
      this.selectedE2EStatus() !== 'all' ||
      this.selectedBucket() !== 'all'
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
  readonly selectedEntryActions = computed<readonly AdminQualityActionRecord[]>(() => {
    const entry = this.selectedEntry();
    const actions = this.actionRegistry();
    return entry ? actions.filter((action) => action.entryId === entry.id) : actions;
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
    return entry ? actions.filter((action) => action.entryId === entry.id) : actions;
  });
  readonly missionControl = computed<AdminQualityMissionControlState | null>(() => {
    const entry = this.selectedEntry();
    const plan = this.selectedDelegation();
    return entry && plan ? buildMissionControl(entry, plan, this.missionDecisions()) : null;
  });
  readonly selectedMission = computed<AdminQualityMissionRecommendation | null>(() => {
    const recommendations = this.missionControl()?.recommendations ?? [];
    if (!recommendations.length) {
      return null;
    }

    const selectedId = this.selectedMissionId();
    return recommendations.find((recommendation) => recommendation.id === selectedId) ?? recommendations[0];
  });

  ngOnInit(): void {
    this.restoreMissionDecisions();
    this.destroyRef.onDestroy(() => this.stopMissionVoice(false));

    this.service
      .loadMatrix()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (snapshot) => {
          this.snapshot.set(snapshot);
          this.loading.set(false);
          this.error.set(null);
        },
        error: () => {
          this.error.set("Impossible de charger la matrice QA.");
          this.loading.set(false);
        },
      });
  }

  setSearch(event: Event): void {
    const value = (event.target as HTMLInputElement | null)?.value ?? '';
    this.search.set(value);
  }

  setDomainFilter(event: Event): void {
    this.selectedDomain.set(((event.target as HTMLSelectElement | null)?.value as FilterValue<string>) ?? 'all');
  }

  setPriorityFilter(event: Event): void {
    this.selectedPriority.set(
      ((event.target as HTMLSelectElement | null)?.value as FilterValue<AdminQualityMatrixPriority>) ?? 'all'
    );
  }

  setE2EFilter(event: Event): void {
    this.selectedE2EStatus.set(
      ((event.target as HTMLSelectElement | null)?.value as FilterValue<AdminQualityMatrixStatus>) ?? 'all'
    );
  }

  setBucketFilter(event: Event): void {
    this.selectedBucket.set(
      ((event.target as HTMLSelectElement | null)?.value as FilterValue<AdminQualityMatrixBucket>) ?? 'all'
    );
  }

  resetFilters(): void {
    this.search.set('');
    this.selectedDomain.set('all');
    this.selectedPriority.set('all');
    this.selectedE2EStatus.set('all');
    this.selectedBucket.set('all');
  }

  selectEntry(entry: AdminQualityMatrixEntry): void {
    this.selectedEntryId.set(entry.id);
    this.selectedActionId.set(null);
    this.selectedMissionId.set(null);
  }

  isSelected(entry: AdminQualityMatrixEntry): boolean {
    return this.selectedEntry()?.id === entry.id;
  }

  selectAction(action: AdminQualityActionRecord): void {
    this.selectedActionId.set(action.id);
    this.inspectionSurface.set('actions');
  }

  isActionSelected(action: AdminQualityActionRecord): boolean {
    return this.selectedAction()?.id === action.id;
  }

  selectMission(recommendation: AdminQualityMissionRecommendation): void {
    this.selectedMissionId.set(recommendation.id);
  }

  setInspectionSurface(surface: AdminQualityInspectionSurface): void {
    this.inspectionSurface.set(surface);
  }

  isInspectionSurfaceActive(surface: AdminQualityInspectionSurface): boolean {
    return this.inspectionSurface() === surface;
  }

  handleMissionAction(event: AdminQualityMissionControlActionEvent): void {
    const resolution = resolveMissionAction(event.action, event.recommendation);
    if (!resolution) {
      return;
    }

    if (resolution.kind === 'reset') {
      this.resetMission(event.recommendation, resolution.message);
      return;
    }

    this.updateMissionStatus(event.recommendation, resolution.status, resolution.message);
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

  actionScoreClasses(score: number): string {
    if (score >= 80) {
      return 'bg-emerald-500';
    }
    if (score >= 60) {
      return 'bg-sky-500';
    }
    return 'bg-rose-500';
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
    await this.copyText(plan.codexPrompt, 'Brief Codex copie.');
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
    this.notifications.info(message, { source: 'admin-quality' });
  }

  async speakMissionControl(state: AdminQualityMissionControlState): Promise<void> {
    if (!this.isBrowser || typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.notifications.info('Synthese vocale indisponible dans ce navigateur.', { source: 'admin-quality' });
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
    this.notifications.info("Analyse AI lue a voix haute.", { source: 'admin-quality' });
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
    if (entry.e2eStatus === 'oui') {
      return 'Prouve';
    }
    if (entry.needsProductWorkFirst) {
      return 'Produit d abord';
    }
    return 'Pret pour preuve QA';
  }

  readinessClasses(entry: AdminQualityMatrixEntry): string {
    if (entry.e2eStatus === 'oui') {
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    }
    if (entry.needsProductWorkFirst) {
      return 'border-indigo-200 bg-indigo-50 text-indigo-700';
    }
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  private compareEntries(left: AdminQualityMatrixEntry, right: AdminQualityMatrixEntry): number {
    return (
      this.priorityRank(right.priority) - this.priorityRank(left.priority) ||
      this.statusRank(left.e2eStatus) - this.statusRank(right.e2eStatus) ||
      left.domain.localeCompare(right.domain, 'fr-CA') ||
      left.need.localeCompare(right.need, 'fr-CA')
    );
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
    message: string
  ): void {
    this.missionDecisions.set({
      ...this.missionDecisions(),
      [recommendation.id]: status,
    });
    this.persistMissionDecisions();
    this.selectedMissionId.set(recommendation.id);
    this.notifications.success(message, { source: 'admin-quality' });
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
        this.notifications.error("Impossible de copier l'action de delegation.", { source: 'admin-quality' });
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
      this.notifications.error('Impossible de persister le pilotage local des missions.', { source: 'admin-quality' });
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
}
