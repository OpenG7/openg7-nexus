import { CommonModule, NgClass, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type SectionKey = 'collection' | 'usage' | 'sharing' | 'security' | 'rights' | 'contact';

interface SectionConfig {
  readonly key: SectionKey;
  readonly accent: string;
}

interface Highlight {
  readonly title: string;
  readonly description: string;
}

interface SummaryItem {
  readonly label: string;
  readonly description: string;
}

@Component({
  standalone: true,
  selector: 'og7-privacy-page',
  imports: [CommonModule, TranslateModule, NgClass],
  templateUrl: './privacy.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Privacy » du dossier « domains/static/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PrivacyPage gérée par le framework.
 */
export class PrivacyPage implements AfterViewInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private intersectionObserver: IntersectionObserver | null = null;

  protected readonly sections: ReadonlyArray<SectionConfig> = [
    { key: 'collection', accent: 'from-tertiary to-primary' },
    { key: 'usage', accent: 'from-primary to-tertiary' },
    { key: 'sharing', accent: 'from-primary to-success' },
    { key: 'security', accent: 'from-success to-tertiary' },
    { key: 'rights', accent: 'from-warning to-primary' },
    { key: 'contact', accent: 'from-error to-warning' },
  ];
  protected readonly activeSection = signal<SectionKey>('collection');
  protected readonly mobileView = signal(false);
  protected readonly expandedSections = signal<ReadonlySet<SectionKey>>(
    new Set(this.sections.map((section) => section.key)),
  );

  private readonly resizeHandler = () => this.updateViewport();
  private readonly hashHandler = () => this.syncActiveSectionWithHash();

  protected paragraphs(section: SectionKey): string[] {
    const key = `pages.privacy.sections.${section}.paragraphs`;
    const value = this.translate.instant(key);
    if (!value || value === key) {
      return [];
    }
    return Array.isArray(value) ? value : [value as string];
  }

  protected bullets(section: SectionKey): string[] {
    const key = `pages.privacy.sections.${section}.bullets`;
    const value = this.translate.instant(key);
    if (!value || value === key) {
      return [];
    }
    return Array.isArray(value) ? value : [value as string];
  }

  protected highlights(): Highlight[] {
    const value = this.translate.instant('pages.privacy.highlights');
    if (!Array.isArray(value)) {
      return [];
    }
    return value as Highlight[];
  }

  protected summaryItems(): SummaryItem[] {
    const value = this.translate.instant('pages.privacy.summaryCard.items');
    if (!Array.isArray(value)) {
      return [];
    }
    return value as SummaryItem[];
  }

  protected contactEmail(): string {
    const value = this.translate.instant('pages.privacy.contactEmail');
    if (typeof value === 'string' && value.trim().length) {
      return value;
    }
    return 'privacy@openg7.org';
  }

  protected sectionAnchor(section: SectionConfig): string {
    return `privacy-${section.key}`;
  }

  protected isSectionActive(section: SectionConfig): boolean {
    return this.activeSection() === section.key;
  }

  protected setActiveSection(section: SectionConfig): void {
    this.activeSection.set(section.key);
    if (this.mobileView()) {
      this.expandedSections.set(new Set([section.key]));
    }
  }

  protected isSectionExpanded(section: SectionConfig): boolean {
    return !this.mobileView() || this.expandedSections().has(section.key);
  }

  protected toggleSection(section: SectionConfig): void {
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

  private startSectionObserver(): void {
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
      const element = document.getElementById(this.sectionAnchor(section));
      if (element) {
        observer.observe(element);
      }
    }

    this.intersectionObserver = observer;
  }

  private sectionKeyFromAnchor(anchor: string): SectionKey | null {
    const section = this.sections.find((entry) => this.sectionAnchor(entry) === anchor);
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

    if (isMobile && !wasMobile) {
      this.expandedSections.set(new Set([this.activeSection()]));
      return;
    }

    if (!isMobile && wasMobile) {
      this.expandedSections.set(new Set(this.sections.map((section) => section.key)));
    }
  }

  protected trackBySection = (_: number, section: SectionConfig) => section.key;
}
