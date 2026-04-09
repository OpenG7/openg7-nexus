import { Injectable, computed, inject, signal } from '@angular/core';

import { FiltersService } from '../filters.service';

export interface TariffImpact {
  readonly id: string;
  readonly rate: number;
  readonly label: {
    readonly fr: string;
    readonly en: string;
  };
  readonly sectors: readonly string[];
}

const TARIFF_DATA: readonly TariffImpact[] = [
  {
    id: 'steel-aluminum',
    rate: 0.5,
    label: {
      fr: 'Acier et aluminium',
      en: 'Steel and aluminum',
    },
    sectors: ['manufacturing', 'construction'],
  },
  {
    id: 'copper',
    rate: 0.5,
    label: {
      fr: 'Cuivre',
      en: 'Copper',
    },
    sectors: ['mining', 'energy'],
  },
  {
    id: 'softwood-lumber',
    rate: 0.45,
    label: {
      fr: "Bois d'œuvre",
      en: 'Softwood lumber',
    },
    sectors: ['construction', 'agri-food'],
  },
  {
    id: 'non-aceum-products',
    rate: 0.35,
    label: {
      fr: 'Produits hors ACEUM',
      en: 'Non-CUSMA products',
    },
    sectors: ['digital-services', 'life-sciences', 'transport-logistics'],
  },
  {
    id: 'automotive',
    rate: 0.25,
    label: {
      fr: 'Automobile',
      en: 'Automotive',
    },
    sectors: ['manufacturing'],
  },
  {
    id: 'energy',
    rate: 0.1,
    label: {
      fr: 'Pétrole, gaz et potasse',
      en: 'Oil, gas and potash',
    },
    sectors: ['energy'],
  },
];

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Tariff Query ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns TariffQueryService gérée par le framework.
 */
export class TariffQueryService {
  private readonly filters = inject(FiltersService);

  private readonly tariffs = signal<readonly TariffImpact[]>(TARIFF_DATA);

  readonly filteredTariffs = computed(() => {
    const sector = this.filters.tradeFilters().sector;
    const entries = this.tariffs();
    if (!sector) {
      return entries;
    }
    return entries.filter((entry) => entry.sectors.includes(sector));
  });
}
