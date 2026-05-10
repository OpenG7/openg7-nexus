import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

export interface OpportunityTwoWayComparatorActor {
  readonly name: string;
  readonly provinceLabelKey: string;
  readonly sectorLabelKey: string;
  readonly logoUrl?: string | null;
}

export interface OpportunityTwoWayComparatorMetric {
  readonly id: string;
  readonly labelKey: string;
  readonly valueKey: string;
  readonly valueParams?: Record<string, unknown>;
  readonly hintKey: string;
  readonly pending: boolean;
}

export interface OpportunityTwoWayComparatorVm {
  readonly id: string;
  readonly matchId: string;
  readonly title: string;
  readonly score: number; // 0..100
  readonly buyer: OpportunityTwoWayComparatorActor;
  readonly supplier: OpportunityTwoWayComparatorActor;
  readonly metrics: readonly OpportunityTwoWayComparatorMetric[];
}

@Component({
  selector: 'og7-opportunity-two-way-comparator',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './opportunity-two-way-comparator.component.html',
  styleUrl: './opportunity-two-way-comparator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/opportunities/opportunities/ui/opportunity-two-way-comparator » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Opportunity Two Way Comparator ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns OpportunityTwoWayComparatorComponent gérée par le framework.
 */
export class OpportunityTwoWayComparatorComponent {
  readonly vm = input.required<OpportunityTwoWayComparatorVm>();
  readonly connect = output<string>();

  private readonly circleRadius = 48;
  private readonly circleCircumference = 2 * Math.PI * this.circleRadius;

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

  readonly scoreLabel = computed(() => `${this.vm().score}%`);

  readonly scoreStrokeDasharray = this.circleCircumference.toFixed(2);

  readonly scoreStrokeDashoffset = computed(() => {
    const value = Math.max(0, Math.min(100, this.vm().score));
    const ratio = value / 100;
    const offset = this.circleCircumference - ratio * this.circleCircumference;
    return offset.toFixed(2);
  });

  readonly scoreStroke = computed(() => {
    switch (this.scoreTone()) {
      case 'high':
        return 'url(#opportunity-two-way-score-high)';
      case 'medium':
        return 'url(#opportunity-two-way-score-medium)';
      default:
        return 'url(#opportunity-two-way-score-low)';
    }
  });

  readonly scoreBadgeClass = computed(
    () => `opportunity-two-way__score-badge--${this.scoreTone()}`,
  );

  readonly titleId = computed(() => `opportunity-two-way-title-${this.vm().id}`);
  readonly scoreId = computed(() => `opportunity-two-way-score-${this.vm().id}`);
  readonly metricsId = computed(() => `opportunity-two-way-metrics-${this.vm().id}`);

  protected trackByMetricId(_index: number, metric: OpportunityTwoWayComparatorMetric): string {
    return metric.id;
  }

  protected emitConnect(): void {
    this.connect.emit(this.vm().matchId);
  }
}
