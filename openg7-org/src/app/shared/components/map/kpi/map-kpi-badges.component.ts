import { animate, style, transition, trigger } from '@angular/animations';
import { CommonModule, NgClass, NgFor } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
} from '@angular/core';
import { FiltersService, TradeModeFilter } from '@app/core/filters.service';
import {
  DEFAULT_MAP_KPI_SNAPSHOT,
  Flow,
  MapKpiComputed,
  MapKpiSnapshot,
  MapKpis,
  computeMapKpiSnapshot,
  selectFilteredFlows,
  selectMapKpis,
} from '@app/state';
import { AppState } from '@app/state/app.state';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

interface MapBadgeViewModel {
  id: string;
  labelKey: string;
  value: string;
  detailKey?: string;
}

interface TradeModeOption {
  id: TradeModeFilter;
  labelKey: string;
}

@Component({
  selector: 'og7-map-kpi-badges',
  standalone: true,
  imports: [NgFor, NgClass, TranslateModule, CommonModule],
  templateUrl: './map-kpi-badges.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    style: 'display:block;position:absolute;top:1.5rem;left:1.5rem;right:1.5rem;z-index:0;',
    'data-og7': 'map-kpi-badges',
  },
  animations: [
    trigger('badgePulse', [
      transition(':enter', [
        style({
          transform: 'scale(0.92)',
          filter: 'drop-shadow(0 0 0 rgba(37, 99, 235, 0))',
        }),
        animate(
          '220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({
            transform: 'scale(1)',
            filter: 'drop-shadow(0 0 1rem rgba(37, 99, 235, 0.28))',
          })
        ),
        animate(
          '200ms ease-out',
          style({
            filter: 'drop-shadow(0 0 0 rgba(37, 99, 235, 0))',
          })
        ),
      ]),
      transition('* => *', [
        style({
          transform: 'scale(1)',
          filter: 'drop-shadow(0 0 0 rgba(37, 99, 235, 0))',
        }),
        animate(
          '140ms ease-out',
          style({
            transform: 'scale(1.04)',
            filter: 'drop-shadow(0 0 0.85rem rgba(37, 99, 235, 0.28))',
          })
        ),
        animate(
          '220ms ease-in',
          style({
            transform: 'scale(1)',
            filter: 'drop-shadow(0 0 0 rgba(37, 99, 235, 0))',
          })
        ),
      ]),
    ]),
  ],
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/map/kpi » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Map Kpi Badges ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns MapKpiBadgesComponent gérée par le framework.
 */
export class MapKpiBadgesComponent {
  private readonly store = inject(Store<AppState>);
  protected readonly filters = inject(FiltersService);
  private readonly locale = inject(LOCALE_ID);

  private readonly flows = this.store.selectSignal(selectFilteredFlows);
  private readonly kpis = this.store.selectSignal(selectMapKpis);

  private readonly placeholderValue = '–';

  readonly tradeModeOptions: readonly TradeModeOption[] = [
    { id: 'all', labelKey: 'map.filters.tradeMode.all' },
    { id: 'export', labelKey: 'map.filters.tradeMode.export' },
    { id: 'import', labelKey: 'map.filters.tradeMode.import' },
  ];

  readonly badges = computed<MapBadgeViewModel[]>(() => {
    const partner = this.filters.tradePartner();
    const tradeMode = this.filters.tradeMode();
    const flowsByPartner = this.filterFlowsByPartner(this.flows(), partner);
    const flows = this.filterFlowsByTradeMode(flowsByPartner, tradeMode);
    const kpiDictionary = this.kpis();
    const fallback = this.resolveFallbackSnapshot(partner, kpiDictionary);
    const summary = computeMapKpiSnapshot(flows, fallback);

    return this.buildBadges(summary);
  });

  trackById = (_index: number, badge: MapBadgeViewModel) => badge.id;
  trackByTradeMode = (_index: number, option: TradeModeOption) => option.id;

  selectTradeMode(mode: TradeModeFilter) {
    this.filters.tradeMode.set(mode);
  }

  private filterFlowsByPartner(flows: Flow[], partner?: string | null): Flow[] {
    if (!partner) {
      return flows;
    }
    return flows.filter((flow) => !flow.partner || flow.partner === partner);
  }

  private filterFlowsByTradeMode(flows: Flow[], tradeMode: TradeModeFilter): Flow[] {
    if (tradeMode === 'all') {
      return flows;
    }
    return flows.filter((flow) => flow.tradeMode === tradeMode);
  }

  private resolveFallbackSnapshot(
    partner: string | null | undefined,
    dictionary: MapKpis
  ): MapKpiSnapshot | undefined {
    if (partner && dictionary[partner]) {
      return dictionary[partner];
    }
    if (dictionary.default) {
      return dictionary.default;
    }
    return undefined;
  }

  private buildBadges(summary: MapKpiComputed): MapBadgeViewModel[] {
    const valueBadge: MapBadgeViewModel = {
      id: 'trade-value',
      labelKey: 'map.badges.tradeValue',
      value:
        summary.tradeValue != null
          ? this.formatCurrency(summary.tradeValue, summary.tradeValueCurrency)
          : this.placeholderValue,
    };

    const volumeBadge: MapBadgeViewModel = {
      id: 'trade-volume',
      labelKey: 'map.badges.tradeVolume',
      value:
        summary.tradeVolume != null
          ? this.formatCompactNumber(summary.tradeVolume)
          : this.placeholderValue,
      detailKey: summary.tradeVolumeUnit
        ? this.formatVolumeUnit(summary.tradeVolumeUnit)
        : undefined,
    };

    const sectorBadge: MapBadgeViewModel = {
      id: 'sector-count',
      labelKey: 'map.badges.sectorCount',
      value:
        summary.sectorCount != null
          ? this.formatInteger(summary.sectorCount)
          : this.placeholderValue,
    };

    return [valueBadge, volumeBadge, sectorBadge];
  }

  private formatCurrency(value: number, currency?: string): string {
    const resolvedCurrency = currency ?? DEFAULT_MAP_KPI_SNAPSHOT.tradeValueCurrency;
    return new Intl.NumberFormat(this.locale, {
      style: 'currency',
      currency: resolvedCurrency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private formatCompactNumber(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }

  private formatInteger(value: number): string {
    return new Intl.NumberFormat(this.locale, {
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatVolumeUnit(unit: string): string {
    const normalized = unit.trim().toLowerCase().replace(/\s+/g, '-');
    return `map.badges.units.${normalized}`;
  }
}
