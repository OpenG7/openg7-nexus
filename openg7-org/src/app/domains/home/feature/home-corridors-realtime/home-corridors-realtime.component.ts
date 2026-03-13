import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { resolveCorridorContext } from '@app/core/config/corridor-context';
import {
  CorridorsRealtimeItem,
  CorridorsRealtimeSnapshot,
  CorridorsRealtimeStatus,
  HomeCorridorsRealtimeService,
} from '@app/domains/home/services/home-corridors-realtime.service';
import { TranslateModule } from '@ngx-translate/core';

const FALLBACK_SNAPSHOT: CorridorsRealtimeSnapshot = {
  titleKey: 'home.corridorsRealtime.title',
  items: [],
  status: { level: 'info', labelKey: 'home.corridorsRealtime.status.monitoring' },
  cta: { labelKey: 'home.corridorsRealtime.cta.viewMap' },
};

@Component({
  selector: 'og7-home-corridors-realtime',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './home-corridors-realtime.component.html',
  styleUrls: ['./home-corridors-realtime.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichee dans la page d'accueil comme widget de monitoring temps reel.
 * Raison d'etre : Offrir une synthese des corridors actifs avec acces plein ecran.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns HomeCorridorsRealtimeComponent geree par le framework.
 */
export class HomeCorridorsRealtimeComponent {
  private readonly service = inject(HomeCorridorsRealtimeService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly browser = isPlatformBrowser(this.platformId);

  private readonly timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  protected readonly snapshot = signal<CorridorsRealtimeSnapshot>({ ...FALLBACK_SNAPSHOT });
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly isFullscreen = signal(false);
  protected readonly fullscreenAvailable = signal(false);

  protected readonly items = computed(() => this.snapshot().items ?? []);
  protected readonly status = computed<CorridorsRealtimeStatus>(() => this.snapshot().status ?? FALLBACK_SNAPSHOT.status);

  protected readonly formattedTime = computed(() => {
    const value = this.snapshot().timestamp;
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return this.timeFormatter.format(parsed);
  });

  protected readonly statusBadgeClass = computed(() => {
    const level = this.status().level ?? 'info';
    switch (level) {
      case 'critical':
        return 'border-rose-400/40 bg-rose-500/15 text-rose-200';
      case 'warning':
        return 'border-amber-400/40 bg-amber-400/15 text-amber-100';
      case 'ok':
        return 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100';
      case 'info':
      default:
        return 'border-cyan-300/40 bg-cyan-300/10 text-cyan-100';
    }
  });

  constructor() {
    if (this.browser) {
      this.fullscreenAvailable.set(Boolean(this.document.fullscreenEnabled));
      const handler = () => this.syncFullscreen();
      this.document.addEventListener('fullscreenchange', handler);
      this.destroyRef.onDestroy(() => this.document.removeEventListener('fullscreenchange', handler));
      this.syncFullscreen();
    }

    effect((onCleanup) => {
      this.loading.set(true);
      this.error.set(null);
      const sub = this.service.loadSnapshot().subscribe({
        next: (snapshot) => {
          this.snapshot.set({ ...FALLBACK_SNAPSHOT, ...snapshot });
          this.loading.set(false);
        },
        error: (error) => {
          this.error.set(error instanceof Error ? error.message : 'home.corridorsRealtime.error');
          this.loading.set(false);
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  protected toggleFullscreen(): void {
    if (!this.browser || !this.fullscreenAvailable()) {
      return;
    }
    if (this.isFullscreen()) {
      const exitPromise = this.document.exitFullscreen?.();
      if (exitPromise) {
        void exitPromise.catch(() => undefined);
      }
      return;
    }
    const target = this.host.nativeElement;
    if (target.requestFullscreen) {
      void target.requestFullscreen().catch(() => undefined);
    }
  }

  protected openCorridor(item: CorridorsRealtimeItem): void {
    const corridorContext = resolveCorridorContext(item.id);
    const queryParams: Record<string, string> = {
      source: 'corridors-realtime',
    };

    if (corridorContext?.id) {
      queryParams['corridorId'] = corridorContext.id;
    } else if (item.id) {
      queryParams['corridorId'] = item.id;
    }

    void this.router.navigate(['/feed'], { queryParams });
  }

  protected openMap(item?: CorridorsRealtimeItem): void {
    if (this.browser) {
      const mapElement = this.document.getElementById('map');
      if (mapElement) {
        mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        void this.router.navigate([], {
          fragment: 'map',
          queryParamsHandling: 'preserve',
          replaceUrl: true,
        });
        return;
      }
    }

    const queryParams: Record<string, string> = {
      source: 'corridors-realtime',
    };
    if (item?.id) {
      queryParams['corridorId'] = item.id;
    }
    void this.router.navigate(['/feed'], { queryParams });
  }

  protected trackItem(index: number, item: CorridorsRealtimeItem): string {
    return item.id ?? `corridor-${index}`;
  }

  private syncFullscreen(): void {
    const current = this.document.fullscreenElement;
    this.isFullscreen.set(Boolean(current && this.host.nativeElement.contains(current)));
  }
}
