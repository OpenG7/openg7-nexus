import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, ViewChild, computed, signal } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { ConnectionStage, IncotermCode, TransportMode } from '@app/core/models/connection';
import { FinancingBanner } from '@app/core/models/partner-profile';
import { createPartnerSelection } from '@app/core/models/partner-selection';
import {
  Og7IntroStepId,
  Og7IntroStepperComponent,
} from '@app/domains/matchmaking/og7-mise-en-relation/og7-intro-stepper.component';
import {
  OpportunityTimelineComponent,
  OpportunityTimelineVm,
} from '@app/domains/opportunities/opportunities/ui/opportunity-timeline/opportunity-timeline.component';
import { Og7SearchFieldComponent } from '@app/shared/components/search/og7-search-field.component';
import { PipelineStepStatus } from '@app/store/connections/connections.selectors';

const DEMO_OPTIONS = [
  {
    id: 'search-field',
    label: 'Champ de recherche',
    description: 'Filtrer un tableau et gérer les actions via le composant de recherche.',
  },
  {
    id: 'intro-stepper',
    label: 'Stepper de mise en relation',
    description: 'Parcourir le flux de mise en relation avec des données simulées.',
  },
  {
    id: 'opportunity-timeline',
    label: "Timeline d'opportunité",
    description: 'Visualiser une opportunité complète à partir de données mockées.',
  },
] as const;

type DemoOptionId = (typeof DEMO_OPTIONS)[number]['id'];

interface MockCompany {
  readonly name: string;
}

