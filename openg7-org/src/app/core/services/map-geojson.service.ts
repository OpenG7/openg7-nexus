import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  Injectable,
  PLATFORM_ID,
  TransferState,
  computed,
  inject,
  makeStateKey,
  signal,
} from '@angular/core';
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  LineString,
  MultiLineString,
  MultiPolygon,
  Point,
  Polygon,
} from 'geojson';

type MapGeojsonLayer = 'province' | 'flow' | 'hub';

interface MapGeojsonBaseProperties {
  id: string;
  layer: MapGeojsonLayer;
  [key: string]: unknown;
}

export interface MapProvinceFeatureProperties extends MapGeojsonBaseProperties {
  layer: 'province';
  code: string;
  name: { fr: string; en: string };
}

export interface MapFlowFeatureProperties extends MapGeojsonBaseProperties {
  layer: 'flow';
  partner?: string;
  tradeMode?: 'import' | 'export';
  value?: number;
  sectorId?: string;
  sectorIds?: string[];
  tariffImpacted?: boolean;
}

export interface MapHubFeatureProperties extends MapGeojsonBaseProperties {
  layer: 'hub';
  role: 'origin' | 'partner';
  partner?: string;
  name?: string;
  tradeValue?: number | null;
  tradeValueCurrency?: string;
  tradeVolume?: number | null;
  tradeVolumeUnit?: string | null;
  sectorCount?: number | null;
}

export type MapProvinceFeature = Feature<Polygon | MultiPolygon, MapProvinceFeatureProperties>;
export type MapProvinceFeatureCollection = FeatureCollection<
  Polygon | MultiPolygon,
  MapProvinceFeatureProperties
>;

export type MapFlowFeature = Feature<LineString | MultiLineString, MapFlowFeatureProperties>;
export type MapFlowFeatureCollection = FeatureCollection<
  LineString | MultiLineString,
  MapFlowFeatureProperties
>;

export type MapHubFeature = Feature<Point, MapHubFeatureProperties>;
export type MapHubFeatureCollection = FeatureCollection<Point, MapHubFeatureProperties>;

type MapGeojsonFeature = MapProvinceFeature | MapFlowFeature | MapHubFeature;

type MapGeojsonPayload = FeatureCollection<Geometry, MapGeojsonBaseProperties> & {
  features: MapGeojsonFeature[];
};

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Map Geojson ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns MapGeojsonService gérée par le framework.
 */
export class MapGeojsonService {
  private readonly http = inject(HttpClient);
  private readonly transferState: TransferState = inject(TransferState);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly stateKey = makeStateKey<MapGeojsonPayload>('MAP_GEOJSON_PAYLOAD');
  private readonly payload = signal<MapGeojsonPayload | null>(
    this.transferState.get(this.stateKey, null),
  );

  readonly provinceCollection = computed<MapProvinceFeatureCollection>(() =>
    this.collectProvinces(),
  );
  readonly flowCollection = computed<MapFlowFeatureCollection>(() => this.collectFlows());
  readonly hubCollection = computed<MapHubFeatureCollection>(() => this.collectHubs());

  constructor() {
    if (this.payload()) {
      if (this.isBrowser) {
        this.transferState.remove(this.stateKey);
      }
      return;
    }

    this.http.get<MapGeojsonPayload>('assets/data/trade-flows.geojson').subscribe({
      next: (payload) => {
        this.payload.set(payload);
        if (!this.isBrowser) {
          this.transferState.set(this.stateKey, payload);
        }
      },
      error: () => {
        this.payload.set({
          type: 'FeatureCollection',
          features: [],
        } as MapGeojsonPayload);
      },
    });
  }

  private collectProvinces(): MapProvinceFeatureCollection {
    return this.collectFeatures(isProvinceFeature);
  }

  private collectFlows(): MapFlowFeatureCollection {
    return this.collectFeatures(isFlowFeature);
  }

  private collectHubs(): MapHubFeatureCollection {
    return this.collectFeatures(isHubFeature);
  }

  private collectFeatures<F extends MapGeojsonFeature>(
    guard: (feature: MapGeojsonFeature) => feature is F,
  ): FeatureCollection<F['geometry'], F['properties']> {
    const payload = this.payload();
    if (!payload) {
      return this.emptyCollection<F['geometry'], F['properties']>();
    }

    const features: F[] = payload.features.filter(guard);
    if (features.length === 0) {
      return this.emptyCollection<F['geometry'], F['properties']>();
    }

    return {
      type: 'FeatureCollection',
      features: features.map((feature) => ({
        ...feature,
        properties: { ...feature.properties },
      })),
    };
  }

  private emptyCollection<G extends Geometry, P extends GeoJsonProperties>(): FeatureCollection<
    G,
    P
  > {
    return {
      type: 'FeatureCollection',
      features: [],
    };
  }
}

function isProvinceFeature(feature: MapGeojsonFeature): feature is MapProvinceFeature {
  return (
    feature.properties?.layer === 'province' &&
    (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')
  );
}

function isFlowFeature(feature: MapGeojsonFeature): feature is MapFlowFeature {
  return (
    feature.properties?.layer === 'flow' &&
    (feature.geometry.type === 'LineString' || feature.geometry.type === 'MultiLineString')
  );
}

function isHubFeature(feature: MapGeojsonFeature): feature is MapHubFeature {
  return feature.properties?.layer === 'hub' && feature.geometry.type === 'Point';
}
