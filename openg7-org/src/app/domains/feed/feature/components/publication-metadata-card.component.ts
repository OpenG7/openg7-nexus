import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { PublicationFieldConfig } from '../form-config/publication-form-config.models';
import { PublicationFormConfigService } from '../form-config/publication-form-config.service';
import { FeedPublicationMetadata } from '../models/feed.models';

interface MetadataRow {
  readonly label: string;
  readonly values: readonly MetadataValue[];
}

interface MetadataValue {
  readonly value: string;
  readonly translate: boolean;
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
        const field = this.resolveField(key);
        const formatted = this.formatValue(value, field);
        if (!formatted.length) {
          return [];
        }
        return [{
          label: field?.labelKey ?? this.humanizeKey(key),
          values: formatted,
        }];
      });
  });

  protected resolveSchemaVersion(): number | null {
    const schemaVersion = this.metadata()?.publicationForm?.schemaVersion;
    return Number.isFinite(schemaVersion) ? Math.trunc(schemaVersion as number) : null;
  }

  private resolveField(key: string): PublicationFieldConfig | null {
    const config = this.publicationConfig();
    return config?.sections.flatMap(section => section.fields).find(entry => entry.key === key) ?? null;
  }

  private formatValue(value: unknown, field: PublicationFieldConfig | null): MetadataValue[] {
    if (value == null) {
      return [];
    }
    if (typeof value === 'boolean') {
      return [{ value: value ? 'forms.common.boolean.true' : 'forms.common.boolean.false', translate: true }];
    }
    if (typeof value === 'number') {
      return [{ value: String(value), translate: false }];
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        return [];
      }
      const optionKey = this.resolveOptionLabelKey(field, normalized);
      return [{ value: optionKey ?? normalized, translate: Boolean(optionKey) }];
    }
    if (Array.isArray(value)) {
      return value.flatMap(entry => this.formatValue(entry, field));
    }
    if (typeof value === 'object') {
      return [{ value: JSON.stringify(value), translate: false }];
    }
    return [];
  }

  private resolveOptionLabelKey(field: PublicationFieldConfig | null, value: string): string | null {
    if (!field?.options?.length) {
      return null;
    }

    return field.options.find(option => String(option.value) === value)?.labelKey ?? null;
  }

  private humanizeKey(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .replace(/^./, char => char.toUpperCase());
  }
}