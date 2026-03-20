import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DEMO_OPPORTUNITY_MATCHES, findDemoFinancingBanner } from '@app/core/fixtures/opportunity-demo';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { OpportunityService } from '@app/core/services/opportunity.service';
import { Og7IntroStepperComponent } from '@app/domains/matchmaking/og7-mise-en-relation/og7-intro-stepper.component';
import { Og7SparksBackgroundDirective } from '@app/shared/directives/og7-sparks-background.directive';
import { PipelineStepStatus } from '@app/state';
import { TranslateModule } from '@ngx-translate/core';
import { distinctUntilChanged, map } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'og7-linkup-page',
  imports: [
    CommonModule,
    TranslateModule,
    Og7IntroStepperComponent,
    Og7SparksBackgroundDirective,
  ],
  templateUrl: './og7-linkup-page.component.html',
  styleUrls: ['./og7-linkup-page.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/matchmaking/pages/linkup » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Linkup Page ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7LinkupPageComponent gérée par le framework.
 */
export class Og7LinkupPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly opportunities = inject(OpportunityService);

  private readonly matches = this.opportunities.items();
  private readonly activeMatchLoading = signal(false);
  private readonly activeMatchFallback = signal<OpportunityMatch | null>(null);
  protected readonly loadingMatches = this.opportunities.loading();
  protected readonly loadingActiveMatch = this.activeMatchLoading.asReadonly();
  private readonly activeMatchState = signal<'idle' | 'loading' | 'match-id' | 'partner-id' | 'not-found' | 'invalid'>('idle');
  protected readonly matchState = this.activeMatchState.asReadonly();
  private readonly defaultMatchesRequested = signal(false);
  private readonly pendingMatchRequests = new Set<number>();
  private readonly partnerIdentifierCache = new Set<number>();
  private readonly pipelineStepsSignal = signal<readonly PipelineStepStatus[]>([]);

  private readonly routeMatchParam = toSignal(
    this.route.paramMap.pipe(
      map(params => params.get('id')),
      distinctUntilChanged(),
    ),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  private readonly routeMatchId = computed(() => this.parseMatchId(this.routeMatchParam()));

  protected readonly activeMatch = computed(() => {
    const id = this.routeMatchId();
    if (id == null) {
      return null;
    }
    const match = this.findMatchByRouteIdentifier(id);
    if (match) {
      return match;
    }
    const fallback = this.activeMatchFallback();
    if (!fallback) {
      return null;
    }
    return fallback.id === id || fallback.seller.id === id || fallback.buyer.id === id ? fallback : null;
  });

  private readonly ensureActiveMatchEffect = effect(() => {
    const rawParam = this.routeMatchParam();
    const id = this.routeMatchId();

    if (!rawParam) {
      this.activeMatchLoading.set(false);
      this.activeMatchFallback.set(null);
      this.activeMatchState.set('idle');
      this.pendingMatchRequests.clear();
      this.ensureDefaultMatches();
      return;
    }

    this.ensureDefaultMatches();

    if (id == null) {
      this.activeMatchFallback.set(null);
      this.activeMatchLoading.set(false);
      this.activeMatchState.set('invalid');
      this.pendingMatchRequests.clear();
      return;
    }

    const matchesLoading = this.loadingMatches();

    const resolved = this.findMatchByRouteIdentifier(id);
    if (resolved) {
      this.activeMatchFallback.set(resolved);
      const kind: 'match-id' | 'partner-id' = resolved.id === id ? 'match-id' : 'partner-id';
      this.activeMatchState.set(kind);
      this.activeMatchLoading.set(false);
      if (kind === 'partner-id') {
        this.partnerIdentifierCache.add(id);
      } else {
        this.partnerIdentifierCache.delete(id);
      }
      return;
    }

    this.activeMatchFallback.set(null);

    if (this.partnerIdentifierCache.has(id)) {
      this.activeMatchState.set('partner-id');
      this.activeMatchLoading.set(false);
      return;
    }

    if (matchesLoading) {
      this.activeMatchLoading.set(true);
      this.activeMatchState.set('loading');
      return;
    }

    this.activeMatchState.set('loading');
    this.requestActiveMatch(id);
  });

  protected readonly financingBanner = computed(() => {
    const match = this.activeMatch();
    return match ? findDemoFinancingBanner(match) : null;
  });

  protected readonly partnerPanelOpen = computed(() => Boolean(this.activeMatch()));

  protected readonly pipelineSteps = computed(() => this.pipelineStepsSignal());

  constructor() {
    if (!this.matches().length) {
      this.opportunities.hydrateWithDemo(DEMO_OPPORTUNITY_MATCHES);
    }
    this.ensureDefaultMatches();
  }

  protected handleClose(): void {
    void this.router.navigate(['/']);
  }

  private parseMatchId(raw: string | null): number | null {
    if (!raw) {
      return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  }

  private ensureDefaultMatches(): void {
    if (this.defaultMatchesRequested()) {
      return;
    }
    this.defaultMatchesRequested.set(true);
    this.opportunities.loadMatches();
  }

  private requestActiveMatch(id: number): void {
    if (!Number.isFinite(id) || this.pendingMatchRequests.has(id) || this.partnerIdentifierCache.has(id)) {
      return;
    }

    const localMatch = this.findMatchByRouteIdentifier(id);
    if (localMatch) {
      this.activeMatchFallback.set(localMatch);
      const kind: 'match-id' | 'partner-id' = localMatch.id === id ? 'match-id' : 'partner-id';
      this.activeMatchState.set(kind);
      this.activeMatchLoading.set(false);
      if (kind === 'partner-id') {
        this.partnerIdentifierCache.add(id);
      } else {
        this.partnerIdentifierCache.delete(id);
      }
      return;
    }

    this.pendingMatchRequests.add(id);
    this.activeMatchLoading.set(true);
    this.activeMatchState.set('loading');

    this.opportunities
      .loadMatchById(id)
      .pipe(
        takeUntilDestroyed(),
        finalize(() => {
          this.pendingMatchRequests.delete(id);
          if (this.routeMatchId() === id) {
            this.activeMatchLoading.set(false);
          }
        }),
      )
      .subscribe(match => {
        if (this.routeMatchId() !== id) {
          return;
        }

        const resolved = match ?? this.findMatchByRouteIdentifier(id);
        if (resolved) {
          this.activeMatchFallback.set(resolved);
          const kind: 'match-id' | 'partner-id' = resolved.id === id ? 'match-id' : 'partner-id';
          this.activeMatchState.set(kind);
          if (kind === 'partner-id') {
            this.partnerIdentifierCache.add(id);
          } else {
            this.partnerIdentifierCache.delete(id);
          }
          return;
        }

        this.activeMatchFallback.set(null);
        this.activeMatchState.set('not-found');
        this.partnerIdentifierCache.delete(id);
      });
  }

  private findMatchByRouteIdentifier(id: number): OpportunityMatch | null {
    const list = this.matches();
    const byMatchId = list.find(item => item.id === id);
    if (byMatchId) {
      return byMatchId;
    }
    const bySellerId = list.find(item => item.seller.id === id);
    if (bySellerId) {
      return bySellerId;
    }
    const byBuyerId = list.find(item => item.buyer.id === id);
    return byBuyerId ?? null;
  }
}
