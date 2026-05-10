import { NavigationExtras } from '@angular/router';

export interface SearchContext {
  readonly role: string;
  readonly locale: string;
  readonly sectorId?: string | null;
  readonly isPremium?: boolean;
}

export interface SearchItemActionRoute {
  readonly type: 'route';
  readonly commands: unknown[] | string;
  readonly extras?: NavigationExtras;
}

export interface SearchItemActionExternal {
  readonly type: 'external';
  readonly url: string;
  readonly target?: '_self' | '_blank';
}

export interface SearchItemActionCallback {
  readonly type: 'callback';
  readonly callbackId: string;
}

export type SearchItemAction =
  | SearchItemActionRoute
  | SearchItemActionExternal
  | SearchItemActionCallback;

export interface SearchItem {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly badge?: string;
  readonly badgeClass?: string;
  readonly shortcut?: string;
  readonly keywords?: string[];
  readonly analyticsEvent?: string;
  readonly permission?: string;
  readonly defaultRank?: number;
  readonly action?: SearchItemAction;
}

export interface SearchSection {
  readonly id: string;
  readonly title: string;
  readonly icon?: string;
  readonly items: SearchItem[];
}

export interface SearchResult {
  readonly query: string;
  readonly sections: SearchSection[];
}

export interface RecentSearch {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly action?: SearchItemAction;
  readonly visitedAt: string;
}
