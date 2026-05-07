import { Component } from '@angular/core';

@Component({
  selector: 'og7-map-zoom-control',
  standalone: true,
  templateUrl: './zoom-control.component.html',
  host: {
    style: 'display:block;width:1px;height:1px;',
    'data-og7': 'map-zoom-control',
  },
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/map/controls » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Zoom Control ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns ZoomControlComponent gérée par le framework.
 */
export class ZoomControlComponent {}
