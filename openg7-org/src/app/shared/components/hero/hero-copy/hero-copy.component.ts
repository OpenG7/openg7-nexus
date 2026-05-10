import { Component } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-hero-copy',
  standalone: true,
  imports: [TranslateModule],
  styleUrls: ['./hero-copy.component.scss'],
  templateUrl: './hero-copy.component.html',
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/hero » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Hero Copy ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns HeroCopyComponent gérée par le framework.
 */
export class HeroCopyComponent {}
