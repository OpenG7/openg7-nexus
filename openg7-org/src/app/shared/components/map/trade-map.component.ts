import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import type { AuthUser } from '@app/core/auth/auth.types';
import { FEATURE_FLAGS } from '@app/core/config/environment.tokens';
import { FiltersService, TradeModeFilter } from '@app/core/filters.service';
import type { SectorType } from '@app/core/models/opportunity';
import {
  MapFlowFeature,
  MapFlowFeatureCollection,
  MapGeojsonService,
  MapHubFeature,
  MapHubFeatureCollection,
  MapProvinceFeature,
  MapProvinceFeatureCollection,
} from '@app/core/services/map-geojson.service';
import { TariffQueryService } from '@app/core/services/tariff-query.service';
import {
  Flow,
  MapKpiComputed,
  MapKpiSnapshot,
  MapKpis,
  computeMapKpiSnapshot,
  selectFilteredFlows,
  selectMapKpis,
  selectMapReady,
  MapActions,
} from '@app/state';
import { AppState } from '@app/state/app.state';
import { selectUserProfile } from '@app/state/user/user.selectors';
import { NgxMapLibreGLModule } from '@maplibre/ngx-maplibre-gl';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import type {
  ColorSpecification,
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  PropertyValueSpecification,
} from 'maplibre-gl';

import { BasemapToggleComponent } from './controls/basemap-toggle.component';
import { ZoomControlComponent } from './controls/zoom-control.component';
import { MapSectorChipsComponent } from './filters/map-sector-chips.component';
import { MapLegendComponent } from './legend/map-legend.component';

type Coordinates = [number, number];
interface Bbox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json';
const MAP_STYLE_NIGHT_LIGHTS_URL = '/assets/map/styles/og7-night-lights.json';
const MAP_CENTERS: Record<'canada' | 'europe' | 'asia', Coordinates> = {
  canada: [-98.5795, 57.6443],
  europe: [15.2551, 54.526],
  asia: [100.6197, 34.0479],
};
const DEFAULT_CENTER: Coordinates = MAP_CENTERS.canada;
const MAP_ZOOM = 2.35;

const EUROPE_COUNTRY_CODES = new Set([
  'AT', 'BE', 'BG', 'CH', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI',
  'FR', 'GB', 'GR', 'HR', 'HU', 'IE', 'IS', 'IT', 'LT', 'LU',
  'LV', 'NL', 'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
]);

const ASIA_COUNTRY_CODES = new Set([
  'AE', 'AF', 'AM', 'AZ', 'BD', 'BH', 'BN', 'BT', 'CN', 'GE',
  'HK', 'ID', 'IL', 'IN', 'IQ', 'IR', 'JP', 'JO', 'KG', 'KH',
  'KP', 'KR', 'KW', 'KZ', 'LA', 'LB', 'LK', 'MM', 'MN', 'MO',
  'MV', 'MY', 'NP', 'OM', 'PH', 'PK', 'QA', 'SA', 'SG', 'SY',
  'TH', 'TJ', 'TM', 'TR', 'TW', 'UZ', 'VN', 'YE',
]);

const EMPTY_FLOW_COLLECTION: MapFlowFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

const EMPTY_MARKER_COLLECTION: MapHubFeatureCollection = {
  type: 'FeatureCollection',
  features: [],
};

interface LinePaint {
  readonly 'line-opacity'?: DataDrivenPropertyValueSpecification<number>;
  readonly 'line-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  readonly 'line-width'?: DataDrivenPropertyValueSpecification<number>;
  readonly 'line-blur'?: DataDrivenPropertyValueSpecification<number>;
  readonly 'line-dasharray'?: PropertyValueSpecification<number[]>;
  readonly 'line-gradient'?: ExpressionSpecification;
}
type Expression = ExpressionSpecification;
interface FillPaint {
  readonly 'fill-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  readonly 'fill-opacity'?: DataDrivenPropertyValueSpecification<number>;
  readonly 'fill-outline-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
}
interface LinePaintStyle {
  readonly 'line-color'?: DataDrivenPropertyValueSpecification<ColorSpecification>;
  readonly 'line-width'?: DataDrivenPropertyValueSpecification<number>;
  readonly 'line-opacity'?: DataDrivenPropertyValueSpecification<number>;
}

