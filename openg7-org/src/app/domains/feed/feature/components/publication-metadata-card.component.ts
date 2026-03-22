import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { PublicationFormConfigService } from '../form-config/publication-form-config.service';
import { FeedPublicationMetadata } from '../models/feed.models';

interface MetadataRow {
  readonly label: string;
  readonly value: string;
}

@Component({
  selector: 'og7-publication-metadata-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './publication-metadata-card.component.html',
  styleUrl: './publication-metadata-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7PublicationMetadataCardComponent {
  private readonly configService = inject(PublicationFormConfigService);

  readonly metadata = input<FeedPublicationMetadata | null>(null);

  protected readonly publicationConfig = computed(() => {
    const formKey = this.metadata()?.publicationForm?.formKey;
    return this.configService.get(formKey);
  });

  protected readonly rows = computed<readonly MetadataRow[]>(() => {
    const metadata = this.metadata();
    const extensions = metadata?.extensions;
    if (!extensions || typeof extensions !== 'object') {
      return [];
    }

    return Object.entries(extensions)
      .flatMap(([key, value]) => {
        const formatted = this.formatValue(value);
        if (!formatted) {
          return [];
        }
        return [{
          label: this.resolveLabel(key),
          value: formatted,
        }];
      });
  });

  protected resolveSchemaVersion(): number | null {
    const schemaVersion = this.metadata()?.publicationForm?.schemaVersion;
    return Number.isFinite(schemaVersion) ? Math.trunc(schemaVersion as number) : null;
  }

  private resolveLabel(key: string): string {
    const config = this.publicationConfig();
    const field = config?.sections.flatMap(section => section.fields).find(entry => entry.key === key);
    if (field) {
      return field.labelKey;
    }
    return this.humanizeKey(key);
  }

  private formatValue(value: unknown): string | null {
    if (value == null) {
      return null;
    }
    if (typeof value === 'boolean') {
      return value ? 'forms.common.boolean.true' : 'forms.common.boolean.false';
    }
    if (typeof value === 'number') {
      return String(value);
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized || null;
    }
    if (Array.isArray(value)) {
      const normalized = value.map(entry => this.formatValue(entry)).filter(Boolean);
      return normalized.length ? normalized.join(', ') : null;
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return null;
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/^./, char => char.toUpperCase());
  }
}