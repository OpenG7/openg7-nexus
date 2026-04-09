import { Injectable, computed, inject, signal } from '@angular/core';
import { SearchContext, SearchItem, SearchResult, SearchSection } from '@app/core/models/search';
import { RbacFacadeService } from '@app/core/security/rbac.facade';
import { SearchRegistryService, SearchProvider } from '@app/core/services/search-registry.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { debounceTime, map, switchMap } from 'rxjs/operators';

import {
  SearchApiResponse,
  SearchApiService,
  SearchCompanyHit,
  SearchExchangeHit,
} from './search-api.service';

interface SectionDefinition {
  readonly id: string;
  readonly titleKey: string;
  readonly icon?: string;
  readonly items: ItemDefinition[];
}

interface ItemDefinition {
  readonly id: string;
  readonly titleKey: string;
  readonly descriptionKey?: string;
  readonly badgeKey?: string;
  readonly badgeClass?: string;
  readonly shortcutKey?: string;
  readonly keywords: string[];
  readonly permission?: string;
  readonly defaultRank?: number;
  readonly action?: SearchItem['action'];
}

const STATIC_SECTIONS: SectionDefinition[] = [
  {
    id: 'companies',
    titleKey: 'search.quick.sections.companies.title',
    icon: 'apartment',
    items: [
      {
        id: 'company-enbridge',
        titleKey: 'search.quick.sections.companies.items.enbridge.title',
        descriptionKey: 'search.quick.sections.companies.items.enbridge.description',
        badgeKey: 'search.quick.badges.energy',
        badgeClass: 'bg-emerald-500/15 text-emerald-400',
        keywords: ['enbridge', 'ontario', 'energy'],
        defaultRank: 10,
        action: { type: 'route', commands: ['/companies/register'], extras: { queryParams: { highlight: 'enbridge' } } },
      },
      {
        id: 'company-magna',
        titleKey: 'search.quick.sections.companies.items.magna.title',
        descriptionKey: 'search.quick.sections.companies.items.magna.description',
        badgeKey: 'search.quick.badges.manufacturing',
        badgeClass: 'bg-sky-500/15 text-sky-300',
        keywords: ['magna', 'automotive', 'ontario'],
        defaultRank: 15,
        action: { type: 'route', commands: ['/companies/register'], extras: { queryParams: { highlight: 'magna' } } },
      },
    ],
  },
  {
    id: 'sectors',
    titleKey: 'search.quick.sections.sectors.title',
    icon: 'category',
    items: [
      {
        id: 'sector-energy',
        titleKey: 'search.quick.sections.sectors.items.energy.title',
        descriptionKey: 'search.quick.sections.sectors.items.energy.description',
        badgeKey: 'search.quick.badges.trending',
        badgeClass: 'bg-cyan-500/15 text-cyan-300',
        keywords: ['energy', 'oil', 'gas', 'transition'],
        defaultRank: 5,
        action: { type: 'route', commands: ['/statistics'], extras: { fragment: 'energy' } },
      },
      {
        id: 'sector-digital-services',
        titleKey: 'search.quick.sections.sectors.items.digitalServices.title',
        descriptionKey: 'search.quick.sections.sectors.items.digitalServices.description',
        badgeKey: 'search.quick.badges.new',
        badgeClass: 'bg-fuchsia-500/15 text-fuchsia-300',
        keywords: ['digital services', 'technology', 'digital', 'software'],
        defaultRank: 12,
        action: { type: 'route', commands: ['/statistics'], extras: { fragment: 'digital-services' } },
      },
    ],
  },
  {
    id: 'actions',
    titleKey: 'search.quick.sections.actions.title',
    icon: 'bolt',
    items: [
      {
        id: 'action-create-company',
        titleKey: 'search.quick.sections.actions.items.createCompany.title',
        descriptionKey: 'search.quick.sections.actions.items.createCompany.description',
        badgeKey: 'search.quick.badges.shortcut',
        badgeClass: 'bg-slate-800 text-slate-200',
        keywords: ['new company', 'register', 'partner'],
        defaultRank: 1,
        action: { type: 'route', commands: ['/companies/register'] },
        permission: 'write',
      },
      {
        id: 'action-open-feed',
        titleKey: 'search.quick.sections.actions.items.openFeed.title',
        descriptionKey: 'search.quick.sections.actions.items.openFeed.description',
        badgeKey: 'search.quick.badges.shortcut',
        badgeClass: 'bg-slate-800 text-slate-200',
        keywords: ['feed', 'activity', 'updates'],
        defaultRank: 8,
        action: { type: 'route', commands: ['/feed'] },
      },
    ],
  },
  {
    id: 'help',
    titleKey: 'search.quick.sections.help.title',
    icon: 'help',
    items: [
      {
        id: 'help-shortcuts',
        titleKey: 'search.quick.sections.help.items.shortcuts.title',
        descriptionKey: 'search.quick.sections.help.items.shortcuts.description',
        keywords: ['shortcuts', 'keyboard', 'help'],
        defaultRank: 20,
        action: { type: 'route', commands: ['/faq'], extras: { fragment: 'shortcuts' } },
      },
      {
        id: 'help-support',
        titleKey: 'search.quick.sections.help.items.support.title',
        descriptionKey: 'search.quick.sections.help.items.support.description',
        keywords: ['support', 'contact', 'helpdesk'],
        defaultRank: 25,
        action: { type: 'external', url: 'mailto:support@openg7.org' },
      },
    ],
  },
];

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « domains/search/feature ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Search ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SearchService gérée par le framework.
 */
