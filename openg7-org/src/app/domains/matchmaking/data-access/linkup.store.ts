import { computed, Injectable, signal, WritableSignal } from '@angular/core';

export type LinkupStatus = 'pending' | 'inDiscussion' | 'completed' | 'closed';
export type LinkupTradeMode = 'import' | 'export' | 'both';

export interface LinkupParticipant {
  readonly id: string;
  readonly name: string;
  readonly province: string;
  readonly sector: string;
  readonly channel?: string;
}

export interface LinkupTimelineEntry {
  readonly id: string;
  readonly date: string;
  readonly summary: string;
  readonly channel?: string;
  readonly author?: string;
}

export interface LinkupNoteEntry {
  readonly id: string;
  readonly date: string;
  readonly author: string;
  readonly content: string;
}

export interface LinkupRecord {
  readonly id: string;
  readonly reference: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly status: LinkupStatus;
  readonly tradeMode: LinkupTradeMode;
  readonly companyA: LinkupParticipant;
  readonly companyB: LinkupParticipant;
  readonly primarySector: string;
  readonly summary: string;
  readonly timeline: readonly LinkupTimelineEntry[];
  readonly notes: readonly LinkupNoteEntry[];
}

export interface LinkupStatusMeta {
  readonly id: LinkupStatus;
  readonly labelKey: string;
  readonly chipClass: string;
}

export const LINKUP_STATUS_ORDER: readonly LinkupStatus[] = [
  'pending',
  'inDiscussion',
  'completed',
  'closed',
];

export const LINKUP_STATUS_META: Readonly<Record<LinkupStatus, LinkupStatusMeta>> = {
  pending: {
    id: 'pending',
    labelKey: 'pages.linkups.status.pending',
    chipClass: 'og7-linkup-status--pending',
  },
  inDiscussion: {
    id: 'inDiscussion',
    labelKey: 'pages.linkups.status.inDiscussion',
    chipClass: 'og7-linkup-status--in-discussion',
  },
  completed: {
    id: 'completed',
    labelKey: 'pages.linkups.status.completed',
    chipClass: 'og7-linkup-status--completed',
  },
  closed: {
    id: 'closed',
    labelKey: 'pages.linkups.status.closed',
    chipClass: 'og7-linkup-status--closed',
  },
};

export const LINKUP_TRADE_MODE_OPTIONS: Readonly<Record<LinkupTradeMode, string>> = {
  import: 'pages.linkups.tradeMode.import',
  export: 'pages.linkups.tradeMode.export',
  both: 'pages.linkups.tradeMode.both',
};

