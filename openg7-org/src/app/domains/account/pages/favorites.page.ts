import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { FavoritesService } from '@app/core/favorites.service';
import { TranslateModule } from '@ngx-translate/core';

interface FavoriteViewModel {
  key: string;
  entityType: string;
  entityId: string;
  title: string;
  typeLabelKey: string;
  routeCommands: readonly string[];
  queryParams?: Params;
}

@Component({
  standalone: true,
  selector: 'og7-favorites-page',
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './favorites.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Favorites » du dossier « domains/account/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns FavoritesPage gérée par le framework.
 */
export class FavoritesPage {
  private readonly favorites = inject(FavoritesService);

  readonly loading = this.favorites.loading;
  readonly error = this.favorites.error;
  readonly favoritesList = computed(() => this.favorites.list());
  readonly favoritesView = computed(() =>
    this.favoritesList().map((item) => this.toViewModel(item)),
  );
  readonly hasFavorites = computed(() => this.favoritesView().length > 0);
  readonly errorMessageKey = computed(() => {
    const errorKey = this.error();
    if (!errorKey) {
      return null;
    }
    return errorKey === 'favorites.sync.failed' ? 'pages.favorites.errors.syncFailed' : errorKey;
  });
  readonly skeletonItems = [0, 1, 2] as const;

  constructor() {
    this.favorites.refresh();
  }

  refreshFavorites() {
    this.favorites.refresh();
  }

  clearFavorites() {
    this.favorites.clear();
  }

  removeFavorite(itemKey: string) {
    this.favorites.remove(itemKey);
  }

  trackByKey = (_: number, item: FavoriteViewModel) => item.key;

  badgeClass(entityType: string): string {
    switch (entityType) {
      case 'company':
      case 'enterprise':
        return 'border-cyan-200 bg-cyan-50 text-cyan-700';
      case 'opportunity':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'partner':
        return 'border-violet-200 bg-violet-50 text-violet-700';
      case 'linkup':
      case 'connection':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      default:
        return 'border-slate-200 bg-white text-slate-700';
    }
  }

  private toViewModel(item: string): FavoriteViewModel {
    const { entityType, entityId } = this.parseItem(item);
    const route = this.routeFor(entityType, entityId);
    return {
      key: item,
      entityType,
      entityId,
      title: this.formatLabel(entityId),
      typeLabelKey: this.typeLabelKey(entityType),
      routeCommands: route.commands,
      queryParams: route.queryParams,
    };
  }

  private parseItem(item: string): { entityType: string; entityId: string } {
    const normalized = item.trim();
    const separatorIndex = normalized.indexOf(':');
    if (separatorIndex <= 0) {
      return {
        entityType: 'generic',
        entityId: normalized,
      };
    }

    const entityType = normalized.slice(0, separatorIndex).trim().toLowerCase();
    const entityId = normalized.slice(separatorIndex + 1).trim();

    if (!entityType || !entityId) {
      return {
        entityType: 'generic',
        entityId: normalized,
      };
    }

    return { entityType, entityId };
  }

  private formatLabel(entityId: string): string {
    const decoded = this.safeDecode(entityId);
    const cleaned = decoded.replace(/[._-]+/g, ' ').trim();
    return cleaned || entityId;
  }

  private safeDecode(value: string): string {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  private typeLabelKey(entityType: string): string {
    switch (entityType) {
      case 'company':
      case 'enterprise':
        return 'pages.favorites.types.company';
      case 'opportunity':
        return 'pages.favorites.types.opportunity';
      case 'partner':
        return 'pages.favorites.types.partner';
      case 'linkup':
      case 'connection':
        return 'pages.favorites.types.linkup';
      default:
        return 'pages.favorites.types.generic';
    }
  }

  private routeFor(
    entityType: string,
    entityId: string,
  ): { commands: readonly string[]; queryParams?: Params } {
    switch (entityType) {
      case 'company':
      case 'enterprise':
        return { commands: ['/entreprise', entityId] };
      case 'partner':
        return { commands: ['/partners', entityId] };
      case 'linkup':
      case 'connection':
        return { commands: ['/linkups', entityId] };
      case 'opportunity':
        return {
          commands: ['/feed'],
          queryParams: { q: entityId },
        };
      default:
        return {
          commands: ['/feed'],
          queryParams: { q: entityId },
        };
    }
  }
}