export class SearchService {
  private readonly translate = inject(TranslateService);
  private readonly registry = inject(SearchRegistryService);
  private readonly rbac = inject(RbacFacadeService);
  private readonly searchApi = inject(SearchApiService);

  private readonly sectionsSig = signal<SearchSection[]>([]);

  readonly sections = this.sectionsSig.asReadonly();
  readonly hasSections = computed(() => this.sectionsSig().length > 0);

  constructor() {
    this.sectionsSig.set(this.instantiateSections());
    const provider: SearchProvider = {
      id: 'quick-search-static',
      resolve: (query, context) => of({ sections: this.filterSections(query, context, false) }),
      getDefault: (context) => of({ sections: this.filterSections('', context, true) }),
    };
    this.registry.register(provider);

    const remoteProvider: SearchProvider = {
      id: 'quick-search-remote',
      resolve: (query, context) => {
        const normalized = query.trim();
        if (!normalized) {
          return of({ sections: [] });
        }
        return this.searchApi
          .search(normalized, context, { limit: 5 })
          .pipe(map((response) => ({ sections: this.buildRemoteSections(response) })));
      },
      getDefault: () => of({ sections: [] }),
    };
    this.registry.register(remoteProvider);

    this.translate.onLangChange.subscribe(() => {
      this.sectionsSig.set(this.instantiateSections());
    });
  }

  search$(query: string, context: SearchContext): Observable<SearchResult> {
    const normalized = query.trim();
    return of({ query: normalized, context }).pipe(
      debounceTime(350),
      switchMap(({ query: q, context: ctx }) =>
        q ? this.registry.resolve(q, ctx) : this.registry.defaults(ctx),
      ),
    );
  }

  private instantiateSections(): SearchSection[] {
    return STATIC_SECTIONS.map((section) => ({
      id: section.id,
      title: this.translate.instant(section.titleKey),
      icon: section.icon,
      items: section.items.map((item) => this.instantiateItem(item)),
    }));
  }

  private buildRemoteSections(response: SearchApiResponse): SearchSection[] {
    if (!response.engine?.enabled) {
      return [];
    }

    const sections: SearchSection[] = [];

    if (response.companies.length) {
      sections.push({
        id: 'companies-remote',
        title: this.translate.instant('search.quick.sections.remoteCompanies.title'),
        icon: 'apartment',
        items: response.companies.map((hit) => this.mapCompanyHit(hit)),
      });
    }

    if (response.exchanges.length) {
      sections.push({
        id: 'exchanges-remote',
        title: this.translate.instant('search.quick.sections.remoteExchanges.title'),
        icon: 'sync_alt',
        items: response.exchanges.map((hit) => this.mapExchangeHit(hit)),
      });
    }

    return sections;
  }

  private mapCompanyHit(hit: SearchCompanyHit): SearchItem {
    const title =
      this.stripHighlight(hit.highlights?.['name']) ??
      hit.name ??
      hit.slug ??
      this.translate.instant('search.quick.results.companyFallback', { id: hit.id });

    const highlightDescription = this.stripHighlight(hit.highlights?.['description']);
    const locationParts = [hit.sector?.name ?? null, hit.province?.name ?? hit.province?.code ?? null]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());

    const description = highlightDescription?.trim().length
      ? highlightDescription
      : locationParts.join(' · ');

