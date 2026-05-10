import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  ImportationFlowMapViewModel,
  ImportationTimelinePoint,
} from '../../models/importation.models';

@Component({
  standalone: true,
  selector: 'og7-importation-flow-map-panel',
  imports: [CommonModule, TranslateModule],
  templateUrl: './importation-flow-map-panel.component.html',
  styleUrls: ['./importation-flow-map-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Visualise la carte des flux, la timeline et les corridors agrégés.
 * Raison d’être : Offre les interactions de drilldown sur l’origine et de sélection temporelle.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ImportationFlowMapPanelComponent géré par le framework.
 */
export class ImportationFlowMapPanelComponent {
  @Input({ required: true }) viewModel!: ImportationFlowMapViewModel;

  @Output() timelineSelect = new EventEmitter<string>();
  @Output() timelinePlayToggle = new EventEmitter<void>();
  @Output() originSelect = new EventEmitter<string>();
  @Output() compareTargetChange = new EventEmitter<string>();

  trackTimeline = (_: number, item: ImportationTimelinePoint) => item.id;
  trackFlow = (_: number, item: { originCode: string }) => item.originCode;

  onTimelineSelect(id: string): void {
    this.timelineSelect.emit(id);
  }

  onTogglePlayback(): void {
    this.timelinePlayToggle.emit();
  }

  onOriginClick(code: string): void {
    this.originSelect.emit(code);
  }

  onCompareTargetChange(value: string): void {
    if (!value) {
      return;
    }
    this.compareTargetChange.emit(value);
  }

  formatValue(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '—';
    }
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
  }

  formatShare(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '—';
    }
    return `${(value * 100).toFixed(1)}%`;
  }

  formatDelta(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '';
    }
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  }
}
