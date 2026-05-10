import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface OpportunityMiniMapSparklinePoint {
  readonly x: number;
  readonly y: number;
}

interface OpportunityMiniMapActor {
  readonly name: string;
  readonly provinceLabelKey: string;
  readonly sectorLabelKey: string;
  readonly sectorIcon: string;
  readonly coordinates: readonly [number, number];
  readonly previewPosition: OpportunityMiniMapSparklinePoint;
}

interface OpportunityMiniMapLeadTime {
  readonly value: number;
  readonly unit: 'days' | 'weeks';
  readonly approximate?: boolean;
}

interface OpportunityMiniMapCo2 {
  readonly value: number;
  readonly approximate?: boolean;
}

interface LeafletMap {
  fitBounds(bounds: unknown, options?: unknown): void;
  remove(): void;
}

interface LeafletLayer {
  addTo(map: LeafletMap): void;
}

interface LeafletBounds {
  pad(padding: number): LeafletBounds;
}

interface LeafletModule {
  map(...args: unknown[]): LeafletMap;
  tileLayer(...args: unknown[]): LeafletLayer;
  latLngBounds(...args: unknown[]): LeafletBounds;
  polyline(...args: unknown[]): LeafletLayer;
  marker(...args: unknown[]): LeafletLayer;
  divIcon(options: {
    html: string;
    className: string;
    iconSize: [number, number];
    iconAnchor: [number, number];
  }): unknown;
}

export interface OpportunityMiniMapVm {
  readonly id: string;
  readonly matchId: string;
  readonly title: string;
  readonly score: number; // 0..100
  readonly buyer: OpportunityMiniMapActor;
  readonly supplier: OpportunityMiniMapActor;
  readonly distanceKm: number | null;
  readonly leadTime?: OpportunityMiniMapLeadTime | null;
  readonly co2Saved?: OpportunityMiniMapCo2 | null;
  readonly mapPreviewUrl: string;
  readonly sparklinePoints: ReadonlyArray<OpportunityMiniMapSparklinePoint>;
}

