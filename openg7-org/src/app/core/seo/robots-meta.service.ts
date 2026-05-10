import { DestroyRef, Injectable, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

const DEFAULT_ROBOTS_DIRECTIVE = 'index,follow';
const ROUTE_DATA_KEY = 'robots';

@Injectable({ providedIn: 'root' })
export class RobotsMetaService {
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  init(): void {
    this.applyCurrentDirective();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.applyCurrentDirective());
  }

  private applyCurrentDirective(): void {
    const directive = this.resolveDirective(this.router.routerState.snapshot.root);
    this.meta.updateTag({ name: 'robots', content: directive });
  }

  private resolveDirective(snapshot: ActivatedRouteSnapshot | null): string {
    let cursor = snapshot;
    let directive: string | null = null;

    while (cursor) {
      const candidate = cursor.data?.[ROUTE_DATA_KEY];
      if (typeof candidate === 'string' && candidate.trim()) {
        directive = candidate.trim();
      }
      cursor = cursor.firstChild ?? null;
    }

    return directive ?? DEFAULT_ROBOTS_DIRECTIVE;
  }
}
