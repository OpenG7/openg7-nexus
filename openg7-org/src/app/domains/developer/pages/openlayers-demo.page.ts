import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { NgxMapLibreGLModule } from '@maplibre/ngx-maplibre-gl';
import { TranslateModule, TranslateService, type TranslationObject } from '@ngx-translate/core';
import type { FeatureCollection, LineString, Point, Polygon } from 'geojson';
import type {
  CircleLayerSpecification,
  ExpressionSpecification,
  FillLayerSpecification,
  LineLayerSpecification,
  Map as MapLibreMap,
} from 'maplibre-gl';
import { createEmpty, extend as extendExtent } from 'ol/extent.js';
import type { Extent } from 'ol/extent.js';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import TopoJSON from 'ol/format/TopoJSON.js';
import type Geometry from 'ol/geom/Geometry.js';
import OLPoint from 'ol/geom/Point.js';
import VectorLayer from 'ol/layer/Vector.js';
import Map from 'ol/Map.js';
import { unByKey } from 'ol/Observable.js';
import { fromLonLat } from 'ol/proj.js';
import VectorSource from 'ol/source/Vector.js';
import { Fill, Circle as CircleStyle, Stroke, Style, Text } from 'ol/style.js';
import View from 'ol/View.js';

type DemoSector = 'energy' | 'manufacturing' | 'agri-food';

interface DemoCorridor {
  id: string;
  routeLabel: string;
  sector: DemoSector;
  partner: string;
  monthlyValueMcad: number;
  reliability: number;
  globalScore: number;
  reservedCapacityMw: number;
  optimizationWindowDays: number;
  keyInsight: string;
  recommendation: string;
  risk: 'Low' | 'Medium';
}

interface InteractionState {
  key: string;
  params?: Record<string, string>;
}

interface LoadedTranslations {
  readonly en: TranslationObject;
  readonly fr: TranslationObject;
}

interface MapLibreLayerEventLike {
  readonly features?: ReadonlyArray<{
    readonly properties?: {
      readonly corridorId?: string;
    };
  }>;
}

const DEMO_CORRIDORS: readonly DemoCorridor[] = [
  {
    id: 'flow-energy',
    routeLabel: 'Quebec -> Ontario',
    sector: 'energy',
    partner: 'Hydro Export',
    monthlyValueMcad: 42,
    reliability: 97,
    globalScore: 87,
    reservedCapacityMw: 1250,
    optimizationWindowDays: 14,
    keyInsight: 'Capacity reserve is sufficient for the expected winter demand window.',
    recommendation: 'Accelerate reserve capacity procurement before winter peaks.',
    risk: 'Low',
  },
  {
    id: 'flow-battery',
    routeLabel: 'Alberta -> Ontario',
    sector: 'manufacturing',
    partner: 'Battery Corridor Alliance',
    monthlyValueMcad: 31,
    reliability: 89,
    globalScore: 79,
    reservedCapacityMw: 840,
    optimizationWindowDays: 21,
    keyInsight: 'Supplier concentration is acceptable, but the cathode window needs an earlier lock.',
    recommendation: 'Lock cathode supply windows for the next twelve weeks.',
    risk: 'Medium',
  },
  {
    id: 'flow-food',
    routeLabel: 'BC -> Ontario',
    sector: 'agri-food',
    partner: 'Pacific Cold Chain',
    monthlyValueMcad: 18,
    reliability: 92,
    globalScore: 74,
    reservedCapacityMw: 430,
    optimizationWindowDays: 9,
    keyInsight: 'Cold-chain availability is the strongest limiter during peak export weeks.',
    recommendation: 'Expand cold-chain slots to secure west-coast distribution.',
    risk: 'Low',
  },
  {
    id: 'flow-qc-usne',
    routeLabel: 'Quebec -> US NE',
    sector: 'energy',
    partner: 'Atlantic Grid Exchange',
    monthlyValueMcad: 24,
    reliability: 84,
    globalScore: 68,
    reservedCapacityMw: 610,
    optimizationWindowDays: 12,
    keyInsight: 'Cross-border demand is rising faster than the reserved interchange window.',
    recommendation: 'Pre-book interchange capacity before the next peak pricing cycle.',
    risk: 'Medium',
  },
] as const;

const DEMO_PROVINCES: FeatureCollection<Polygon> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'qc',
      properties: { provinceId: 'qc', label: 'Quebec' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-79.7, 62.0], [-71.2, 62.8], [-63.1, 61.8], [-58.0, 58.4], [-57.0, 52.4], [-58.2, 47.4], [-63.8, 45.2], [-74.1, 45.0], [-78.2, 48.4], [-79.7, 55.8], [-79.7, 62.0]]],
      },
    },
    {
      type: 'Feature',
      id: 'on',
      properties: { provinceId: 'on', label: 'Ontario' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-95.2, 56.9], [-88.5, 57.2], [-82.0, 55.8], [-79.2, 52.8], [-79.0, 49.0], [-76.2, 46.2], [-74.1, 45.2], [-79.6, 41.7], [-84.6, 42.0], [-89.8, 45.5], [-93.4, 50.0], [-95.2, 53.8], [-95.2, 56.9]]],
      },
    },
    {
      type: 'Feature',
      id: 'ab',
      properties: { provinceId: 'ab', label: 'Alberta' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-120.0, 60.0], [-111.0, 60.0], [-110.0, 57.0], [-110.0, 49.0], [-114.3, 49.0], [-116.6, 50.6], [-118.4, 53.4], [-119.5, 56.7], [-120.0, 60.0]]],
      },
    },
    {
      type: 'Feature',
      id: 'bc',
      properties: { provinceId: 'bc', label: 'British Columbia' },
      geometry: {
        type: 'Polygon',
        coordinates: [[[-139.0, 60.0], [-132.8, 59.6], [-128.4, 57.8], [-125.3, 55.4], [-123.9, 52.4], [-123.1, 49.2], [-120.1, 48.6], [-114.0, 49.0], [-114.0, 60.0], [-139.0, 60.0]]],
      },
    },
  ],
};

const DEMO_FLOWS: FeatureCollection<LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'flow-energy',
      properties: {
        corridorId: 'flow-energy',
        sector: 'energy',
        provinces: ['qc', 'on'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-71.208, 46.8139], [-73.5673, 45.5017], [-75.6972, 45.4215], [-79.3832, 43.6532]],
      },
    },
    {
      type: 'Feature',
      id: 'flow-battery',
      properties: {
        corridorId: 'flow-battery',
        sector: 'manufacturing',
        provinces: ['ab', 'mb', 'on'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-114.0719, 51.0447], [-104.6189, 50.4452], [-97.1384, 49.8951], [-89.2477, 48.3809], [-79.3832, 43.6532]],
      },
    },
    {
      type: 'Feature',
      id: 'flow-food',
      properties: {
        corridorId: 'flow-food',
        sector: 'agri-food',
        provinces: ['bc', 'ab', 'mb', 'on'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-123.1207, 49.2827], [-114.0719, 51.0447], [-97.1384, 49.8951], [-89.2477, 48.3809], [-79.3832, 43.6532]],
      },
    },
    {
      type: 'Feature',
      id: 'flow-qc-usne',
      properties: {
        corridorId: 'flow-qc-usne',
        sector: 'energy',
        provinces: ['qc', 'us-ct', 'us-ma', 'us-me', 'us-nh', 'us-ny', 'us-ri', 'us-vt'],
      },
      geometry: {
        type: 'LineString',
        coordinates: [[-71.208, 46.8139], [-73.5673, 45.5017], [-71.0589, 42.3601]],
      },
    },
  ],
};

const DEMO_HUBS: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      id: 'quebec-city',
      properties: { label: 'Quebec City', provinceId: 'qc' },
      geometry: { type: 'Point', coordinates: [-71.208, 46.8139] },
    },
    {
      type: 'Feature',
      id: 'montreal',
      properties: { label: 'Montreal', provinceId: 'qc' },
      geometry: { type: 'Point', coordinates: [-73.5673, 45.5017] },
    },
    {
      type: 'Feature',
      id: 'ottawa',
      properties: { label: 'Ottawa', provinceId: 'on' },
      geometry: { type: 'Point', coordinates: [-75.6972, 45.4215] },
    },
    {
      type: 'Feature',
      id: 'toronto',
      properties: { label: 'Toronto', provinceId: 'on' },
      geometry: { type: 'Point', coordinates: [-79.3832, 43.6532] },
    },
    {
      type: 'Feature',
      id: 'calgary',
      properties: { label: 'Calgary', provinceId: 'ab' },
      geometry: { type: 'Point', coordinates: [-114.0719, 51.0447] },
    },
    {
      type: 'Feature',
      id: 'winnipeg',
      properties: { label: 'Winnipeg', provinceId: 'mb' },
      geometry: { type: 'Point', coordinates: [-97.1384, 49.8951] },
    },
    {
      type: 'Feature',
      id: 'vancouver',
      properties: { label: 'Vancouver', provinceId: 'bc' },
      geometry: { type: 'Point', coordinates: [-123.1207, 49.2827] },
    },
    {
      type: 'Feature',
      id: 'boston',
      properties: { label: 'Boston', provinceId: 'us-ne' },
      geometry: { type: 'Point', coordinates: [-71.0589, 42.3601] },
    },
  ],
};

