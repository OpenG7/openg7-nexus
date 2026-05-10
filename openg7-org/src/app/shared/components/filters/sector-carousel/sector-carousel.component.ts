import { NgFor, NgIf } from '@angular/common';
import { Component, Input, computed, inject } from '@angular/core';
import { FiltersService } from '@app/core/filters.service';
import { SectorType } from '@app/core/models/opportunity';
import { TranslatePipe } from '@ngx-translate/core';

export interface Sector {
  id: SectorType;
  name?: string;
  labelKey?: string;
}

@Component({
  selector: 'og7-filters-sector-carousel',
  standalone: true,
  imports: [NgFor, NgIf, TranslatePipe],
  templateUrl: './sector-carousel.component.html',
  host: { style: 'display:block' },
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/filters » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Sector Carousel ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SectorCarouselComponent gérée par le framework.
 */
export class SectorCarouselComponent {
  @Input() sectors: Sector[] = [];
  @Input() ariaLabelledBy?: string | null;
  @Input() describedBy?: string | null;

  private static nextId = 0;
  private readonly instanceId = ++SectorCarouselComponent.nextId;

  readonly filters = inject(FiltersService);

  private readonly activeSector = computed(() => this.filters.activeSector());

  select(id: SectorType) {
    this.filters.activeSector.set(id);
  }

  protected isActive(id: SectorType): boolean {
    return this.activeSector() === id;
  }

  protected resolveOptionId(id: SectorType): string {
    return `og7SectorOption${this.instanceId}-${id}`;
  }

  trackById = (_: number, sector: Sector) => sector.id;
}
