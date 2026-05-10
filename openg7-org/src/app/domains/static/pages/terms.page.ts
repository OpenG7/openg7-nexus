import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type SectionKey = 'service' | 'access' | 'data' | 'conduct' | 'security' | 'continuity';

interface TermsSectionTranslation {
  anchor?: string;
  title: string;
  navLabel?: string;
  tag?: string;
  lede?: string;
  paragraphs?: string[];
  checklistTitle?: string;
  checklist?: string[];
  callout?: {
    title: string;
    body: string[];
    tone?: 'info' | 'warning';
  };
}

type TermsSectionView = TermsSectionTranslation & {
  key: SectionKey;
  anchor: string;
  paragraphs: string[];
  checklist: string[];
};

interface TermsHighlight {
  title: string;
  description: string;
}

interface TermsObligation {
  title: string;
  description: string;
}

interface TermsNavLink {
  key: SectionKey;
  anchor: string;
  label: string;
}

interface TermsTimelineEntry {
  date: string;
  label: string;
  description: string;
}

interface TermsSummary {
  title: string;
  description: string;
  points?: string[];
}

interface TermsSupport {
  title: string;
  description: string;
  details?: string[];
  ctaLabel: string;
  ctaEmail: string;
}

interface TermsToc {
  title: string;
}

