import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { afterNextRender, Component, PLATFORM_ID, Type, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { NotificationToastTrayComponent } from '@app/shared/components/layout/notification-toast-tray/notification-toast-tray.component';
import { Og7OnboardingFlowComponent } from '@app/shared/components/layout/og7-onboarding-flow/og7-onboarding-flow.component';
import { SiteHeaderComponent } from '@app/shared/components/layout/site-header/site-header.component';
import { UnderConstructionBannerComponent } from '@app/shared/components/layout/under-construction-banner/under-construction-banner.component';
import { CtrlKDirective } from '@app/shared/directives/ctrl-k.directive';
import { TranslateModule } from '@ngx-translate/core';
import { filter, map } from 'rxjs';

import { FEATURE_FLAGS } from './core/config/environment.tokens';
import { GlobalShortcutsService } from './core/shortcuts/global-shortcuts.service';
import { Og7ModalContainerComponent } from './core/ui/modal/og7-modal-container.component';
@Component({
  selector: 'og7-shell-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    SiteHeaderComponent,
    UnderConstructionBannerComponent,
    Og7OnboardingFlowComponent,
    NotificationToastTrayComponent,
    Og7ModalContainerComponent,
    RouterLink,
    TranslateModule,
    CtrlKDirective,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
/**
 * Contexte : Affichée dans les vues du dossier « openg7-org/src/app » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « App ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AppComponent gérée par le framework.
 */
export class AppComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly globalShortcuts = inject(GlobalShortcutsService);
  private readonly featureFlags = inject(FEATURE_FLAGS);
  private readonly router = inject(Router);

  readonly componentLabComponent = signal<Type<unknown> | null>(null);
  readonly backgroundComponent = signal<Type<unknown> | null>(null);
  readonly appReady = signal(false);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  readonly immersiveMainContent = computed(() => isImmersiveMainContentUrl(this.currentUrl()));

  readonly currentYear = new Date().getFullYear();

  constructor() {
    void this.globalShortcuts;
    void this.loadComponentLabIfEnabled();
    if (this.isBrowser) {
      afterNextRender(() => {
        this.appReady.set(true);
        void this.loadBackgroundIfEnabled();
      });
    }
  }

  private async loadComponentLabIfEnabled(): Promise<void> {
    if (!this.featureFlags?.['componentLab']) {
      return;
    }

    const component = await import(
      '@app/domains/developer/pages/component-lab/og7-component-lab-page.component'
    ).then((m) => m.Og7ComponentLabPageComponent);

    this.componentLabComponent.set(component);
  }

  private async loadBackgroundIfEnabled(): Promise<void> {
    if (this.backgroundComponent()) {
      return;
    }

    const component = await import(
      '@app/shared/components/layout/app-starry-background.component'
    ).then((m) => m.AppStarryBackgroundComponent);

    this.backgroundComponent.set(component);
  }
}

const IMMERSIVE_MAIN_CONTENT_PREFIXES = ['/feed'];
const IMMERSIVE_MAIN_CONTENT_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/terms',
  '/privacy',
  '/legal',
  '/faq',
  '/credits',
  '/governance',
  '/auth/callback',
]);

function isImmersiveMainContentUrl(url: string): boolean {
  const normalized = normalizeUrlPath(url);
  if (IMMERSIVE_MAIN_CONTENT_PATHS.has(normalized)) {
    return true;
  }

  return IMMERSIVE_MAIN_CONTENT_PREFIXES.some((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`));
}

function normalizeUrlPath(url: string): string {
  const [pathWithoutHash] = url.split('#', 1);
  const [pathWithoutQuery] = pathWithoutHash.split('?', 1);
  return pathWithoutQuery || '/';
}