const DEMO_LINKUPS: readonly LinkupRecord[] = [
  {
    id: 'lkp-001',
    reference: 'OG7-2025-001',
    createdAt: '2025-07-02T14:05:00Z',
    updatedAt: '2025-07-18T09:12:00Z',
    status: 'inDiscussion',
    tradeMode: 'both',
    companyA: {
      id: 'cmp-aurora-timber',
      name: 'Aurora Timber Coop',
      province: 'BC',
      sector: 'Forêt et bois d’œuvre',
      channel: 'OpenG7',
    },
    companyB: {
      id: 'cmp-nordic-build',
      name: 'Nordic Build Prefab',
      province: 'QC',
      sector: 'Construction durable',
      channel: 'Courriel',
    },
    primarySector: 'Matériaux durables',
    summary:
      'Mise en relation pour sécuriser un approvisionnement en bois lamellé-croisé issu de forêts certifiées.',
    timeline: [
      {
        id: 'lkp-001-t1',
        date: '2025-07-02T14:05:00Z',
        summary: 'Demande envoyée via OpenG7 au réseau interprovincial.',
        channel: 'Plateforme',
        author: 'Aurora Timber Coop',
      },
      {
        id: 'lkp-001-t2',
        date: '2025-07-04T16:42:00Z',
        summary: 'Premier retour de Nordic Build avec intérêts pour un volume test de 1 000 m³.',
        channel: 'Courriel',
        author: 'Nordic Build Prefab',
      },
      {
        id: 'lkp-001-t3',
        date: '2025-07-10T18:30:00Z',
        summary:
          'Réunion conjointe avec le ministère de l’Économie du Québec pour baliser la logistique.',
        channel: 'Visio',
        author: 'Cellule OpenG7',
      },
    ],
    notes: [
      {
        id: 'lkp-001-n1',
        date: '2025-07-11T09:00:00Z',
        author: 'Équipe OpenG7 – Marielle',
        content:
          'Préparer un dossier sur les incitatifs fiscaux québécois pour soutenir l’implantation d’un hub logistique à Trois-Rivières.',
      },
      {
        id: 'lkp-001-n2',
        date: '2025-07-18T09:12:00Z',
        author: 'Équipe OpenG7 – Xavier',
        content:
          'Nordic Build souhaite ajouter un volet export vers le Maine si le pilote est concluant.',
      },
    ],
  },
  {
    id: 'lkp-002',
    reference: 'OG7-2025-014',
    createdAt: '2025-05-22T11:25:00Z',
    updatedAt: '2025-06-01T15:45:00Z',
    status: 'completed',
    tradeMode: 'export',
    companyA: {
      id: 'cmp-prairie-grain',
      name: 'Prairie Grain Elevators',
      province: 'SK',
      sector: 'Agroalimentaire',
      channel: 'Téléphone',
    },
    companyB: {
      id: 'cmp-maritime-foods',
      name: 'Maritime Foods Cooperative',
      province: 'NB',
      sector: 'Transformation alimentaire',
      channel: 'OpenG7',
    },
    primarySector: 'Agroalimentaire',
    summary:
      'Accord de distribution de céréales pour les marchés atlantiques en appui au plan de résilience alimentaire.',
    timeline: [
      {
        id: 'lkp-002-t1',
        date: '2025-05-22T11:25:00Z',
        summary: 'Premier contact établi par l’équipe OpenG7 régionale.',
        channel: 'Téléphone',
        author: 'Prairie Grain Elevators',
      },
      {
        id: 'lkp-002-t2',
        date: '2025-05-26T13:10:00Z',
        summary: 'Atelier de cadrage logistique avec l’Agence de promotion des exportations.',
        channel: 'Visio',
        author: 'Cellule OpenG7',
      },
      {
        id: 'lkp-002-t3',
        date: '2025-05-31T17:00:00Z',
        summary: 'Signature d’un protocole d’entente pour trois ans.',
        channel: 'Plateforme',
        author: 'Maritime Foods Cooperative',
      },
      {
        id: 'lkp-002-t4',
        date: '2025-06-01T15:45:00Z',
        summary: 'Livraison pilote réussie et mise à jour du statut en Complétée.',
        channel: 'OpenG7',
        author: 'Équipe OpenG7',
      },
    ],
    notes: [
      {
        id: 'lkp-002-n1',
        date: '2025-05-29T08:30:00Z',
        author: 'Équipe OpenG7 – Daniel',
        content: 'Prévoir un suivi trimestriel sur les volumes pour préparer un rapport d’impact.',
      },
    ],
  },
  {
    id: 'lkp-003',
    reference: 'OG7-2025-021',
    createdAt: '2025-06-15T08:50:00Z',
    updatedAt: '2025-06-20T10:22:00Z',
    status: 'pending',
    tradeMode: 'import',
    companyA: {
      id: 'cmp-northern-tech',
      name: 'Northern Tech Labs',
      province: 'YT',
      sector: 'Technologies propres',
      channel: 'OpenG7',
    },
    companyB: {
      id: 'cmp-quantum-loop',
      name: 'Quantum Loop Systems',
      province: 'ON',
      sector: 'Électronique avancée',
      channel: 'OpenG7',
    },
    primarySector: 'Technologies propres',
    summary:
      'Recherche d’un fournisseur de composants pour un projet de stockage énergétique nordique.',
    timeline: [
      {
        id: 'lkp-003-t1',
        date: '2025-06-15T08:50:00Z',
        summary: 'Demande déposée sur la plateforme par Northern Tech Labs.',
        channel: 'Plateforme',
        author: 'Northern Tech Labs',
      },
      {
        id: 'lkp-003-t2',
        date: '2025-06-18T09:10:00Z',
        summary: 'Analyse de compatibilité technique réalisée par Quantum Loop.',
        channel: 'Courriel',
        author: 'Quantum Loop Systems',
      },
      {
        id: 'lkp-003-t3',
        date: '2025-06-20T10:22:00Z',
        summary: 'Statut mis à jour en En attente de réponse finale.',
        channel: 'OpenG7',
        author: 'Équipe OpenG7',
      },
    ],
    notes: [
      {
        id: 'lkp-003-n1',
        date: '2025-06-20T12:00:00Z',
        author: 'Équipe OpenG7 – Camille',
        content:
          'Prévoir une relance ciblée sur la prise en charge logistique si aucune réponse d’ici la fin du mois.',
      },
    ],
  },
  {
    id: 'lkp-004',
    reference: 'OG7-2025-030',
    createdAt: '2025-04-03T09:35:00Z',
    updatedAt: '2025-05-02T14:20:00Z',
    status: 'closed',
    tradeMode: 'export',
    companyA: {
      id: 'cmp-coastal-energy',
      name: 'Coastal Energy Alliance',
      province: 'NS',
      sector: 'Énergies marines',
      channel: 'Téléphone',
    },
    companyB: {
      id: 'cmp-prarie-hydrogen',
      name: 'Prairie Hydrogen Works',
      province: 'AB',
      sector: 'Hydrogène',
      channel: 'Courriel',
    },
    primarySector: 'Énergies renouvelables',
    summary: 'Exploration d’un corridor d’export d’hydrogène vert vers l’Europe via Halifax.',
    timeline: [
      {
        id: 'lkp-004-t1',
        date: '2025-04-03T09:35:00Z',
        summary: 'Contact initial par l’entremise d’un événement OpenG7.',
        channel: 'Événement',
        author: 'Coastal Energy Alliance',
      },
      {
        id: 'lkp-004-t2',
        date: '2025-04-10T12:10:00Z',
        summary: 'Évaluation technique : coûts logistiques jugés trop élevés à court terme.',
        channel: 'Rapport',
        author: 'Prairie Hydrogen Works',
      },
      {
        id: 'lkp-004-t3',
        date: '2025-05-02T14:20:00Z',
        summary: 'Dossier clôturé en attendant de nouveaux incitatifs fédéraux.',
        channel: 'Courriel',
        author: 'Équipe OpenG7',
      },
    ],
    notes: [
      {
        id: 'lkp-004-n1',
        date: '2025-05-03T08:15:00Z',
        author: 'Équipe OpenG7 – Fatima',
        content:
          'Inscrire le dossier à revisiter lors de la revue semestrielle des projets hydrogène.',
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
export class LinkupStore {
  private readonly linkups: WritableSignal<readonly LinkupRecord[]> = signal(DEMO_LINKUPS);
  readonly filterStatus = signal<LinkupStatus | 'all'>('all');
  readonly filterMode = signal<LinkupTradeMode | 'all'>('all');
  readonly searchTerm = signal('');

  readonly items = computed(() => this.linkups());

  readonly statusCounts = computed(() => {
    const counts: Record<LinkupStatus, number> = {
      pending: 0,
      inDiscussion: 0,
      completed: 0,
      closed: 0,
    };
    for (const linkup of this.linkups()) {
      counts[linkup.status]++;
    }
    return counts as Readonly<Record<LinkupStatus, number>>;
  });

  readonly filteredLinkups = computed(() => {
    const statusFilter = this.filterStatus();
    const tradeModeFilter = this.filterMode();
    const search = this.searchTerm().trim().toLowerCase();

    return this.linkups().filter((linkup) => {
      if (statusFilter !== 'all' && linkup.status !== statusFilter) {
        return false;
      }
      if (tradeModeFilter !== 'all' && linkup.tradeMode !== tradeModeFilter) {
        return false;
      }
      if (!search) {
        return true;
      }
      return this.matchesSearch(linkup, search);
    });
  });

  readonly hasActiveFilters = computed(() => {
    return (
      this.filterStatus() !== 'all' ||
      this.filterMode() !== 'all' ||
      Boolean(this.searchTerm().trim())
    );
  });

  setStatusFilter(status: LinkupStatus | 'all'): void {
    this.filterStatus.set(status);
  }

  setTradeModeFilter(tradeMode: LinkupTradeMode | 'all'): void {
    this.filterMode.set(tradeMode);
  }

  setSearchTerm(term: string): void {
    this.searchTerm.set(term);
  }

  resetFilters(): void {
    this.filterStatus.set('all');
    this.filterMode.set('all');
    this.searchTerm.set('');
  }

  getLinkupById(id: string): LinkupRecord | null {
    return this.linkups().find((item) => item.id === id) ?? null;
  }

  private matchesSearch(linkup: LinkupRecord, query: string): boolean {
    const haystacks: string[] = [
      linkup.companyA.name,
      linkup.companyA.province,
      linkup.companyA.sector,
      linkup.companyB.name,
      linkup.companyB.province,
      linkup.companyB.sector,
      linkup.primarySector,
      linkup.summary,
    ];

    for (const haystack of haystacks) {
      if (haystack.toLowerCase().includes(query)) {
        return true;
      }
    }
    return false;
  }
}