const MAPLIBRE_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const MAPLIBRE_DEFAULT_CENTER: [number, number] = [-95, 54];
const MAPLIBRE_DEFAULT_ZOOM = 3.15;
const MAPLIBRE_FALLBACK_BOUNDS: [[number, number], [number, number]] = [[-139, 41.7], [-57, 62.8]];
const BOUNDARY_TOPOJSON_URLS = [
  '/assets/geo/boundaries/canada-adm1.json',
  '/assets/geo/boundaries/usa-adm1.json',
] as const;
const USA_NORTHEAST_STATE_IDS = new Set(['us-ct', 'us-ma', 'us-me', 'us-nh', 'us-ny', 'us-ri', 'us-vt']);

@Component({
  standalone: true,
  selector: 'og7-openlayers-demo-page',
  imports: [CommonModule, RouterModule, TranslateModule, NgxMapLibreGLModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen bg-slate-950 px-3 py-4 text-white sm:px-5 lg:px-8" data-og7="ol-demo-page">
      <section class="mx-auto flex max-w-[96rem] flex-col gap-6">
        <div class="space-y-6">
          <div class="space-y-6">
            <section class="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-[0_28px_120px_-72px_rgba(14,165,233,0.85)]" data-og7="ol-demo-cockpit">
              <header class="flex flex-col gap-4 border-b border-white/10 bg-slate-950/95 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                <div class="flex min-w-0 items-center gap-3">
                  <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-300/30 bg-cyan-300/12 text-sm font-semibold text-cyan-100">
                    CI
                  </span>
                  <div class="min-w-0">
                    <p class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                      {{ 'pages.olDemo.kicker' | translate }}
                    </p>
                    <h1 class="truncate text-base font-semibold tracking-tight text-white sm:text-lg">
                      {{ 'pages.olDemo.title' | translate }}
                    </h1>
                  </div>
                </div>

                <nav class="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/5 p-1 text-sm text-slate-300" data-og7="ol-demo-tabs" aria-label="Corridor Intelligence">
                  <button
                    type="button"
                    class="rounded-lg bg-cyan-400/14 px-3 py-2 font-medium text-cyan-100 ring-1 ring-cyan-300/30"
                    data-og7="action"
                    data-og7-id="ol-demo-tab-corridor"
                    aria-current="page"
                  >
                    {{ 'pages.olDemo.nav.corridorView' | translate }}
                  </button>
                  <button type="button" class="rounded-lg px-3 py-2 font-medium transition hover:bg-white/8 hover:text-white" data-og7="action" data-og7-id="ol-demo-tab-comparison">
                    {{ 'pages.olDemo.nav.comparison' | translate }}
                  </button>
                  <button type="button" class="rounded-lg px-3 py-2 font-medium transition hover:bg-white/8 hover:text-white" data-og7="action" data-og7-id="ol-demo-tab-analytics">
                    {{ 'pages.olDemo.nav.analytics' | translate }}
                  </button>
                  <button type="button" class="rounded-lg px-3 py-2 font-medium transition hover:bg-white/8 hover:text-white" data-og7="action" data-og7-id="ol-demo-tab-reports">
                    {{ 'pages.olDemo.nav.reports' | translate }}
                  </button>
                  <button type="button" class="rounded-lg px-3 py-2 font-medium transition hover:bg-white/8 hover:text-white" data-og7="action" data-og7-id="ol-demo-tab-alerts">
                    {{ 'pages.olDemo.nav.alerts' | translate }}
                    <span class="ml-1 rounded-full bg-amber-300 px-1.5 py-0.5 text-[0.65rem] font-semibold text-slate-950">3</span>
                  </button>
                </nav>
              </header>

              <div class="grid lg:grid-cols-[minmax(0,1fr)_26rem]">
                <section class="relative min-h-[30rem] overflow-hidden sm:min-h-[34rem] lg:min-h-[42rem]">
                  <div #mapHost class="ol-demo-map h-[30rem] w-full sm:h-[34rem] lg:h-[42rem]" data-og7="ol-demo-map"></div>
                  <div class="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-slate-950 via-slate-950/58 to-transparent"></div>

                  <div class="absolute left-3 right-3 top-3 z-10 rounded-2xl border border-white/10 bg-slate-950/82 p-4 shadow-[0_22px_60px_-36px_rgba(2,6,23,0.95)] backdrop-blur sm:left-4 sm:right-auto sm:top-4 sm:w-[min(20rem,calc(100%-2rem))]">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <p class="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300">
                          {{ 'pages.olDemo.map.activeLabel' | translate }}
                        </p>
                        <p class="mt-2 text-base font-semibold text-white">{{ corridorRouteLabelKey(scoreboardCorridor()) | translate }}</p>
                      </div>
                      <span class="rounded-lg border border-emerald-300/25 bg-emerald-300/12 px-2.5 py-1 text-[0.7rem] font-medium text-emerald-200">
                        {{ 'pages.olDemo.map.activeStatus' | translate }}
                      </span>
                    </div>

                    <dl class="mt-4 hidden gap-3 text-sm sm:grid">
                      <div class="flex items-center justify-between gap-4">
                        <dt class="text-slate-400">{{ 'pages.olDemo.brief.partner' | translate }}</dt>
                        <dd class="text-right font-medium text-slate-100">{{ corridorPartnerKey(scoreboardCorridor()) | translate }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4">
                        <dt class="text-slate-400">{{ 'pages.olDemo.brief.sector' | translate }}</dt>
                        <dd class="text-right font-medium text-slate-100">{{ sectorLabelKey(scoreboardCorridor().sector) | translate }}</dd>
                      </div>
                      <div class="flex items-center justify-between gap-4">
                        <dt class="text-slate-400">{{ 'pages.olDemo.brief.updatedAt' | translate }}</dt>
                        <dd class="text-right font-medium text-slate-100">{{ 'pages.olDemo.map.updatedAt' | translate }}</dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      class="mt-4 flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/7 px-3 py-2 text-sm font-medium text-white transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
                      data-og7="action"
                      data-og7-id="ol-demo-reset-view"
                      (click)="resetView()"
                    >
                      <span>{{ 'pages.olDemo.actions.resetView' | translate }}</span>
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>

                  <div class="absolute bottom-32 left-3 z-10 flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-[0_18px_48px_-30px_rgba(2,6,23,0.9)] backdrop-blur sm:bottom-28 sm:left-4">
                    <button type="button" class="h-11 w-11 border-b border-white/10 text-xl text-slate-100 transition hover:bg-white/10" data-og7="action" data-og7-id="ol-demo-zoom-in" [attr.aria-label]="'pages.olDemo.actions.zoomIn' | translate" (click)="zoomIn()">+</button>
                    <button type="button" class="h-11 w-11 border-b border-white/10 text-xl text-slate-100 transition hover:bg-white/10" data-og7="action" data-og7-id="ol-demo-zoom-out" [attr.aria-label]="'pages.olDemo.actions.zoomOut' | translate" (click)="zoomOut()">-</button>
                    <button type="button" class="h-11 w-11 text-sm text-slate-100 transition hover:bg-white/10" data-og7="action" data-og7-id="ol-demo-clear-focus" [attr.aria-label]="'pages.olDemo.actions.clearFocus' | translate" (click)="clearSelection()">x</button>
                  </div>

                  <div class="absolute inset-x-4 bottom-4 z-10 flex justify-center">
                    <ul class="flex max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/82 px-3 py-3 text-[0.7rem] text-slate-300 shadow-[0_20px_60px_-36px_rgba(2,6,23,0.9)] backdrop-blur sm:gap-4 sm:px-4 sm:text-xs" data-og7="ol-demo-map-legend">
                      <li class="flex items-center gap-2">
                        <span class="h-2.5 w-2.5 rounded-full bg-cyan-300"></span>
                        <span>{{ 'pages.olDemo.legend.activeCorridor' | translate }}</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <span class="h-2.5 w-2.5 rounded-full bg-slate-400"></span>
                        <span>{{ 'pages.olDemo.legend.secondaryCorridor' | translate }}</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <span class="h-2.5 w-2.5 rounded-full bg-emerald-300"></span>
                        <span>{{ 'pages.olDemo.legend.province' | translate }}</span>
                      </li>
                      <li class="flex items-center gap-2">
                        <span class="h-2.5 w-2.5 rounded-full bg-amber-300"></span>
                        <span>{{ 'pages.olDemo.legend.hub' | translate }}</span>
                      </li>
                    </ul>
                  </div>
                </section>

                <aside class="border-t border-white/10 bg-slate-950/94 p-5 lg:border-l lg:border-t-0">
                  <div class="grid grid-cols-2 gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 sm:grid-cols-4 lg:grid-cols-4" data-og7="ol-demo-brief-tabs">
                    <button type="button" class="rounded-lg border border-cyan-300/35 bg-cyan-300/12 px-3 py-2 text-cyan-100">{{ 'pages.olDemo.panel.overview' | translate }}</button>
                    <button type="button" class="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/8 hover:text-white">{{ 'pages.olDemo.panel.performance' | translate }}</button>
                    <button type="button" class="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/8 hover:text-white">{{ 'pages.olDemo.panel.risks' | translate }}</button>
                    <button type="button" class="rounded-lg border border-white/10 px-3 py-2 transition hover:bg-white/8 hover:text-white">{{ 'pages.olDemo.panel.insights' | translate }}</button>
                  </div>

                  <div class="mt-7" data-og7="ol-demo-brief">
                    <ng-container *ngIf="activeCorridor(); else emptyBrief">
                      <div class="flex items-start justify-between gap-5">
                        <div>
                          <p class="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-300">
                            {{ 'pages.olDemo.brief.title' | translate }}
                          </p>
                          <h2 class="mt-3 text-2xl font-semibold tracking-tight text-white">{{ corridorRouteLabelKey(activeCorridor()) | translate }}</h2>
                        </div>
                        <div class="flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-3xl border border-cyan-300/15 bg-cyan-300/8">
                          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-300">{{ 'pages.olDemo.brief.globalScore' | translate }}</p>
                          <p class="mt-1 text-4xl font-semibold text-white">{{ activeCorridor()!.globalScore }}</p>
                          <p class="text-xs text-slate-300">/100</p>
                        </div>
                      </div>

                      <dl class="mt-6 grid gap-3 text-sm text-slate-300">
                        <div class="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <dt>{{ 'pages.olDemo.brief.partner' | translate }}</dt>
                          <dd class="text-right font-medium text-white">{{ corridorPartnerKey(activeCorridor()) | translate }}</dd>
                        </div>
                        <div class="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <dt>{{ 'pages.olDemo.brief.sector' | translate }}</dt>
                          <dd class="text-right font-medium text-white">{{ sectorLabelKey(activeCorridor()!.sector) | translate }}</dd>
                        </div>
                        <div class="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <dt>{{ 'pages.olDemo.brief.monthlyValue' | translate }}</dt>
                          <dd class="text-right font-medium text-emerald-300">{{ formatMonthlyValue(activeCorridor()!.monthlyValueMcad) }}</dd>
                        </div>
                        <div class="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <dt>{{ 'pages.olDemo.brief.reliability' | translate }}</dt>
                          <dd class="text-right font-medium text-white">{{ activeCorridor()!.reliability }}%</dd>
                        </div>
                        <div class="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <dt>{{ 'pages.olDemo.brief.risk' | translate }}</dt>
                          <dd class="rounded-lg px-2 py-1 text-right text-xs font-semibold"
                            [class.bg-emerald-300/12]="activeCorridor()!.risk === 'Low'"
                            [class.text-emerald-200]="activeCorridor()!.risk === 'Low'"
                            [class.bg-amber-300/12]="activeCorridor()!.risk === 'Medium'"
                            [class.text-amber-200]="activeCorridor()!.risk === 'Medium'"
                          >{{ riskLabelKey(activeCorridor()!.risk) | translate }}</dd>
                        </div>
                        <div class="flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                          <dt>{{ 'pages.olDemo.brief.reservedCapacity' | translate }}</dt>
                          <dd class="text-right font-medium text-white">{{ activeCorridor()!.reservedCapacityMw | number }} MW</dd>
                        </div>
                        <div class="flex items-center justify-between gap-4">
                          <dt>{{ 'pages.olDemo.brief.optimizationWindow' | translate }}</dt>
                          <dd class="text-right font-medium text-white">{{ 'pages.olDemo.brief.optimizationWindowValue' | translate: { days: activeCorridor()!.optimizationWindowDays } }}</dd>
                        </div>
                      </dl>

                      <div class="mt-6 rounded-2xl border border-cyan-300/20 bg-cyan-300/8 p-4">
                        <p class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-300">
                          {{ 'pages.olDemo.brief.keyInsight' | translate }}
                        </p>
                        <p class="mt-2 text-sm leading-6 text-slate-100">{{ corridorKeyInsightKey(activeCorridor()) | translate }}</p>
                      </div>
                    </ng-container>
                    <ng-template #emptyBrief>
                      <p class="text-sm leading-6 text-slate-300">
                        {{ 'pages.olDemo.brief.empty' | translate }}
                      </p>
                    </ng-template>
                  </div>
                </aside>
              </div>

              <div class="grid gap-3 border-t border-white/10 bg-slate-950 px-4 py-4 sm:grid-cols-2 lg:grid-cols-4" data-og7="ol-demo-kpi-rail">
                <article class="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ 'pages.olDemo.brief.monthlyValue' | translate }}</p>
                  <p class="mt-2 text-2xl font-semibold text-white">{{ formatMonthlyValue(scoreboardCorridor().monthlyValueMcad) }}</p>
                </article>
                <article class="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ 'pages.olDemo.brief.reliability' | translate }}</p>
                  <p class="mt-2 text-2xl font-semibold text-white">{{ scoreboardCorridor().reliability }}%</p>
                </article>
                <article class="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ 'pages.olDemo.brief.risk' | translate }}</p>
                  <p class="mt-2 text-2xl font-semibold text-white">{{ riskLabelKey(scoreboardCorridor().risk) | translate }}</p>
                </article>
                <article class="rounded-2xl border border-white/10 bg-white/6 p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{{ 'pages.olDemo.brief.reservedCapacity' | translate }}</p>
                  <p class="mt-2 text-2xl font-semibold text-white">{{ scoreboardCorridor().reservedCapacityMw | number }} MW</p>
                </article>
              </div>
            </section>

            <section class="ol-demo-scoreboard overflow-hidden rounded-[1.75rem] border border-slate-200/70 px-5 py-5 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.5)] sm:px-6 sm:py-6">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div class="max-w-3xl">
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200/90">
                    {{ 'pages.olDemo.scoreboard.kicker' | translate }}
                  </p>
                  <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                    {{ 'pages.olDemo.scoreboard.title' | translate }}
                  </h2>
                  <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                    {{ 'pages.olDemo.scoreboard.copy' | translate }}
                  </p>
                </div>

                <div class="inline-flex max-w-full items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                  {{ corridorRouteLabelKey(scoreboardCorridor()) | translate }}
                </div>
              </div>

              <div class="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)_minmax(0,1fr)] xl:items-stretch">
                <article class="scoreboard-province scoreboard-province-origin relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                  <p class="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-300">
                    {{ 'pages.olDemo.scoreboard.originLabel' | translate }}
                  </p>
                  <div class="mt-5 flex items-center justify-center">
                    <div class="scoreboard-province-badge scoreboard-province-badge-origin flex h-32 w-32 items-center justify-center rounded-4xl border border-white/15 text-4xl font-semibold tracking-[0.14em] text-white shadow-[0_22px_48px_-30px_rgba(103,232,249,0.7)]">
                      {{ scoreboardOriginAbbr() }}
                    </div>
                  </div>
                  <p class="mt-5 text-center text-2xl font-semibold tracking-tight text-white">
                    {{ scoreboardOriginName() }}
                  </p>
                  <p class="mt-2 text-center text-sm leading-6 text-slate-300">
                    {{ 'pages.olDemo.scoreboard.originCopy' | translate }}
                  </p>
                </article>

                <article class="scoreboard-center relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/78 p-5">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-cyan-200">
                        {{ 'pages.olDemo.scoreboard.centerLabel' | translate }}
                      </p>
                      <p class="mt-2 text-lg font-semibold text-white">
                        {{ corridorPartnerKey(scoreboardCorridor()) | translate }}
                      </p>
                    </div>
                    <span
                      class="rounded-full px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
                      [class.bg-cyan-100]="scoreboardCorridor().sector === 'energy'"
                      [class.text-cyan-700]="scoreboardCorridor().sector === 'energy'"
                      [class.bg-amber-100]="scoreboardCorridor().sector === 'manufacturing'"
                      [class.text-amber-700]="scoreboardCorridor().sector === 'manufacturing'"
                      [class.bg-emerald-100]="scoreboardCorridor().sector === 'agri-food'"
                      [class.text-emerald-700]="scoreboardCorridor().sector === 'agri-food'"
                    >{{ sectorLabelKey(scoreboardCorridor().sector) | translate }}</span>
                  </div>

                  <dl class="mt-6 space-y-4 text-sm text-slate-200">
                    <div class="scoreboard-stat-row flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                      <dt class="text-slate-400">{{ 'pages.olDemo.brief.monthlyValue' | translate }}</dt>
                      <dd class="text-right text-lg font-semibold text-white">{{ formatMonthlyValue(scoreboardCorridor().monthlyValueMcad) }}</dd>
                    </div>
                    <div class="scoreboard-stat-row flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                      <dt class="text-slate-400">{{ 'pages.olDemo.brief.reliability' | translate }}</dt>
                      <dd class="text-right text-lg font-semibold text-white">{{ scoreboardCorridor().reliability }}%</dd>
                    </div>
                    <div class="scoreboard-stat-row flex items-center justify-between gap-4 border-b border-white/8 pb-3">
                      <dt class="text-slate-400">{{ 'pages.olDemo.brief.risk' | translate }}</dt>
                      <dd class="text-right text-lg font-semibold text-white">{{ riskLabelKey(scoreboardCorridor().risk) | translate }}</dd>
                    </div>
                    <div class="scoreboard-stat-row flex items-center justify-between gap-4">
                      <dt class="text-slate-400">{{ 'pages.olDemo.brief.partner' | translate }}</dt>
                      <dd class="max-w-44 text-right font-medium text-white">{{ corridorPartnerKey(scoreboardCorridor()) | translate }}</dd>
                    </div>
                  </dl>

                  <p class="mt-5 text-sm leading-6 text-slate-300">
                    {{ corridorRecommendationKey(scoreboardCorridor()) | translate }}
                  </p>

                  <p class="mt-4 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {{ 'pages.olDemo.scoreboard.hint' | translate }}
                  </p>
                </article>

                <article class="scoreboard-province scoreboard-province-destination relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/6 p-5">
                  <p class="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-300">
                    {{ 'pages.olDemo.scoreboard.destinationLabel' | translate }}
                  </p>
                  <div class="mt-5 flex items-center justify-center">
                    <div class="scoreboard-province-badge scoreboard-province-badge-destination flex h-32 w-32 items-center justify-center rounded-4xl border border-white/15 text-4xl font-semibold tracking-[0.14em] text-white shadow-[0_22px_48px_-30px_rgba(192,132,252,0.55)]">
                      {{ scoreboardDestinationAbbr() }}
                    </div>
                  </div>
                  <p class="mt-5 text-center text-2xl font-semibold tracking-tight text-white">
                    {{ scoreboardDestinationName() }}
                  </p>
                  <p class="mt-2 text-center text-sm leading-6 text-slate-300">
                    {{ 'pages.olDemo.scoreboard.destinationCopy' | translate }}
                  </p>
                </article>
              </div>
            </section>

            <section class="overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-slate-950 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.62)]">
              <div class="border-b border-white/10 px-5 py-5 sm:px-6">
                <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div class="max-w-3xl">
                    <p class="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                      {{ 'pages.olDemo.maplibre.kicker' | translate }}
                    </p>
                    <h2 class="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-[2rem]">
                      {{ 'pages.olDemo.maplibre.title' | translate }}
                    </h2>
                    <p class="mt-2 text-sm leading-6 text-slate-300 sm:text-base">
                      {{ 'pages.olDemo.maplibre.copy' | translate }}
                    </p>
                  </div>

                  <div class="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/6 px-4 py-2 text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
                    {{ corridorRouteLabelKey(comparisonCorridor()) | translate }}
                  </div>
                </div>
              </div>

              <div class="grid gap-4 px-5 py-5 xl:grid-cols-2 sm:px-6 sm:py-6">
                <article class="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                        {{ 'pages.olDemo.maplibre.directLabel' | translate }}
                      </p>
                      <h3 class="mt-2 text-xl font-semibold text-white">
                        {{ 'pages.olDemo.maplibre.directTitle' | translate }}
                      </h3>
                    </div>
                    <span class="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                      maplibre-gl
                    </span>
                  </div>

                  <p class="mt-3 text-sm leading-6 text-slate-300">
                    {{ 'pages.olDemo.maplibre.directCopy' | translate }}
                  </p>

                  <div class="mt-4 overflow-hidden rounded-[1.35rem] border border-white/10">
                    <div #maplibreDirectHost class="maplibre-demo-surface h-72 w-full" data-og7="maplibre-direct-map"></div>
                  </div>

                  <ul class="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                    <li>{{ 'pages.olDemo.maplibre.directNote1' | translate }}</li>
                    <li>{{ 'pages.olDemo.maplibre.directNote2' | translate }}</li>
                  </ul>
                </article>

                <article class="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div class="flex items-start justify-between gap-4">
                    <div>
                      <p class="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-cyan-200/80">
                        {{ 'pages.olDemo.maplibre.ngxLabel' | translate }}
                      </p>
                      <h3 class="mt-2 text-xl font-semibold text-white">
                        {{ 'pages.olDemo.maplibre.ngxTitle' | translate }}
                      </h3>
                    </div>
                    <span class="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-emerald-50">
                      @maplibre/ngx-maplibre-gl
                    </span>
                  </div>

                  <p class="mt-3 text-sm leading-6 text-slate-300">
                    {{ 'pages.olDemo.maplibre.ngxCopy' | translate }}
                  </p>

                  <div class="mt-4 overflow-hidden rounded-[1.35rem] border border-white/10" data-og7="maplibre-ngx-map">
                    <mgl-map
                      [mapStyle]="maplibreStyleUrl"
                      [center]="maplibreCenter"
                      [zoom]="[maplibreZoom]"
                      [renderWorldCopies]="false"
                      (mapLoad)="onNgxComparisonMapLoad($event)"
                      [style.display]="'block'"
                      [style.height.rem]="18"
                      [style.width.%]="100"
                    >
                      <mgl-control mglNavigation position="top-right"></mgl-control>

                      <mgl-geojson-source id="compare-provinces" [data]="maplibreProvinceCollection">
                        <mgl-layer
                          id="compare-provinces-fill"
                          type="fill"
                          source="compare-provinces"
                          [paint]="maplibreProvinceFillPaint()"
                        ></mgl-layer>
                        <mgl-layer
                          id="compare-provinces-outline"
                          type="line"
                          source="compare-provinces"
                          [paint]="maplibreProvinceOutlinePaint"
                        ></mgl-layer>
                      </mgl-geojson-source>

                      <mgl-geojson-source id="compare-flows" [data]="maplibreFlowCollection">
                        <mgl-layer
                          id="compare-flows-base"
                          type="line"
                          source="compare-flows"
                          [layout]="maplibreFlowLayout"
                          [paint]="maplibreFlowBasePaint"
                          (layerClick)="handleNgxComparisonLayerClick($event)"
                        ></mgl-layer>
                      </mgl-geojson-source>

                      <mgl-geojson-source id="compare-highlight" [data]="maplibreHighlightCollection()">
                        <mgl-layer
                          id="compare-flows-highlight"
                          type="line"
                          source="compare-highlight"
                          [layout]="maplibreFlowLayout"
                          [paint]="maplibreHighlightPaint()"
                        ></mgl-layer>
                      </mgl-geojson-source>

                      <mgl-geojson-source id="compare-hubs" [data]="maplibreHubCollection">
                        <mgl-layer
                          id="compare-hubs-layer"
                          type="circle"
                          source="compare-hubs"
                          [paint]="maplibreHubPaint"
                        ></mgl-layer>
                      </mgl-geojson-source>
                    </mgl-map>
                  </div>

                  <ul class="mt-4 space-y-2 text-sm leading-6 text-slate-300">
                    <li>{{ 'pages.olDemo.maplibre.ngxNote1' | translate }}</li>
                    <li>{{ 'pages.olDemo.maplibre.ngxNote2' | translate }}</li>
                  </ul>
                </article>
              </div>

              <div class="border-t border-white/10 px-5 py-4 sm:px-6">
                <p class="text-sm leading-6 text-slate-300">
                  {{ 'pages.olDemo.maplibre.sharedHint' | translate: { route: corridorRouteLabel(comparisonCorridor()) } }}
                </p>
              </div>
            </section>
          </div>

          <aside class="space-y-4">
            <section class="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-[0_20px_70px_-52px_rgba(15,23,42,0.4)]">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {{ 'pages.olDemo.routes.heading' | translate }}
              </p>
              <p class="mt-2 text-sm leading-6 text-slate-600">
                {{ 'pages.olDemo.routes.copy' | translate }}
              </p>
              <div class="mt-4 space-y-3">
                <button
                  *ngFor="let corridor of corridors"
                  type="button"
                  class="block w-full rounded-3xl border px-4 py-3 text-left transition"
                  [class.border-cyan-300]="corridor.id === selectedCorridorId()"
                  [class.bg-cyan-50]="corridor.id === selectedCorridorId()"
                  [class.border-slate-200]="corridor.id !== selectedCorridorId()"
                  [class.bg-white]="corridor.id !== selectedCorridorId()"
                  [attr.data-og7]="'action'"
                  [attr.data-og7-id]="'ol-demo-focus-' + corridor.id"
                  (click)="focusCorridor(corridor.id)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <p class="text-sm font-semibold text-slate-950">{{ corridorRouteLabelKey(corridor) | translate }}</p>
                      <p class="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{{ corridorPartnerKey(corridor) | translate }}</p>
                    </div>
                    <span class="rounded-full px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
                      [class.bg-cyan-100]="corridor.sector === 'energy'"
                      [class.text-cyan-700]="corridor.sector === 'energy'"
                      [class.bg-amber-100]="corridor.sector === 'manufacturing'"
                      [class.text-amber-700]="corridor.sector === 'manufacturing'"
                      [class.bg-emerald-100]="corridor.sector === 'agri-food'"
                      [class.text-emerald-700]="corridor.sector === 'agri-food'"
                    >{{ sectorLabelKey(corridor.sector) | translate }}</span>
                  </div>
                </button>
              </div>
            </section>

            <section class="rounded-[1.75rem] border border-slate-200 bg-white/85 p-5 shadow-[0_20px_70px_-52px_rgba(15,23,42,0.4)]">
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {{ 'pages.olDemo.notes.heading' | translate }}
              </p>
              <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li>{{ 'pages.olDemo.notes.item1' | translate }}</li>
                <li>{{ 'pages.olDemo.notes.item2' | translate }}</li>
                <li>{{ 'pages.olDemo.notes.item3' | translate }}</li>
                <li>{{ 'pages.olDemo.notes.item4' | translate }}</li>
              </ul>
            </section>

            <a
              routerLink="/"
              class="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-white"
            >
              {{ 'pages.olDemo.actions.backHome' | translate }}
            </a>
          </aside>
        </div>
      </section>
    </main>
  `,
  styles: [
    `
      .ol-demo-map {
        position: relative;
        background:
          radial-gradient(circle at 68% 24%, rgba(34, 211, 238, 0.16), transparent 0 30%),
          radial-gradient(circle at 24% 78%, rgba(45, 212, 191, 0.12), transparent 0 28%),
          linear-gradient(180deg, #020617 0%, #0f172a 100%);
      }

      .ol-demo-map::before,
      .ol-demo-map::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .ol-demo-map::before {
        background:
          repeating-linear-gradient(
            90deg,
            rgba(148, 163, 184, 0.06) 0,
            rgba(148, 163, 184, 0.06) 1px,
            transparent 1px,
            transparent 88px
          ),
          repeating-linear-gradient(
            180deg,
            rgba(148, 163, 184, 0.05) 0,
            rgba(148, 163, 184, 0.05) 1px,
            transparent 1px,
            transparent 88px
          );
        mix-blend-mode: screen;
        opacity: 0.34;
      }

      .ol-demo-map::after {
        inset: auto 0 0;
        height: 32%;
        background: linear-gradient(180deg, transparent 0%, rgba(2, 6, 23, 0.06) 22%, rgba(2, 6, 23, 0.82) 100%);
      }

      .ol-demo-scoreboard {
        position: relative;
        background:
          radial-gradient(circle at 18% 24%, rgba(34, 211, 238, 0.18), transparent 0 28%),
          radial-gradient(circle at 82% 24%, rgba(129, 140, 248, 0.16), transparent 0 28%),
          linear-gradient(135deg, #082f49 0%, #0f172a 45%, #111827 100%);
      }

      .ol-demo-scoreboard::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.07) 48%, rgba(255, 255, 255, 0.07) 52%, transparent 100%),
          radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.06), transparent 0 55%);
        opacity: 0.55;
      }

      .scoreboard-province,
      .scoreboard-center {
        position: relative;
        z-index: 1;
        backdrop-filter: blur(10px);
      }

      .scoreboard-province::after,
      .scoreboard-center::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: inherit;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      .scoreboard-province-badge-origin {
        background: radial-gradient(circle at 30% 30%, rgba(125, 211, 252, 0.4), rgba(8, 47, 73, 0.96));
      }

      .scoreboard-province-badge-destination {
        background: radial-gradient(circle at 32% 30%, rgba(165, 180, 252, 0.4), rgba(67, 56, 202, 0.88));
      }

      .scoreboard-center {
        box-shadow: 0 28px 60px -44px rgba(8, 145, 178, 0.7);
      }

      .scoreboard-center::before {
        content: '';
        position: absolute;
        inset: 1rem;
        pointer-events: none;
        border-radius: 1.2rem;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .maplibre-demo-surface {
        position: relative;
        background:
          radial-gradient(circle at 22% 20%, rgba(34, 211, 238, 0.16), transparent 0 28%),
          radial-gradient(circle at 78% 84%, rgba(59, 130, 246, 0.12), transparent 0 30%),
          linear-gradient(180deg, #020617 0%, #0f172a 100%);
      }

      .maplibre-demo-surface::before {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background:
          repeating-linear-gradient(
            90deg,
            rgba(148, 163, 184, 0.05) 0,
            rgba(148, 163, 184, 0.05) 1px,
            transparent 1px,
            transparent 84px
          ),
          repeating-linear-gradient(
            180deg,
            rgba(148, 163, 184, 0.04) 0,
            rgba(148, 163, 184, 0.04) 1px,
            transparent 1px,
            transparent 84px
          );
        opacity: 0.28;
      }
    `,
  ],
})
export class OpenlayersDemoPage implements AfterViewInit {
  @ViewChild('mapHost') private readonly mapHost?: ElementRef<HTMLDivElement>;
  @ViewChild('maplibreDirectHost') private readonly maplibreDirectHost?: ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly geoJson = new GeoJSON();
  private readonly topoJson = new TopoJSON();
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private translationsLoaded = false;

  readonly corridors = DEMO_CORRIDORS;
  readonly selectedCorridorId = signal<string>('flow-energy');
  readonly hoveredCorridorId = signal<string | null>(null);
  readonly activeCorridor = computed(() => {
    const activeId = this.selectedCorridorId() || this.hoveredCorridorId();
    return this.corridors.find(corridor => corridor.id === activeId) ?? null;
  });
  readonly comparisonCorridorId = computed(() => this.selectedCorridorId() || this.corridors[0]?.id || '');
  readonly comparisonCorridor = computed(() => this.corridors.find(corridor => corridor.id === this.comparisonCorridorId()) ?? this.corridors[0]!);
  readonly comparisonProvinceIds = computed(() => this.getCorridorProvinceIdsFromData(this.comparisonCorridorId()));
  readonly scoreboardCorridor = computed(() => this.activeCorridor() ?? this.corridors[0] ?? null);
  readonly interactionState = computed<InteractionState>(() => {
    const selected = this.activeCorridor();
    if (selected) {
      return {
        key: 'pages.olDemo.status.selected',
        params: { route: this.corridorRouteLabel(selected), partner: this.corridorPartnerLabel(selected) },
      };
    }

    return { key: 'pages.olDemo.status.idle' };
  });

  private map: Map | null = null;
  private provinceLayer: VectorLayer<VectorSource> | null = null;
  private provinceLabelLayer: VectorLayer<VectorSource> | null = null;
  private corridorLayer: VectorLayer<VectorSource> | null = null;
  private hubLayer: VectorLayer<VectorSource> | null = null;
  private interactionKeys: unknown[] = [];
  private maplibreDirectMap: MapLibreMap | null = null;
  private ngxComparisonMap: MapLibreMap | null = null;

  readonly maplibreStyleUrl = MAPLIBRE_STYLE_URL;
  readonly maplibreCenter = MAPLIBRE_DEFAULT_CENTER;
  readonly maplibreZoom = MAPLIBRE_DEFAULT_ZOOM;
  readonly maplibreProvinceCollection = DEMO_PROVINCES;
  readonly maplibreFlowCollection = DEMO_FLOWS;
  readonly maplibreHubCollection = DEMO_HUBS;
  readonly maplibreHighlightCollection = computed<FeatureCollection<LineString>>(() => ({
    type: 'FeatureCollection',
    features: DEMO_FLOWS.features.filter(feature => feature.properties?.['corridorId'] === this.comparisonCorridorId()),
  }));
  readonly maplibreProvinceFillPaint = computed<FillLayerSpecification['paint']>(() => {
    const isActive = ['in', ['get', 'provinceId'], ['literal', this.comparisonProvinceIds()]] as ExpressionSpecification;
    return {
      'fill-color': ['case', isActive, '#3ec7d8', '#203645'] as ExpressionSpecification,
      'fill-opacity': ['case', isActive, 0.42, 0.14] as ExpressionSpecification,
    };
  });
  readonly maplibreHighlightPaint = computed<LineLayerSpecification['paint']>(() => ({
    'line-color': this.getSectorColor(this.comparisonCorridor().sector, true),
    'line-width': 5.2,
    'line-opacity': 0.95,
  }));
  readonly maplibreProvinceOutlinePaint: LineLayerSpecification['paint'] = {
    'line-color': '#94a3b8',
    'line-width': 1.2,
    'line-opacity': 0.65,
  };
  readonly maplibreFlowLayout: LineLayerSpecification['layout'] = {
    'line-cap': 'round',
    'line-join': 'round',
  };
  readonly maplibreFlowBasePaint: LineLayerSpecification['paint'] = {
    'line-color': '#67a6bd',
    'line-width': 2.6,
    'line-opacity': 0.48,
  };
  readonly maplibreHubPaint: CircleLayerSpecification['paint'] = {
    'circle-color': '#f8fafc',
    'circle-radius': 5.5,
    'circle-stroke-color': '#f59e0b',
    'circle-stroke-width': 2,
  };

  constructor() {
    this.ensureTranslations();
    effect(() => {
      const corridorId = this.comparisonCorridorId();
      this.syncDirectMaplibreState(corridorId);
      this.syncNgxComparisonCamera(corridorId);
    });
    this.destroyRef.onDestroy(() => {
      this.translationsLoaded = true;
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || !this.mapHost) {
      return;
    }

    const provinceSource = new VectorSource();
    const provinceLabelSource = new VectorSource();
    const corridorSource = new VectorSource({
      features: this.geoJson.readFeatures(DEMO_FLOWS, { featureProjection: 'EPSG:3857' }),
    });
    const hubSource = new VectorSource({
      features: this.geoJson.readFeatures(DEMO_HUBS, { featureProjection: 'EPSG:3857' }),
    });

    this.provinceLayer = new VectorLayer({
      source: provinceSource,
      style: feature => this.buildProvinceStyle(feature as Feature<Geometry>),
    });
    this.provinceLabelLayer = new VectorLayer({
      source: provinceLabelSource,
      style: feature => this.buildProvinceLabelStyle(feature as Feature<Geometry>),
    });
    this.corridorLayer = new VectorLayer({
      source: corridorSource,
      style: feature => this.buildCorridorStyle(feature as Feature<Geometry>),
    });
    this.hubLayer = new VectorLayer({
      source: hubSource,
      style: feature => this.buildHubStyle(feature as Feature<Geometry>),
    });

    this.map = new Map({
      target: this.mapHost.nativeElement,
      controls: [],
      layers: [this.provinceLayer, this.corridorLayer, this.provinceLabelLayer, this.hubLayer],
      view: new View({
        center: fromLonLat([-95, 54]),
        zoom: 3.45,
        minZoom: 3,
        maxZoom: 7,
      }),
    });

    this.resetView();
    void this.loadBoundaryFeatures(provinceSource, provinceLabelSource);

    this.interactionKeys = [
      this.map.on('pointermove', event => {
        if (event.dragging) {
          return;
        }
        const hoveredFeature = this.findCorridorFeature(event.pixel);
        const hoveredId = hoveredFeature?.get('corridorId') ?? null;
        this.hoveredCorridorId.set(hoveredId);
        this.mapHost?.nativeElement.style.setProperty('cursor', hoveredId ? 'pointer' : 'default');
        this.refreshMapStyles();
      }),
      this.map.on('singleclick', event => {
        const clickedFeature = this.findCorridorFeature(event.pixel);
        const corridorId = clickedFeature?.get('corridorId') as string | undefined;
        if (!corridorId) {
          this.clearSelection();
          return;
        }
        this.focusCorridor(corridorId);
      }),
    ];

    void this.initializeMaplibreDirectMap();
  }

  private async loadBoundaryFeatures(source: VectorSource, labelSource: VectorSource): Promise<void> {
    try {
      const responses = await Promise.all(
        BOUNDARY_TOPOJSON_URLS.map(async url => {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to load ${url}: ${response.status}`);
          }
          return response.text();
        })
      );

      const features = responses
        .flatMap(payload => this.topoJson.readFeatures(payload, { featureProjection: 'EPSG:3857' }) as Feature<Geometry>[])
        .filter(feature => this.normalizeBoundaryFeature(feature));

      this.updateBoundarySources(source, labelSource, features);
    } catch (error) {
      console.error('Failed to load geoBoundaries TopoJSON assets', error);
      this.updateBoundarySources(
        source,
        labelSource,
        this.geoJson.readFeatures(DEMO_PROVINCES, { featureProjection: 'EPSG:3857' }) as Feature<Geometry>[]
      );
    }
  }

  private updateBoundarySources(source: VectorSource, labelSource: VectorSource, features: Feature<Geometry>[]): void {
    source.clear();
    source.addFeatures(features);

    labelSource.clear();
    labelSource.addFeatures(this.createBoundaryLabelFeatures(features));

    this.refreshMapStyles();
    this.resetView();
  }

  private normalizeBoundaryFeature(feature: Feature<Geometry>): boolean {
    const shapeIso = this.readBoundaryString(feature, 'shapeISO')?.toLowerCase();
    const shapeName = this.readBoundaryString(feature, 'shapeName');
    const provinceId = this.getBoundaryProvinceId(shapeIso, shapeName);
    if (!provinceId) {
      return false;
    }

    if (provinceId.startsWith('us-') && !USA_NORTHEAST_STATE_IDS.has(provinceId)) {
      return false;
    }

    feature.set('provinceId', provinceId);
    feature.set('label', this.getBoundaryLabel(provinceId, shapeName));
    return true;
  }

  private createBoundaryLabelFeatures(features: Feature<Geometry>[]): Feature<Geometry>[] {
    return features.flatMap(feature => {
      const provinceId = feature.get('provinceId') as string | undefined;
      const label = feature.get('label') as string | undefined;
      const geometry = feature.getGeometry();
      if (!provinceId || !label || !geometry) {
        return [];
      }

      const [minX, minY, maxX, maxY] = geometry.getExtent();
      const labelFeature = new Feature(new OLPoint([(minX + maxX) / 2, (minY + maxY) / 2]));
      labelFeature.set('provinceId', provinceId);
      labelFeature.set('label', label);
      return [labelFeature as Feature<Geometry>];
    });
  }

  private readBoundaryString(feature: Feature<Geometry>, key: string): string | null {
    const value = feature.get(key);
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  private getBoundaryProvinceId(shapeIso: string | null | undefined, shapeName: string | null | undefined): string | null {
    if (shapeIso?.startsWith('ca-')) {
      return shapeIso.slice(3);
    }
    if (shapeIso?.startsWith('us-')) {
      return shapeIso;
    }

    const normalizedName = shapeName?.trim().toLowerCase();
    if (!normalizedName) {
      return null;
    }

    const fallbackIds: Record<string, string> = {
      alberta: 'ab',
      'british columbia': 'bc',
      manitoba: 'mb',
      ontario: 'on',
      quebec: 'qc',
      connecticut: 'us-ct',
      maine: 'us-me',
      massachusetts: 'us-ma',
      'new hampshire': 'us-nh',
      'new york': 'us-ny',
      'rhode island': 'us-ri',
      vermont: 'us-vt',
    };

    return fallbackIds[normalizedName] ?? null;
  }

  private getBoundaryLabel(provinceId: string, shapeName: string | null | undefined): string {
    if (provinceId === 'qc') {
      return 'Quebec';
    }
    if (provinceId === 'bc') {
      return 'British Columbia';
    }
    if (provinceId === 'us-ny') {
      return 'New York';
    }

    return shapeName ?? provinceId.toUpperCase();
  }

  ngOnDestroy(): void {
    if (this.interactionKeys.length) {
      unByKey(this.interactionKeys as Parameters<typeof unByKey>[0]);
    }

    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }

    if (this.maplibreDirectMap) {
      this.maplibreDirectMap.remove();
      this.maplibreDirectMap = null;
    }
  }

  onNgxComparisonMapLoad(map: MapLibreMap): void {
    this.ngxComparisonMap = map;
    this.syncNgxComparisonCamera(this.comparisonCorridorId());
  }

  handleNgxComparisonLayerClick(event: MapLibreLayerEventLike): void {
    const corridorId = this.readCorridorIdFromMaplibreEvent(event);
    if (corridorId) {
      this.focusCorridor(corridorId);
    }
  }

  clearSelection(): void {
    this.selectedCorridorId.set('');
    this.hoveredCorridorId.set(null);
    this.refreshMapStyles();
  }

  zoomIn(): void {
    this.adjustOpenlayersZoom(1);
  }

  zoomOut(): void {
    this.adjustOpenlayersZoom(-1);
  }

  resetView(): void {
    if (!this.map) {
      return;
    }

    const extent = this.buildExtentForCorridor(this.selectedCorridorId() || undefined);
    if (!extent) {
      return;
    }

    this.map.getView().fit(extent, {
      padding: [52, 52, 52, 52],
      maxZoom: 4.25,
      duration: 500,
    });
  }

  focusCorridor(corridorId: string): void {
    this.selectedCorridorId.set(corridorId);
    this.hoveredCorridorId.set(null);
    this.refreshMapStyles();

    const extent = this.buildExtentForCorridor(corridorId);
    if (!this.map || !extent) {
      return;
    }

    this.map.getView().fit(extent, {
      padding: [90, 120, 90, 120],
      maxZoom: 5.5,
      duration: 550,
    });
  }

  private adjustOpenlayersZoom(delta: number): void {
    if (!this.map) {
      return;
    }

    const view = this.map.getView();
    const currentZoom = view.getZoom() ?? 3.45;
    view.animate({
      zoom: currentZoom + delta,
      duration: 220,
    });
  }

  totalMonthlyValueLabel(): string {
    const total = this.corridors.reduce((sum, corridor) => sum + corridor.monthlyValueMcad, 0);
    return this.formatMonthlyValue(total);
  }

  averageReliabilityLabel(): string {
    const reliability = this.corridors.reduce((sum, corridor) => sum + corridor.reliability, 0) / this.corridors.length;
    return `${Math.round(reliability)}%`;
  }

  corridorRouteLabelKey(corridor: DemoCorridor | null | undefined): string {
    return corridor ? `pages.olDemo.corridors.${corridor.id}.routeLabel` : '';
  }

  corridorPartnerKey(corridor: DemoCorridor | null | undefined): string {
    return corridor ? `pages.olDemo.corridors.${corridor.id}.partner` : '';
  }

  corridorKeyInsightKey(corridor: DemoCorridor | null | undefined): string {
    return corridor ? `pages.olDemo.corridors.${corridor.id}.keyInsight` : '';
  }

  corridorRecommendationKey(corridor: DemoCorridor | null | undefined): string {
    return corridor ? `pages.olDemo.corridors.${corridor.id}.recommendation` : '';
  }

  sectorLabelKey(sector: DemoSector | null | undefined): string {
    return sector ? `pages.olDemo.sectors.${sector}` : '';
  }

  riskLabelKey(risk: DemoCorridor['risk'] | null | undefined): string {
    return risk ? `pages.olDemo.risks.${risk.toLowerCase()}` : '';
  }

  corridorRouteLabel(corridor: DemoCorridor | null | undefined): string {
    return this.translateLabel(this.corridorRouteLabelKey(corridor), corridor?.routeLabel ?? '');
  }

  private corridorPartnerLabel(corridor: DemoCorridor | null | undefined): string {
    return this.translateLabel(this.corridorPartnerKey(corridor), corridor?.partner ?? '');
  }

  formatMonthlyValue(value: number): string {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value * 1_000_000);
  }

  scoreboardOriginName(): string {
    const corridor = this.scoreboardCorridor();
    return this.translateLabel(
      corridor ? `pages.olDemo.corridors.${corridor.id}.origin` : '',
      this.getScoreboardRouteParts().origin
    );
  }

  scoreboardDestinationName(): string {
    const corridor = this.scoreboardCorridor();
    return this.translateLabel(
      corridor ? `pages.olDemo.corridors.${corridor.id}.destination` : '',
      this.getScoreboardRouteParts().destination
    );
  }

  scoreboardOriginAbbr(): string {
    return this.getProvinceAbbreviation(this.scoreboardOriginName());
  }

  scoreboardDestinationAbbr(): string {
    return this.getProvinceAbbreviation(this.scoreboardDestinationName());
  }

  private buildProvinceStyle(feature: Feature<Geometry>): Style[] {
    const provinceId = feature.get('provinceId') as string | undefined;
    const activeCorridor = this.activeCorridor();
    const provinceIsActive = activeCorridor
      ? this.getCorridorProvinceIds(activeCorridor.id).includes(provinceId ?? '')
      : false;
    const accentColor = this.getProvinceAccentColor(provinceId);

    return [
      new Style({
        stroke: new Stroke({
          color: provinceIsActive ? this.getProvinceGlowColor(provinceId) : 'rgba(15, 23, 42, 0.18)',
          width: provinceIsActive ? 7 : 2,
        }),
      }),
      new Style({
        fill: new Fill({ color: provinceIsActive ? this.getProvinceFillColor(provinceId) : 'rgba(15, 23, 42, 0.2)' }),
        stroke: new Stroke({ color: provinceIsActive ? accentColor : 'rgba(100, 116, 139, 0.72)', width: provinceIsActive ? 2.8 : 1.1 }),
      }),
    ];
  }

  private buildProvinceLabelStyle(feature: Feature<Geometry>): Style[] {
    const provinceId = feature.get('provinceId') as string | undefined;
    const label = feature.get('label') as string | undefined;
    const activeCorridor = this.activeCorridor();
    const provinceIsActive = activeCorridor
      ? this.getCorridorProvinceIds(activeCorridor.id).includes(provinceId ?? '')
      : false;

    return [
      new Style({
        text: new Text({
          text: label ?? '',
          font: provinceIsActive ? '700 14px ui-sans-serif' : '600 12px ui-sans-serif',
          fill: new Fill({ color: provinceIsActive ? '#f8fafc' : '#cbd5e1' }),
          stroke: new Stroke({ color: 'rgba(2, 6, 23, 0.95)', width: 4 }),
        }),
      }),
    ];
  }

  private buildCorridorStyle(feature: Feature<Geometry>): Style[] {
    const corridorId = feature.get('corridorId') as string;
    const sector = feature.get('sector') as DemoSector;
    const isSelected = corridorId === this.selectedCorridorId();
    const isHovered = corridorId === this.hoveredCorridorId();
    const active = isSelected || isHovered;
    const color = this.getSectorColor(sector, active);
    const glowColor = this.getSectorGlowColor(sector, active ? 0.42 : 0.12);
    const routeLabel = this.corridorRouteLabel(this.corridors.find(corridor => corridor.id === corridorId));

    const styles = [
      new Style({
        stroke: new Stroke({
          color: active ? this.getSectorGlowColor(sector, 0.2) : 'rgba(100, 116, 139, 0.1)',
          width: active ? 18 : 6,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: glowColor,
          width: active ? 10 : 4,
          lineCap: 'round',
          lineJoin: 'round',
          lineDash: active ? undefined : [8, 12],
        }),
      }),
      new Style({
        stroke: new Stroke({
          color,
          width: active ? 5.4 : 2.4,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    ];

    if (active) {
      styles.push(
        new Style({
          text: new Text({
            text: '>',
            placement: 'line',
            repeat: 72,
            overflow: true,
            font: '800 16px ui-sans-serif',
            fill: new Fill({ color: '#ecfeff' }),
            stroke: new Stroke({ color: 'rgba(8, 47, 73, 0.8)', width: 3 }),
            offsetY: 0,
          }),
        }),
        new Style({
          text: new Text({
            text: routeLabel,
            placement: 'line',
            repeat: 9999,
            overflow: true,
            font: '700 12px ui-sans-serif',
            fill: new Fill({ color: '#f8fafc' }),
            stroke: new Stroke({ color: 'rgba(2, 6, 23, 0.95)', width: 4 }),
            offsetY: -14,
          }),
        })
      );
    }

    return styles;
  }

  private buildHubStyle(feature: Feature<Geometry>): Style[] {
    const provinceId = feature.get('provinceId') as string | undefined;
    const label = feature.get('label') as string | undefined;
    const activeCorridor = this.activeCorridor();
    const active = activeCorridor ? this.getCorridorProvinceIds(activeCorridor.id).includes(provinceId ?? '') : false;

    return [
      new Style({
        image: new CircleStyle({
          radius: active ? 16 : 8,
          fill: new Fill({ color: active ? 'rgba(251, 191, 36, 0.2)' : 'rgba(148, 163, 184, 0.08)' }),
          stroke: new Stroke({ color: active ? 'rgba(253, 230, 138, 0.28)' : 'transparent', width: active ? 2 : 0 }),
        }),
      }),
      new Style({
        image: new CircleStyle({
          radius: active ? 7.5 : 4.5,
          fill: new Fill({ color: active ? '#fbbf24' : '#f8fafc' }),
          stroke: new Stroke({ color: active ? '#f59e0b' : '#475569', width: 2 }),
        }),
      }),
      new Style({
        image: new CircleStyle({
          radius: active ? 2.8 : 1.8,
          fill: new Fill({ color: active ? '#fff7ed' : '#cbd5e1' }),
          stroke: new Stroke({ color: 'transparent', width: 0 }),
        }),
        text: new Text({
          text: label ?? '',
          offsetY: active ? 22 : 16,
          font: active ? '700 12px ui-sans-serif' : '600 11px ui-sans-serif',
          fill: new Fill({ color: active ? '#fff7ed' : '#dbe5f0' }),
          stroke: new Stroke({ color: 'rgba(2, 6, 23, 0.95)', width: 4 }),
        }),
      }),
    ];
  }

  private getCorridorProvinceIds(corridorId: string): string[] {
    const feature = this.corridorLayer?.getSource()?.getFeatureById(corridorId);
    return (feature?.get('provinces') as string[] | undefined) ?? [];
  }

  private buildExtentForCorridor(corridorId?: string): Extent | null {
    const extent = createEmpty();
    let hasGeometry = false;
    const provinceIds = corridorId ? new Set(this.getCorridorProvinceIds(corridorId)) : null;

    const includeGeometry = (geometry: Geometry | null | undefined): void => {
      if (!geometry) {
        return;
      }
      extendExtent(extent, geometry.getExtent());
      hasGeometry = true;
    };

    if (corridorId) {
      includeGeometry(this.corridorLayer?.getSource()?.getFeatureById(corridorId)?.getGeometry());
    }

    const includeAllFeatures = !corridorId;
    this.provinceLayer?.getSource()?.getFeatures().forEach(feature => {
      if (includeAllFeatures || provinceIds?.has((feature.get('provinceId') as string | undefined) ?? '')) {
        includeGeometry(feature.getGeometry());
      }
    });
    this.corridorLayer?.getSource()?.getFeatures().forEach(feature => {
      if (includeAllFeatures || feature.get('corridorId') === corridorId) {
        includeGeometry(feature.getGeometry());
      }
    });
    this.hubLayer?.getSource()?.getFeatures().forEach(feature => {
      if (includeAllFeatures || provinceIds?.has((feature.get('provinceId') as string | undefined) ?? '')) {
        includeGeometry(feature.getGeometry());
      }
    });

    return hasGeometry ? extent : null;
  }

  private findCorridorFeature(pixel: number[]): Feature<Geometry> | null {
    if (!this.map) {
      return null;
    }

    const feature = this.map.forEachFeatureAtPixel(pixel, candidate => {
      if (candidate.get('corridorId')) {
        return candidate;
      }
      return null;
    });

    return (feature as Feature<Geometry> | null) ?? null;
  }

  private refreshMapStyles(): void {
    this.provinceLayer?.changed();
    this.provinceLabelLayer?.changed();
    this.corridorLayer?.changed();
    this.hubLayer?.changed();
  }

  private getSectorColor(sector: DemoSector, active: boolean): string {
    if (sector === 'energy') {
      return active ? '#67e8f9' : '#38bdf8';
    }
    if (sector === 'manufacturing') {
      return active ? '#fcd34d' : '#f59e0b';
    }
    return active ? '#86efac' : '#34d399';
  }

  private getSectorGlowColor(sector: DemoSector, opacity: number): string {
    if (sector === 'energy') {
      return `rgba(34, 211, 238, ${opacity})`;
    }
    if (sector === 'manufacturing') {
      return `rgba(245, 158, 11, ${opacity})`;
    }
    return `rgba(52, 211, 153, ${opacity})`;
  }

  private getProvinceAccentColor(provinceId: string | undefined): string {
    if (provinceId === 'qc') {
      return '#38bdf8';
    }
    if (provinceId === 'on') {
      return '#34d399';
    }
    if (provinceId === 'ab') {
      return '#f59e0b';
    }
    if (provinceId === 'bc') {
      return '#a78bfa';
    }
    return '#67e8f9';
  }

  private getProvinceFillColor(provinceId: string | undefined): string {
    if (provinceId === 'qc') {
      return 'rgba(59, 130, 246, 0.24)';
    }
    if (provinceId === 'on') {
      return 'rgba(16, 185, 129, 0.22)';
    }
    if (provinceId === 'ab') {
      return 'rgba(245, 158, 11, 0.18)';
    }
    if (provinceId === 'bc') {
      return 'rgba(139, 92, 246, 0.2)';
    }
    return 'rgba(45, 212, 191, 0.18)';
  }

  private getProvinceGlowColor(provinceId: string | undefined): string {
    if (provinceId === 'qc') {
      return 'rgba(56, 189, 248, 0.24)';
    }
    if (provinceId === 'on') {
      return 'rgba(52, 211, 153, 0.24)';
    }
    if (provinceId === 'ab') {
      return 'rgba(245, 158, 11, 0.2)';
    }
    if (provinceId === 'bc') {
      return 'rgba(167, 139, 250, 0.22)';
    }
    return 'rgba(103, 232, 249, 0.18)';
  }

  private translateLabel(key: string, fallback: string): string {
    if (!key) {
      return fallback;
    }

    const translated = this.translate.instant(key);
    return typeof translated === 'string' && translated !== key ? translated : fallback;
  }

  private getScoreboardRouteParts(): { origin: string; destination: string } {
    const routeLabel = this.scoreboardCorridor()?.routeLabel;
    if (!routeLabel) {
      return { origin: 'Origin', destination: 'Destination' };
    }

    const [origin, destination] = routeLabel.split('->').map(part => part.trim());
    return {
      origin: origin || 'Origin',
      destination: destination || 'Destination',
    };
  }

  private getProvinceAbbreviation(provinceName: string): string {
    const normalized = provinceName.trim().toLowerCase();
    if (normalized === 'quebec') {
      return 'QC';
    }
    if (normalized === 'ontario') {
      return 'ON';
    }
    if (normalized === 'alberta') {
      return 'AB';
    }
    if (normalized === 'british columbia') {
      return 'BC';
    }
    if (normalized === 'colombie-britannique' || normalized === 'c.-b.') {
      return 'BC';
    }
    if (normalized === 'us ne' || normalized === 'nord-est us') {
      return 'US';
    }

    return provinceName.slice(0, 2).toUpperCase();
  }

  private async initializeMaplibreDirectMap(): Promise<void> {
    if (!this.isBrowser || !this.maplibreDirectHost || this.maplibreDirectMap) {
      return;
    }

    const { Map: RuntimeMap, NavigationControl } = await import('maplibre-gl');
    const map = new RuntimeMap({
      container: this.maplibreDirectHost.nativeElement,
      style: this.maplibreStyleUrl,
      center: this.maplibreCenter,
      zoom: this.maplibreZoom,
      renderWorldCopies: false,
      attributionControl: false,
    });

    map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
    map.on('load', () => {
      map.addSource('compare-provinces', {
        type: 'geojson',
        data: this.maplibreProvinceCollection,
      });
      map.addLayer({
        id: 'compare-provinces-fill',
        type: 'fill',
        source: 'compare-provinces',
        paint: this.maplibreProvinceFillPaint(),
      });
      map.addLayer({
        id: 'compare-provinces-outline',
        type: 'line',
        source: 'compare-provinces',
        paint: this.maplibreProvinceOutlinePaint,
      });

      map.addSource('compare-flows', {
        type: 'geojson',
        data: this.maplibreFlowCollection,
      });
      map.addLayer({
        id: 'compare-flows-base',
        type: 'line',
        source: 'compare-flows',
        layout: this.maplibreFlowLayout,
        paint: this.maplibreFlowBasePaint,
      });
      map.addLayer({
        id: 'compare-flows-highlight',
        type: 'line',
        source: 'compare-flows',
        layout: this.maplibreFlowLayout,
        paint: this.maplibreHighlightPaint(),
        filter: ['==', ['get', 'corridorId'], this.comparisonCorridorId()],
      });

      map.addSource('compare-hubs', {
        type: 'geojson',
        data: this.maplibreHubCollection,
      });
      map.addLayer({
        id: 'compare-hubs-layer',
        type: 'circle',
        source: 'compare-hubs',
        paint: this.maplibreHubPaint,
      });

      map.on('click', 'compare-flows-base', (event) => {
        const corridorId = this.readCorridorIdFromMaplibreEvent(event as MapLibreLayerEventLike);
        if (corridorId) {
          this.focusCorridor(corridorId);
        }
      });
      map.on('mouseenter', 'compare-flows-base', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'compare-flows-base', () => {
        map.getCanvas().style.cursor = '';
      });

      this.syncDirectMaplibreState(this.comparisonCorridorId());
    });

    this.maplibreDirectMap = map;
  }

  private syncDirectMaplibreState(corridorId: string): void {
    if (!this.maplibreDirectMap || !this.maplibreDirectMap.getLayer('compare-flows-highlight')) {
      return;
    }

    const provincePaint = this.maplibreProvinceFillPaint();
    const highlightPaint = this.maplibreHighlightPaint();

    if (provincePaint?.['fill-color']) {
      this.maplibreDirectMap.setPaintProperty('compare-provinces-fill', 'fill-color', provincePaint['fill-color']);
    }
    if (provincePaint?.['fill-opacity']) {
      this.maplibreDirectMap.setPaintProperty('compare-provinces-fill', 'fill-opacity', provincePaint['fill-opacity']);
    }
    if (highlightPaint?.['line-color']) {
      this.maplibreDirectMap.setPaintProperty('compare-flows-highlight', 'line-color', highlightPaint['line-color']);
    }
    this.maplibreDirectMap.setFilter('compare-flows-highlight', ['==', ['get', 'corridorId'], corridorId]);
    this.fitMaplibreToCorridor(this.maplibreDirectMap, corridorId);
  }

  private syncNgxComparisonCamera(corridorId: string): void {
    if (!this.ngxComparisonMap) {
      return;
    }

    this.fitMaplibreToCorridor(this.ngxComparisonMap, corridorId);
  }

  private fitMaplibreToCorridor(map: MapLibreMap, corridorId: string): void {
    const bounds = this.buildLngLatBoundsForCorridor(corridorId);
    map.fitBounds(bounds, {
      padding: 42,
      duration: 600,
      maxZoom: 5.1,
      essential: true,
    });
  }

  private readCorridorIdFromMaplibreEvent(event: MapLibreLayerEventLike): string | null {
    return event.features?.[0]?.properties?.corridorId ?? null;
  }

  private getCorridorProvinceIdsFromData(corridorId: string): string[] {
    const feature = DEMO_FLOWS.features.find(entry => entry.properties?.['corridorId'] === corridorId);
    return [...((feature?.properties?.['provinces'] as string[] | undefined) ?? [])];
  }

  private buildLngLatBoundsForCorridor(corridorId: string): [[number, number], [number, number]] {
    const provinceIds = new Set(this.getCorridorProvinceIdsFromData(corridorId));
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    const includePoint = (coordinate: readonly number[]): void => {
      const [lng, lat] = coordinate;
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
    };

    DEMO_PROVINCES.features.forEach(feature => {
      if (!provinceIds.has((feature.properties?.['provinceId'] as string | undefined) ?? '')) {
        return;
      }
      feature.geometry.coordinates.forEach(ring => {
        ring.forEach(includePoint);
      });
    });

    DEMO_FLOWS.features.forEach(feature => {
      if (feature.properties?.['corridorId'] !== corridorId) {
        return;
      }
      feature.geometry.coordinates.forEach(includePoint);
    });

    DEMO_HUBS.features.forEach(feature => {
      if (!provinceIds.has((feature.properties?.['provinceId'] as string | undefined) ?? '')) {
        return;
      }
      includePoint(feature.geometry.coordinates);
    });

    if (!Number.isFinite(minLng) || !Number.isFinite(maxLng) || !Number.isFinite(minLat) || !Number.isFinite(maxLat)) {
      return MAPLIBRE_FALLBACK_BOUNDS;
    }

    return [[minLng, minLat], [maxLng, maxLat]];
  }

  private ensureTranslations(): void {
    if (this.translationsLoaded) {
      return;
    }

    void this.loadTranslations().then(translations => {
      if (!translations) {
        return;
      }
      this.translate.setTranslation('fr', translations.fr, true);
      this.translate.setTranslation('en', translations.en, true);
      this.translationsLoaded = true;
      this.refreshMapStyles();
    });
  }

  private async loadTranslations(): Promise<LoadedTranslations | null> {
    try {
      const [frModule, enModule] = await Promise.all([
        import('./i18n/openlayers-demo.fr.json'),
        import('./i18n/openlayers-demo.en.json'),
      ]);

      const fr = (frModule as { default?: TranslationObject }).default ?? (frModule as TranslationObject);
      const en = (enModule as { default?: TranslationObject }).default ?? (enModule as TranslationObject);
      return { fr, en } satisfies LoadedTranslations;
    } catch (error) {
      console.error('Failed to load OpenLayers demo translations', error);
      return null;
    }
  }
}
