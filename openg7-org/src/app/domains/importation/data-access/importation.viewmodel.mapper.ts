import { Injectable } from '@angular/core';

import {
  ImportationCollaborationViewModel,
  ImportationCommodityRowViewModel,
  ImportationCommoditySectionViewModel,
  ImportationCommodityTab,
  ImportationFilters,
  ImportationFlowMapViewModel,
  ImportationFlowNodeViewModel,
  ImportationKnowledgeArticleCardViewModel,
  ImportationKnowledgeSectionViewModel,
  ImportationOverviewViewModel,
  ImportationRiskFlag,
  ImportationSupplierCardViewModel,
  ImportationSupplierSectionViewModel,
} from '../models/importation.models';

import {
  ImportationAnnotationDto,
  ImportationCommodityCollectionsDto,
  ImportationFlowsResponseDto,
  ImportationKnowledgeResponseDto,
  ImportationRiskFlagDto,
  ImportationSupplierDto,
  ImportationWatchlistDto,
} from './importation-api.client';

const GRANULARITY_OPTIONS: ImportationOverviewViewModel['filters']['granularityOptions'] = [
  { id: 'month', label: 'pages.importation.filters.period.month' },
  { id: 'quarter', label: 'pages.importation.filters.period.quarter' },
  { id: 'year', label: 'pages.importation.filters.period.year' },
];

const ORIGIN_OPTIONS: ImportationOverviewViewModel['filters']['originOptions'] = [
  {
    id: 'global',
    label: 'pages.importation.filters.origin.global',
    description: 'pages.importation.filters.origin.globalDescription',
  },
  {
    id: 'g7',
    label: 'pages.importation.filters.origin.g7',
    description: 'pages.importation.filters.origin.g7Description',
  },
  {
    id: 'usmca',
    label: 'pages.importation.filters.origin.usmca',
    description: 'pages.importation.filters.origin.usmcaDescription',
  },
  {
    id: 'european_union',
    label: 'pages.importation.filters.origin.eu',
    description: 'pages.importation.filters.origin.euDescription',
  },
  {
    id: 'indo_pacific',
    label: 'pages.importation.filters.origin.indo',
    description: 'pages.importation.filters.origin.indoDescription',
  },
  {
    id: 'custom',
    label: 'pages.importation.filters.origin.custom',
    description: 'pages.importation.filters.origin.customDescription',
  },
];

const HS_SECTION_OPTIONS: ImportationOverviewViewModel['filters']['hsSectionOptions'] = [
  { id: '01', label: 'pages.importation.filters.hs.sections.01' },
  { id: '02', label: 'pages.importation.filters.hs.sections.02' },
  { id: '07', label: 'pages.importation.filters.hs.sections.07' },
  { id: '15', label: 'pages.importation.filters.hs.sections.15' },
  { id: '27', label: 'pages.importation.filters.hs.sections.27' },
  { id: '84', label: 'pages.importation.filters.hs.sections.84' },
];

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Fournit les conversions entre DTO d’API et ViewModels consommés par la page Importation.
 * Raison d’être : Factorise les transformations et formatages pour garder le store léger.
 * @returns ImportationViewModelMapper géré par le framework.
 */