interface FlowCollectionState {
  readonly collection: MapFlowFeatureCollection;
  readonly hasTariffImpact: boolean;
}

interface FlowContextVm {
  readonly id: string;
  readonly sectorLabel: string;
  readonly tradeValue: string;
  readonly tradeMode: 'import' | 'export';
  readonly sectorId: string | null;
  readonly partner: string | null;
  readonly pinned: boolean;
}

interface LayerFlowFeatureProperties {
  readonly id?: string;
  readonly tradeMode?: 'import' | 'export';
  readonly value?: number;
  readonly currency?: string;
  readonly sectorId?: string;
  readonly sectorIds?: readonly string[];
}

interface LayerPointerEventLike {
  readonly features?: ReadonlyArray<{
    readonly properties?: LayerFlowFeatureProperties;
  }>;
}

interface MapCameraApi {
  fitBounds(
    bounds: [[number, number], [number, number]],
    options?: { padding?: number; duration?: number; maxZoom?: number; essential?: boolean }
  ): void;
  easeTo(options: { center: Coordinates; zoom: number; duration?: number; essential?: boolean }): void;
}

const DEFAULT_FLOW_LAYER_PAINT: LinePaint = {
  'line-color': '#68a9c7',
  'line-width': 2.8,
  'line-opacity': 0.74,
  'line-blur': 0.24,
};

const DEFAULT_FLOW_GLOW_PAINT: LinePaint = {
  'line-color': '#bfe7f5',
  'line-width': 4.4,
  'line-opacity': 0.28,
  'line-blur': 1.1,
};

