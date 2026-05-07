import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FiltersService } from '@app/core/filters.service';
import type { SectorType } from '@app/core/models/opportunity';
import { Og7MapFrameComponent } from '@app/shared/components/map-frame/og7-map-frame.component';
import { Flow, MapActions, selectFilteredFlows } from '@app/state';
import { AppState } from '@app/state/app.state';
import { selectSectors } from '@app/state/catalog/catalog.selectors';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { HomeOpenlayersMapComponent } from './home-openlayers-map.component';

interface MapDecisionDrilldownVm {
  readonly sectorId: string;
  readonly label: string;
  readonly tradeValue: number;
  readonly currency: string;
  readonly flowCount: number;
}

const MAP_DECISION_LIMIT = 3;

@Component({
  selector: 'og7-home-map-section',
  standalone: true,
  imports: [CommonModule, TranslateModule, Og7MapFrameComponent, HomeOpenlayersMapComponent],
  templateUrl: './home-map-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/home/feature » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Home Map Section ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HomeMapSectionComponent gérée par le framework.
 */
export class HomeMapSectionComponent {
  private readonly router = inject(Router);
  private readonly store = inject(Store<AppState>);
  private readonly filters = inject(FiltersService);
  private readonly flows = this.store.selectSignal(selectFilteredFlows);
  private readonly sectors = this.store.selectSignal(selectSectors);

  protected readonly decisionDrilldowns = computed<ReadonlyArray<MapDecisionDrilldownVm>>(() => {
    const sectorLabels = new Map(this.sectors().map((sector) => [sector.id, sector.name] as const));
    const grouped = new Map<string, Omit<MapDecisionDrilldownVm, 'label'>>();

    for (const flow of this.flows()) {
      for (const sectorId of this.collectSectorIds(flow)) {
        const current = grouped.get(sectorId) ?? {
          sectorId,
          tradeValue: 0,
          currency: flow.currency ?? 'CAD',
          flowCount: 0,
        };

        grouped.set(sectorId, {
          sectorId,
          tradeValue: current.tradeValue + (flow.value ?? 0),
          currency: flow.currency ?? current.currency,
          flowCount: current.flowCount + 1,
        });
      }
    }

    return Array.from(grouped.values())
      .map((entry) => ({
        ...entry,
        label: sectorLabels.get(entry.sectorId) ?? this.humanizeSectorId(entry.sectorId),
      }))
      .sort((left, right) => {
        const valueDiff = right.tradeValue - left.tradeValue;
        if (valueDiff !== 0) {
          return valueDiff;
        }
        return left.label.localeCompare(right.label);
      })
      .slice(0, MAP_DECISION_LIMIT);
  });

  protected readonly selectedDecisionDrilldown = computed<MapDecisionDrilldownVm | null>(() => {
    const sectorId = this.filters.activeSector();
    if (!sectorId) {
      return null;
    }

    return this.decisionDrilldowns().find((entry) => entry.sectorId === sectorId) ?? null;
  });

  protected isSelected(sectorId: string): boolean {
    return this.filters.activeSector() === sectorId;
  }

  protected selectDrilldown(sectorId: string): void {
    const nextSectorId = this.filters.activeSector() === sectorId ? null : (sectorId as SectorType);
    this.filters.activeSector.set(nextSectorId);
    this.store.dispatch(MapActions.activeSectorSelected({ sectorId: nextSectorId }));
  }

  protected openSelectedDrilldown(): void {
    const selected = this.selectedDecisionDrilldown();
    if (!selected) {
      return;
    }

    void this.router.navigate(['/feed'], {
      queryParams: {
        source: 'trade-map',
        sector: selected.sectorId,
        type: 'REQUEST',
      },
    });
  }

  protected formatTradeValue(drilldown: MapDecisionDrilldownVm): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: drilldown.currency || 'CAD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(drilldown.tradeValue);
  }

  private collectSectorIds(flow: Flow): string[] {
    const ids = new Set<string>();
    const primarySectorId = flow.sectorId?.trim();
    if (primarySectorId) {
      ids.add(primarySectorId);
    }

    if (Array.isArray(flow.sectorIds)) {
      for (const sectorId of flow.sectorIds) {
        const normalized = sectorId?.trim();
        if (normalized) {
          ids.add(normalized);
        }
      }
    }

    return Array.from(ids);
  }

  private humanizeSectorId(value: string): string {
    return value
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