export class ImportationViewModelMapper {
  mapOverview(
    filters: ImportationFilters,
    flows: ImportationFlowsResponseDto | null,
    timelinePoint: string | null,
    riskFlags: readonly ImportationRiskFlagDto[],
    canExport: boolean,
  ): ImportationOverviewViewModel {
    const timeline = flows?.timeline ?? [];
    const activeTimeline = this.resolveTimelinePoint(timeline, timelinePoint);
    const totalValue = activeTimeline?.totalValue ?? 0;
    const yoyDelta = activeTimeline?.yoyDelta ?? null;
    const topOrigin = this.resolveTopOrigin(flows?.flows ?? []);
    const riskIndex = this.computeRiskIndex(riskFlags);

    return {
      title: 'pages.importation.title',
      breadcrumb: [
        { label: 'pages.importation.breadcrumb.dashboard', link: '/dashboard' },
        { label: 'pages.importation.breadcrumb.trade', link: '/statistics' },
        { label: 'pages.importation.breadcrumb.importation', link: null },
      ],
      meta: {
        lastUpdated: flows?.lastUpdated ?? null,
        dataProvider: flows?.dataProvider ?? null,
        coverageLabel: flows?.coverage != null ? this.formatPercentage(flows.coverage) : null,
      },
      filters: {
        filters,
        granularityOptions: GRANULARITY_OPTIONS,
        originOptions: ORIGIN_OPTIONS,
        hsSectionOptions: HS_SECTION_OPTIONS,
        selectedHsSections: filters.hsSections,
        originCodes: filters.originCodes,
      },
      kpis: [
        {
          id: 'totalValue',
          label: 'pages.importation.kpis.totalValue',
          value: this.formatCurrency(totalValue),
          trend: 'flat',
          sparkline: this.extractSparkline(timeline),
          tooltip: 'pages.importation.kpis.totalValueTooltip',
        },
        {
          id: 'yoyDelta',
          label: 'pages.importation.kpis.yoyDelta',
          value: yoyDelta != null ? this.formatPercentage(yoyDelta) : '—',
          delta: yoyDelta,
          trend: yoyDelta != null ? (yoyDelta >= 0 ? 'up' : 'down') : 'flat',
          sparkline: this.extractSparkline(timeline, (point) => point.yoyDelta ?? 0),
          tooltip: 'pages.importation.kpis.yoyDeltaTooltip',
        },
        {
          id: 'topOrigin',
          label: 'pages.importation.kpis.topOrigin',
          value: topOrigin?.originName ?? '—',
          delta: topOrigin?.yoyDelta ?? null,
          deltaLabel:
            topOrigin?.yoyDelta != null ? this.formatPercentage(topOrigin.yoyDelta) : null,
          trend: topOrigin?.yoyDelta != null ? (topOrigin.yoyDelta >= 0 ? 'up' : 'down') : 'flat',
          sparkline: [],
          tooltip: 'pages.importation.kpis.topOriginTooltip',
        },
        {
          id: 'riskIndex',
          label: 'pages.importation.kpis.riskIndex',
          value: riskIndex != null ? `${riskIndex.toFixed(1)}/5` : '—',
          delta: null,
          trend: 'flat',
          sparkline: [],
          tooltip: canExport ? 'pages.importation.kpis.riskIndexTooltip' : null,
        },
      ],
    } satisfies ImportationOverviewViewModel;
  }

  mapFlowMap(
    filters: ImportationFilters,
    flows: ImportationFlowsResponseDto | null,
    timelinePoint: string | null,
    playing: boolean,
    loading: boolean,
    error: string | null,
  ): ImportationFlowMapViewModel {
    const timeline = flows?.timeline ?? [];
    const activeTimeline = this.resolveTimelinePoint(timeline, timelinePoint);
    const selectedPoint = activeTimeline?.period ?? timeline[0]?.period ?? null;
    const nodes = (flows?.flows ?? []).map(
      (flow) =>
        ({
          originCode: flow.originCode,
          originName: flow.originName,
          value: flow.value,
          yoyDelta: flow.yoyDelta,
          share: flow.share,
          coordinate: flow.coordinate,
          corridors: (flow.corridors ?? []).map((corridor) => ({
            target: corridor.target,
            value: corridor.value,
            delta: corridor.delta,
          })),
        }) satisfies ImportationFlowNodeViewModel,
    );
    const values = nodes.map((node) => node.value);
    const legendMin = values.length ? Math.min(...values) : null;
    const legendMax = values.length ? Math.max(...values) : null;

    return {
      loading,
      error: error ? 'pages.importation.flow.error' : null,
      timeline: timeline.map((point) => ({
        id: point.period,
        label: point.label,
        totalValue: point.totalValue,
        yoyDelta: point.yoyDelta,
        isProjected: point.isProjected,
      })),
      selectedPoint,
      compareMode: filters.compareMode,
      compareTarget: filters.compareWith,
      playing,
      coverage: flows?.coverage ?? null,
      legendMin,
      legendMax,
      flows: nodes,
    } satisfies ImportationFlowMapViewModel;
  }

