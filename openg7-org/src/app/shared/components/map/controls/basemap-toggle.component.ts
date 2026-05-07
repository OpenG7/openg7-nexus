import { Component } from '@angular/core';

@Component({
  selector: 'og7-map-basemap-toggle',
  standalone: true,
  templateUrl: './basemap-toggle.component.html',
  host: {
    style: 'display:block;width:1px;height:1px;',
    'data-og7': 'map-basemap-toggle',
  },
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/map/controls » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Basemap Toggle ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns BasemapToggleComponent gérée par le framework.
 */
export class BasemapToggleComponent {}
