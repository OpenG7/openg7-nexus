import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

interface InputCard {
  readonly id: string;
  readonly icon: string;
  readonly titleKey: string;
  readonly descriptionKey: string;
}

// Editorial home inputs intentionally stay separate from the canonical sector taxonomy.
const INPUT_CARDS: readonly InputCard[] = [
  {
    id: 'electricity',
    icon: '\u26A1',
    titleKey: 'home.inputs.cards.electricity.title',
    descriptionKey: 'home.inputs.cards.electricity.description',
  },
  {
    id: 'oil',
    icon: '\uD83D\uDEE2\uFE0F',
    titleKey: 'home.inputs.cards.oil.title',
    descriptionKey: 'home.inputs.cards.oil.description',
  },
  {
    id: 'operations-support',
    icon: '\uD83E\uDDF0',
    titleKey: 'home.inputs.cards.operations-support.title',
    descriptionKey: 'home.inputs.cards.operations-support.description',
  },
  {
    id: 'workforce',
    icon: '\uD83E\uDDD1\u200D\uD83C\uDFED',
    titleKey: 'home.inputs.cards.workforce.title',
    descriptionKey: 'home.inputs.cards.workforce.description',
  },
  {
    id: 'materials',
    icon: '\uD83E\uDDF1',
    titleKey: 'home.inputs.cards.materials.title',
    descriptionKey: 'home.inputs.cards.materials.description',
  },
];

@Component({
  selector: 'og7-home-inputs-section',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './home-inputs-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichee dans les vues du dossier "domains/home/feature" en tant que composant Angular standalone.
 * Raison d'etre : Encapsule l'interface utilisateur et la logique propre a "Home Inputs Section".
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns HomeInputsSectionComponent geree par le framework.
 */
export class HomeInputsSectionComponent {
  protected readonly cards = INPUT_CARDS;
}
