import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, NgZone, PLATFORM_ID, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FiltersService } from '@app/core/filters.service';
import type { SectorType } from '@app/core/models/opportunity';
import { TranslateModule } from '@ngx-translate/core';
import type { FeatureCollection, LineString, Point } from 'geojson';
import { createEmpty, extend as extendExtent } from 'ol/extent.js';
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
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from 'ol/style.js';
import View from 'ol/View.js';

type HomeSector = 'energy' | 'manufacturing' | 'agri-food';

interface HomeCorridor {
  readonly id: string;
  readonly sector: HomeSector;
  readonly routeLabelKey: string;
  readonly briefKey: string;
  readonly stageKey: string;
  readonly provinces: readonly string[];
  readonly monitoringHours: number;
  readonly checkpointCount: number;
  readonly reliability: number;
  readonly beats: readonly HomeCorridorBeat[];
}

interface HomeCorridorBeat {
  readonly id: string;
  readonly labelKey: string;
  readonly hubId: string;
}

interface HomeSectorMeta {
  readonly id: HomeSector;
  readonly labelKey: string;
}

interface HomeHub {
  readonly id: string;
  readonly label: string;
  readonly provinceId: string;
  readonly roleKey: string;
  readonly briefKey: string;
  readonly corridorIds: readonly string[];
  readonly coordinates: readonly [number, number];
}

const BOUNDARY_TOPOJSON_URLS = [
  '/assets/geo/boundaries/canada-adm1.json',
  '/assets/geo/boundaries/usa-adm1.json',
] as const;

const USA_NORTHEAST_STATE_IDS = new Set(['us-ct', 'us-ma', 'us-me', 'us-nh', 'us-ny', 'us-ri', 'us-vt']);

const IDLE_CINEMATIC_DELAY_MS = 4_500;
const IDLE_CINEMATIC_STEP_MS = 2_600;
const CAMERA_FOCUS_PRIMARY_MS = 720;
const CAMERA_FOCUS_SETTLE_MS = 180;
const CAMERA_CORRIDOR_FIT_MS = 760;
const CAMERA_RESET_FIT_MS = 500;
const CAMERA_MOTION_WINDOW_MS = CAMERA_CORRIDOR_FIT_MS + CAMERA_FOCUS_SETTLE_MS + 80;
const MAP_REVEAL_TRANSITION_MS = 900;
const DEFAULT_RESET_CENTER_OFFSET_MOBILE_PX = 120;
const DEFAULT_RESET_CENTER_OFFSET_DESKTOP_PX = 180;
const DEFAULT_RESET_MAX_ZOOM_MOBILE = 4.0;
const DEFAULT_RESET_MAX_ZOOM_DESKTOP = 4.35;
const DEFAULT_RESET_PADDING_MOBILE: [number, number, number, number] = [180, 16, 168, 16];
const DEFAULT_RESET_PADDING_DESKTOP: [number, number, number, number] = [220, 148, 136, 58];
const PANORAMIC_BASE_CENTER: [number, number] = [-92.4, 50.4];
const PANORAMIC_BASE_ZOOM = 3.72;
const MAP_STATS_VISIBILITY_STORAGE_KEY = 'og7:home-map:stats-visible';
const DESKTOP_MEDIA_QUERY = '(min-width: 1024px)';

const HOME_SECTORS: readonly HomeSectorMeta[] = [
  { id: 'energy', labelKey: 'home.map.overlay.sectorsList.energy' },
  { id: 'manufacturing', labelKey: 'home.map.overlay.sectorsList.manufacturing' },
  { id: 'agri-food', labelKey: 'home.map.overlay.sectorsList.agriFood' },
] as const;

const HOME_CORRIDORS: readonly HomeCorridor[] = [
  {
    id: 'flow-energy',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowEnergy',
    briefKey: 'home.map.overlay.corridorBriefs.flowEnergy',
    stageKey: 'home.map.overlay.stage.activeWatch',
    sector: 'energy',
    provinces: ['qc', 'on'],
    monitoringHours: 72,
    checkpointCount: 4,
    reliability: 97,
    beats: [
      { id: 'energy-dispatch', labelKey: 'home.map.overlay.corridorBeats.energyDispatch', hubId: 'quebec-city' },
      { id: 'energy-trade', labelKey: 'home.map.overlay.corridorBeats.energyTrade', hubId: 'montreal' },
      { id: 'energy-demand', labelKey: 'home.map.overlay.corridorBeats.energyDemand', hubId: 'toronto' },
    ],
  },
  {
    id: 'flow-battery',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowBattery',
    briefKey: 'home.map.overlay.corridorBriefs.flowBattery',
    stageKey: 'home.map.overlay.stage.synchronized',
    sector: 'manufacturing',
    provinces: ['ab', 'mb', 'on'],
    monitoringHours: 96,
    checkpointCount: 5,
    reliability: 92,
    beats: [
      { id: 'battery-origin', labelKey: 'home.map.overlay.corridorBeats.batteryOrigin', hubId: 'calgary' },
      { id: 'battery-sync', labelKey: 'home.map.overlay.corridorBeats.batterySync', hubId: 'winnipeg' },
      { id: 'battery-assembly', labelKey: 'home.map.overlay.corridorBeats.batteryAssembly', hubId: 'toronto' },
    ],
  },
  {
    id: 'flow-food',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowFood',
    briefKey: 'home.map.overlay.corridorBriefs.flowFood',
    stageKey: 'home.map.overlay.stage.synchronized',
    sector: 'agri-food',
    provinces: ['bc', 'ab', 'mb', 'on'],
    monitoringHours: 84,
    checkpointCount: 5,
    reliability: 94,
    beats: [
      { id: 'food-gateway', labelKey: 'home.map.overlay.corridorBeats.foodGateway', hubId: 'vancouver' },
      { id: 'food-sync', labelKey: 'home.map.overlay.corridorBeats.foodSync', hubId: 'winnipeg' },
      { id: 'food-demand', labelKey: 'home.map.overlay.corridorBeats.foodDemand', hubId: 'toronto' },
    ],
  },
  {
    id: 'flow-qc-usne',
    routeLabelKey: 'home.map.overlay.corridorLabels.flowQcUsne',
    briefKey: 'home.map.overlay.corridorBriefs.flowQcUsne',
    stageKey: 'home.map.overlay.stage.exportBridge',
    sector: 'energy',
    provinces: ['qc', 'us-ct', 'us-ma', 'us-me', 'us-nh', 'us-ny', 'us-ri', 'us-vt'],
    monitoringHours: 48,
    checkpointCount: 3,
    reliability: 95,
    beats: [
      { id: 'export-origin', labelKey: 'home.map.overlay.corridorBeats.exportOrigin', hubId: 'montreal' },
      { id: 'export-gateway', labelKey: 'home.map.overlay.corridorBeats.exportGateway', hubId: 'boston' },
    ],
  },
] as const;

