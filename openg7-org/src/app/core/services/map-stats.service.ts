import { Injectable } from '@angular/core';
import { StatMetric } from '@app/shared/components/hero/hero-stats/hero-stats.component';
import { Flow, MapKpiSnapshot, MapKpis, computeMapKpiSnapshot } from '@app/state';

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Map Stats ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns MapStatsService gérée par le framework.
 */
export class MapStatsService {
  /**
   * Contexte : Invoked by the trade map dashboard when assembling KPI cards for a selected partner.
   * Raison d’être : Aggregates flow data into presentation-ready metrics with sensible fallbacks.
   * @param flows Collection of flow records filtered for the current view.
   * @param kpis Precomputed KPI dictionary used as fallback snapshots.
   * @param partner Optional partner identifier narrowing the KPI scope.
   * @returns Array of metrics ready for the hero stats component.
   */
  buildMetrics(flows: Flow[], kpis: MapKpis, partner?: string | null): StatMetric[] {
    const relevantFlows = this.filterFlowsByPartner(flows, partner);
    const fallback = this.resolveFallbackSnapshot(partner, kpis);
    const summary = computeMapKpiSnapshot(relevantFlows, fallback);

    return [
      {
        id: 'tradeValue',
        labelKey: 'metrics.tradeValue',
        value: summary.tradeValue ?? 0,
        kind: 'money',
        color: 'bg-sky-500',
        series: this.buildValueSeries(relevantFlows),
      },
      {
        id: 'exchangeQty',
        labelKey: 'metrics.exchangeQty',
        value: summary.tradeVolume ?? 0,
        kind: 'count',
        suffixKey:
          summary.tradeVolume != null
            ? this.resolveVolumeSuffix(summary.tradeVolumeUnit)
            : undefined,
        color: 'bg-amber-500',
        series: this.buildQuantitySeries(relevantFlows),
      },
      {
        id: 'sectors',
        labelKey: 'metrics.sectors',
        value: summary.sectorCount ?? 0,
        kind: 'count',
        color: 'bg-emerald-500',
        series: this.buildSectorSeries(relevantFlows),
      },
    ];
  }

  private filterFlowsByPartner(flows: Flow[], partner?: string | null): Flow[] {
    if (!partner) {
      return flows;
    }
    return flows.filter((flow) => !flow.partner || flow.partner === partner);
  }

  private resolveFallbackSnapshot(
    partner: string | null | undefined,
    dictionary: MapKpis,
  ): MapKpiSnapshot | undefined {
    if (partner && dictionary[partner]) {
      return dictionary[partner];
    }
    return dictionary.default;
  }

  private buildValueSeries(flows: Flow[]): number[] | undefined {
    const values = flows
      .map((flow) => flow.value)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return values.length >= 2 ? values : undefined;
  }

  private buildQuantitySeries(flows: Flow[]): number[] | undefined {
    const quantities = flows
      .map((flow) => flow.quantity)
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return quantities.length >= 2 ? quantities : undefined;
  }

  private buildSectorSeries(flows: Flow[]): number[] | undefined {
    if (!flows.length) {
      return undefined;
    }

    const seen = new Set<string>();
    const progression: number[] = [];

    for (const flow of flows) {
      if (typeof flow.sectorId === 'string' && flow.sectorId.trim().length > 0) {
        seen.add(flow.sectorId);
      }
      if (Array.isArray(flow.sectorIds)) {
        for (const id of flow.sectorIds) {
          if (typeof id === 'string' && id.trim().length > 0) {
            seen.add(id);
          }
        }
      }
      progression.push(seen.size);
    }

    return progression.length >= 2 ? progression : undefined;
  }

  private resolveVolumeSuffix(unit?: string | null): string | undefined {
    if (!unit) {
      return undefined;
    }
    const normalized = unit.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized) {
      return undefined;
    }
    if (normalized === 'transactions') {
      return 'metrics.transactions';
    }
    return `map.badges.units.${normalized}`;
  }
}