@Component({
  standalone: true,
  selector: 'og7-terms-page',
  imports: [CommonModule, TranslateModule],
  templateUrl: './terms.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Terms » du dossier « domains/static/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns TermsPage gérée par le framework.
 */
export class TermsPage implements AfterViewInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private intersectionObserver: IntersectionObserver | null = null;

  private readonly sectionOrder: SectionKey[] = [
    'service',
    'access',
    'data',
    'conduct',
    'security',
    'continuity',
  ];
  private readonly resizeHandler = () => this.updateViewport();
  private readonly hashHandler = () => this.syncActiveSectionWithHash();

  protected sections: TermsSectionView[] = [];
  protected highlights: TermsHighlight[] = [];
  protected obligations: TermsObligation[] = [];
  protected navLinks: TermsNavLink[] = [];
  protected timeline: TermsTimelineEntry[] = [];
  protected summary: TermsSummary | null = null;
  protected support: TermsSupport | null = null;
  protected toc: TermsToc | null = null;
  protected readonly activeSection = signal<SectionKey>('service');
  protected readonly mobileView = signal(false);
  protected readonly expandedSections = signal<ReadonlySet<SectionKey>>(new Set(this.sectionOrder));

  constructor() {
    this.refreshContent();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.refreshContent());
  }

  private refreshContent(): void {
    this.sections = this.sectionOrder
      .map((key): TermsSectionView | null => {
        const translation = this.resolveObject<TermsSectionTranslation>(
          `pages.terms.sections.${key}`,
        );
        if (!translation) {
          return null;
        }

        const callout = translation.callout
          ? {
              ...translation.callout,
              body: this.ensureArray(translation.callout.body),
            }
          : undefined;

        return {
          key,
          anchor: translation.anchor ?? key,
          title: translation.title,
          navLabel: translation.navLabel,
          tag: translation.tag,
          lede: translation.lede,
          paragraphs: this.ensureArray(translation.paragraphs),
          checklistTitle: translation.checklistTitle,
          checklist: this.ensureArray(translation.checklist),
          callout,
        };
      })
      .filter((section): section is TermsSectionView => section !== null);

    this.navLinks = this.sections.map((section) => ({
      key: section.key,
      anchor: section.anchor,
      label: section.navLabel ?? section.title,
    }));

    this.highlights = this.resolveArray<TermsHighlight>('pages.terms.highlights');
    this.obligations = this.resolveArray<TermsObligation>('pages.terms.obligations.items');
    this.timeline = this.resolveArray<TermsTimelineEntry>('pages.terms.timeline.items');
    this.summary = this.resolveObject<TermsSummary>('pages.terms.summary');
    this.support = this.resolveObject<TermsSupport>('pages.terms.support');
    this.toc = this.resolveObject<TermsToc>('pages.terms.toc');

    if (!this.sections.some((section) => section.key === this.activeSection())) {
      this.activeSection.set(this.sections[0]?.key ?? 'service');
    }
    this.syncExpandedSectionsWithViewport();

    if (this.browser && this.intersectionObserver !== null) {
      setTimeout(() => this.startSectionObserver(), 0);
    }
  }

  ngAfterViewInit(): void {
    if (!this.browser) {
      return;
    }

    this.updateViewport();
    this.syncActiveSectionWithHash();
    this.startSectionObserver();
    window.addEventListener('resize', this.resizeHandler, { passive: true });
    window.addEventListener('hashchange', this.hashHandler);
  }

  ngOnDestroy(): void {
    if (!this.browser) {
      return;
    }

    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('hashchange', this.hashHandler);
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
  }

  protected isSectionActive(section: TermsSectionView): boolean {
    return this.activeSection() === section.key;
  }

  protected setActiveSection(section: TermsSectionView): void {
    this.activeSection.set(section.key);
    if (this.mobileView()) {
      this.expandedSections.set(new Set([section.key]));
    }
  }

  protected setActiveSectionByKey(key: SectionKey): void {
    const section = this.sections.find((entry) => entry.key === key);
    if (!section) {
      return;
    }
    this.setActiveSection(section);
  }

  protected isSectionActiveByKey(key: SectionKey): boolean {
    return this.activeSection() === key;
  }

  protected isSectionExpanded(section: TermsSectionView): boolean {
    return !this.mobileView() || this.expandedSections().has(section.key);
  }

  protected toggleSection(section: TermsSectionView): void {
    if (!this.mobileView()) {
      return;
    }

    const next = new Set(this.expandedSections());
    if (next.has(section.key)) {
      if (next.size === 1) {
        return;
      }
      next.delete(section.key);
    } else {
      next.add(section.key);
    }
    this.expandedSections.set(next);
  }

  private startSectionObserver(): void {
    if (!this.browser) {
      return;
    }

    this.intersectionObserver?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        if (!visible.length) {
          return;
        }

        const sectionKey = this.sectionKeyFromAnchor(visible[0].target.id);
        if (!sectionKey) {
          return;
        }
        this.activeSection.set(sectionKey);
      },
      {
        threshold: [0.2, 0.5, 0.8],
        rootMargin: '-20% 0px -50% 0px',
      },
    );

    for (const section of this.sections) {
      const element = document.getElementById(section.anchor);
      if (element) {
        observer.observe(element);
      }
    }

    this.intersectionObserver = observer;
  }

  private sectionKeyFromAnchor(anchor: string): SectionKey | null {
    const section = this.sections.find((entry) => entry.anchor === anchor);
    return section?.key ?? null;
  }

  private syncActiveSectionWithHash(): void {
    if (!this.browser) {
      return;
    }

    const hash = window.location.hash.replace('#', '');
    if (!hash) {
      return;
    }

    const key = this.sectionKeyFromAnchor(hash);
    if (!key) {
      return;
    }

    this.activeSection.set(key);
    if (this.mobileView()) {
      this.expandedSections.set(new Set([key]));
    }
  }

  private updateViewport(): void {
    if (!this.browser) {
      return;
    }

    const isMobile = window.innerWidth < 768;
    const wasMobile = this.mobileView();
    this.mobileView.set(isMobile);

    if (isMobile !== wasMobile) {
      this.syncExpandedSectionsWithViewport();
    }
  }

  private syncExpandedSectionsWithViewport(): void {
    if (this.mobileView()) {
      this.expandedSections.set(new Set([this.activeSection()]));
      return;
    }

    this.expandedSections.set(new Set(this.sections.map((section) => section.key)));
  }

  private translateInstant<T>(key: string): T | null {
    const value = this.translate.instant(key);
    if (value === key || value === undefined || value === null) {
      return null;
    }
    return value as T;
  }

  private resolveArray<T>(key: string): T[] {
    const value = this.translateInstant<T | T[]>(key);
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? (value as T[]) : [value as T];
  }

  private resolveObject<T>(key: string): T | null {
    const value = this.translateInstant<T>(key);
    if (!value || typeof value !== 'object') {
      return null;
    }
    return value;
  }

  private ensureArray<T>(value: T[] | T | undefined): T[] {
    if (!value) {
      return [];
    }
    return Array.isArray(value) ? value : [value];
  }

  protected trackBySection = (_: number, section: TermsSectionView) => section.key;
  protected trackByNavLink = (_: number, link: TermsNavLink) => link.anchor;
  protected trackByHighlight = (_: number, highlight: TermsHighlight) => highlight.title;
  protected trackByObligation = (_: number, obligation: TermsObligation) => obligation.title;
  protected trackByTimeline = (_: number, entry: TermsTimelineEntry) =>
    `${entry.date}-${entry.label}`;
}