@Component({
  selector: 'og7-opportunity-mini-map',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './opportunity-mini-map.component.html',
  styleUrl: './opportunity-mini-map.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/opportunities/opportunities/ui/opportunity-mini-map » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Opportunity Mini Map ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns OpportunityMiniMapComponent gérée par le framework.
 */
export class OpportunityMiniMapComponent {
  private static readonly SPARKLINE_WIDTH = 320;
  private static readonly SPARKLINE_HEIGHT = 200;

  readonly vm = input.required<OpportunityMiniMapVm>();

  readonly distanceClicked = output<string>();
  readonly mapExpanded = output<{ id: string; expanded: boolean }>();
  readonly connect = output<string>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');

  private leafletModule: LeafletModule | null = null;
  private mapInstance: LeafletMap | null = null;
  private ensureStylesPromise: Promise<void> | null = null;

  protected readonly isExpanded = signal(false);
  protected readonly isInteractiveReady = signal(false);
  protected readonly isLoadingMap = signal(false);

  private readonly circleCircumference = 2 * Math.PI * 28;
  readonly scoreStrokeDasharray = this.circleCircumference.toFixed(2);

  readonly scoreTone = computed<'high' | 'medium' | 'low'>(() => {
    const score = this.vm().score;
    if (score >= 85) {
      return 'high';
    }
    if (score >= 70) {
      return 'medium';
    }
    return 'low';
  });

  readonly scoreStrokeDashoffset = computed(() => {
    const value = Math.max(0, Math.min(100, this.vm().score));
    const ratio = value / 100;
    const offset = this.circleCircumference - ratio * this.circleCircumference;
    return offset.toFixed(2);
  });

  readonly scoreStroke = computed(() => {
    switch (this.scoreTone()) {
      case 'high':
        return 'url(#opportunity-mini-map-score-high)';
      case 'medium':
        return 'url(#opportunity-mini-map-score-medium)';
      default:
        return 'url(#opportunity-mini-map-score-low)';
    }
  });

  readonly scoreLabel = computed(() => `${this.vm().score}%`);
  readonly titleId = computed(() => `opportunity-mini-map-title-${this.vm().id}`);
  readonly scoreId = computed(() => `opportunity-mini-map-score-${this.vm().id}`);

  readonly distanceLabel = computed(() => {
    const value = this.vm().distanceKm;
    if (value == null) {
      return '—';
    }
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value) + ' km';
  });

  readonly sparklinePath = computed(() => {
    const points = this.vm().sparklinePoints;
    if (!points.length) {
      return '';
    }
    const [first, ...rest] = points;
    const path = rest
      .map(
        (point) =>
          `${this.toSvgCoordinate(point.x, OpportunityMiniMapComponent.SPARKLINE_WIDTH)} ${this.toSvgCoordinate(point.y, OpportunityMiniMapComponent.SPARKLINE_HEIGHT)}`,
      )
      .join(' L ');
    return `M ${this.toSvgCoordinate(first.x, OpportunityMiniMapComponent.SPARKLINE_WIDTH)} ${this.toSvgCoordinate(first.y, OpportunityMiniMapComponent.SPARKLINE_HEIGHT)}${path ? ' L ' + path : ''}`;
  });

  readonly buyerMarkerPosition = computed(() => this.toSvgPoint(this.vm().buyer.previewPosition));
  readonly supplierMarkerPosition = computed(() =>
    this.toSvgPoint(this.vm().supplier.previewPosition),
  );
  readonly buyerMarkerIconY = computed(() => this.buyerMarkerPosition().y - 16);
  readonly supplierMarkerIconY = computed(() => this.supplierMarkerPosition().y - 16);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.teardownMap();
    });
  }

  protected handleDistanceClick(): void {
    this.distanceClicked.emit(this.vm().id);
  }

  protected emitConnect(): void {
    this.connect.emit(this.vm().matchId);
  }

  protected async activateInteractiveMap(): Promise<void> {
    if (this.isExpanded()) {
      return;
    }
    this.isExpanded.set(true);
    this.isLoadingMap.set(true);
    this.mapExpanded.emit({ id: this.vm().id, expanded: true });
    queueMicrotask(() => {
      void this.mountLeafletMap();
    });
  }

  private async mountLeafletMap(): Promise<void> {
    if (typeof window === 'undefined') {
      this.isLoadingMap.set(false);
      return;
    }
    const hostRef = this.mapHost();
    if (!hostRef) {
      this.isLoadingMap.set(false);
      return;
    }
    const container = hostRef.nativeElement;
    if (container.childElementCount > 0) {
      this.isLoadingMap.set(false);
      this.isInteractiveReady.set(true);
      return;
    }

    const leaflet = await this.ensureLeafletModule();
    if (!leaflet) {
      this.isLoadingMap.set(false);
      return;
    }

    const { buyer, supplier } = this.vm();
    const map = leaflet.map(container, {
      attributionControl: false,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
    });

    leaflet
      .tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 12,
      })
      .addTo(map);

    const bounds = leaflet.latLngBounds([buyer.coordinates, supplier.coordinates]).pad(0.9);
    map.fitBounds(bounds, { animate: false });

    leaflet
      .polyline([buyer.coordinates, supplier.coordinates], {
        color: '#22d3ee',
        opacity: 0.85,
        weight: 3,
        dashArray: '6 6',
      })
      .addTo(map);

    leaflet
      .marker(buyer.coordinates, {
        icon: leaflet.divIcon({
          html: this.createMarkerHtml('A', buyer.sectorIcon),
          className: 'opportunity-mini-map__marker opportunity-mini-map__marker--buyer',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        }),
        interactive: false,
      })
      .addTo(map);

    leaflet
      .marker(supplier.coordinates, {
        icon: leaflet.divIcon({
          html: this.createMarkerHtml('B', supplier.sectorIcon),
          className: 'opportunity-mini-map__marker opportunity-mini-map__marker--supplier',
          iconSize: [38, 38],
          iconAnchor: [19, 19],
        }),
        interactive: false,
      })
      .addTo(map);

    this.mapInstance = map;
    this.isInteractiveReady.set(true);
    this.isLoadingMap.set(false);
  }

  private async ensureLeafletModule(): Promise<LeafletModule | null> {
    if (this.leafletModule) {
      return this.leafletModule;
    }
    try {
      await Promise.all([this.ensureLeafletStylesheet(), this.ensureLeafletScript()]);
      const leaflet = (globalThis as { L?: LeafletModule }).L;
      if (leaflet) {
        this.leafletModule = leaflet;
        return leaflet;
      }
      return null;
    } catch {
      return null;
    }
  }

  private ensureLeafletStylesheet(): Promise<void> {
    if (this.ensureStylesPromise) {
      return this.ensureStylesPromise;
    }
    if (typeof document === 'undefined') {
      this.ensureStylesPromise = Promise.resolve();
      return this.ensureStylesPromise;
    }
    const existing = document.getElementById('opportunity-mini-map-leaflet-css');
    if (existing) {
      this.ensureStylesPromise = Promise.resolve();
      return this.ensureStylesPromise;
    }
    this.ensureStylesPromise = new Promise((resolve) => {
      const link = document.createElement('link');
      link.id = 'opportunity-mini-map-leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
    });
    return this.ensureStylesPromise;
  }

  private ensureLeafletScript(): Promise<void> {
    if (typeof document === 'undefined') {
      return Promise.resolve();
    }
    if (document.getElementById('opportunity-mini-map-leaflet-script')) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.id = 'opportunity-mini-map-leaflet-script';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      document.head.appendChild(script);
    });
  }

  private teardownMap(): void {
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  private toSvgCoordinate(value: number, dimension: number): number {
    const clamped = Math.min(Math.max(value, 0), 1);
    return Number((clamped * dimension).toFixed(2));
  }

  private toSvgPoint(point: OpportunityMiniMapSparklinePoint): { x: number; y: number } {
    return {
      x: this.toSvgCoordinate(point.x, OpportunityMiniMapComponent.SPARKLINE_WIDTH),
      y: this.toSvgCoordinate(point.y, OpportunityMiniMapComponent.SPARKLINE_HEIGHT),
    };
  }

  private createMarkerHtml(label: string, icon: string): string {
    const safeLabel = label.slice(0, 2);
    const safeIcon = icon.slice(0, 2);
    return `\n      <span class="opportunity-mini-map__marker-label">${safeLabel}</span>\n      <span class="opportunity-mini-map__marker-icon" aria-hidden="true">${safeIcon}</span>\n    `;
  }
}
