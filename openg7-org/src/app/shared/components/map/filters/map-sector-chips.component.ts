import { Component } from '@angular/core';

@Component({
  selector: 'og7-map-sector-chips',
  standalone: true,
  templateUrl: './map-sector-chips.component.html',
  host: {
    style: 'display:block;width:1px;height:1px;',
    'data-og7': 'map-sector-chips',
  },
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/map/filters » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Map Sector Chips ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns MapSectorChipsComponent gérée par le framework.
 */
export class MapSectorChipsComponent {}