const HOME_FLOWS: FeatureCollection<LineString> = {
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

const HOME_HUBS: readonly HomeHub[] = [
  {
    id: 'quebec-city',
    label: 'Quebec City',
    provinceId: 'qc',
    roleKey: 'home.map.overlay.hubRoles.dispatch',
    briefKey: 'home.map.overlay.hubBriefs.quebecCity',
    corridorIds: ['flow-energy'],
    coordinates: [-71.208, 46.8139],
  },
  {
    id: 'montreal',
    label: 'Montreal',
    provinceId: 'qc',
    roleKey: 'home.map.overlay.hubRoles.trade',
    briefKey: 'home.map.overlay.hubBriefs.montreal',
    corridorIds: ['flow-energy', 'flow-qc-usne'],
    coordinates: [-73.5673, 45.5017],
  },
  {
    id: 'ottawa',
    label: 'Ottawa',
    provinceId: 'on',
    roleKey: 'home.map.overlay.hubRoles.governance',
    briefKey: 'home.map.overlay.hubBriefs.ottawa',
    corridorIds: ['flow-energy'],
    coordinates: [-75.6972, 45.4215],
  },
  {
    id: 'toronto',
    label: 'Toronto',
    provinceId: 'on',
    roleKey: 'home.map.overlay.hubRoles.market',
    briefKey: 'home.map.overlay.hubBriefs.toronto',
    corridorIds: ['flow-energy', 'flow-battery', 'flow-food'],
    coordinates: [-79.3832, 43.6532],
  },
  {
    id: 'calgary',
    label: 'Calgary',
    provinceId: 'ab',
    roleKey: 'home.map.overlay.hubRoles.extraction',
    briefKey: 'home.map.overlay.hubBriefs.calgary',
    corridorIds: ['flow-battery'],
    coordinates: [-114.0719, 51.0447],
  },
  {
    id: 'winnipeg',
    label: 'Winnipeg',
    provinceId: 'mb',
    roleKey: 'home.map.overlay.hubRoles.sync',
    briefKey: 'home.map.overlay.hubBriefs.winnipeg',
    corridorIds: ['flow-battery', 'flow-food'],
    coordinates: [-97.1384, 49.8951],
  },
  {
    id: 'vancouver',
    label: 'Vancouver',
    provinceId: 'bc',
    roleKey: 'home.map.overlay.hubRoles.gateway',
    briefKey: 'home.map.overlay.hubBriefs.vancouver',
    corridorIds: ['flow-food'],
    coordinates: [-123.1207, 49.2827],
  },
  {
    id: 'boston',
    label: 'Boston',
    provinceId: 'us-ma',
    roleKey: 'home.map.overlay.hubRoles.export',
    briefKey: 'home.map.overlay.hubBriefs.boston',
    corridorIds: ['flow-qc-usne'],
    coordinates: [-71.0589, 42.3601],
  },
] as const;

const HOME_HUB_FEATURES: FeatureCollection<Point> = {
  type: 'FeatureCollection',
  features: HOME_HUBS.map((hub) => ({
    type: 'Feature',
    id: hub.id,
    properties: { label: hub.label, provinceId: hub.provinceId, hubId: hub.id },
    geometry: { type: 'Point', coordinates: [...hub.coordinates] },
  })),
};

@Component({
  selector: 'og7-home-openlayers-map',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="absolute inset-0 overflow-hidden rounded-4xl bg-slate-950" data-og7="trade-map" data-og7-layer="flows">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(34,211,238,0.22),transparent_34%),radial-gradient(circle_at_82%_18%,rgba(56,189,248,0.18),transparent_28%),linear-gradient(180deg,#020617_0%,#03111e_46%,#041d2d_100%)]"></div>
      <div class="absolute inset-0 bg-[linear-gradient(rgba(103,232,249,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(103,232,249,0.08)_1px,transparent_1px)] bg-size-[72px_72px] opacity-40"></div>
      <div
        #mapHost
        class="absolute inset-0 transition-[opacity,transform,filter] duration-900 ease-out"
        [class.opacity-0]="!mapVisualReady()"
        [class.opacity-100]="mapVisualReady()"
        [class.scale-[1.035]]="!mapVisualReady()"
        [class.scale-100]="mapVisualReady()"
        [class.blur-[2px]]="!mapVisualReady()"
        [class.blur-0]="mapVisualReady()"
        data-og7-id="openlayers-home-map"
      ></div>
      @if (mapLoadingOverlayVisible()) {
        <div
          class="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-4xl transition-[opacity,transform,filter] duration-900 ease-out"
          [class.bg-slate-950/78]="!mapVisualReady()"
          [class.bg-slate-950/24]="mapVisualReady()"
          [class.opacity-100]="!mapVisualReady()"
          [class.opacity-0]="mapVisualReady()"
          [class.scale-100]="!mapVisualReady()"
          [class.scale-[1.02]]="mapVisualReady()"
          [class.backdrop-blur-[3px]]="!mapVisualReady()"
          [class.backdrop-blur-0]="mapVisualReady()"
          aria-hidden="true"
        >
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(103,232,249,0.26),transparent_28%),radial-gradient(circle_at_82%_20%,rgba(56,189,248,0.18),transparent_26%),radial-gradient(circle_at_50%_78%,rgba(45,212,191,0.14),transparent_34%),linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.48)_100%)]"></div>
          <div class="absolute inset-[-32%] bg-[conic-gradient(from_180deg_at_50%_50%,rgba(34,211,238,0)_0deg,rgba(34,211,238,0.2)_72deg,rgba(14,165,233,0.04)_160deg,rgba(34,211,238,0.12)_248deg,rgba(34,211,238,0)_360deg)] opacity-75 animate-[spin_10s_linear_infinite]"></div>
          <div class="absolute inset-y-0 left-1/2 w-40 -translate-x-1/2 bg-[linear-gradient(180deg,rgba(103,232,249,0)_0%,rgba(103,232,249,0.12)_18%,rgba(103,232,249,0.22)_50%,rgba(103,232,249,0.08)_82%,rgba(103,232,249,0)_100%)] blur-2xl"></div>
          <div class="absolute inset-0 bg-[linear-gradient(112deg,transparent_0%,rgba(255,255,255,0.02)_38%,rgba(103,232,249,0.22)_50%,rgba(255,255,255,0.02)_62%,transparent_100%)] animate-[pulse_2.8s_ease-in-out_infinite]"></div>

          <div class="absolute inset-0 flex items-center justify-center">
            <div class="relative flex h-44 w-44 items-center justify-center">
              <div class="absolute h-44 w-44 rounded-full border border-cyan-300/10 bg-cyan-200/5 shadow-[0_0_90px_rgba(34,211,238,0.12)] animate-[ping_3.8s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
              <div class="absolute h-32 w-32 rounded-full border border-cyan-200/16"></div>
              <div class="absolute h-20 w-20 rounded-full border border-cyan-100/28"></div>
              <div class="absolute h-12 w-12 rounded-full border border-white/14 bg-white/4 backdrop-blur-sm"></div>
              <div class="absolute h-3 w-24 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0),rgba(103,232,249,0.9),rgba(34,211,238,0))] blur-[1px] animate-[spin_4.2s_linear_infinite]"></div>
              <div class="h-3.5 w-3.5 rounded-full bg-cyan-100 shadow-[0_0_26px_rgba(103,232,249,0.95)]"></div>
            </div>
          </div>

          <div class="absolute inset-x-0 bottom-12 flex justify-center px-6">
            <div class="w-full max-w-72 rounded-[1.4rem] border border-white/8 bg-slate-900/42 px-4 py-3 shadow-[0_18px_44px_rgba(2,6,23,0.34)] backdrop-blur-md">
              <div class="flex items-center gap-2.5">
                <span class="h-1.5 w-1.5 rounded-full bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.8)] animate-pulse"></span>
                <span class="h-px flex-1 bg-[linear-gradient(90deg,rgba(148,163,184,0.08),rgba(103,232,249,0.42),rgba(148,163,184,0.08))]"></span>
                <span class="h-1.5 w-1.5 rounded-full bg-cyan-200/80 animate-pulse"></span>
              </div>
              <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                <div class="h-full w-1/2 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.05),rgba(125,211,252,0.95),rgba(45,212,191,0.1))] shadow-[0_0_20px_rgba(103,232,249,0.45)] animate-[pulse_1.6s_ease-in-out_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
      }
      <div class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-slate-950 via-slate-950/44 to-transparent"></div>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-linear-to-t from-slate-950 via-slate-950/54 to-transparent"></div>

      <div class="absolute inset-0 flex flex-col justify-between p-3 pb-8 sm:p-4 sm:pb-10 lg:p-5 lg:pb-12" data-og7="map-overlay">
        <div class="flex flex-col gap-2.5 lg:flex-row lg:items-start lg:justify-between">
          <section
            class="pointer-events-auto max-w-xl rounded-[1.45rem] border border-white/10 bg-transparent p-3 text-white sm:p-3.5"
            data-og7="map-sector-rail"
          >
            <div class="flex items-center justify-between gap-3">
              <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-200/75">
                {{ 'home.map.overlay.sectors' | translate }}
              </p>
              @if (activeSector() || pinnedCorridorId()) {
                <button
                  type="button"
                  class="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                  data-og7="action"
                  data-og7-id="map-reset-focus"
                  (click)="resetFocus()"
                >
                  {{ 'home.map.overlay.reset' | translate }}
                </button>
              }
            </div>

            <div class="mt-2.5 flex flex-wrap gap-2">
              @for (sector of sectorCards(); track sector.id) {
                <button
                  type="button"
                  class="group rounded-xl border px-3 py-1.5 text-left transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                  [style.borderColor]="sector.active ? getSectorGlowColor(sector.id, 0.42) : 'rgba(148, 163, 184, 0.18)'"
                  [style.background]="sector.active ? 'linear-gradient(135deg, rgba(15, 23, 42, 0.68), ' + getSectorGlowColor(sector.id, 0.16) + ')' : 'rgba(2, 6, 23, 0.48)'"
                  [style.boxShadow]="sector.active ? '0 24px 42px -28px ' + getSectorGlowColor(sector.id, 0.9) : 'none'"
                  [attr.aria-pressed]="sector.active"
                  [attr.data-og7-id]="'map-sector-' + sector.id"
                  (click)="toggleSector(sector.id)"
                >
                  <span class="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300/80">
                    {{ sector.corridorCount }} {{ 'home.map.overlay.corridorsCount' | translate }}
                  </span>
                  <span class="mt-0.5 block text-[0.95rem] font-semibold text-white">
                    {{ sector.labelKey | translate }}
                  </span>
                </button>
              }
            </div>
          </section>

          <div class="flex flex-col gap-2 lg:max-w-64 lg:items-end lg:self-center">
            <div class="pointer-events-auto flex justify-end">
              <button
                type="button"
                class="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                [class.border-cyan-300/45]="showMapStats()"
                [class.bg-cyan-300/14]="showMapStats()"
                [class.text-cyan-50]="showMapStats()"
                [class.shadow-[0_0_0_1px_rgba(103,232,249,0.14),0_10px_24px_rgba(8,47,73,0.22)]]="showMapStats()"
                [class.hover:bg-cyan-300/20]="showMapStats()"
                [class.border-white/12]="!showMapStats()"
                [class.bg-slate-950/46]="!showMapStats()"
                [class.hover:bg-slate-950/60]="!showMapStats()"
                data-og7="action"
                data-og7-id="map-toggle-stats"
                aria-controls="home-map-stats-panel"
                [attr.aria-expanded]="showMapStats()"
                (click)="toggleMapStats()"
              >
                {{ (showMapStats() ? 'home.map.overlay.hideStats' : 'home.map.overlay.showStats') | translate }}
              </button>
            </div>

            <section
              id="home-map-stats-panel"
              class="grid max-w-64 grid-cols-1 gap-1.5 overflow-hidden text-white transition-all duration-300 ease-out"
              [class.max-h-80]="showMapStats()"
              [class.translate-y-0]="showMapStats()"
              [class.opacity-84]="showMapStats()"
              [class.max-h-0]="!showMapStats()"
              [class.-translate-y-2]="!showMapStats()"
              [class.opacity-0]="!showMapStats()"
              [attr.aria-hidden]="!showMapStats()"
              data-og7="map-pulse-panel"
            >
              <article
                class="rounded-2xl border border-cyan-400/12 px-3 py-2 shadow-[0_10px_28px_rgba(2,6,23,0.24)]"
                [class.bg-slate-950/72]="autoCameraMotionActive()"
                [class.backdrop-blur-none]="autoCameraMotionActive()"
                [class.bg-slate-950/38]="!autoCameraMotionActive()"
                [class.backdrop-blur-sm]="!autoCameraMotionActive()"
              >
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-200/68">
                    {{ 'home.map.overlay.liveCorridors' | translate }}
                  </span>
                  <strong class="text-[1.15rem] font-semibold leading-none text-white">
                    {{ visibleCorridors().length }}
                  </strong>
                </div>
                <span class="mt-1 block text-[10px] font-medium text-slate-300/64">{{ 'home.map.overlay.networkPulse' | translate }}</span>
              </article>

              <article
                class="rounded-2xl border border-white/10 px-3 py-2 shadow-[0_10px_28px_rgba(2,6,23,0.24)]"
                [class.bg-slate-950/72]="autoCameraMotionActive()"
                [class.backdrop-blur-none]="autoCameraMotionActive()"
                [class.bg-slate-950/38]="!autoCameraMotionActive()"
                [class.backdrop-blur-sm]="!autoCameraMotionActive()"
              >
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-200/68">
                    {{ 'home.map.overlay.liveHubs' | translate }}
                  </span>
                  <strong class="text-[1.15rem] font-semibold leading-none text-white">
                    {{ visibleHubCount() }}
                  </strong>
                </div>
                <span class="mt-1 block text-[10px] font-medium text-slate-300/64">{{ 'home.map.overlay.networkPulse' | translate }}</span>
              </article>

              <article
                class="rounded-2xl border border-white/10 px-3 py-2 shadow-[0_10px_28px_rgba(2,6,23,0.24)]"
                [class.bg-slate-950/72]="autoCameraMotionActive()"
                [class.backdrop-blur-none]="autoCameraMotionActive()"
                [class.bg-slate-950/38]="!autoCameraMotionActive()"
                [class.backdrop-blur-sm]="!autoCameraMotionActive()"
                data-og7="map-cinematic-status"
                [attr.data-og7-id]="cinematicStatusId()"
                [attr.data-og7-state]="mapInteractionState()"
              >
                <span class="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-200/68">
                  {{ 'home.map.overlay.cinematicStatusLabel' | translate }}
                </span>
                <strong class="mt-1 block text-[0.92rem] font-semibold text-white">
                  {{ cinematicStatusLabelKey() | translate }}
                </strong>
              </article>
            </section>

            @if (currentHub(); as hub) {
              <section
                class="pointer-events-auto relative max-w-64 overflow-hidden rounded-[1.2rem] border border-amber-200/18 p-3 text-white shadow-[0_14px_42px_rgba(2,6,23,0.3)]"
                [class.bg-slate-950/78]="autoCameraMotionActive()"
                [class.backdrop-blur-none]="autoCameraMotionActive()"
                [class.bg-slate-950/54]="!autoCameraMotionActive()"
                [class.backdrop-blur-md]="!autoCameraMotionActive()"
                [style.borderColor]="'rgba(251, 191, 36, 0.28)'"
                [style.boxShadow]="getActiveHubCardShadow()"
                data-og7="map-hub-card"
                [attr.data-og7-id]="hub.id"
              >
                <div class="pointer-events-none absolute inset-x-4 -top-8 h-20 rounded-full blur-2xl" [style.background]="'radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0) 72%)'"></div>
                <div class="pointer-events-none absolute inset-x-4 top-0 h-px" [style.background]="'linear-gradient(90deg, rgba(251, 191, 36, 0), rgba(253, 224, 71, 0.92), rgba(251, 191, 36, 0))'"></div>
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-100/70">
                      {{ 'home.map.overlay.hubSpotlight' | translate }}
                    </p>
                    <h4 class="mt-1.5 text-lg font-semibold text-white">
                      {{ hub.label }}
                    </h4>
                    <p class="mt-1.5 text-[13px] leading-relaxed text-slate-300/80">
                      {{ hub.briefKey | translate }}
                    </p>
                  </div>

                  <button
                    type="button"
                    class="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-100 transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                    data-og7="action"
                    data-og7-id="map-hub-dismiss"
                    (click)="dismissHubCard()"
                  >
                    {{ 'home.map.overlay.dismiss' | translate }}
                  </button>
                </div>

                <div class="mt-3 grid gap-2 sm:grid-cols-2">
                  <article class="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                    <span class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {{ 'home.map.overlay.hubRole' | translate }}
                    </span>
                    <strong class="mt-2 block text-base font-semibold text-white">
                      {{ hub.roleKey | translate }}
                    </strong>
                  </article>

                  <article class="rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
                    <span class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      {{ 'home.map.overlay.monitoredCorridors' | translate }}
                    </span>
                    <strong class="mt-2 block text-base font-semibold text-white">
                      {{ hub.corridorIds.length }}
                    </strong>
                  </article>
                </div>

                <div class="mt-3 flex flex-wrap gap-1.5">
                  @for (corridorLabelKey of currentHubCorridorLabelKeys(); track corridorLabelKey) {
                    <span class="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em] text-slate-200">
                      {{ corridorLabelKey | translate }}
                    </span>
                  }
                </div>
              </section>
            } @else {
              <section
                class="pointer-events-none max-w-64 rounded-2xl border border-white/10 px-3 py-2 text-[11px] leading-relaxed font-medium tracking-[0.01em] text-slate-300/64 shadow-[0_10px_28px_rgba(2,6,23,0.24)]"
                [class.bg-slate-950/72]="autoCameraMotionActive()"
                [class.backdrop-blur-none]="autoCameraMotionActive()"
                [class.bg-slate-950/42]="!autoCameraMotionActive()"
                [class.backdrop-blur-sm]="!autoCameraMotionActive()"
                data-og7="map-hub-prompt"
              >
                {{ 'home.map.overlay.hubPrompt' | translate }}
              </section>
            }
          </div>
        </div>

        <div class="mb-1 flex flex-col gap-2.5 lg:mb-4 lg:flex-row lg:items-end lg:justify-between xl:mb-5">
          @if (currentCorridor(); as corridor) {
            <section
              class="pointer-events-auto relative max-w-92 overflow-hidden rounded-[1.45rem] border border-white/10 p-3 text-white shadow-[0_18px_56px_rgba(2,6,23,0.34)] sm:max-w-96 sm:p-3.5"
              [class.bg-slate-950/78]="autoCameraMotionActive()"
              [class.backdrop-blur-none]="autoCameraMotionActive()"
              [class.bg-slate-950/54]="!autoCameraMotionActive()"
              [class.backdrop-blur-md]="!autoCameraMotionActive()"
              [style.borderColor]="getSectorGlowColor(corridor.sector, 0.34)"
              [style.boxShadow]="getActiveCorridorCardShadow(corridor.sector)"
              data-og7="map-corridor-card"
              [attr.data-og7-id]="corridor.id"
            >
              <div class="pointer-events-none absolute inset-x-5 -top-10 h-24 rounded-full blur-3xl" [style.background]="'radial-gradient(circle, ' + getSectorGlowColor(corridor.sector, 0.32) + ' 0%, ' + getSectorGlowColor(corridor.sector, 0) + ' 72%)'"></div>
              <div class="pointer-events-none absolute inset-x-4 top-0 h-px" [style.background]="'linear-gradient(90deg, ' + getSectorGlowColor(corridor.sector, 0) + ', ' + getSectorColor(corridor.sector, true) + ', ' + getSectorGlowColor(corridor.sector, 0) + ')' "></div>
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-200/75">
                    {{ 'home.map.overlay.priority' | translate }}
                  </p>
                  <h3 class="mt-1 max-w-56 text-[1.45rem] font-semibold leading-tight tracking-tight text-white sm:max-w-64 sm:text-[1.65rem]">
                    {{ corridor.routeLabelKey | translate }}
                  </h3>
                  <p class="mt-1 max-w-md text-[12px] leading-relaxed text-slate-300/78">
                    {{ corridor.briefKey | translate }}
                  </p>
                </div>

                <div class="flex shrink-0 flex-col items-end gap-1.5">
                  <span
                    class="inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]"
                    [style.borderColor]="getSectorGlowColor(corridor.sector, 0.45)"
                    [style.background]="getSectorGlowColor(corridor.sector, 0.14)"
                    [style.color]="getSectorColor(corridor.sector, true)"
                  >
                    {{ getSectorLabelKey(corridor.sector) | translate }}
                  </span>
                  <span class="rounded-full border border-white/10 bg-white/6 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-100/85">
                    {{ corridor.stageKey | translate }}
                  </span>
                </div>
              </div>

              <div class="mt-2.5 grid gap-1.5 sm:grid-cols-3">
                <article class="rounded-xl border border-white/8 bg-white/4 px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {{ 'home.map.overlay.signal' | translate }}
                  </span>
                  <strong class="mt-1 block text-base font-semibold text-white">
                    {{ corridor.reliability }}%
                  </strong>
                  <p class="mt-1.5 text-[11px] leading-relaxed text-slate-300/80">
                    {{ 'home.map.overlay.monitoringWindow' | translate:{ hours: corridor.monitoringHours } }}
                  </p>
                </article>

                <article class="rounded-xl border border-white/8 bg-white/4 px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {{ 'home.map.overlay.provinces' | translate }}
                  </span>
                  <strong class="mt-1 block text-base font-semibold text-white">
                    {{ corridor.provinces.length }}
                  </strong>
                  <div class="mt-1.5 flex flex-wrap gap-1">
                    @for (provinceLabel of currentCorridorProvinceLabels(); track provinceLabel) {
                      <span class="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-200">
                        {{ provinceLabel }}
                      </span>
                    }
                  </div>
                </article>

                <article class="rounded-xl border border-white/8 bg-white/4 px-2.5 py-2">
                  <span class="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    {{ 'home.map.overlay.checkpoints' | translate }}
                  </span>
                  <strong class="mt-1 block text-base font-semibold text-white">
                    {{ corridor.checkpointCount }}
                  </strong>
                  <p class="mt-1.5 text-[11px] leading-relaxed text-slate-300/80">
                    {{ 'home.map.overlay.hubs' | translate }}: {{ currentCorridorHubCount() }}
                  </p>
                </article>
              </div>

              <div class="mt-2.5 rounded-xl border border-white/8 bg-white/4 px-2.5 py-2">
                <div class="flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <span>{{ 'home.map.overlay.commitment' | translate }}</span>
                  <span>{{ corridor.reliability }}%</span>
                </div>
                <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-800/90">
                  <div
                    class="h-full rounded-full transition-[width] duration-500"
                    [style.width.%]="corridor.reliability"
                    [style.background]="'linear-gradient(90deg, ' + getSectorGlowColor(corridor.sector, 0.36) + ', ' + getSectorColor(corridor.sector, true) + ')'"
                  ></div>
                </div>
              </div>

              <div class="mt-2.5 rounded-xl border border-white/8 bg-white/4 px-2.5 py-2">
                <div class="flex items-center justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <span>{{ 'home.map.overlay.routeBeatsTitle' | translate }}</span>
                  <span>{{ currentCorridorBeats().length }}</span>
                </div>

                <div class="mt-1.5 flex flex-wrap gap-1">
                  @for (beat of currentCorridorBeats(); track beat.id) {
                    <button
                      type="button"
                      class="rounded-full border px-2 py-1 text-[9px] font-semibold tracking-[0.18em] transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                      data-og7="map-corridor-beat"
                      [attr.data-og7-id]="beat.id"
                      [style.borderColor]="isActiveBeat(beat.id) ? getSectorGlowColor(corridor.sector, 0.46) : 'rgba(148, 163, 184, 0.18)'"
                      [style.background]="isActiveBeat(beat.id) ? getSectorGlowColor(corridor.sector, 0.16) : 'rgba(2, 6, 23, 0.42)'"
                      [style.color]="isActiveBeat(beat.id) ? getSectorColor(corridor.sector, true) : '#e2e8f0'"
                      [attr.aria-pressed]="isActiveBeat(beat.id)"
                      (click)="focusCorridorBeat(corridor.id, beat.id)"
                    >
                      {{ beat.labelKey | translate }}
                    </button>
                  }
                </div>
              </div>
            </section>
          }

          <section
            class="pointer-events-none hidden max-w-68 rounded-[1.35rem] border border-white/10 p-3 text-white shadow-[0_14px_42px_rgba(2,6,23,0.3)] lg:block"
            [class.bg-slate-950/76]="autoCameraMotionActive()"
            [class.backdrop-blur-none]="autoCameraMotionActive()"
            [class.bg-slate-950/52]="!autoCameraMotionActive()"
            [class.backdrop-blur-md]="!autoCameraMotionActive()"
            data-og7="map-legend"
          >
            <p class="text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-300/70">
              {{ 'home.map.overlay.briefing' | translate }}
            </p>

            <div class="mt-2.5 space-y-2 text-[13px]">
              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.7)]"></span>
                <span class="text-slate-200">{{ 'home.map.overlay.legendCorridor' | translate }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.7)]"></span>
                <span class="text-slate-200">{{ 'home.map.overlay.legendHub' | translate }}</span>
              </div>
              <div class="flex items-center gap-3">
                <span class="h-2.5 w-2.5 rounded-full bg-slate-300"></span>
                <span class="text-slate-200">{{ 'home.map.overlay.legendProvince' | translate }}</span>
              </div>
            </div>

            @if (currentCorridor(); as corridor) {
              <div class="mt-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-[12px] text-slate-200/85">
                <p class="font-semibold text-white">{{ corridor.routeLabelKey | translate }}</p>
                <p class="mt-2 leading-relaxed text-slate-300/80">{{ corridor.briefKey | translate }}</p>
              </div>
            }
          </section>
        </div>
      </div>
    </div>
  `,
  host: {
    style: 'display:block;position:relative;width:100%;height:100%;min-height:480px;',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeOpenlayersMapComponent implements AfterViewInit {
  @ViewChild('mapHost', { static: true }) private readonly mapHost?: import('@angular/core').ElementRef<HTMLDivElement>;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);
  private readonly filters = inject(FiltersService);
  private readonly geoJson = new GeoJSON();
  private readonly topoJson = new TopoJSON();
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly hoveredCorridorId = signal<string | null>(null);
  private readonly activeHubId = signal<string | null>(null);
  private readonly activeBeatId = signal<string | null>(null);
  private readonly cinematicCorridorId = signal<string | null>(null);
  private readonly flowPulsePhase = signal(0);
  private readonly interactionReady = signal(false);
  protected readonly mapVisualReady = signal(false);
  protected readonly mapLoadingOverlayVisible = signal(true);
  private readonly prefersReducedMotion = signal(false);
  private readonly pageHidden = signal(false);
  protected readonly pinnedCorridorId = signal<string | null>(null);
  protected readonly showMapStats = signal(true);
  protected readonly autoCameraMotionActive = signal(false);
  protected readonly activeSector = this.filters.activeSector;
  protected readonly highlightedSector = computed<HomeSector | null>(() => {
    const selectedSector = this.activeSector();
    if (selectedSector) {
      return selectedSector as HomeSector;
    }

    return this.findCorridor(this.pinnedCorridorId())?.sector ?? this.findCorridor(this.cinematicCorridorId())?.sector ?? null;
  });
  protected readonly sectorCards = computed(() =>
    HOME_SECTORS.map((sector) => ({
      ...sector,
      corridorCount: HOME_CORRIDORS.filter((corridor) => corridor.sector === sector.id).length,
      active: this.highlightedSector() === sector.id,
    })),
  );
  protected readonly visibleCorridors = computed(() => {
    const sector = this.activeSector();
    if (!sector) {
      return [...HOME_CORRIDORS];
    }

    return HOME_CORRIDORS.filter((corridor) => corridor.sector === sector);
  });
  protected readonly currentCorridor = computed(() => {
    const pinned = this.findCorridor(this.pinnedCorridorId());
    if (pinned) {
      return pinned;
    }

    const hovered = this.findCorridor(this.hoveredCorridorId());
    if (hovered) {
      return hovered;
    }

    const cinematic = this.findCorridor(this.cinematicCorridorId());
    if (cinematic) {
      return cinematic;
    }

    return this.visibleCorridors()[0] ?? HOME_CORRIDORS[0] ?? null;
  });
  protected readonly currentCorridorBeats = computed(() => this.currentCorridor()?.beats ?? []);
  protected readonly currentCorridorProvinceLabels = computed(() =>
    this.currentCorridor()?.provinces.map((provinceId) => this.getProvinceBadgeLabel(provinceId)) ?? [],
  );
  protected readonly currentHub = computed(() => this.findHub(this.activeHubId()));
  protected readonly currentHubCorridorLabelKeys = computed(() =>
    this.currentHub()
      ?.corridorIds.map((corridorId) => this.findCorridor(corridorId)?.routeLabelKey)
      .filter((labelKey): labelKey is string => Boolean(labelKey)) ?? [],
  );
  protected readonly currentCorridorHubCount = computed(() => {
    const corridorId = this.currentCorridor()?.id;
    if (!corridorId) {
      return 0;
    }

    return HOME_HUBS.filter((hub) => hub.corridorIds.includes(corridorId)).length;
  });
  protected readonly visibleHubCount = computed(() => {
    const corridorIds = new Set(this.visibleCorridors().map((corridor) => corridor.id));
    return HOME_HUBS.filter((hub) => hub.corridorIds.some((corridorId) => corridorIds.has(corridorId))).length;
  });
  protected readonly cinematicStatusId = computed(() => {
    if (this.prefersReducedMotion() || this.pageHidden()) {
      return 'paused';
    }

    return this.cinematicCorridorId() ? 'active' : 'standby';
  });
  protected readonly cinematicStatusLabelKey = computed(() => `home.map.overlay.cinematicStatus.${this.cinematicStatusId()}`);
  protected readonly mapInteractionState = computed(() => (this.interactionReady() ? 'ready' : 'booting'));
  private readonly activeCorridorIds = computed(() => {
    const pinned = this.pinnedCorridorId();
    if (pinned) {
      return new Set([pinned]);
    }

    const hovered = this.hoveredCorridorId();
    const sector = this.activeSector();
    const ids = new Set<string>();

    if (sector) {
      for (const corridor of HOME_CORRIDORS) {
        if (corridor.sector === sector) {
          ids.add(corridor.id);
        }
      }
    }

    if (hovered) {
      ids.add(hovered);
    }

    const cinematic = this.cinematicCorridorId();
    if (cinematic) {
      ids.add(cinematic);
    }

    return ids;
  });

  private map: Map | null = null;
  private provinceLayer: VectorLayer<VectorSource> | null = null;
  private provinceLabelLayer: VectorLayer<VectorSource> | null = null;
  private corridorLayer: VectorLayer<VectorSource> | null = null;
  private hubLayer: VectorLayer<VectorSource> | null = null;
  private interactionKeys: unknown[] = [];
  private targetSyncTimer: number | null = null;
  private flowPulseTimer: number | null = null;
  private idleCinematicTimer: number | null = null;
  private autoCameraMotionTimer: number | null = null;
  private resetCenterOffsetTimer: number | null = null;
  private mapRevealTimer: number | null = null;
  private lastCameraFocusKey: string | null = null;
  private cinematicCursor = -1;
  private lastUserInteractionAt = Date.now();
  private reducedMotionQuery: MediaQueryList | null = null;
  private readonly handleReducedMotionChange = (event: MediaQueryListEvent): void => {
    this.prefersReducedMotion.set(event.matches);
    this.reconcileAnimationSchedulers();
  };
  private readonly handleVisibilityChange = (): void => {
    this.pageHidden.set(document.hidden);
    this.reconcileAnimationSchedulers();
  };

  constructor() {
    effect(() => {
      this.activeCorridorIds();
      this.flowPulsePhase();
      this.refreshMapStyles();
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || !this.mapHost) {
      return;
    }

    this.restoreMapStatsPreference();
    this.registerMotionPreferences();
    this.initializeMap();
    this.ensureConnectedTarget();
    this.startTargetSync();
    this.reconcileAnimationSchedulers();
  }

  ngOnDestroy(): void {
    if (this.targetSyncTimer !== null) {
      clearInterval(this.targetSyncTimer);
      this.targetSyncTimer = null;
    }

    if (this.flowPulseTimer !== null) {
      clearInterval(this.flowPulseTimer);
      this.flowPulseTimer = null;
    }

    if (this.idleCinematicTimer !== null) {
      clearInterval(this.idleCinematicTimer);
      this.idleCinematicTimer = null;
    }

    if (this.autoCameraMotionTimer !== null) {
      clearTimeout(this.autoCameraMotionTimer);
      this.autoCameraMotionTimer = null;
    }

    if (this.resetCenterOffsetTimer !== null) {
      clearTimeout(this.resetCenterOffsetTimer);
      this.resetCenterOffsetTimer = null;
    }

    if (this.mapRevealTimer !== null) {
      clearTimeout(this.mapRevealTimer);
      this.mapRevealTimer = null;
    }

    if (this.isBrowser) {
      if (this.reducedMotionQuery) {
        this.reducedMotionQuery.removeEventListener('change', this.handleReducedMotionChange);
        this.reducedMotionQuery = null;
      }

      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }

    if (this.interactionKeys.length) {
      unByKey(this.interactionKeys as Parameters<typeof unByKey>[0]);
    }

    if (this.map) {
      this.map.setTarget(undefined);
      this.map = null;
    }
  }

  private initializeMap(): void {
    if (this.map || !this.mapHost?.nativeElement.isConnected) {
      return;
    }

    this.mapVisualReady.set(false);
    this.mapLoadingOverlayVisible.set(true);
    if (this.mapRevealTimer !== null) {
      clearTimeout(this.mapRevealTimer);
      this.mapRevealTimer = null;
    }

    const provinceSource = new VectorSource();
    const provinceLabelSource = new VectorSource();
    const corridorSource = new VectorSource({
      features: this.geoJson.readFeatures(HOME_FLOWS, { featureProjection: 'EPSG:3857' }),
    });
    const hubSource = new VectorSource({
      features: this.geoJson.readFeatures(HOME_HUB_FEATURES, { featureProjection: 'EPSG:3857' }),
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
        center: fromLonLat(PANORAMIC_BASE_CENTER),
        zoom: PANORAMIC_BASE_ZOOM,
        minZoom: 3,
        maxZoom: 7,
      }),
    });

    const renderReadyKey = this.map.once('rendercomplete', () => {
      this.ngZone.run(() => {
        this.mapVisualReady.set(true);
        if (this.mapRevealTimer !== null) {
          clearTimeout(this.mapRevealTimer);
        }
        this.ngZone.runOutsideAngular(() => {
          this.mapRevealTimer = window.setTimeout(() => {
            this.ngZone.run(() => {
              this.mapLoadingOverlayVisible.set(false);
              this.mapRevealTimer = null;
            });
          }, MAP_REVEAL_TRANSITION_MS);
        });
      });
    });
    this.interactionKeys.push(renderReadyKey);

    void this.loadBoundaryFeatures(provinceSource, provinceLabelSource);
    this.resetView();
    this.syncFocusView(true);

    this.interactionKeys = [
      this.map.on('pointermove', event => {
        if (event.dragging) {
          return;
        }

        const hoveredFeature = this.findCorridorFeature(event.pixel);
        const hoveredHub = this.findHubFeature(event.pixel);
        const hoveredId = hoveredFeature?.get('corridorId') ?? null;
        if (hoveredId || hoveredHub) {
          this.noteUserInteraction();
        }
        this.hoveredCorridorId.set(hoveredId);
        this.mapHost?.nativeElement.style.setProperty('cursor', hoveredId || hoveredHub ? 'pointer' : 'default');
        this.refreshMapStyles();
      }),
      this.map.on('singleclick', event => {
        this.noteUserInteraction();
        const clickedHub = this.findHubFeature(event.pixel);
        const hubId = clickedHub?.get('hubId') as string | undefined;
        if (hubId) {
          const hub = this.findHub(hubId);
          const preferredCorridor =
            hub?.corridorIds
              .map((corridorId) => this.findCorridor(corridorId))
              .find((corridor): corridor is HomeCorridor => Boolean(corridor) && (!this.activeSector() || corridor.sector === this.activeSector())) ??
            (hub?.corridorIds[0] ? this.findCorridor(hub.corridorIds[0]) : null);

          this.activeHubId.set(hubId);
          this.activeBeatId.set(this.findBeatForHub(preferredCorridor?.id ?? null, hubId)?.id ?? null);
          this.pinnedCorridorId.set(preferredCorridor?.id ?? null);
          this.filters.activeSector.set((preferredCorridor?.sector ?? this.activeSector() ?? null) as SectorType | null);
          this.refreshMapStyles();
          this.syncFocusView();
          return;
        }

        const clickedFeature = this.findCorridorFeature(event.pixel);
        const corridorId = clickedFeature?.get('corridorId') as string | undefined;
        if (!corridorId) {
          this.activeHubId.set(null);
          this.activeBeatId.set(null);
          this.pinnedCorridorId.set(null);
          this.filters.activeSector.set(null);
          this.refreshMapStyles();
          this.syncFocusView();
          return;
        }

        const corridor = HOME_CORRIDORS.find(entry => entry.id === corridorId);
        this.activeHubId.set(null);
  this.activeBeatId.set(null);
        this.pinnedCorridorId.set(corridorId);
        this.filters.activeSector.set((corridor?.sector ?? null) as SectorType | null);
        this.refreshMapStyles();
        this.syncFocusView();
      }),
    ];

    this.interactionReady.set(true);
  }

  private startTargetSync(): void {
    if (this.targetSyncTimer !== null) {
      return;
    }

    let remainingAttempts = 60;
    this.ngZone.runOutsideAngular(() => {
      this.targetSyncTimer = window.setInterval(() => {
        this.ngZone.run(() => {
          this.initializeMap();
          this.ensureConnectedTarget();

          remainingAttempts -= 1;
          if (remainingAttempts <= 0) {
            clearInterval(this.targetSyncTimer!);
            this.targetSyncTimer = null;
          }
        });
      }, 250);
    });
  }

  private startFlowPulse(): void {
    if (this.flowPulseTimer !== null) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.flowPulseTimer = window.setInterval(() => {
        this.ngZone.run(() => {
          this.flowPulsePhase.update((phase) => (phase + 6) % 200);
        });
      }, 90);
    });
  }

  private stopFlowPulse(): void {
    if (this.flowPulseTimer === null) {
      return;
    }

    clearInterval(this.flowPulseTimer);
    this.flowPulseTimer = null;
  }

  private startIdleCinematic(): void {
    if (this.idleCinematicTimer !== null) {
      return;
    }

    this.ngZone.runOutsideAngular(() => {
      this.idleCinematicTimer = window.setInterval(() => {
        this.ngZone.run(() => {
          if (!this.map || this.activeHubId() || this.pinnedCorridorId() || this.activeSector()) {
            return;
          }

          if (Date.now() - this.lastUserInteractionAt < IDLE_CINEMATIC_DELAY_MS) {
            return;
          }

          this.cinematicCursor = (this.cinematicCursor + 1) % HOME_CORRIDORS.length;
          this.activeBeatId.set(null);
          this.cinematicCorridorId.set(HOME_CORRIDORS[this.cinematicCursor]?.id ?? null);
          this.markAutoCameraMotionWindow();
          this.syncFocusView();
        });
      }, IDLE_CINEMATIC_STEP_MS);
    });
  }

  private stopIdleCinematic(): void {
    if (this.idleCinematicTimer === null) {
      return;
    }

    clearInterval(this.idleCinematicTimer);
    this.idleCinematicTimer = null;
  }

  private registerMotionPreferences(): void {
    this.pageHidden.set(document.hidden);
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.prefersReducedMotion.set(this.reducedMotionQuery.matches);
    this.reducedMotionQuery.addEventListener('change', this.handleReducedMotionChange);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private reconcileAnimationSchedulers(): void {
    if (this.prefersReducedMotion() || this.pageHidden()) {
      this.stopFlowPulse();
      this.stopIdleCinematic();
      this.cinematicCorridorId.set(null);
      this.refreshMapStyles();
      return;
    }

    this.startFlowPulse();
    this.startIdleCinematic();
  }

  private noteUserInteraction(): void {
    this.lastUserInteractionAt = Date.now();
    this.cinematicCorridorId.set(null);
    if (this.autoCameraMotionTimer !== null) {
      clearTimeout(this.autoCameraMotionTimer);
      this.autoCameraMotionTimer = null;
    }
    this.autoCameraMotionActive.set(false);
  }

  private markAutoCameraMotionWindow(): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.autoCameraMotionTimer !== null) {
      clearTimeout(this.autoCameraMotionTimer);
      this.autoCameraMotionTimer = null;
    }

    this.autoCameraMotionActive.set(true);
    this.ngZone.runOutsideAngular(() => {
      this.autoCameraMotionTimer = window.setTimeout(() => {
        this.ngZone.run(() => {
          this.autoCameraMotionActive.set(false);
          this.autoCameraMotionTimer = null;
        });
      }, CAMERA_MOTION_WINDOW_MS);
    });
  }

  protected toggleSector(sectorId: HomeSector): void {
    this.noteUserInteraction();
    const nextSector = this.activeSector() === sectorId ? null : (sectorId as SectorType);
    this.activeHubId.set(null);
    this.activeBeatId.set(null);
    this.pinnedCorridorId.set(null);
    this.hoveredCorridorId.set(null);
    this.filters.activeSector.set(nextSector);
    this.syncFocusView();
  }

  protected resetFocus(): void {
    this.noteUserInteraction();
    this.activeHubId.set(null);
    this.activeBeatId.set(null);
    this.pinnedCorridorId.set(null);
    this.hoveredCorridorId.set(null);
    this.filters.activeSector.set(null);
    this.refreshMapStyles();
    this.syncFocusView();
  }

  protected toggleMapStats(): void {
    this.noteUserInteraction();
    this.showMapStats.update((visible) => !visible);
    this.persistMapStatsPreference();
  }

  private restoreMapStatsPreference(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      const storedPreference = window.sessionStorage.getItem(MAP_STATS_VISIBILITY_STORAGE_KEY);
      if (storedPreference === 'true' || storedPreference === 'false') {
        this.showMapStats.set(storedPreference === 'true');
        return;
      }

      this.showMapStats.set(window.matchMedia(DESKTOP_MEDIA_QUERY).matches);
    } catch {
      this.showMapStats.set(true);
    }
  }

  private persistMapStatsPreference(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      window.sessionStorage.setItem(MAP_STATS_VISIBILITY_STORAGE_KEY, String(this.showMapStats()));
    } catch {
      // Ignore session storage failures and keep the in-memory preference.
    }
  }

  protected dismissHubCard(): void {
    this.noteUserInteraction();
    this.activeHubId.set(null);
    this.syncFocusView();
  }

  protected focusCorridorBeat(corridorId: string, beatId: string): void {
    const corridor = this.findCorridor(corridorId);
    const beat = this.findBeat(corridorId, beatId);
    if (!corridor || !beat) {
      return;
    }

    this.noteUserInteraction();
    this.activeBeatId.set(beat.id);
    this.activeHubId.set(beat.hubId);
    this.pinnedCorridorId.set(corridor.id);
    this.filters.activeSector.set(corridor.sector as SectorType);
    this.refreshMapStyles();
    this.syncFocusView();
  }

  protected isActiveBeat(beatId: string): boolean {
    return this.activeBeatId() === beatId;
  }

  protected getSectorLabelKey(sectorId: HomeSector): string {
    return HOME_SECTORS.find((sector) => sector.id === sectorId)?.labelKey ?? 'home.map.overlay.sectorsList.energy';
  }

  private ensureConnectedTarget(): void {
    if (!this.map || !this.mapHost?.nativeElement.isConnected) {
      return;
    }

    const target = this.map.getTargetElement();
    if (target !== this.mapHost.nativeElement) {
      this.map.setTarget(this.mapHost.nativeElement);
      this.map.updateSize();
    }
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

      source.clear();
      source.addFeatures(features);

      labelSource.clear();
      labelSource.addFeatures(this.createBoundaryLabelFeatures(features));

      this.refreshMapStyles();
      this.resetView();
      this.syncFocusView(true);
    } catch {
      source.clear();
      labelSource.clear();
    }
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
    const labelAnchors: Record<string, { label: string; center: [number, number]; area: number }> = {};

    for (const feature of features) {
      const provinceId = feature.get('provinceId') as string | undefined;
      const label = feature.get('label') as string | undefined;
      const geometry = feature.getGeometry();
      if (!provinceId || !label || !geometry) {
        continue;
      }

      const [minX, minY, maxX, maxY] = geometry.getExtent();
      const area = Math.abs((maxX - minX) * (maxY - minY));
      const current = labelAnchors[provinceId];
      if (!current || area > current.area) {
        labelAnchors[provinceId] = {
          label,
          center: [(minX + maxX) / 2, (minY + maxY) / 2],
          area,
        };
      }
    }

    return Object.entries(labelAnchors).map(([provinceId, anchor]) => {
      const feature = new Feature(new OLPoint(anchor.center));
      feature.set('provinceId', provinceId);
      feature.set('label', anchor.label);
      return feature as Feature<Geometry>;
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

  private getBoundaryLabel(provinceId: string, _shapeName: string | null | undefined): string {
    return this.getProvinceBadgeLabel(provinceId);
  }

  private buildProvinceStyle(feature: Feature<Geometry>): Style[] {
    const provinceId = feature.get('provinceId') as string | undefined;
    const isActive = this.isProvinceActive(provinceId);
    const accentColor = this.getProvinceAccentColor(provinceId);

    return [
      new Style({
        stroke: new Stroke({
          color: isActive ? this.getProvinceGlowColor(provinceId) : 'rgba(2, 6, 23, 0.82)',
          width: isActive ? 8.5 : 2.6,
        }),
      }),
      new Style({
        fill: new Fill({ color: isActive ? this.getProvinceFillColor(provinceId) : 'rgba(2, 8, 20, 0.68)' }),
        stroke: new Stroke({ color: isActive ? accentColor : 'rgba(100, 116, 139, 0.78)', width: isActive ? 2.6 : 1.35 }),
      }),
    ];
  }

  private buildProvinceLabelStyle(feature: Feature<Geometry>): Style[] {
    const provinceId = feature.get('provinceId') as string | undefined;
    const label = feature.get('label') as string | undefined;
    const isActive = this.isProvinceActive(provinceId);

    return [
      new Style({
        text: new Text({
          text: label ?? '',
          font: isActive ? '800 15px ui-sans-serif' : '700 13px ui-sans-serif',
          fill: new Fill({ color: isActive ? '#f8fafc' : '#e2e8f0' }),
          stroke: new Stroke({ color: 'rgba(2, 6, 23, 0.98)', width: 5 }),
          backgroundFill: new Fill({ color: isActive ? 'rgba(2, 6, 23, 0.72)' : 'rgba(2, 6, 23, 0.58)' }),
          backgroundStroke: new Stroke({ color: isActive ? 'rgba(125, 211, 252, 0.22)' : 'rgba(148, 163, 184, 0.18)', width: 1 }),
          padding: [2, 5, 2, 5],
        }),
      }),
    ];
  }

  private buildCorridorStyle(feature: Feature<Geometry>): Style[] {
    const corridorId = feature.get('corridorId') as string;
    const sector = feature.get('sector') as HomeSector;
    const isActive = this.activeCorridorIds().has(corridorId);
    const color = isActive ? this.getSectorColor(sector, true) : this.getSectorGlowColor(sector, 0.16);
    const glowColor = this.getSectorGlowColor(sector, isActive ? 0.42 : 0.08);
    const pulsePhase = this.flowPulsePhase();
    const pulseOpacity = 0.18 + ((Math.sin(pulsePhase / 10) + 1) / 2) * 0.22;

    return [
      new Style({
        stroke: new Stroke({
          color: isActive ? this.getSectorGlowColor(sector, 0.2) : 'rgba(51, 65, 85, 0.06)',
          width: isActive ? 18 : 4,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
      new Style({
        stroke: new Stroke({
          color: glowColor,
          width: isActive ? 10 : 2.6,
          lineCap: 'round',
          lineJoin: 'round',
          lineDash: isActive ? undefined : [8, 12],
        }),
      }),
      ...(isActive
        ? [
            new Style({
              stroke: new Stroke({
                color: this.getSectorGlowColor(sector, pulseOpacity),
                width: 3.2,
                lineCap: 'round',
                lineJoin: 'round',
                lineDash: [22, 64],
                lineDashOffset: -pulsePhase,
              }),
            }),
          ]
        : []),
      new Style({
        stroke: new Stroke({
          color,
          width: isActive ? 5.4 : 1.6,
          lineCap: 'round',
          lineJoin: 'round',
        }),
      }),
    ];
  }

  private buildHubStyle(feature: Feature<Geometry>): Style[] {
    const provinceId = feature.get('provinceId') as string | undefined;
    const hubId = feature.get('hubId') as string | undefined;
    const label = feature.get('label') as string | undefined;
    const isActive = this.isProvinceActive(provinceId);
    const isSelectedHub = hubId === this.activeHubId();
    const isSecondaryHub = !isSelectedHub && !isActive;
    const pulseWave = (Math.sin(this.flowPulsePhase() / 10) + 1) / 2;
    const displayLabel = this.getHubMapLabel(hubId, label, isSecondaryHub);

    return [
      new Style({
        image: new CircleStyle({
          radius: isSelectedHub ? 18 + pulseWave * 5 : isActive ? 16 : 7,
          fill: new Fill({ color: isSelectedHub ? 'rgba(251, 191, 36, 0.26)' : isActive ? 'rgba(251, 191, 36, 0.2)' : 'rgba(71, 85, 105, 0.12)' }),
          stroke: new Stroke({ color: isSelectedHub ? 'rgba(253, 230, 138, 0.42)' : isActive ? 'rgba(253, 230, 138, 0.28)' : 'transparent', width: isSelectedHub ? 2.6 : isActive ? 2 : 0 }),
        }),
      }),
      new Style({
        image: new CircleStyle({
          radius: isSelectedHub ? 8.6 : isActive ? 7.5 : 4,
          fill: new Fill({ color: isSelectedHub ? '#fde68a' : isActive ? '#fbbf24' : '#cbd5e1' }),
          stroke: new Stroke({ color: isSelectedHub ? '#fbbf24' : isActive ? '#f59e0b' : '#334155', width: isSelectedHub || isActive ? 2 : 1.5 }),
        }),
      }),
      new Style({
        image: new CircleStyle({
          radius: isSelectedHub ? 3.1 : isActive ? 2.8 : 1.6,
          fill: new Fill({ color: isSelectedHub ? '#fff7ed' : isActive ? '#fff7ed' : '#e2e8f0' }),
          stroke: new Stroke({ color: 'transparent', width: 0 }),
        }),
        text: new Text({
          text: displayLabel,
          offsetY: isSelectedHub ? 24 : isActive ? 22 : 15,
          font: isSelectedHub ? '700 13px ui-sans-serif' : isActive ? '700 12px ui-sans-serif' : '600 10px ui-sans-serif',
          fill: new Fill({ color: isSelectedHub ? '#fff7ed' : isActive ? '#fff7ed' : '#cbd5e1' }),
          stroke: new Stroke({ color: 'rgba(2, 6, 23, 0.98)', width: isSecondaryHub ? 3 : 4 }),
        }),
      }),
    ];
  }

  private getHubMapLabel(hubId: string | undefined, label: string | undefined, abbreviated: boolean): string {
    if (!label) {
      return '';
    }

    if (!abbreviated) {
      return label;
    }

    const abbreviatedLabels: Record<string, string> = {
      'quebec-city': 'QC',
      montreal: 'MTL',
      ottawa: 'OTT',
      toronto: 'TOR',
      calgary: 'CAL',
      winnipeg: 'WPG',
      vancouver: 'VAN',
      boston: 'BOS',
    };

    if (hubId && abbreviatedLabels[hubId]) {
      return abbreviatedLabels[hubId];
    }

    return label.slice(0, 3).toUpperCase();
  }

  private isProvinceActive(provinceId: string | undefined): boolean {
    if (!provinceId) {
      return false;
    }

    for (const corridorId of this.activeCorridorIds()) {
      const corridor = HOME_CORRIDORS.find(entry => entry.id === corridorId);
      if (corridor?.provinces.includes(provinceId)) {
        return true;
      }
    }

    return false;
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

  private findHubFeature(pixel: number[]): Feature<Geometry> | null {
    if (!this.map) {
      return null;
    }

    const feature = this.map.forEachFeatureAtPixel(pixel, candidate => {
      if (candidate.get('hubId')) {
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

  private findCorridor(corridorId: string | null): HomeCorridor | null {
    if (!corridorId) {
      return null;
    }

    return HOME_CORRIDORS.find((corridor) => corridor.id === corridorId) ?? null;
  }

  private findHub(hubId: string | null): HomeHub | null {
    if (!hubId) {
      return null;
    }

    return HOME_HUBS.find((hub) => hub.id === hubId) ?? null;
  }

  private findBeat(corridorId: string | null, beatId: string | null): HomeCorridorBeat | null {
    const corridor = this.findCorridor(corridorId);
    if (!corridor || !beatId) {
      return null;
    }

    return corridor.beats.find((beat) => beat.id === beatId) ?? null;
  }

  private findBeatForHub(corridorId: string | null, hubId: string | null): HomeCorridorBeat | null {
    const corridor = this.findCorridor(corridorId);
    if (!corridor || !hubId) {
      return null;
    }

    return corridor.beats.find((beat) => beat.hubId === hubId) ?? null;
  }

  private resetView(): void {
    if (!this.map) {
      return;
    }

    const extent = createEmpty();
    let hasGeometry = false;
    const compactLayout = (this.mapHost?.nativeElement.clientWidth ?? 0) < 1024;
    const includeGeometry = (geometry: Geometry | null | undefined): void => {
      if (!geometry) {
        return;
      }
      extendExtent(extent, geometry.getExtent());
      hasGeometry = true;
    };

    this.corridorLayer?.getSource()?.getFeatures().forEach(feature => includeGeometry(feature.getGeometry()));
    this.hubLayer?.getSource()?.getFeatures().forEach(feature => includeGeometry(feature.getGeometry()));

    if (!hasGeometry) {
      this.provinceLayer?.getSource()?.getFeatures().forEach(feature => includeGeometry(feature.getGeometry()));
    }

    if (!hasGeometry) {
      return;
    }

    const view = this.map.getView();
    view.cancelAnimations();
    this.markAutoCameraMotionWindow();
    view.fit(extent, {
      padding: compactLayout ? DEFAULT_RESET_PADDING_MOBILE : DEFAULT_RESET_PADDING_DESKTOP,
      maxZoom: compactLayout ? DEFAULT_RESET_MAX_ZOOM_MOBILE : DEFAULT_RESET_MAX_ZOOM_DESKTOP,
      duration: CAMERA_RESET_FIT_MS,
    });
    this.scheduleResetCenterOffset(compactLayout ? DEFAULT_RESET_CENTER_OFFSET_MOBILE_PX : DEFAULT_RESET_CENTER_OFFSET_DESKTOP_PX);
  }

  private scheduleResetCenterOffset(offsetPx: number): void {
    if (!this.isBrowser) {
      return;
    }

    if (this.resetCenterOffsetTimer !== null) {
      clearTimeout(this.resetCenterOffsetTimer);
      this.resetCenterOffsetTimer = null;
    }

    this.ngZone.runOutsideAngular(() => {
      this.resetCenterOffsetTimer = window.setTimeout(() => {
        this.ngZone.run(() => {
          if (!this.map) {
            this.resetCenterOffsetTimer = null;
            return;
          }

          const size = this.map.getSize();
          const center = this.map.getView().getCenter();
          if (!size || !center) {
            this.resetCenterOffsetTimer = null;
            return;
          }

          this.map.getView().centerOn(center, size, [size[0] / 2, size[1] / 2 + offsetPx]);
          this.resetCenterOffsetTimer = null;
        });
      }, CAMERA_RESET_FIT_MS + 24);
    });
  }

  private syncFocusView(force = false): void {
    if (!this.map) {
      return;
    }

    const hubId = this.activeHubId();
    const corridorId = this.pinnedCorridorId();
    const sectorId = this.activeSector();
    const cinematicId = this.cinematicCorridorId();
    const nextKey = hubId
      ? `hub:${hubId}`
      : corridorId
        ? `corridor:${corridorId}`
        : cinematicId
          ? `cinematic:${cinematicId}`
          : sectorId
            ? `sector:${sectorId}`
            : 'default';

    if (!force && this.lastCameraFocusKey === nextKey) {
      return;
    }

    this.lastCameraFocusKey = nextKey;

    const activeHub = this.currentHub();
    if (activeHub) {
      this.animateToHub(activeHub);
      return;
    }

    const activeCorridor = this.findCorridor(corridorId) ?? this.findCorridor(cinematicId) ?? (sectorId ? this.currentCorridor() : null);
    if (activeCorridor) {
      this.animateToCorridor(activeCorridor);
      return;
    }

    this.resetView();
  }

  private animateToHub(hub: HomeHub): void {
    if (!this.map) {
      return;
    }

    const preferredCorridor =
      hub.corridorIds
        .map((corridorId) => this.findCorridor(corridorId))
        .find((corridor): corridor is HomeCorridor => Boolean(corridor)) ?? null;

    if (preferredCorridor) {
      this.animateToCorridor(preferredCorridor, hub);
      return;
    }

    const compactLayout = (this.mapHost?.nativeElement.clientWidth ?? 0) < 1024;
    const view = this.map.getView();
    view.cancelAnimations();
    this.markAutoCameraMotionWindow();
    view.animate(
      {
        center: fromLonLat([...hub.coordinates]),
        zoom: compactLayout ? 4.95 : 5.35,
        duration: CAMERA_FOCUS_PRIMARY_MS,
      },
      {
        zoom: compactLayout ? 5.05 : 5.5,
        duration: CAMERA_FOCUS_SETTLE_MS,
      },
    );
  }

  private animateToCorridor(corridor: HomeCorridor, selectedHub: HomeHub | null = null): void {
    if (!this.map) {
      return;
    }

    const extent = createEmpty();
    let hasGeometry = false;
    const includeFeatureGeometry = (feature: Feature<Geometry> | null | undefined): void => {
      const geometry = feature?.getGeometry();
      if (!geometry) {
        return;
      }

      extendExtent(extent, geometry.getExtent());
      hasGeometry = true;
    };

    this.corridorLayer
      ?.getSource()
      ?.getFeatures()
      .filter((feature) => feature.get('corridorId') === corridor.id)
      .forEach((feature) => includeFeatureGeometry(feature as Feature<Geometry>));

    this.hubLayer
      ?.getSource()
      ?.getFeatures()
      .filter((feature) => {
        const hubId = feature.get('hubId') as string | undefined;
        if (!hubId) {
          return false;
        }

        return HOME_HUBS.some((hub) => hub.id === hubId && hub.corridorIds.includes(corridor.id));
      })
      .forEach((feature) => includeFeatureGeometry(feature as Feature<Geometry>));

    if (!hasGeometry) {
      this.resetView();
      return;
    }

    const compactLayout = (this.mapHost?.nativeElement.clientWidth ?? 0) < 1024;
    const view = this.map.getView();
    view.cancelAnimations();
    this.markAutoCameraMotionWindow();
    view.fit(extent, {
      padding: selectedHub
        ? compactLayout
          ? [54, 26, 190, 26]
          : [52, 240, 146, 48]
        : compactLayout
          ? [56, 26, 198, 26]
          : [52, 168, 144, 52],
      maxZoom: selectedHub ? 5.45 : 5.1,
      duration: CAMERA_CORRIDOR_FIT_MS,
    });

    if (selectedHub) {
      view.animate({
        center: fromLonLat([...selectedHub.coordinates]),
        duration: CAMERA_FOCUS_SETTLE_MS,
      });
    }
  }

  protected getSectorColor(sector: HomeSector, active: boolean): string {
    if (sector === 'energy') {
      return active ? '#67e8f9' : '#38bdf8';
    }
    if (sector === 'manufacturing') {
      return active ? '#fcd34d' : '#f59e0b';
    }
    return active ? '#86efac' : '#34d399';
  }

  protected getSectorGlowColor(sector: HomeSector, opacity: number): string {
    if (sector === 'energy') {
      return `rgba(34, 211, 238, ${opacity})`;
    }
    if (sector === 'manufacturing') {
      return `rgba(245, 158, 11, ${opacity})`;
    }
    return `rgba(52, 211, 153, ${opacity})`;
  }

  protected getActiveCorridorCardShadow(sector: HomeSector): string {
    return [
      `0 0 0 1px ${this.getSectorGlowColor(sector, 0.16)}`,
      `0 22px 56px -24px ${this.getSectorGlowColor(sector, 0.6)}`,
      `0 0 56px -28px ${this.getSectorGlowColor(sector, 0.44)}`,
      '0 18px 56px rgba(2,6,23,0.34)',
    ].join(', ');
  }

  protected getActiveHubCardShadow(): string {
    return [
      '0 0 0 1px rgba(251, 191, 36, 0.18)',
      '0 20px 48px -22px rgba(245, 158, 11, 0.45)',
      '0 0 52px -28px rgba(251, 191, 36, 0.34)',
      '0 14px 42px rgba(2,6,23,0.3)',
    ].join(', ');
  }

  private getProvinceAccentColor(provinceId: string | undefined): string {
    if (provinceId === 'qc') {
      return '#7dd3fc';
    }
    if (provinceId === 'on') {
      return '#6ee7b7';
    }
    if (provinceId === 'ab') {
      return '#fcd34d';
    }
    if (provinceId === 'bc') {
      return '#c084fc';
    }
    return '#67e8f9';
  }

  private getProvinceFillColor(provinceId: string | undefined): string {
    if (provinceId === 'qc') {
      return 'rgba(14, 165, 233, 0.34)';
    }
    if (provinceId === 'on') {
      return 'rgba(16, 185, 129, 0.3)';
    }
    if (provinceId === 'ab') {
      return 'rgba(245, 158, 11, 0.28)';
    }
    if (provinceId === 'bc') {
      return 'rgba(168, 85, 247, 0.28)';
    }
    return 'rgba(45, 212, 191, 0.28)';
  }

  private getProvinceGlowColor(provinceId: string | undefined): string {
    if (provinceId === 'qc') {
      return 'rgba(56, 189, 248, 0.42)';
    }
    if (provinceId === 'on') {
      return 'rgba(52, 211, 153, 0.38)';
    }
    if (provinceId === 'ab') {
      return 'rgba(251, 191, 36, 0.42)';
    }
    if (provinceId === 'bc') {
      return 'rgba(192, 132, 252, 0.4)';
    }
    return 'rgba(103, 232, 249, 0.34)';
  }

  private getProvinceBadgeLabel(provinceId: string): string {
    const labels: Record<string, string> = {
      ab: 'AB',
      bc: 'BC',
      mb: 'MB',
      on: 'ON',
      qc: 'QC',
      'us-ct': 'CT',
      'us-ma': 'MA',
      'us-me': 'ME',
      'us-nh': 'NH',
      'us-ny': 'NY',
      'us-ri': 'RI',
      'us-vt': 'VT',
    };

    return labels[provinceId] ?? provinceId.toUpperCase();
  }
}