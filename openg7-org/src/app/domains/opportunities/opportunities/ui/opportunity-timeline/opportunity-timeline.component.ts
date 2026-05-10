import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { FavoritesService } from '@app/core/favorites.service';
import { PartnerSelection } from '@app/core/models/partner-selection';
import { TranslateModule } from '@ngx-translate/core';

import { OpportunityViewSheetPayload } from '../opportunity-view-sheet-payload';

interface OpportunityActor {
  readonly name: string;
  readonly province: string;
  readonly sector: string;
  readonly logoUrl?: string | null;
}

interface OpportunityTimelineKpi {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}

interface OpportunityTimelineStep {
  readonly id: 'need' | 'capacity' | 'logistics' | 'impact' | (string & {});
  readonly title: string;
  readonly summary?: string;
  readonly kpis: ReadonlyArray<OpportunityTimelineKpi>;
}

interface OpportunityTimelineContext {
  readonly distanceKm: number;
  readonly leadTime?: string;
  readonly co2SavedTons?: number;
  readonly logisticsCost?: string;
}

export interface OpportunityTimelineVm {
  readonly id: string;
  readonly matchId: string;
  readonly title: string;
  readonly score: number; // 0..100
  readonly buyer: OpportunityActor;
  readonly supplier: OpportunityActor;
  readonly context: OpportunityTimelineContext;
  readonly steps: ReadonlyArray<OpportunityTimelineStep>;
  readonly profileSelection: PartnerSelection;
}

@Component({
  selector: 'og7-opportunity-timeline',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './opportunity-timeline.component.html',
  styleUrl: './opportunity-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/opportunities/opportunities/ui/opportunity-timeline » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Opportunity Timeline ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns OpportunityTimelineComponent gérée par le framework.
 */
export class OpportunityTimelineComponent {
  private readonly favorites = inject(FavoritesService);

  readonly vm = input.required<OpportunityTimelineVm>();
  readonly viewSheet = output<OpportunityViewSheetPayload>();
  readonly connect = output<string>();

  private readonly circleCircumference = 2 * Math.PI * 28;

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
        return 'url(#opportunity-score-high)';
      case 'medium':
        return 'url(#opportunity-score-medium)';
      default:
        return 'url(#opportunity-score-low)';
    }
  });

  readonly scoreLabel = computed(() => `${this.vm().score}%`);

  readonly distanceLabel = computed(
    () =>
      new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
        this.vm().context.distanceKm,
      ) + ' km',
  );

  readonly co2Label = computed(() => {
    const tons = this.vm().context.co2SavedTons;
    if (tons == null) {
      return null;
    }
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(tons) + ' tCO₂e';
  });
  readonly favoriteKey = computed(() => `opportunity:${this.vm().matchId}`);
  readonly saved = computed(() => this.favorites.list().includes(this.favoriteKey()));

  protected emitViewSheet(): void {
    const vm = this.vm();
    this.viewSheet.emit({ matchId: vm.matchId, selection: vm.profileSelection });
  }

  protected emitConnect(): void {
    this.connect.emit(this.vm().matchId);
  }

  protected toggleSave(): void {
    const key = this.favoriteKey();
    if (this.saved()) {
      this.favorites.remove(key);
      return;
    }
    this.favorites.add(key);
  }
}