@Component({
  selector: 'og7-map-trade',
  standalone: true,
  imports: [
    CommonModule,
    NgxMapLibreGLModule,
    TranslateModule,
    MapLegendComponent,
    //MapKpiBadgesComponent,
    MapSectorChipsComponent,
    BasemapToggleComponent,
    ZoomControlComponent,
  ],
  templateUrl: './trade-map.component.html',
  host: {
    style: 'display:block;position:relative;width:100%;height:100%;min-height:420px;',
    'data-og7': 'trade-map',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/map » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Trade Map ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns TradeMapComponent gérée par le framework.
 */
export class TradeMapComponent {
  readonly enableGlobeProjection = input(false);
  readonly showGlobeControl = input(false);
  readonly showLegend = input(true);
  readonly showSectorChips = input(false);
  readonly showBasemapToggle = input(false);

  private readonly store = inject(Store<AppState>);
  private readonly router = inject(Router);
  private readonly filters = inject(FiltersService);
  private readonly featureFlags = inject(FEATURE_FLAGS, { optional: true });
  private readonly mapInstance = signal<MapCameraApi | null>(null);
  private lastCameraTarget: string | null = null;

  private readonly geojson = inject(MapGeojsonService);
  private readonly tariffQuery = inject(TariffQueryService);
  private readonly hoveredFlowId = signal<string | null>(null);
  private readonly pinnedFlowId = signal<string | null>(null);

  protected readonly ready = this.store.selectSignal(selectMapReady);
  private readonly userProfile = this.store.selectSignal(selectUserProfile);
  private readonly flows = this.store.selectSignal(selectFilteredFlows);
  private readonly kpis = this.store.selectSignal(selectMapKpis);
  protected readonly hasPinnedFlow = computed(() => this.pinnedFlowId() !== null);
  private readonly activeFlowId = computed(() => this.pinnedFlowId() ?? this.hoveredFlowId());
  protected readonly activeFlowContext = computed<FlowContextVm | null>(() => {
    const flowId = this.activeFlowId();
    if (!flowId) {
      return null;
    }

    const flow = this.filteredFlows().find((entry) => entry.id === flowId);
    if (!flow) {
      return null;
    }

    const sectorId = flow.sectorId ?? flow.sectorIds?.[0] ?? null;
    const sectorLabel = sectorId ? this.resolveSectorLabel(sectorId) : flow.partner ?? flow.id;

    return {
      id: flow.id,
      sectorLabel,
      tradeValue: this.formatFlowValue(flow),
      tradeMode: flow.tradeMode ?? 'export',
      sectorId,
      partner: flow.partner ?? null,
      pinned: this.pinnedFlowId() === flow.id,
    };
  });

  readonly mapStyle = (this.featureFlags?.['mapNight'] ?? false)
    ? MAP_STYLE_NIGHT_LIGHTS_URL
    : MAP_STYLE_URL;
  protected readonly mapCenter = computed(() => this.resolveMapCenter());
  protected readonly mapZoom = MAP_ZOOM;
  protected readonly globeEnabled = computed(() => this.enableGlobeProjection() && (this.featureFlags?.['mapGlobe'] ?? false));

  protected readonly provinceSource = this.geojson.provinceCollection;
  private readonly provinceBboxes = computed(() => this.buildProvinceBboxes(this.provinceSource()));
  private readonly activeProvinces = computed(() => this.resolveActiveProvinces());
  protected readonly provinceLayerPaint = computed<FillPaint>(() => {
    const active = Array.from(this.activeProvinces());
    if (!active.length) {
      const paint: FillPaint = {
        'fill-color': '#365f70',
        'fill-opacity': 0.14,
        'fill-outline-color': '#6c8b98',
      };
      return paint;
    }

    const isActive: ExpressionSpecification = ['in', ['get', 'code'], ['literal', active]];
    const paint: FillPaint = {
      'fill-color': ['case', isActive, '#56849b', '#223845'],
      'fill-opacity': ['case', isActive, 0.34, 0.1],
      'fill-outline-color': '#6c8b98',
    };
    return paint;
  });
  protected readonly provinceOutlinePaint: LinePaintStyle = {
    'line-color': '#7694a0',
    'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.6, 6, 1.2, 10, 2],
    'line-opacity': 0.42,
  };

  protected readonly flowLayerLayout = {
    'line-cap': 'round',
    'line-join': 'round',
  } as const;
  protected readonly highlightLayerLayout = this.flowLayerLayout;
  protected readonly highlightLayerPaint = {
    'line-color': '#d9a441',
    'line-width': 5.5,
    'line-opacity': 0.82,
    'line-blur': 0.5,
  } as const;
  protected readonly focusedFlowLayerPaint = {
    'line-color': '#f3f7fb',
    'line-width': 6.2,
    'line-opacity': 0.96,
    'line-blur': 0.15,
  } as const;
  protected readonly focusedFlowGlowPaint = {
    'line-color': '#7dc7dd',
    'line-width': 9.6,
    'line-opacity': 0.34,
    'line-blur': 1.45,
  } as const;
  protected readonly markerLayerPaint = {
    'circle-radius': 6,
    'circle-color': '#0f1c2f',
    'circle-opacity': 0.92,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#c7d6e2',
  } as const;

  private readonly flowGeometryById = computed(() =>
    this.indexFlowFeatures(this.geojson.flowCollection())
  );
  private readonly hubGeometryById = computed(() =>
    this.indexHubFeatures(this.geojson.hubCollection())
  );

  private readonly filteredFlows = computed(() => {
    const flows = this.flows();
    const partner = this.filters.tradePartner();
    const { mode } = this.filters.tradeFilters();
    const byPartner = this.filterFlowsByPartner(flows, partner);
    return this.filterFlowsByTradeMode(byPartner, mode);
  });

  private readonly tariffedSectors = computed(() => {
    const tariffs = this.tariffQuery.filteredTariffs();
    if (!tariffs.length) {
      return new Set<string>();
    }
    const sectors = new Set<string>();
    for (const tariff of tariffs) {
      for (const sector of tariff.sectors) {
        if (typeof sector === 'string' && sector.trim().length > 0) {
          sectors.add(sector);
        }
      }
    }
    return sectors;
  });

  private readonly flowCollectionState = computed(() =>
    this.createFlowCollection(this.filteredFlows(), this.tariffedSectors())
  );

  protected readonly flowSource = computed<MapFlowFeatureCollection>(
    () => this.flowCollectionState().collection
  );

  protected readonly highlightSource = computed<MapFlowFeatureCollection>(() => {
    const { sector } = this.filters.tradeFilters();
    if (!sector) {
      return EMPTY_FLOW_COLLECTION;
    }
    const flows = this.filteredFlows().filter((flow) => this.matchesSector(flow, sector));
    if (!flows.length) {
      return EMPTY_FLOW_COLLECTION;
    }
    return this.createFlowCollection(flows, this.tariffedSectors()).collection;
  });

  protected readonly focusedFlowSource = computed<MapFlowFeatureCollection>(() => {
    const flowId = this.activeFlowId();
    if (!flowId) {
      return EMPTY_FLOW_COLLECTION;
    }

    const flows = this.filteredFlows().filter((flow) => flow.id === flowId);
    if (!flows.length) {
      return EMPTY_FLOW_COLLECTION;
    }

    return this.createFlowCollection(flows, this.tariffedSectors()).collection;
  });

  protected readonly hasHighlight = computed(() => this.highlightSource().features.length > 0);
  protected readonly hasFocusedFlow = computed(() => this.focusedFlowSource().features.length > 0);

  private readonly hasTariffImpact = computed(() => this.flowCollectionState().hasTariffImpact);

  constructor() {
    effect(() => {
      const map = this.mapInstance();
      if (!map) {
        return;
      }

      const sectorId = this.filters.activeSector();
      const highlightCollection = this.highlightSource();
      const cameraTarget = sectorId ?? '__default__';

      if (this.lastCameraTarget === cameraTarget) {
        return;
      }

      if (sectorId && highlightCollection.features.length > 0) {
        const bounds = this.computeCollectionBounds(highlightCollection);
        if (bounds) {
          map.fitBounds(bounds, {
            padding: 80,
            duration: 800,
            maxZoom: 4.4,
            essential: true,
          });
          this.lastCameraTarget = cameraTarget;
          return;
        }
      }

      map.easeTo({
        center: this.mapCenter(),
        zoom: this.mapZoom,
        duration: 600,
        essential: true,
      });
      this.lastCameraTarget = cameraTarget;
    });
  }

  private resolveMapCenter(): Coordinates {
    const profile = this.userProfile();
    const profileRegion = this.resolveRegionKey(this.extractProfileRegion(profile));
    if (profileRegion) {
      return MAP_CENTERS[profileRegion];
    }

    const localeRegion = this.resolveRegionKey(this.extractLocaleRegion());
    if (localeRegion) {
      return MAP_CENTERS[localeRegion];
    }

    return DEFAULT_CENTER;
  }

  private extractProfileRegion(profile: AuthUser | null): string | null {
    if (!profile) {
      return null;
    }
    if ('country' in profile && typeof (profile as { country?: unknown }).country === 'string') {
      return (profile as { country?: string }).country ?? null;
    }
    if ('locale' in profile && typeof (profile as { locale?: unknown }).locale === 'string') {
      return (profile as { locale?: string }).locale ?? null;
    }
    return null;
  }

  private extractLocaleRegion(): string | null {
    if (typeof navigator === 'undefined' || !navigator.language) {
      return null;
    }
    const parts = navigator.language.split(/[-_]/).filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    return parts[parts.length - 1] ?? null;
  }

  private resolveRegionKey(value: string | null): keyof typeof MAP_CENTERS | null {
    if (!value) {
      return null;
    }
    const normalized = value.trim().toUpperCase();
    if (!normalized) {
      return null;
    }
    if (['CA', 'CAN', 'CANADA'].includes(normalized)) {
      return 'canada';
    }
    if (['EU', 'EUROPE', 'EUROPA'].includes(normalized) || EUROPE_COUNTRY_CODES.has(normalized)) {
      return 'europe';
    }
    if (['ASIA', 'ASIE', 'ASI'].includes(normalized) || ASIA_COUNTRY_CODES.has(normalized)) {
      return 'asia';
    }
    return null;
  }

  private resolveActiveProvinces(): Set<string> {
    const active = new Set<string>();
    const selected = this.filters.matchProvince();
    if (selected && selected !== 'all') {
      active.add(String(selected).toUpperCase());
    }

    const flows = this.filteredFlows();
    const bboxes = this.provinceBboxes();
    const flowGeometry = this.flowGeometryById();
    if (!flows.length || bboxes.size === 0) {
      return active;
    }

    for (const flow of flows) {
      const geometry = flowGeometry.get(flow.id);
      if (!geometry) {
        continue;
      }
      for (const coordinate of this.getFlowCoordinates(geometry)) {
        for (const [code, bbox] of bboxes) {
          if (this.isCoordinateInBbox(coordinate, bbox)) {
            active.add(code);
          }
        }
      }
    }

    return active;
  }

  private buildProvinceBboxes(collection: MapProvinceFeatureCollection): Map<string, Bbox> {
    const map = new Map<string, Bbox>();
    for (const feature of collection.features) {
      const code = feature.properties?.code?.toUpperCase();
      if (!code) {
        continue;
      }
      map.set(code, this.computeBbox(feature.geometry));
    }
    return map;
  }

  private computeBbox(geometry: MapProvinceFeature['geometry']): Bbox {
    const bbox: Bbox = {
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    };
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const coordinate of ring) {
          const [lng, lat] = coordinate as Coordinates;
          if (lng < bbox.minLng) bbox.minLng = lng;
          if (lng > bbox.maxLng) bbox.maxLng = lng;
          if (lat < bbox.minLat) bbox.minLat = lat;
          if (lat > bbox.maxLat) bbox.maxLat = lat;
        }
      }
    }
    return bbox;
  }

  private isCoordinateInBbox([lng, lat]: Coordinates, bbox: Bbox): boolean {
    return (
      lng >= bbox.minLng &&
      lng <= bbox.maxLng &&
      lat >= bbox.minLat &&
      lat <= bbox.maxLat
    );
  }

  private getFlowCoordinates(flow: MapFlowFeature): Coordinates[] {
    const geometry = flow.geometry;
    if (geometry.type === 'LineString') {
      return geometry.coordinates as Coordinates[];
    }
    const coordinates: Coordinates[] = [];
    for (const line of geometry.coordinates) {
      for (const coordinate of line) {
        coordinates.push(coordinate as Coordinates);
      }
    }
    return coordinates;
  }

  private computeCollectionBounds(
    collection: MapFlowFeatureCollection
  ): [[number, number], [number, number]] | null {
    let minLng = Number.POSITIVE_INFINITY;
    let maxLng = Number.NEGATIVE_INFINITY;
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;

    for (const feature of collection.features) {
      for (const [lng, lat] of this.getFlowCoordinates(feature)) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }

    if (![minLng, maxLng, minLat, maxLat].every(Number.isFinite)) {
      return null;
    }

    return [
      [minLng, minLat],
      [maxLng, maxLat],
    ];
  }

  private readonly tariffImpactExpression = computed<Expression>(() => [
    'boolean',
    ['get', 'tariffImpacted'],
    false,
  ]);

  protected readonly flowLayerPaint = computed<LinePaint>(() => {
    if (!this.hasTariffImpact()) {
      return DEFAULT_FLOW_LAYER_PAINT;
    }
    const impact = this.tariffImpactExpression();
    return {
      'line-color': ['case', impact, '#df6e55', '#5f7f91'],
      'line-width': ['case', impact, 3.2, 2.2],
      'line-opacity': ['case', impact, 0.86, 0.22],
      'line-blur': ['case', impact, 0.42, 0.12],
    } as LinePaint;
  });

  protected readonly flowGlowPaint = computed<LinePaint>(() => {
    if (!this.hasTariffImpact()) {
      return DEFAULT_FLOW_GLOW_PAINT;
    }
    const impact = this.tariffImpactExpression();
    return {
      'line-color': ['case', impact, '#f4b8a7', '#c4d4de'],
      'line-width': ['case', impact, 4.8, 3.4],
      'line-opacity': ['case', impact, 0.36, 0.1],
      'line-blur': ['case', impact, 1.15, 0.58],
    } as LinePaint;
  });

  protected readonly markerSource = computed<MapHubFeatureCollection>(() => {
    const flows = this.filteredFlows();
    if (!flows.length) {
      return EMPTY_MARKER_COLLECTION;
    }

    const geometry = this.hubGeometryById();
    if (geometry.size === 0) {
      return EMPTY_MARKER_COLLECTION;
    }

    const dictionary = this.kpis();
    const features: MapHubFeature[] = [];

    const origin = geometry.get('origin');
    if (origin) {
      const overallSnapshot = computeMapKpiSnapshot(flows, dictionary.default);
      features.push(this.decorateHubFeature(origin, overallSnapshot));
    }

    const groups = this.groupFlowsByPartner(flows);
    for (const [partner, partnerFlows] of groups.entries()) {
      if (partner === 'canada') {
        continue;
      }
      const baseFeature = geometry.get(partner);
      if (!baseFeature) {
        continue;
      }
      const snapshot = computeMapKpiSnapshot(
        partnerFlows,
        this.resolveFallbackSnapshot(partner, dictionary)
      );
      features.push(this.decorateHubFeature(baseFeature, snapshot));
    }

    return features.length
      ? { type: 'FeatureCollection', features }
      : EMPTY_MARKER_COLLECTION;
  });

  /**
   * Handles the MapLibre load event by marking the map as ready in the store.
   * The readiness flag is only emitted once to avoid redundant state updates
   * when the component receives additional load events from MapLibre.
   */
  onMapLoad(map: MapCameraApi): void {
    this.mapInstance.set(map);
    if (!this.ready()) {
      this.store.dispatch(MapActions.mapLoaded());
    }
  }

  protected handleFlowMouseMove(event: unknown): void {
    const flowId = this.extractFlowIdFromLayerEvent(event);
    this.hoveredFlowId.set(flowId);
  }

  protected handleFlowMouseLeave(): void {
    this.hoveredFlowId.set(null);
  }

  protected handleFlowClick(event: unknown): void {
    const properties = this.extractFlowPropertiesFromLayerEvent(event);
    if (!properties) {
      return;
    }

    const flowId = properties.id ?? null;
    const isTogglingOff = this.pinnedFlowId() === flowId;
    this.pinnedFlowId.set(isTogglingOff ? null : flowId);
    this.hoveredFlowId.set(null);

    const sectorId = properties.sectorId ?? properties.sectorIds?.[0] ?? null;
    if (isTogglingOff) {
      this.filters.activeSector.set(null);
      this.store.dispatch(MapActions.activeSectorSelected({ sectorId: null }));
      return;
    }

    if (!sectorId) {
      return;
    }

    this.filters.activeSector.set(sectorId as SectorType);
    this.store.dispatch(MapActions.activeSectorSelected({ sectorId }));
  }

  protected openPinnedFlowContext(): void {
    const context = this.activeFlowContext();
    if (!context?.pinned || !context.sectorId) {
      return;
    }

    void this.router.navigate(['/feed'], {
      queryParams: {
        source: 'trade-map',
        sector: context.sectorId,
        corridorId: context.id,
        partner: context.partner,
      },
    });
  }

  /**
   * Assemble a GeoJSON feature collection representing the provided trade flows.
   * Geometry comes from the dedicated GeoJSON dataset while trade metadata is
   * merged from the NgRx store.
   *
   * @param flows Trade flows filtered by the current UI state.
   * @param impactedSectors Set of sector identifiers currently covered by tariffs.
   * @returns A FeatureCollection along with a flag indicating whether at least one flow is tariffed.
   */
  private createFlowCollection(
    flows: Flow[],
    impactedSectors: ReadonlySet<string>
  ): FlowCollectionState {
    if (!flows.length) {
      return { collection: EMPTY_FLOW_COLLECTION, hasTariffImpact: false };
    }

    const geometry = this.flowGeometryById();
    if (geometry.size === 0) {
      return { collection: EMPTY_FLOW_COLLECTION, hasTariffImpact: false };
    }

    const features = this.buildFlowFeatures(flows, geometry, impactedSectors);
    if (!features.length) {
      return { collection: EMPTY_FLOW_COLLECTION, hasTariffImpact: false };
    }

    const hasTariffImpact = features.some(
      (feature) => feature.properties?.tariffImpacted === true
    );

    return {
      collection: { type: 'FeatureCollection', features },
      hasTariffImpact,
    };
  }

  private buildFlowFeatures(
    flows: Flow[],
    geometry: Map<string, MapFlowFeature>,
    impactedSectors: ReadonlySet<string>
  ): MapFlowFeature[] {
    const features: MapFlowFeature[] = [];
    for (const flow of flows) {
      const base = geometry.get(flow.id);
      if (!base) {
        continue;
      }
      features.push(this.decorateFlowFeature(base, flow, impactedSectors));
    }
    return features;
  }

  private decorateFlowFeature(
    base: MapFlowFeature,
    flow: Flow,
    impactedSectors: ReadonlySet<string>
  ): MapFlowFeature {
    const id =
      typeof base.id === 'string' && base.id.trim().length > 0 ? base.id : flow.id;
    const sectorIds = this.resolveSectorIds(flow);
    return {
      type: 'Feature',
      id,
      geometry: base.geometry,
      properties: {
        ...base.properties,
        id: flow.id,
        partner: flow.partner,
        tradeMode: this.resolveTradeMode(flow),
        value: flow.value,
        sectorId: flow.sectorId,
        sectorIds,
        tariffImpacted: this.isFlowTariffImpacted(flow, impactedSectors, sectorIds),
      },
    };
  }

  private indexFlowFeatures(collection: MapFlowFeatureCollection): Map<string, MapFlowFeature> {
    const dictionary = new Map<string, MapFlowFeature>();
    for (const feature of collection.features) {
      const identifier = this.extractFeatureIdentifier(feature.properties?.id, feature.id);
      if (identifier) {
        dictionary.set(identifier, feature);
      }
    }
    return dictionary;
  }

  private indexHubFeatures(collection: MapHubFeatureCollection): Map<string, MapHubFeature> {
    const dictionary = new Map<string, MapHubFeature>();
    for (const feature of collection.features) {
      const identifier = this.extractFeatureIdentifier(feature.properties?.id, feature.id);
      if (identifier) {
        dictionary.set(identifier, feature);
      }
    }
    return dictionary;
  }

  private extractFeatureIdentifier(
    propertiesId: unknown,
    featureId: MapFlowFeature['id'] | MapHubFeature['id']
  ): string | null {
    if (typeof propertiesId === 'string' && propertiesId.trim().length > 0) {
      return propertiesId;
    }
    if (typeof featureId === 'string' && featureId.trim().length > 0) {
      return featureId;
    }
    return null;
  }

  private extractFlowPropertiesFromLayerEvent(event: unknown): LayerFlowFeatureProperties | null {
    const pointerEvent = event as LayerPointerEventLike | null;
    const feature = pointerEvent?.features?.[0];
    return feature?.properties ?? null;
  }

  private extractFlowIdFromLayerEvent(event: unknown): string | null {
    const properties = this.extractFlowPropertiesFromLayerEvent(event);
    return properties?.id ?? null;
  }

  private decorateHubFeature(base: MapHubFeature, snapshot: MapKpiComputed): MapHubFeature {
    const fallbackName =
      typeof base.properties?.name === 'string' ? base.properties.name : undefined;
    const identifier =
      this.extractFeatureIdentifier(base.properties?.id, base.id) ?? fallbackName ?? 'hub';
    return {
      type: 'Feature',
      id: identifier,
      geometry: base.geometry,
      properties: {
        ...base.properties,
        partner:
          base.properties.partner ?? (base.properties.role === 'origin' ? 'canada' : undefined),
        tradeValue: snapshot.tradeValue,
        tradeValueCurrency: snapshot.tradeValueCurrency,
        tradeVolume: snapshot.tradeVolume,
        tradeVolumeUnit: snapshot.tradeVolumeUnit,
        sectorCount: snapshot.sectorCount,
      },
    };
  }

  /**
   * Ensure every flow exposes a valid trade mode. Missing values are normalised
   * to the default `export` mode so that styling logic remains consistent when
   * the backend omits the field.
   *
   * @param flow Flow currently being transformed into a map feature.
   * @returns The trade mode reported by the flow or the default fallback.
   */
  private resolveTradeMode(flow: Flow): Flow['tradeMode'] {
    return flow.tradeMode ?? 'export';
  }

  /**
   * Collect the list of sectors attached to a flow, if any. The map can then
   * highlight matching flows when a sector filter is active.
   *
   * @param flow Flow currently being transformed into a map feature.
   * @returns Array of sector identifiers or `undefined` when no extra sectors are provided.
   */
  private resolveSectorIds(flow: Flow): string[] | undefined {
    return flow.sectorIds;
  }

  private isFlowTariffImpacted(
    flow: Flow,
    impactedSectors: ReadonlySet<string>,
    resolvedSectorIds?: readonly string[] | undefined
  ): boolean {
    if (impactedSectors.size === 0) {
      return false;
    }

    if (typeof flow.sectorId === 'string' && impactedSectors.has(flow.sectorId)) {
      return true;
    }

    const extraSectors = resolvedSectorIds ?? flow.sectorIds;
    if (!extraSectors) {
      return false;
    }

    for (const sector of extraSectors) {
      if (typeof sector === 'string' && impactedSectors.has(sector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Regroups a list of flows by partner to ease subsequent aggregations.
   * When the partner is missing, flows are associated with the Canadian hub
   * so domestic exchanges stay clustered together.
   *
   * @param flows Collection of flows produced by the selectors and filters.
   * @returns A map keyed by partner identifier whose values are the matching flows.
   */
  private groupFlowsByPartner(flows: Flow[]): Map<string, Flow[]> {
    const groups = new Map<string, Flow[]>();
    for (const flow of flows) {
      const key = flow.partner ?? 'canada';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(flow);
    }
    return groups;
  }

  /**
   * Filters flows according to the selected trade partner.
   * Absence of a partner selection keeps domestic and international flows,
   * while setting a partner restricts the result to matching exchanges.
   *
   * @param flows Base collection to filter.
   * @param partner Optional partner identifier coming from the filter service.
   * @returns Flows matching the requested partner, or all flows when no partner is selected.
   */
  private filterFlowsByPartner(flows: Flow[], partner: string | null | undefined): Flow[] {
    if (!partner) {
      return flows;
    }
    return flows.filter((flow) => !flow.partner || flow.partner === partner);
  }

  /**
   * Narrows a flow collection to those matching the active trade mode filter.
   * Selecting "all" leaves the list untouched to represent both imports and exports.
   *
   * @param flows Base collection to filter.
   * @param tradeMode Trade mode chosen in the filters (all, import or export).
   * @returns Flows matching the trade mode criteria.
   */
  private filterFlowsByTradeMode(flows: Flow[], tradeMode: TradeModeFilter): Flow[] {
    if (tradeMode === 'all') {
      return flows;
    }
    return flows.filter((flow) => flow.tradeMode === tradeMode);
  }

  /**
   * Checks whether the provided flow belongs to the sector highlighted on the map.
   * The comparison covers both the primary sector and the optional sector list
   * so secondary associations still trigger a highlight.
   *
   * @param flow Flow currently being evaluated.
   * @param sectorId Sector identifier requested by the active filter.
   * @returns True when the flow matches the sector, false otherwise.
   */
  private matchesSector(flow: Flow, sectorId: string): boolean {
    if (flow.sectorId === sectorId) {
      return true;
    }
    return Array.isArray(flow.sectorIds) && flow.sectorIds.includes(sectorId);
  }

  /**
   * Chooses the KPI snapshot to use for a partner marker when aggregating KPIs.
   * It first looks up a partner-specific entry, then falls back to the global
   * default snapshot so markers always display meaningful values.
   *
   * @param partner Partner identifier associated with the marker.
   * @param dictionary Map of KPI snapshots keyed by partner plus a default entry.
   * @returns The most appropriate snapshot for the marker or undefined when none exists.
   */
  private resolveFallbackSnapshot(
    partner: string | null | undefined,
    dictionary: MapKpis
  ): MapKpiSnapshot | undefined {
    if (partner && dictionary[partner]) {
      return dictionary[partner];
    }
    return dictionary.default;
  }

  private resolveSectorLabel(sectorId: string): string {
    return sectorId
      .split('-')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private formatFlowValue(flow: Flow): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: flow.currency ?? 'CAD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(flow.value ?? 0);
  }
}