  mapCommoditySection(
    filters: ImportationFilters,
    collections: ImportationCommodityCollectionsDto | null,
    riskFlags: readonly ImportationRiskFlagDto[],
    activeTab: ImportationCommodityTab,
    selectedCommodityId: string | null,
    loading: boolean,
    canExport: boolean,
    error: string | null,
  ): ImportationCommoditySectionViewModel {
    const rows = this.pickCommodityCollection(collections, activeTab).map((commodity) =>
      this.toCommodityRow(commodity, riskFlags),
    );
    const selectedCommodity = rows.find((row) => row.id === selectedCommodityId) ?? null;

    return {
      loading,
      error: error ? 'pages.importation.commodities.error' : null,
      activeTab,
      tabs: [
        {
          id: 'top',
          label: 'pages.importation.commodities.tabs.top',
          count: collections?.top.length ?? 0,
        },
        {
          id: 'emerging',
          label: 'pages.importation.commodities.tabs.emerging',
          count: collections?.emerging.length ?? 0,
        },
        {
          id: 'risk',
          label: 'pages.importation.commodities.tabs.risk',
          count: collections?.risk.length ?? 0,
        },
      ],
      rows,
      selectedCommodityId,
      selectedCommodityFlags: selectedCommodity?.flags ?? [],
      canExport,
    } satisfies ImportationCommoditySectionViewModel;
  }

