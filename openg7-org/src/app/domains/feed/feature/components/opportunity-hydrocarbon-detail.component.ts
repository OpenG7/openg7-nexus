import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { FeedPublicationMetadata } from '../models/feed.models';

interface HydrocarbonBadgeVm {
  readonly value: string;
  readonly translate: boolean;
  readonly tone: 'neutral' | 'warning' | 'critical';
}

interface HydrocarbonRowVm {
  readonly labelKey: string;
  readonly values: readonly string[];
  readonly translate: boolean;
}

@Component({
  selector: 'og7-opportunity-hydrocarbon-detail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <article
      *ngIf="isHydrocarbonSignal()"
      class="opportunity-body__card opportunity-body__card--hydrocarbon"
      data-og7="hydrocarbon-detail-card"
    >
      <h2>{{ 'feed.opportunity.detail.hydrocarbon.title' | translate }}</h2>
      <p>{{ 'feed.opportunity.detail.hydrocarbon.subtitle' | translate }}</p>

      <ul *ngIf="badges().length > 0" class="opportunity-body__tags">
        <li *ngFor="let badge of badges()">
          <span class="hydrocarbon-badge" [class.is-warning]="badge.tone === 'warning'" [class.is-critical]="badge.tone === 'critical'">
            <ng-container *ngIf="badge.translate; else rawBadge">{{ badge.value | translate }}</ng-container>
          </span>
          <ng-template #rawBadge>{{ badge.value }}</ng-template>
        </li>
      </ul>

      <div *ngIf="windowLabel() as window" class="hydrocarbon-window">
        <span>{{ 'feed.opportunity.detail.hydrocarbon.window' | translate }}</span>
        <strong>{{ window }}</strong>
      </div>

      <ul>
        <li *ngFor="let row of rows()">
          <span>{{ row.labelKey | translate }}</span>
          <strong *ngIf="row.translate; else rawRow">
            <ng-container *ngFor="let value of row.values; let last = last">
              {{ value | translate }}<ng-container *ngIf="!last">, </ng-container>
            </ng-container>
          </strong>
          <ng-template #rawRow><strong>{{ row.values.join(', ') }}</strong></ng-template>
        </li>
      </ul>
    </article>
  `,
  styles: [
    `
      .hydrocarbon-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 0.35rem 0.7rem;
        background: rgba(16, 24, 40, 0.06);
        color: #0f172a;
        font-size: 0.8rem;
        font-weight: 600;
      }

      .hydrocarbon-badge.is-warning {
        background: rgba(217, 119, 6, 0.14);
        color: #9a3412;
      }

      .hydrocarbon-badge.is-critical {
        background: rgba(185, 28, 28, 0.14);
        color: #991b1b;
      }

      .hydrocarbon-window {
        display: grid;
        gap: 0.25rem;
        margin: 0 0 1rem;
        padding: 0.85rem 1rem;
        border-left: 4px solid #9a3412;
        background: rgba(154, 52, 18, 0.06);
      }

      .hydrocarbon-window span {
        font-size: 0.78rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .hydrocarbon-window strong {
        font-size: 1rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7OpportunityHydrocarbonDetailComponent {
  readonly metadata = input<FeedPublicationMetadata | null>(null);

  private readonly extensions = computed<Record<string, unknown>>(() => {
    const value = this.metadata()?.extensions;
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  });

  readonly isHydrocarbonSignal = computed(
    () => this.metadata()?.publicationForm?.formKey === 'hydrocarbon-surplus-offer'
  );

  readonly badges = computed<readonly HydrocarbonBadgeVm[]>(() => {
    if (!this.isHydrocarbonSignal()) {
      return [];
    }

    const extensions = this.extensions();
    const badges: HydrocarbonBadgeVm[] = [];
    for (const [field, value] of [
      ['publicationType', extensions['publicationType']],
      ['productType', extensions['productType']],
      ['storagePressureLevel', extensions['storagePressureLevel']],
    ] as const) {
      const optionKey = this.optionKey(field, value);
      if (optionKey) {
        badges.push({
          value: optionKey,
          translate: true,
          tone: field === 'storagePressureLevel' ? this.pressureTone(value) : 'neutral',
        });
      }
    }

    return badges;
  });

  readonly windowLabel = computed(() => {
    if (!this.isHydrocarbonSignal()) {
      return null;
    }

    const extensions = this.extensions();
    const start = this.stringValue(extensions['availableFrom']);
    const end = this.stringValue(extensions['availableUntil']);
    if (start && end) {
      return `${start} -> ${end}`;
    }
    return start ?? end ?? null;
  });

  readonly rows = computed<readonly HydrocarbonRowVm[]>(() => {
    if (!this.isHydrocarbonSignal()) {
      return [];
    }

    const extensions = this.extensions();
    const rows: HydrocarbonRowVm[] = [];
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.companyName.label', this.stringValue(extensions['companyName']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.volumeBarrels.label', this.quantityValue(extensions['volumeBarrels']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.minimumLotBarrels.label', this.quantityValue(extensions['minimumLotBarrels']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.availableFrom.label', this.stringValue(extensions['availableFrom']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.availableUntil.label', this.stringValue(extensions['availableUntil']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.estimatedDelayDays.label', this.dayValue(extensions['estimatedDelayDays']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.originSite.label', this.stringValue(extensions['originSite']));
    this.pushTranslatedRow(rows, 'forms.hydrocarbonSurplus.fields.qualityGrade.label', 'qualityGrade', extensions['qualityGrade']);
    this.pushTranslatedListRow(rows, 'forms.hydrocarbonSurplus.fields.logisticsMode.label', 'logisticsMode', extensions['logisticsMode']);
    this.pushTranslatedListRow(rows, 'forms.hydrocarbonSurplus.fields.targetScope.label', 'targetScope', extensions['targetScope']);
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.priceReference.label', this.stringValue(extensions['priceReference']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.contactChannel.label', this.stringValue(extensions['contactChannel']));
    this.pushRow(rows, 'forms.hydrocarbonSurplus.fields.notes.label', this.stringValue(extensions['notes']));
    return rows;
  });

  private pushRow(rows: HydrocarbonRowVm[], labelKey: string, value: string | null): void {
    if (!value) {
      return;
    }
    rows.push({ labelKey, values: [value], translate: false });
  }

  private pushTranslatedRow(rows: HydrocarbonRowVm[], labelKey: string, field: string, value: unknown): void {
    const optionKey = this.optionKey(field, value);
    if (!optionKey) {
      return;
    }
    rows.push({ labelKey, values: [optionKey], translate: true });
  }

  private pushTranslatedListRow(
    rows: HydrocarbonRowVm[],
    labelKey: string,
    field: string,
    value: unknown
  ): void {
    const values = Array.isArray(value)
      ? value.map((entry) => this.optionKey(field, entry)).filter((entry): entry is string => Boolean(entry))
      : [];

    if (values.length === 0) {
      return;
    }

    rows.push({ labelKey, values, translate: true });
  }

  private optionKey(field: string, value: unknown): string | null {
    if (typeof value !== 'string' || !value.trim()) {
      return null;
    }
    return `forms.hydrocarbonSurplus.fields.${field}.options.${value.trim()}`;
  }

  private stringValue(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private quantityValue(value: unknown): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    return `${value.toLocaleString('en-CA')} bbl`;
  }

  private dayValue(value: unknown): string | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return null;
    }

    return `${value} d`;
  }

  private pressureTone(value: unknown): 'neutral' | 'warning' | 'critical' {
    if (value === 'critical') {
      return 'critical';
    }
    if (value === 'high') {
      return 'warning';
    }
    return 'neutral';
  }
}