    const queryParams: Record<string, string> = { highlight: String(hit.slug ?? hit.id) };
    if (hit.locale) {
      queryParams['locale'] = hit.locale;
    }

    return {
      id: `company-${hit.id}`,
      title,
      description: description || undefined,
      badge: hit.province?.code ?? hit.province?.name ?? undefined,
      badgeClass: 'bg-emerald-500/15 text-emerald-400',
      keywords: [hit.slug ?? undefined, hit.province?.name ?? undefined, hit.sector?.name ?? undefined]
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
      action: {
        type: 'route',
        commands: ['/companies/register'],
        extras: { queryParams },
      },
    } satisfies SearchItem;
  }

  private mapExchangeHit(hit: SearchExchangeHit): SearchItem {
    const source = hit.sourceProvince?.name ?? hit.sourceProvince?.code ?? this.translate.instant('search.quick.results.exchange.source');
    const target = hit.targetProvince?.name ?? hit.targetProvince?.code ?? this.translate.instant('search.quick.results.exchange.target');
    const title = `${source} → ${target}`;

    const valueText = hit.value != null ? `${hit.value}` : null;
    const metricParts = [valueText, hit.unit ?? null]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());

    const description =
      this.stripHighlight(hit.highlights?.['searchText']) ?? metricParts.join(' ');

    const queryParams: Record<string, string> = {};
    if (hit.sourceProvince?.slug) {
      queryParams['source'] = hit.sourceProvince.slug;
    } else if (hit.sourceProvince?.code) {
      queryParams['source'] = hit.sourceProvince.code;
    }
    if (hit.targetProvince?.slug) {
      queryParams['target'] = hit.targetProvince.slug;
    } else if (hit.targetProvince?.code) {
      queryParams['target'] = hit.targetProvince.code;
    }

    return {
      id: `exchange-${hit.id}`,
      title,
      description: description || undefined,
      badge: this.translate.instant('search.quick.sections.remoteExchanges.badge'),
      badgeClass: 'bg-sky-500/15 text-sky-300',
      keywords: [hit.unit ?? undefined, hit.sourceProvince?.name ?? undefined, hit.targetProvince?.name ?? undefined]
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
      action: {
        type: 'route',
        commands: ['/repertoire'],
        extras: { queryParams },
      },
    } satisfies SearchItem;
  }

  private stripHighlight(value: string | null | undefined): string | undefined {
    if (!value) {
      return undefined;
    }
    return value.replace(/<\/?em>/gi, '').trim() || undefined;
  }

  private instantiateItem(definition: ItemDefinition): SearchItem {
    return {
      id: definition.id,
      title: this.translate.instant(definition.titleKey),
      description: definition.descriptionKey ? this.translate.instant(definition.descriptionKey) : undefined,
      badge: definition.badgeKey ? this.translate.instant(definition.badgeKey) : undefined,
      badgeClass: definition.badgeClass,
      shortcut: definition.shortcutKey ? this.translate.instant(definition.shortcutKey) : undefined,
      keywords: definition.keywords,
      permission: definition.permission,
      defaultRank: definition.defaultRank,
      action: definition.action,
    } satisfies SearchItem;
  }

  private filterSections(query: string, context: SearchContext, useDefaults: boolean): SearchSection[] {
    const normalized = query.trim().toLowerCase();
    const sections = this.sectionsSig();
    return sections
      .map((section) => ({
        ...section,
        items: section.items
          .filter((item) => this.isItemVisible(item, context, normalized, useDefaults))
          .sort((a, b) => this.sortItems(a, b, normalized, useDefaults)),
      }))
      .filter((section) => section.items.length > 0);
  }

  private isItemVisible(
    item: SearchItem,
    context: SearchContext,
    normalizedQuery: string,
    useDefaults: boolean,
  ): boolean {
    if (item.permission && !this.rbac.hasPermission(item.permission)) {
      return false;
    }

    if (!normalizedQuery) {
      return useDefaults && item.defaultRank !== undefined;
    }

    const haystack = [item.title, item.description, ...(item.keywords ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  }

  private sortItems(a: SearchItem, b: SearchItem, normalizedQuery: string, useDefaults: boolean): number {
    if (!normalizedQuery && useDefaults) {
      return (a.defaultRank ?? Number.MAX_SAFE_INTEGER) - (b.defaultRank ?? Number.MAX_SAFE_INTEGER);
    }
    return a.title.localeCompare(b.title);
  }
}
