import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Component, OnDestroy, PLATFORM_ID, inject, signal } from '@angular/core';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

type LegalSectionKey = 'operator' | 'hosting' | 'compliance' | 'credits';

interface LegalSectionConfig {
  readonly key: LegalSectionKey;
  readonly accent: string;
}

interface LegalHighlight {
  readonly label: string;
  readonly value: string;
  readonly description?: string;
}

interface LegalContact {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly href?: string;
  readonly hint?: string;
}

interface LegalMetaItem {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

interface ContactContent {
  readonly title: string;
  readonly description?: string;
  readonly channels: ReadonlyArray<LegalContact>;
}

interface LegalContactTranslation {
  readonly title?: string;
  readonly description?: string;
  readonly channels?: Record<
    string,
    { label?: string; value?: string; href?: string; hint?: string }
  >;
}

interface LegalMetaTranslation {
  readonly items?: Record<string, { label?: string; value?: string }>;
  readonly pdfHref?: string;
}

@Component({
  standalone: true,
  selector: 'og7-legal-page',
  imports: [CommonModule, TranslateModule],
  templateUrl: './legal.page.html',
})
/**
 * Contexte : Chargee par le routeur Angular pour afficher la page « Legal » du dossier « domains/static/pages ».
 * Raison d'etre : Lie le template standalone et les dependances de cette page pour la rendre navigable.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns LegalPage geree par le framework.
 */
export class LegalPage implements AfterViewInit, OnDestroy {
  private readonly translate = inject(TranslateService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly browser = isPlatformBrowser(this.platformId);
  private readonly langChangeSubscription = this.translate.onLangChange.subscribe(() =>
    this.refreshLocalizedContent(),
  );
  private intersectionObserver: IntersectionObserver | null = null;
  private copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

  protected readonly sections: ReadonlyArray<LegalSectionConfig> = [
    { key: 'operator', accent: 'from-tertiary to-primary' },
    { key: 'hosting', accent: 'from-primary to-success' },
    { key: 'compliance', accent: 'from-success to-warning' },
    { key: 'credits', accent: 'from-warning to-primary' },
  ];
  protected readonly activeSection = signal<LegalSectionKey>('operator');
  protected readonly mobileView = signal(false);
  protected readonly expandedSections = signal<ReadonlySet<LegalSectionKey>>(
    new Set(this.sections.map((section) => section.key)),
  );
  protected readonly highlights = signal<ReadonlyArray<LegalHighlight>>([]);
  protected readonly contactCard = signal<ContactContent | null>(null);
  protected readonly metaItems = signal<ReadonlyArray<LegalMetaItem>>([]);
  protected readonly legalPdfHref = signal<string | null>(null);
  protected readonly copiedChannel = signal<string | null>(null);

  private readonly resizeHandler = () => this.updateViewport();
  private readonly hashHandler = () => this.syncActiveSectionWithHash();

  constructor() {
    this.refreshLocalizedContent();
  }

  protected paragraphs(section: LegalSectionKey): string[] {
    const key = `pages.legal.sections.${section}.paragraphs`;
    const value = this.translate.instant(key);
    if (!value || value === key) {
      return [];
    }
    return Array.isArray(value) ? value : [value as string];
  }

  protected bullets(section: LegalSectionKey): string[] {
    const key = `pages.legal.sections.${section}.bullets`;
    const value = this.translate.instant(key);
    if (!value || value === key) {
      return [];
    }
    return Array.isArray(value) ? value : [value as string];
  }

  protected sectionAnchor(section: LegalSectionConfig): string {
    return `legal-${section.key}`;
  }

  protected isSectionActive(section: LegalSectionConfig): boolean {
    return this.activeSection() === section.key;
  }

  protected setActiveSection(section: LegalSectionConfig): void {
    this.activeSection.set(section.key);
    if (this.mobileView()) {
      this.expandedSections.set(new Set([section.key]));
    }
  }

  protected isSectionExpanded(section: LegalSectionConfig): boolean {
    return !this.mobileView() || this.expandedSections().has(section.key);
  }

  protected toggleSection(section: LegalSectionConfig): void {
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

  protected canCopyChannel(channel: LegalContact): boolean {
    return channel.href?.startsWith('mailto:') ?? false;
  }

  protected isChannelCopied(channel: LegalContact): boolean {
    return this.copiedChannel() === channel.key;
  }

  protected copyChannelValue(channel: LegalContact): void {
    if (!this.browser || !channel.value.trim()) {
      return;
    }

    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      return;
    }

    void clipboard.writeText(channel.value).then(() => {
      this.copiedChannel.set(channel.key);
      if (this.copyResetTimeout !== null) {
        clearTimeout(this.copyResetTimeout);
      }
      this.copyResetTimeout = setTimeout(() => this.copiedChannel.set(null), 1800);
    });
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
    this.langChangeSubscription.unsubscribe();

    if (!this.browser) {
      return;
    }

    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('hashchange', this.hashHandler);
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;

    if (this.copyResetTimeout !== null) {
      clearTimeout(this.copyResetTimeout);
      this.copyResetTimeout = null;
    }
  }

  private refreshLocalizedContent(): void {
    const translatedHighlights =
      this.translateDictionary<Record<string, LegalHighlight>>('pages.legal.highlights');
    const highlights = translatedHighlights
      ? Object.values(translatedHighlights).filter(
          (item): item is LegalHighlight => Boolean(item?.label) && Boolean(item?.value),
        )
      : [];
    this.highlights.set(highlights);

    const contactTranslation =
      this.translateDictionary<LegalContactTranslation>('pages.legal.contact');
    if (!contactTranslation?.title) {
      this.contactCard.set(null);
    } else {
      const channels = Object.entries(contactTranslation.channels ?? {})
        .map(
          ([key, channel]): LegalContact => ({
            key,
            label: channel.label ?? '',
            value: channel.value ?? '',
            href: channel.href,
            hint: channel.hint,
          }),
        )
        .filter((channel) => Boolean(channel.label) && Boolean(channel.value));

      this.contactCard.set({
        title: contactTranslation.title,
        description: contactTranslation.description,
        channels,
      });
    }

    const metaTranslation = this.translateDictionary<LegalMetaTranslation>('pages.legal.meta');
    const metaItems = Object.entries(metaTranslation?.items ?? {})
      .map(
        ([key, item]): LegalMetaItem => ({
          key,
          label: item.label ?? '',
          value: item.value ?? '',
        }),
      )
      .filter((item) => Boolean(item.label) && Boolean(item.value));
    this.metaItems.set(metaItems);

    const pdfHref =
      typeof metaTranslation?.pdfHref === 'string' && metaTranslation.pdfHref.trim().length
        ? metaTranslation.pdfHref
        : null;
    this.legalPdfHref.set(pdfHref);
  }

  private translateDictionary<T extends object>(key: string): T | null {
    const value = this.translate.instant(key);
    if (!value || value === key || typeof value !== 'object') {
      return null;
    }
    return value as T;
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

  private sectionKeyFromAnchor(anchor: string): LegalSectionKey | null {
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

  protected trackBySection = (_: number, section: LegalSectionConfig) => section.key;
  protected trackByHighlight = (_: number, highlight: LegalHighlight) => highlight.label;
  protected trackByMetaItem = (_: number, item: LegalMetaItem) => item.key;
  protected trackByContactChannel = (_: number, channel: LegalContact) => channel.key;
}
