import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  HeroStatsComponent,
  StatMetric,
} from '@app/shared/components/hero/hero-stats/hero-stats.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-home-statistics-section',
  standalone: true,
  imports: [TranslateModule, HeroStatsComponent],
  templateUrl: './home-statistics-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/home/feature » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Home Statistics Section ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HomeStatisticsSectionComponent gérée par le framework.
 */
export class HomeStatisticsSectionComponent {
  readonly stats = input.required<StatMetric[]>();
}
