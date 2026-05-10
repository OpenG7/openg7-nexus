import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import {
  ImportationKpiTile,
  ImportationOverviewViewModel,
  ImportationOriginScope,
  ImportationPeriodGranularity,
} from '../../models/importation.models';

@Component({
  standalone: true,
  selector: 'og7-importation-overview-header',
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './importation-overview-header.component.html',
  styleUrls: ['./importation-overview-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Composant de présentation du bandeau d’introduction et des filtres rapides.
 * Raison d’être : Offre les contrôles de période, d’origine et de sections HS ainsi que l’affichage des KPI.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ImportationOverviewHeaderComponent géré par le framework.
 */
export class ImportationOverviewHeaderComponent implements OnChanges {
  @Input({ required: true }) viewModel!: ImportationOverviewViewModel;

  @Output() periodGranularityChange = new EventEmitter<ImportationPeriodGranularity>();
  @Output() periodValueChange = new EventEmitter<string | null>();
  @Output() originScopeChange = new EventEmitter<ImportationOriginScope>();
  @Output() originCodesChange = new EventEmitter<readonly string[]>();
  @Output() hsSectionToggle = new EventEmitter<string>();
  @Output() compareModeToggle = new EventEmitter<void>();
  @Output() compareWithChange = new EventEmitter<string | null>();

  periodValueDraft = '';
  originCodesDraft = '';
  compareWithDraft = '';

  periodValueErrorKey: string | null = null;
  originCodesErrorKey: string | null = null;
  compareWithErrorKey: string | null = null;

  sparklineHeight(tile: ImportationKpiTile, index: number): number {
    if (!tile.sparkline.length) {
      return 0;
    }
    const max = Math.max(...tile.sparkline);
    if (max === 0) {
      return 0;
    }
    const value = tile.sparkline[index] ?? 0;
    return Math.max(6, Math.round((value / max) * 100));
  }

  trackKpi = (_: number, item: ImportationKpiTile) => item.id;
  trackOption = (_: number, item: { id: string }) => item.id;

  onGranularitySelect(option: ImportationPeriodGranularity): void {
    this.periodGranularityChange.emit(option);
  }

  onOriginScopeSelect(scope: ImportationOriginScope): void {
    this.originCodesErrorKey = null;
    this.originScopeChange.emit(scope);
  }

  applyPeriodValue(): void {
    const normalized = this.normalizePeriodValue(this.periodValueDraft);
    if (!normalized) {
      this.periodValueErrorKey = null;
      this.periodValueChange.emit(null);
      return;
    }

    const validationError = this.validatePeriodValue(
      normalized,
      this.viewModel.filters.filters.periodGranularity,
    );
    if (validationError) {
      this.periodValueErrorKey = validationError;
      return;
    }

    this.periodValueErrorKey = null;
    this.periodValueDraft = normalized;
    this.periodValueChange.emit(normalized);
  }

  applyOriginCodes(): void {
    const normalized = this.originCodesDraft
      .split(',')
      .map((code) => code.trim().toUpperCase())
      .filter((code) => Boolean(code));

    if (!normalized.length) {
      this.originCodesErrorKey = null;
      this.originCodesChange.emit([]);
      return;
    }

    const hasInvalidCode = normalized.some((code) => !/^[A-Z]{2}$/.test(code));
    if (hasInvalidCode) {
      this.originCodesErrorKey = 'pages.importation.filters.validation.originCodes';
      return;
    }

    this.originCodesErrorKey = null;
    this.originCodesDraft = normalized.join(', ');
    this.originCodesChange.emit(normalized);
  }

  onHsSectionToggle(section: string): void {
    this.hsSectionToggle.emit(section);
  }

  onCompareToggle(): void {
    this.compareModeToggle.emit();
  }

  applyCompareWith(): void {
    const normalized = this.normalizePeriodValue(this.compareWithDraft);
    if (!normalized) {
      this.compareWithErrorKey = null;
      this.compareWithChange.emit(null);
      return;
    }

    const validationError = this.validatePeriodValue(
      normalized,
      this.viewModel.filters.filters.periodGranularity,
    );
    if (validationError) {
      this.compareWithErrorKey = 'pages.importation.filters.validation.compareWith';
      return;
    }

    this.compareWithErrorKey = null;
    this.compareWithDraft = normalized;
    this.compareWithChange.emit(normalized);
  }

  clearPeriodError(): void {
    this.periodValueErrorKey = null;
  }

  clearOriginCodesError(): void {
    this.originCodesErrorKey = null;
  }

  clearCompareError(): void {
    this.compareWithErrorKey = null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['viewModel']) {
      return;
    }

    const filters = this.viewModel.filters.filters;
    this.periodValueDraft = filters.periodValue ?? '';
    this.originCodesDraft = this.viewModel.filters.originCodes.join(', ');
    this.compareWithDraft = filters.compareWith ?? '';
  }

  private normalizePeriodValue(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    if (!trimmed) {
      return null;
    }
    return trimmed.toUpperCase();
  }

  private validatePeriodValue(
    value: string,
    granularity: ImportationPeriodGranularity,
  ): string | null {
    if (granularity === 'month') {
      return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
        ? null
        : 'pages.importation.filters.validation.periodMonth';
    }

    if (granularity === 'quarter') {
      return /^\d{4}-Q[1-4]$/.test(value)
        ? null
        : 'pages.importation.filters.validation.periodQuarter';
    }

    return /^\d{4}$/.test(value) ? null : 'pages.importation.filters.validation.periodYear';
  }
}
