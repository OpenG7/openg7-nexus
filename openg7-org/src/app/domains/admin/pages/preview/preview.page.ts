import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RuntimeConfigService } from '@app/core/config/runtime-config.service';

interface HomepagePreviewAttributes {
  navigation?: unknown;
  sections?: unknown[];
  seo?: unknown;
}

interface HomepagePreviewResponse {
  data: {
    id: number;
    attributes: HomepagePreviewAttributes;
  } | null;
}

interface SectionSummary {
  index: number;
  type: string;
  title?: string;
}

@Component({
  standalone: true,
  selector: 'og7-homepage-preview-page',
  imports: [CommonModule, JsonPipe],
  templateUrl: './preview.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Preview » du dossier « domains/admin/pages/preview ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PreviewPage gérée par le framework.
 */
export class PreviewPage {
  private readonly runtimeConfig = inject(RuntimeConfigService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly preview = signal<HomepagePreviewResponse | null>(null);

  protected readonly sectionSummaries = computed<SectionSummary[]>(() => {
    const sections = this.preview()?.data?.attributes?.sections;
    if (!Array.isArray(sections)) {
      return [];
    }

    return sections.map((item, index) => {
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const type =
          typeof record['__component'] === 'string' ? (record['__component'] as string) : 'unknown';
        const title = typeof record['title'] === 'string' ? (record['title'] as string) : undefined;
        return { index, type, title } satisfies SectionSummary;
      }

      return { index, type: 'unknown' } satisfies SectionSummary;
    });
  });

  constructor() {
    void this.loadPreview();
  }

  private async loadPreview(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const token = this.runtimeConfig.homepagePreviewToken();
      if (!token) {
        this.error.set(
          'No homepage preview token configured. Define HOMEPAGE_PREVIEW_TOKEN in the runtime configuration.',
        );
        return;
      }

      const baseUrl = this.runtimeConfig.apiUrl();
      if (!baseUrl) {
        this.error.set('API_URL is not configured.');
        return;
      }

      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/homepage/preview?secret=${encodeURIComponent(token)}`;
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Unable to load preview (HTTP ${response.status}).`);
      }

      const payload = (await response.json()) as HomepagePreviewResponse;
      this.preview.set(payload);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to load the homepage preview.';
      this.error.set(message);
    } finally {
      this.loading.set(false);
    }
  }
}
