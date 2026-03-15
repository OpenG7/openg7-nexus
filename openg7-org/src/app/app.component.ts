import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { afterNextRender, Component, PLATFORM_ID, Type, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Og7OnboardingFlowComponent } from '@app/shared/components/layout/og7-onboarding-flow/og7-onboarding-flow.component';
import { SiteHeaderComponent } from '@app/shared/components/layout/site-header/site-header.component';
import { UnderConstructionBannerComponent } from '@app/shared/components/layout/under-construction-banner/under-construction-banner.component';
import { CtrlKDirective } from '@app/shared/directives/ctrl-k.directive';
import { TranslateModule } from '@ngx-translate/core';
import { NgxStarrySkyComponent } from '@omnedia/ngx-starry-sky';
import { map } from 'rxjs';

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
    Og7ModalContainerComponent,
    RouterLink,
    TranslateModule,
    CtrlKDirective,
    NgxStarrySkyComponent
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

   readonly starrySkyColor = 'transparent';
  readonly starsBackgroundConfig = {

    starDensity: 0.0002,
    maxStars: 2000,
    twinkleProbability: 0.15,

    milkyWayIntensity: 0.8,
    milkyWayWidth: 0.45,
    milkyWayAngle: -8,
    nebulaIntensity: 0.55,
    colorVariance: 0.35,
    twinkleStrength: 0.25,    
  };
  readonly shootingStarsConfig = {
    minSpeed: 15,
    maxSpeed: 32,
    minDelay: 1100,
    maxDelay: 5200,
    starColor: '#F6FF0E',
    trailColor: '#7dd3fc',
    starWidth: 12,
    starHeight: 1,
  };
  readonly componentLabComponent = signal<Type<unknown> | null>(null);
  readonly appReady = signal(false);
  readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly isHandset = toSignal(
    this.breakpointObserver.observe(Breakpoints.Handset).pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly currentYear = new Date().getFullYear();

  constructor() {
    void this.globalShortcuts;
    void this.loadComponentLabIfEnabled();
    if (this.isBrowser) {
      afterNextRender(() => this.appReady.set(true));
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
}