  mapSuppliers(
    suppliers: readonly ImportationSupplierDto[] | null,
    loading: boolean,
    error: string | null,
  ): ImportationSupplierSectionViewModel {
    const cards: ImportationSupplierCardViewModel[] = (suppliers ?? []).map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      dependencyScore: supplier.dependencyScore,
      diversificationScore: supplier.diversificationScore,
      reliability: supplier.reliability,
      country: supplier.country,
      lastReviewed: supplier.lastReviewed,
      recommendation: supplier.recommendation,
    }));

    return {
      loading,
      error: error ? 'pages.importation.suppliers.error' : null,
      suppliers: cards,
    } satisfies ImportationSupplierSectionViewModel;
  }

  mapCollaboration(
    watchlists: readonly ImportationWatchlistDto[] | null,
    annotations: readonly ImportationAnnotationDto[] | null,
    permissions: Pick<
      ImportationCollaborationViewModel,
      'canManageWatchlists' | 'canScheduleReports' | 'canViewCollaboration'
    >,
    loading: boolean,
    error: string | null,
  ): ImportationCollaborationViewModel {
    return {
      loading,
      error: error ? 'pages.importation.collaboration.error' : null,
      watchlists: (watchlists ?? []).map((watchlist) => ({
        id: watchlist.id,
        name: watchlist.name,
        owner: watchlist.owner,
        updatedAt: watchlist.updatedAt,
        filtersSummary: this.buildFiltersSummary(watchlist.filters),
      })),
      annotations: (annotations ?? []).map((annotation) => ({
        id: annotation.id,
        author: annotation.author,
        authorAvatarUrl: annotation.authorAvatarUrl,
        excerpt: annotation.excerpt,
        createdAt: annotation.createdAt,
        relatedLabel: annotation.relatedCommodityId ?? annotation.relatedOriginCode ?? undefined,
      })),
      ...permissions,
    } satisfies ImportationCollaborationViewModel;
  }

  mapKnowledge(
    response: ImportationKnowledgeResponseDto | null,
    loading: boolean,
    error: string | null,
  ): ImportationKnowledgeSectionViewModel {
    const articles: ImportationKnowledgeArticleCardViewModel[] = (response?.articles ?? []).map(
      (article) => ({
        id: article.id,
        title: article.title,
        summary: article.summary,
        publishedAt: article.publishedAt,
        link: article.link,
        tag: article.tag,
        thumbnailUrl: article.thumbnailUrl,
      }),
    );

    const cta = response?.cta
      ? {
          title: response.cta.title,
          subtitle: response.cta.subtitle,
          actionLabel: response.cta.actionLabel,
          actionLink: response.cta.actionLink,
        }
      : null;

    return {
      loading,
      error: error ? 'pages.importation.knowledge.error' : null,
      articles,
      cta,
    } satisfies ImportationKnowledgeSectionViewModel;
  }

  private resolveTimelinePoint(
    timeline: readonly {
      period: string;
      totalValue: number;
      yoyDelta: number | null;
      label: string;
      isProjected?: boolean;
    }[],
    target: string | null,
  ): {
    period: string;
    totalValue: number;
    yoyDelta: number | null;
    label: string;
    isProjected?: boolean;
  } | null {
    if (!timeline.length) {
      return null;
    }
    if (!target) {
      return timeline[0];
    }
    return timeline.find((point) => point.period === target) ?? timeline[0];
  }

  private resolveTopOrigin(
    flows: readonly {
      originCode: string;
      originName: string;
      value: number;
      yoyDelta: number | null;
    }[],
  ): { originCode: string; originName: string; value: number; yoyDelta: number | null } | null {
    if (!flows.length) {
      return null;
    }
    return [...flows].sort((a, b) => (b.value ?? 0) - (a.value ?? 0))[0];
  }

  private computeRiskIndex(flags: readonly ImportationRiskFlag[]): number | null {
    if (!flags.length) {
      return null;
    }
    const score = flags.reduce((acc, flag) => {
      switch (flag.severity) {
        case 'high':
          return acc + 5;
        case 'medium':
          return acc + 3;
        default:
          return acc + 1;
      }
    }, 0);
    return score / flags.length;
  }

  private extractSparkline(
    timeline: readonly { totalValue: number; yoyDelta: number | null }[],
    selector: (point: { totalValue: number; yoyDelta: number | null }) => number = (point) =>
      point.totalValue,
  ): readonly number[] {
    return timeline.slice(0, 12).map((point) => selector(point));
  }

  private toCommodityRow(
    commodity: {
      id: string;
      hsCode: string;
      label: string;
      value: number;
      yoyDelta: number | null;
      riskScore: number | null;
      sparkline: readonly number[];
      flags: readonly string[];
    },
    riskFlags: readonly ImportationRiskFlag[],
  ): ImportationCommodityRowViewModel {
    const flags = riskFlags.filter(
      (flag) => flag.relatedCommodityId === commodity.id || commodity.flags.includes(flag.id),
    );
    return {
      id: commodity.id,
      hsCode: commodity.hsCode,
      label: commodity.label,
      value: commodity.value,
      yoyDelta: commodity.yoyDelta,
      riskScore: commodity.riskScore,
      sparkline: commodity.sparkline,
      flags,
    } satisfies ImportationCommodityRowViewModel;
  }

  private pickCommodityCollection(
    collections: ImportationCommodityCollectionsDto | null,
    tab: ImportationCommodityTab,
  ): ImportationCommodityCollectionsDto['top'] {
    if (!collections) {
      return [];
    }
    switch (tab) {
      case 'emerging':
        return collections.emerging;
      case 'risk':
        return collections.risk;
      default:
        return collections.top;
    }
  }

  private buildFiltersSummary(filters: ImportationFilters): string {
    const sections = filters.hsSections.length ? filters.hsSections.join(', ') : '—';
    const origin =
      filters.originScope === 'custom' && filters.originCodes.length
        ? filters.originCodes.join(', ')
        : `@${filters.originScope}`;
    const period = `${filters.periodGranularity}:${filters.periodValue ?? 'latest'}`;
    return `${period} • ${origin} • HS ${sections}`;
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'CAD',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }
}
