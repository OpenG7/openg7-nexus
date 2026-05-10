import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  TemplateRef,
  QueryList,
  ViewChild,
  ViewChildren,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IntroductionDraftState,
  ConnectionAttachment,
  TransportMode,
  IncotermCode,
} from '@app/core/models/connection';
import { FinancingBanner } from '@app/core/models/partner-profile';
import { PipelineStepStatus } from '@app/state';
import { TranslateModule } from '@ngx-translate/core';

import { IntroductionMessageEditorComponent } from './components/introduction-message-editor.component';

export type Og7IntroStepId =
  | 'introduction'
  | 'compliance'
  | 'scheduler'
  | 'logistics'
  | 'pipeline'
  | 'financing';

interface StepDefinition {
  readonly id: Og7IntroStepId;
  readonly labelKey: string;
  readonly descriptionKey: string;
  readonly template: TemplateRef<unknown> | null;
  readonly complete: boolean;
  readonly optional: boolean;
  readonly disabled?: boolean;
}

export type IntroStepperDefaults = IntroductionDraftState;

const STEP_ORDER: readonly Og7IntroStepId[] = [
  'introduction',
  'compliance',
  'scheduler',
  'logistics',
  'pipeline',
  'financing',
];

@Component({
  selector: 'og7-intro-stepper',
  standalone: true,
  imports: [CommonModule, TranslateModule, IntroductionMessageEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  exportAs: 'og7IntroStepper',
  templateUrl: './og7-intro-stepper.component.html',
  styleUrls: ['./og7-intro-stepper.component.scss'],
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/matchmaking/og7-mise-en-relation » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Intro Stepper ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7IntroStepperComponent gérée par le framework.
 */
export class Og7IntroStepperComponent {
  imageSrc = 'assets/home.png';
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  @ViewChildren('collaborationStepButton', { read: ElementRef })
  private readonly stepButtons?: QueryList<ElementRef<HTMLButtonElement>>;

  @ViewChild('introductionStepTemplate', { read: TemplateRef })
  private set introductionStepTemplate(template: TemplateRef<unknown> | null) {
    this.introductionTemplateRef.set(template);
  }

  readonly partnerPanelOpen = input(false);
  readonly primaryTemplate = input<TemplateRef<unknown> | null>(null);
  readonly ctaRailTemplate = input<TemplateRef<unknown> | null>(null);
  readonly ctaTemplate = input<TemplateRef<unknown> | null>(null);
  readonly messageTemplate = input<TemplateRef<unknown> | null>(null);
  readonly includeMessageStep = input(true);
  readonly complianceTemplate = input<TemplateRef<unknown> | null>(null);
  readonly schedulerTemplate = input<TemplateRef<unknown> | null>(null);
  readonly logisticsTemplate = input<TemplateRef<unknown> | null>(null);
  readonly pipelineTemplate = input<TemplateRef<unknown> | null>(null);
  readonly financingTemplate = input<TemplateRef<unknown> | null>(null);

  readonly ctaContentAvailable = input<boolean | null>(null);
  readonly pipelineContentAvailable = input<boolean | null>(null);
  readonly incotermsContentAvailable = input<boolean | null>(null);
  readonly financingContentAvailable = input<boolean | null>(null);
  readonly complianceContentAvailable = input<boolean | null>(null);
  readonly schedulerContentAvailable = input<boolean | null>(null);

  readonly pipelineSteps = input<readonly PipelineStepStatus[]>([]);
  readonly financingData = input<FinancingBanner | null>(null);

  readonly messageChange = output<string>();

  private readonly activeStepSignal = signal<Og7IntroStepId>('introduction');
  private readonly introMessageSignal = signal('');
  private readonly introTouchedSignal = signal(false);
  private readonly attachmentsSignal = signal<ConnectionAttachment[]>([]);
  private readonly meetingSlotsSignal = signal<readonly string[]>([]);
  private readonly selectedTransportsSignal = signal<TransportMode[]>([]);
  private readonly selectedIncotermSignal = signal<IncotermCode | null>(null);

  private readonly introductionTemplateRef = signal<TemplateRef<unknown> | null>(null);

  private readonly minimumSlots = 2;
  readonly maxMessageLength = 600;
  private readonly minMessageLength = 20;

  private updatingUrl = false;

  public readonly messageValue = computed(() => this.introMessageSignal());
  public readonly messageTouched = computed(() => this.introTouchedSignal());
  private readonly trimmedMessage = computed(() => this.introMessageSignal().trim());
  public readonly messageTooShort = computed(
    () => this.trimmedMessage().length < this.minMessageLength,
  );
  public readonly messageTooLong = computed(
    () => this.trimmedMessage().length > this.maxMessageLength,
  );
  public readonly messageInvalid = computed(() => this.messageTooShort() || this.messageTooLong());
  public readonly messageReady = computed(
    () => !this.messageInvalid() && this.trimmedMessage().length > 0,
  );

  public readonly attachmentsSelected = computed(
    () => this.attachmentsSignal() as readonly ConnectionAttachment[],
  );
  public readonly complianceReady = computed(() => this.attachmentsSignal().length > 0);

  public readonly meetingSlots = computed(() => this.meetingSlotsSignal() as readonly string[]);
  public readonly meetingSlotsCount = computed(() => this.meetingSlotsSignal().length);
  public readonly schedulerReady = computed(
    () => this.meetingSlotsSignal().length >= this.minimumSlots,
  );

  public readonly selectedTransports = computed(
    () => this.selectedTransportsSignal() as readonly TransportMode[],
  );
  public readonly selectedIncoterm = computed(() => this.selectedIncotermSignal());
  public readonly logisticsReady = computed(
    () => Boolean(this.selectedIncotermSignal()) && this.selectedTransportsSignal().length > 0,
  );

  public readonly pipelineReady = computed(() => {
    const steps = this.pipelineSteps();
    return Array.isArray(steps) && steps.length > 0;
  });

  public readonly financingReady = computed(() => Boolean(this.financingData()));

  public readonly readyToSend = computed(
    () =>
      this.messageReady() &&
      this.complianceReady() &&
      this.schedulerReady() &&
      this.logisticsReady() &&
      this.pipelineReady(),
  );

  protected readonly steps = computed(() => {
    const definitions: StepDefinition[] = [];

    if (this.includeMessageStep()) {
      definitions.push({
        id: 'introduction',
        labelKey: 'introBillboard.steps.introduction.title',
        descriptionKey: 'introBillboard.steps.introduction.description',
        template: this.templateFor('introduction'),
        complete: this.resolveCompletion('introduction'),
        optional: false,
      });
    }

    for (const id of STEP_ORDER.slice(1)) {
      const template = this.templateFor(id);
      if (!template) {
        continue;
      }
      definitions.push({
        id,
        labelKey: `introBillboard.steps.${id}.title`,
        descriptionKey: `introBillboard.steps.${id}.description`,
        template,
        complete: this.resolveCompletion(id),
        optional: id === 'financing',
      });
    }

    return definitions;
  });

  protected readonly activeStep = computed(() => this.activeStepSignal());
  protected readonly hasCtaContent = computed(() => {
    const availability = this.ctaContentAvailable();
    if (availability === false) {
      return false;
    }
    if (this.primaryTemplate()) {
      return true;
    }
    if (this.ctaRailTemplate()) {
      return true;
    }
    if (!this.partnerPanelOpen() && this.ctaTemplate()) {
      return true;
    }
    return false;
  });

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const requested = this.parseStep(params.get('step'));
      const normalized = this.normalizeStep(requested, this.steps());
      this.activeStepSignal.set(normalized);
    });

    effect(() => {
      const available = this.steps();
      const current = this.activeStepSignal();
      const normalized = this.normalizeStep(current, available);
      const defaultStep = this.defaultStep(available);
      if (normalized !== current) {
        this.activeStepSignal.set(normalized);
        return;
      }
      this.persistStep(normalized, defaultStep);
    });
  }

  public goToStep(step: Og7IntroStepId): void {
    const normalized = this.normalizeStep(step, this.steps());
    this.activeStepSignal.set(normalized);
    queueMicrotask(() => this.focusStepButton(normalized));
  }

  public currentStep(): Og7IntroStepId {
    return this.activeStepSignal();
  }

  protected stepButtonId(step: Og7IntroStepId): string {
    return `og7-intro-step-${step}`;
  }

  protected stepPanelId(step: Og7IntroStepId): string {
    return `og7-intro-step-panel-${step}`;
  }

  protected isActive(step: Og7IntroStepId): boolean {
    return this.activeStepSignal() === step;
  }

  protected readonly collaborationSteps = computed(() => this.steps());

  protected collaborationStepSelected(step: Og7IntroStepId): boolean {
    return this.isActive(step);
  }

  protected selectCollaborationStep(step: Og7IntroStepId): void {
    this.goToStep(step);
  }

  protected handleCollaborationStepKeydown(event: KeyboardEvent, index: number): void {
    this.onKeydown(event, index);
  }

  protected collaborationStepButtonId(step: Og7IntroStepId): string {
    return this.stepButtonId(step);
  }

  protected collaborationStepPanelId(step: Og7IntroStepId): string {
    return this.stepPanelId(step);
  }

  protected collaborationActivePanelId(): string | null {
    const active = this.activeStepSignal();
    return active ? this.stepPanelId(active) : null;
  }

  protected collaborationActiveButtonId(): string | null {
    const active = this.activeStepSignal();
    return active ? this.stepButtonId(active) : null;
  }

  protected activeCollaborationStepDefinition(): StepDefinition | null {
    const active = this.activeStepSignal();
    const steps = this.steps();
    return steps.find((step) => step.id === active) ?? null;
  }

  protected collaborationStepTemplate(step: Og7IntroStepId): TemplateRef<unknown> | null {
    return this.templateFor(step);
  }

  protected collaborationSectionLabelKey(step: Og7IntroStepId): string {
    switch (step) {
      case 'introduction':
        return 'introBillboard.steps.introduction.title';
      case 'compliance':
        return 'partner.panel.sections.compliance';
      case 'scheduler':
        return 'partner.panel.sections.scheduler';
      case 'logistics':
        return 'partner.panel.sections.incoterms';
      case 'pipeline':
        return 'partner.panel.sections.pipeline';
      case 'financing':
        return 'partner.panel.sections.financing';
      default:
        return 'partner.panel.sections.collaboration';
    }
  }

  protected collaborationPlaceholderKey(step: Og7IntroStepId): string {
    switch (step) {
      case 'introduction':
        return 'introBillboard.stepperPanelHint';
      case 'compliance':
        return 'partner.panel.compliancePlaceholder';
      case 'scheduler':
        return 'partner.panel.schedulerPlaceholder';
      case 'logistics':
        return 'partner.panel.incotermsPlaceholder';
      case 'pipeline':
        return 'partner.panel.pipelinePlaceholder';
      case 'financing':
        return 'partner.panel.financingPlaceholder';
      default:
        return 'introBillboard.stepperPanelHint';
    }
  }

  protected collaborationStepDescription(step: StepDefinition): string | null {
    return step.descriptionKey ? step.descriptionKey : null;
  }

  protected hasPipelineContent(): boolean {
    if (!this.pipelineTemplate()) {
      return false;
    }
    const availability = this.pipelineContentAvailable();
    return availability ?? true;
  }

  protected hasLogisticsContent(): boolean {
    if (!this.logisticsTemplate()) {
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
    return Boolean(this.financingData());
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

  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      this.goToIndex(index + 1);
      return;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.goToIndex(index - 1);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.goToIndex(0);
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.goToIndex(this.steps().length - 1);
    }
  }

  protected onMessageInput(value: string): void {
    this.setIntroMessage(value);
    this.messageChange.emit(value);
  }

  public setIntroMessage(value: string, options?: { touched?: boolean }): void {
    this.introMessageSignal.set(value);
    const touched = options?.touched ?? true;
    this.introTouchedSignal.set(touched);
  }

  public touchMessage(): void {
    this.introTouchedSignal.set(true);
  }

  public resetState(): void {
    this.introMessageSignal.set('');
    this.introTouchedSignal.set(false);
    this.attachmentsSignal.set([]);
    this.meetingSlotsSignal.set([]);
    this.selectedTransportsSignal.set([]);
    this.selectedIncotermSignal.set(null);
  }

  public applyDefaults(defaults: IntroStepperDefaults): void {
    this.introMessageSignal.set(defaults.message);
    this.introTouchedSignal.set(false);
    this.attachmentsSignal.set(this.uniqueList(defaults.attachments));
    this.meetingSlotsSignal.set(this.sanitizeSlots(defaults.meetingSlots));
    this.selectedTransportsSignal.set(this.uniqueList(defaults.transports));
    this.selectedIncotermSignal.set(defaults.incoterm ?? null);
  }

  public updateAttachment(
    key: ConnectionAttachment,
    enabled: boolean,
  ): readonly ConnectionAttachment[] {
    const next = new Set(this.attachmentsSignal());
    if (enabled) {
      next.add(key);
    } else {
      next.delete(key);
    }
    const updated = Array.from(next);
    this.attachmentsSignal.set(updated);
    return updated;
  }

  public setMeetingSlots(slots: readonly string[]): readonly string[] {
    const sanitized = this.sanitizeSlots(slots);
    this.meetingSlotsSignal.set(sanitized);
    return sanitized;
  }

  public setTransports(modes: readonly TransportMode[]): void {
    this.selectedTransportsSignal.set(this.uniqueList(modes));
  }

  public setIncoterm(code: IncotermCode | null): void {
    this.selectedIncotermSignal.set(code ?? null);
  }

  private goToIndex(index: number): void {
    const steps = this.steps();
    if (!steps.length) {
      return;
    }
    const normalizedIndex = (index + steps.length) % steps.length;
    this.goToStep(steps[normalizedIndex].id);
  }

  protected templateFor(step: Og7IntroStepId): TemplateRef<unknown> | null {
    switch (step) {
      case 'introduction':
        return this.includeMessageStep() ? this.introductionTemplateRef() : null;
      case 'compliance':
        return this.hasComplianceContent() ? this.complianceTemplate() : null;
      case 'scheduler':
        return this.hasSchedulerContent() ? this.schedulerTemplate() : null;
      case 'logistics':
        return this.hasLogisticsContent() ? this.logisticsTemplate() : null;
      case 'pipeline':
        return this.hasPipelineContent() ? this.pipelineTemplate() : null;
      case 'financing':
        return this.hasFinancingContent() ? this.financingTemplate() : null;
      default:
        return null;
    }
  }

  private resolveCompletion(step: Og7IntroStepId): boolean {
    switch (step) {
      case 'introduction':
        return this.messageReady();
      case 'compliance':
        return this.complianceReady();
      case 'scheduler':
        return this.schedulerReady();
      case 'logistics':
        return this.logisticsReady();
      case 'pipeline':
        return this.pipelineReady();
      case 'financing':
        return this.financingReady();
      default:
        return false;
    }
  }

  private parseStep(value: string | null): Og7IntroStepId | null {
    if (!value) {
      return null;
    }
    const lower = value.toLowerCase() as Og7IntroStepId;
    return STEP_ORDER.includes(lower) ? lower : null;
  }

  private normalizeStep(
    candidate: Og7IntroStepId | null,
    steps: readonly StepDefinition[],
  ): Og7IntroStepId {
    if (candidate && steps.some((step) => step.id === candidate)) {
      return candidate;
    }
    return this.defaultStep(steps);
  }

  private persistStep(step: Og7IntroStepId, defaultStep: Og7IntroStepId): void {
    const raw = this.route.snapshot.queryParamMap.get('step');
    if (step === defaultStep) {
      if (raw == null) {
        return;
      }
      this.updateUrl(null);
      return;
    }
    if (raw === step) {
      return;
    }
    this.updateUrl(step);
  }

  private defaultStep(steps: readonly StepDefinition[]): Og7IntroStepId {
    return steps[0]?.id ?? 'introduction';
  }

  private updateUrl(step: Og7IntroStepId | null): void {
    if (this.updatingUrl) {
      return;
    }
    this.updatingUrl = true;
    void this.router
      .navigate([], {
        relativeTo: this.route,
        queryParams: step ? { step } : { step: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      })
      .finally(() => {
        this.updatingUrl = false;
      });
  }

  private focusStepButton(step: Og7IntroStepId): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const index = this.steps().findIndex((definition) => definition.id === step);
    if (index < 0) {
      return;
    }
    const button = this.stepButtons?.get(index)?.nativeElement ?? null;
    if (!button) {
      return;
    }
    queueMicrotask(() => button.focus());
  }

  private uniqueList<T>(values: readonly T[]): T[] {
    return Array.from(new Set(values));
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

  private formatForInput(date: Date): string {
    const pad = (input: number) => input.toString().padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }
}
