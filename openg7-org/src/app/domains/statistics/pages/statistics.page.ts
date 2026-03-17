import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { CountryCode, G7_COUNTRY_CODES } from '@app/core/models/country';
import { StatisticsIntrant, StatisticsScope } from '@app/core/models/statistics';
import { StatisticsActions } from '@app/store/statistics/statistics.actions';
import {
  selectStatisticsAvailableCountries,
  selectStatisticsAvailablePeriods,
  selectStatisticsAvailableProvinces,
  selectStatisticsError,
  selectStatisticsFilters,
  selectStatisticsHeroSnapshot,
  selectStatisticsInsights,
  selectStatisticsIsFallback,
  selectStatisticsLoading,
  selectStatisticsSummaries,
} from '@app/store/statistics/statistics.selectors';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  standalone: true,
  selector: 'og7-statistics-page',
  imports: [CommonModule, RouterModule, TranslateModule],
  styleUrls: ['./statistics.page.scss'],
  templateUrl: './statistics.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargee par le routeur Angular pour afficher la page « Statistics » du dossier « domains/statistics/pages ».
 * Raison d'etre : Lie le template standalone et les dependances de cette page pour la rendre navigable.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns StatisticsPage geree par le framework.
 */
export class StatisticsPage {
  private readonly store = inject(Store);
  readonly loadingSig = toSignal(this.store.select(selectStatisticsLoading), { initialValue: false });
  readonly errorSig = toSignal(this.store.select(selectStatisticsError), { initialValue: null as string | null });
  readonly isFallbackSig = toSignal(this.store.select(selectStatisticsIsFallback), { initialValue: false });

  readonly filtersSig = toSignal(this.store.select(selectStatisticsFilters), {
    initialValue: { scope: 'interprovincial', intrant: 'all', period: null, province: null, country: null },
  });
  readonly summariesSig = toSignal(this.store.select(selectStatisticsSummaries), { initialValue: [] });
  readonly insightsSig = toSignal(this.store.select(selectStatisticsInsights), { initialValue: [] });
  readonly snapshotSig = toSignal(this.store.select(selectStatisticsHeroSnapshot), { initialValue: null });
  protected readonly guidanceAsideId = 'statistics-guidance-heading';
  protected readonly alertAsideId = 'statistics-alert-heading';
  readonly loadingSkeletons = Array.from({ length: 6 }, (_, index) => index);
  readonly intrantFilters = [
    { id: 'all' as StatisticsIntrant, label: 'pages.statistics.filters.all' },
    { id: 'energy' as StatisticsIntrant, label: 'pages.statistics.filters.energy' },
    { id: 'agriculture' as StatisticsIntrant, label: 'pages.statistics.filters.agriculture' },
    { id: 'manufacturing' as StatisticsIntrant, label: 'pages.statistics.filters.manufacturing' },
    { id: 'services' as StatisticsIntrant, label: 'pages.statistics.filters.services' },
  ];

  private readonly periodsSig = toSignal(this.store.select(selectStatisticsAvailablePeriods), { initialValue: [] as string[] });
  private readonly provincesSig = toSignal(this.store.select(selectStatisticsAvailableProvinces), {
    initialValue: [] as string[],
  });
  private readonly countriesSig = toSignal(this.store.select(selectStatisticsAvailableCountries), {
    initialValue: [] as CountryCode[],
  });

  constructor() {
    this.store.dispatch(StatisticsActions.initialize());
  }

  formatNumber(value: number | null | undefined): string {
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    }
    return '--';
  }

  setScope(scope: StatisticsScope) {
    const filters = this.filtersSig();
    if (filters.scope === scope) {
      return;
    }
    this.store.dispatch(StatisticsActions.changeScope({ scope }));
  }

  setIntrant(intrant: StatisticsIntrant) {
    const filters = this.filtersSig();
    if (filters.intrant === intrant) {
      return;
    }
    this.store.dispatch(StatisticsActions.changeIntrant({ intrant }));
  }

  onPeriodChange(value: string) {
    const next = value?.trim() ? value : null;
    const filters = this.filtersSig();
    if (filters.period === next) {
      return;
    }
    this.store.dispatch(StatisticsActions.changePeriod({ period: next }));
  }

  onProvinceChange(value: string) {
    const next = value?.trim() ? value : null;
    const filters = this.filtersSig();
    if (filters.province === next) {
      return;
    }
    this.store.dispatch(StatisticsActions.changeProvince({ province: next }));
  }

  onCountryChange(value: string) {
    const trimmed = value?.trim().toUpperCase();
    const next = trimmed && (G7_COUNTRY_CODES as readonly string[]).includes(trimmed)
      ? (trimmed as CountryCode)
      : null;
    const filters = this.filtersSig();
    if (filters.country === next) {
      return;
    }
    this.store.dispatch(StatisticsActions.changeCountry({ country: next }));
  }

  periodOptions(): readonly string[] {
    return this.periodsSig();
  }

  provinceOptions(): readonly string[] {
    return this.provincesSig();
  }

  countryOptions(): readonly CountryCode[] {
    return this.countriesSig();
  }

  retryLoad() {
    this.store.dispatch(StatisticsActions.loadStatistics({ filters: this.filtersSig() }));
  }

  resetFilters() {
    this.store.dispatch(StatisticsActions.resetFilters());
  }

  summaryTrendWidth(change: number | null | undefined): number {
    if (typeof change !== 'number') {
      return 24;
    }

    return Math.max(20, Math.min(92, 42 + Math.abs(change) * 5));
  }

  trackSummary = (_: number, summary: { id: number }) => summary.id;
  trackInsight = (_: number, insight: { id: number }) => insight.id;
  trackLoadingSkeleton = (_: number, item: number) => item;
}