@Component({
  standalone: true,
  selector: 'og7-component-lab-page',
  imports: [
    CommonModule,
    MatTableModule,
    Og7SearchFieldComponent,
    Og7IntroStepperComponent,
    OpportunityTimelineComponent,
  ],
  templateUrl: './og7-component-lab-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/developer/pages/component-lab » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Component Lab Page ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7ComponentLabPageComponent gérée par le framework.
 */
export class Og7ComponentLabPageComponent {
  protected readonly demoOptions = DEMO_OPTIONS;
  protected readonly selectedDemo = signal<DemoOptionId>('search-field');
  protected readonly selectedDescription = computed(
    () => this.demoOptions.find((option) => option.id === this.selectedDemo())?.description ?? '',
  );

  protected readonly displayedColumns = ['name'];
  protected readonly companies = new MatTableDataSource<MockCompany>([
    { name: 'Atlas Manufacturier' },
    { name: 'Borealis Énergie' },
    { name: 'Cascades Nord' },
    { name: 'Delta Composite' },
  ]);

  protected readonly lastCommittedSearch = signal<string | null>(null);

  protected readonly fallbackIncoterm: IncotermCode = 'DAP';
  protected readonly transportLabels: Record<TransportMode, string> = {
    road: 'Transport routier',
    rail: 'Transport ferroviaire',
    air: 'Fret aérien',
    sea: 'Transport maritime',
  };

  protected readonly incotermDescriptions: Record<IncotermCode, string> = {
    FCA: 'Remise au transporteur désigné par l’acheteur.',
    FOB: 'Livraison à bord du navire choisi par l’acheteur.',
    DDP: 'Livraison droits acquittés à l’adresse convenue.',
    CPT: 'Fret payé jusqu’au point convenu, risques transférés à l’acheteur.',
    DAP: 'Livraison au site convenu, droits et taxes à charge de l’acheteur.',
    EXW: 'Mise à disposition à l’usine du fournisseur.',
    CIF: 'Coût, assurance et fret inclus jusqu’au port de destination.',
    CIP: 'Transport et assurance payés jusqu’au lieu convenu.',
  };

  protected readonly pipelineStageLabels: Record<ConnectionStage, string> = {
    intro: 'Introduction envoyée',
    reply: 'Réponse reçue',
    meeting: 'Rencontre planifiée',
    review: 'Analyse en cours',
    deal: 'Entente conclue',
  };

  protected readonly pipelineStatusLabels: Record<PipelineStepStatus['status'], string> = {
    completed: 'Terminé',
    active: 'En cours',
    upcoming: 'À venir',
  };

  protected readonly pipelineSteps: readonly PipelineStepStatus[] = [
    { stage: 'intro', status: 'completed', timestamp: '2025-01-08T09:00:00Z' },
    { stage: 'reply', status: 'completed', timestamp: '2025-01-09T14:30:00Z' },
    { stage: 'meeting', status: 'active', timestamp: '2025-01-12T15:00:00Z' },
    { stage: 'review', status: 'upcoming' },
    { stage: 'deal', status: 'upcoming' },
  ];

  protected readonly financingBanner: FinancingBanner = {
    id: 'component-lab-financing',
    province: 'QC',
    sector: 'manufacturing',
    title: {
      fr: 'Subvention modernisation G7',
      en: 'G7 Modernization Grant',
    },
    body: {
      fr: 'Couvre jusqu’à 40 % des investissements robotique pour le partenaire sélectionné.',
      en: 'Covers up to 40% of robotics investments for the selected partner.',
    },
    ctaLabel: {
      fr: 'Découvrir le programme',
      en: 'Explore the program',
    },
    ctaUrl: 'https://www.openg7.org/mock-financing',
  };

  protected readonly opportunityTimelineVm: OpportunityTimelineVm = {
    id: 'component-lab-opportunity',
    matchId: 'component-lab-opportunity',
    title: 'Alliance éolienne Abitibi → Bas-Saint-Laurent',
    score: 86,
    buyer: {
      name: 'Ventis Québec',
      province: 'QC',
      sector: 'energy',
      logoUrl: undefined,
    },
    supplier: {
      name: 'Bas-Saint-Laurent Composites',
      province: 'QC',
      sector: 'manufacturing',
      logoUrl: undefined,
    },
    context: {
      distanceKm: 620,
      leadTime: '12 jours',
      co2SavedTons: 78,
      logisticsCost: '18 500 $',
    },
    steps: [
      {
        id: 'need',
        title: 'Qualification du besoin',
        summary: 'Rotor 42m pour parc éolien régional, priorité neutralité carbone.',
        kpis: [
          { label: 'Volume', value: '12 unités' },
          { label: 'Démarrage', value: 'Mars 2025' },
        ],
      },
      {
        id: 'capacity',
        title: 'Capacité de production',
        summary: 'L’usine fournit 5 lignes dédiées, cadence double shift validée.',
        kpis: [
          { label: 'Cadence', value: '2 unités/semaine' },
          { label: 'Taux de rebut', value: '0.9 %' },
        ],
      },
      {
        id: 'logistics',
        title: 'Logistique & conformité',
        summary: 'Convoi spécial route + rail hybride, incoterm DAP confirmé.',
        kpis: [
          { label: 'Distance', value: '620 km' },
          { label: 'Incoterm', value: 'DAP' },
        ],
      },
      {
        id: 'impact',
        title: 'Impact et financement',
        summary: 'Réduction de 18 % des émissions par rapport à l’option importée.',
        kpis: [
          { label: 'CO₂ évité', value: '78 t' },
          { label: 'Financement', value: '2,4 M$ confirmé' },
        ],
      },
    ],
    profileSelection: createPartnerSelection('supplier', 'component-lab-supplier'),
  };

  private introStepper?: Og7IntroStepperComponent;

  constructor() {
    this.companies.filterPredicate = (data, filter) =>
      data.name.toLowerCase().includes(filter.trim().toLowerCase());
  }

  @ViewChild(Og7IntroStepperComponent)
  set introStepperRef(component: Og7IntroStepperComponent | undefined) {
    this.introStepper = component;
    if (component && this.selectedDemo() === 'intro-stepper') {
      queueMicrotask(() => this.initializeIntroStepper());
    }
  }

  protected onSelectDemo(event: Event): void {
    const next = (event.target as HTMLSelectElement).value as DemoOptionId;
    this.selectedDemo.set(next);
    if (next === 'intro-stepper') {
      queueMicrotask(() => this.initializeIntroStepper());
    }
  }

  protected applyFilter(value: string): void {
    this.companies.filter = value.trim().toLowerCase();
  }

  protected commitSearch(value: string): void {
    this.lastCommittedSearch.set(value);
  }

  protected goToStep(step: Og7IntroStepId): void {
    this.introStepper?.goToStep(step);
  }

  private initializeIntroStepper(): void {
    if (!this.introStepper) {
      return;
    }

    this.introStepper.setIntroMessage(
      'Bonjour équipe Ventis, voici la proposition de mise en relation.',
    );
    this.introStepper.updateAttachment('nda', true);
    this.introStepper.updateAttachment('rfq', true);
    this.introStepper.setMeetingSlots(['2025-02-04T14:00:00Z', '2025-02-06T16:30:00Z']);
    this.introStepper.setTransports(['road', 'rail']);
    this.introStepper.setIncoterm(this.fallbackIncoterm);
  }
}
