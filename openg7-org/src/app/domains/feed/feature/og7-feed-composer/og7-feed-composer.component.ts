import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import { feedModeSig, feedTypeSig, fromProvinceIdSig, sectorIdSig, toProvinceIdSig } from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import { FeedComposerDraft, FeedItemType, FeedOriginType, FlowMode, QuantityUnit } from '../models/feed.models';
import { FeedRealtimeService } from '../services/feed-realtime.service';

@Component({
  selector: 'og7-feed-composer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './og7-feed-composer.component.html',
  styleUrls: ['./og7-feed-composer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Og7FeedComposerComponent {
  private readonly feed = inject(FeedRealtimeService);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly appliedPrefillKey = signal<string | null>(null);
  readonly showHeader = input(true);

  protected readonly type = signal<FeedItemType | null>(feedTypeSig());
  protected readonly sectorId = signal<string | null>(sectorIdSig());
  protected readonly mode = signal<FlowMode>(feedModeSig());
  protected readonly fromProvinceId = signal<string | null>(fromProvinceIdSig());
  protected readonly toProvinceId = signal<string | null>(toProvinceIdSig());
  protected readonly title = signal('');
  protected readonly summary = signal('');
  protected readonly quantityValue = signal('');
  protected readonly quantityUnit = signal<QuantityUnit | ''>('');
  protected readonly tagsInput = signal('');
  protected readonly originType = signal<FeedOriginType | null>(null);
  protected readonly originId = signal<string | null>(null);

  protected readonly submitting = signal(false);
  protected readonly errors = signal<readonly string[]>([]);
  protected readonly warnings = signal<readonly string[]>([]);

  protected readonly provinces = this.store.selectSignal(selectProvinces);
  protected readonly sectors = this.store.selectSignal(selectSectors);

  protected readonly typeOptions: FeedItemType[] = [
    'OFFER',
    'REQUEST',
    'ALERT',
    'TENDER',
    'CAPACITY',
    'INDICATOR',
  ];

  protected readonly modeOptions: FlowMode[] = ['BOTH', 'EXPORT', 'IMPORT'];
  protected readonly unitOptions: QuantityUnit[] = [
    'MW',
    'MWh',
    'bbl_d',
    'ton',
    'kg',
    'hours',
    'cad',
    'usd',
  ];

  protected readonly canSubmit = computed(() => {
    return (
      !this.submitting() &&
      Boolean(this.type()) &&
      Boolean(this.sectorId()) &&
      this.title().trim().length >= 3 &&
      this.summary().trim().length >= 10
    );
  });

  constructor() {
    effect(
      () => {
        const query = this.queryParamMap();
        if (!query) {
          return;
        }
        const source = this.normalizeQueryText(query.get('draftSource'));
        const hasExplicitOrigin = Boolean(
          this.normalizeDraftOriginType(query.get('draftOriginType')) && this.normalizeQueryText(query.get('draftOriginId'))
        );
        if (source !== 'alert' && !hasExplicitOrigin) {
          return;
        }
        const prefillKey = this.buildPrefillKey(query);
        if (prefillKey === this.appliedPrefillKey()) {
          return;
        }
        this.appliedPrefillKey.set(prefillKey);
        this.applyDraftPrefill(query);
      },
      { allowSignalWrites: true }
    );
  }

  protected handleSubmit(): void {
    if (!this.canSubmit()) {
      return;
    }
    const quantity =
      this.quantityValue().trim().length > 0
        ? {
            value: Number(this.quantityValue()),
            unit: this.quantityUnit() as QuantityUnit,
          }
        : null;
    const tags = this.tagsInput()
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
    const draft: FeedComposerDraft = {
      type: this.type(),
      title: this.title(),
      summary: this.summary(),
      sectorId: this.sectorId(),
      fromProvinceId: this.fromProvinceId(),
      toProvinceId: this.toProvinceId(),
      mode: this.mode(),
      quantity,
      tags: tags.length ? tags : undefined,
      originType: this.originType(),
      originId: this.originId(),
    };
    const validation = this.feed.publish(draft);
    this.errors.set(validation.errors);
    this.warnings.set(validation.warnings);
    if (validation.valid) {
      this.submitting.set(true);
      this.title.set('');
      this.summary.set('');
      this.quantityValue.set('');
      this.quantityUnit.set('');
      this.tagsInput.set('');
      this.originType.set(null);
      this.originId.set(null);
      setTimeout(() => this.submitting.set(false), 250);
    }
  }

  protected updateType(value: string): void {
    const next = value ? (value as FeedItemType) : null;
    this.type.set(next);
  }

  protected updateSector(value: string): void {
    this.sectorId.set(value || null);
  }

  protected updateMode(value: string): void {
    this.mode.set((value as FlowMode) || 'BOTH');
  }

  protected updateFromProvince(value: string): void {
    this.fromProvinceId.set(value || null);
  }

  protected updateToProvince(value: string): void {
    this.toProvinceId.set(value || null);
  }

  protected clearDraft(): void {
    this.title.set('');
    this.summary.set('');
    this.quantityValue.set('');
    this.quantityUnit.set('');
    this.tagsInput.set('');
    this.originType.set(null);
    this.originId.set(null);
  }

  focusPrimaryField(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.titleInputRef()?.nativeElement.focus();
  }

  private applyDraftPrefill(query: ParamMap): void {
    const draftType = this.normalizeDraftType(query.get('draftType'));
    if (draftType) {
      this.type.set(draftType);
    }

    const draftMode = this.normalizeDraftMode(query.get('draftMode'));
    if (draftMode) {
      this.mode.set(draftMode);
    }

    const draftSectorId = this.normalizeQueryText(query.get('draftSectorId'));
    if (draftSectorId) {
      this.sectorId.set(draftSectorId);
    }

    const draftFromProvinceId = this.normalizeQueryText(query.get('draftFromProvinceId'));
    if (draftFromProvinceId) {
      this.fromProvinceId.set(draftFromProvinceId);
    }

    const draftToProvinceId = this.normalizeQueryText(query.get('draftToProvinceId'));
    if (draftToProvinceId) {
      this.toProvinceId.set(draftToProvinceId);
    }

    const draftTitle = this.normalizeQueryText(query.get('draftTitle'));
    if (draftTitle) {
      this.title.set(draftTitle.slice(0, 160));
    }

    const draftSummary = this.normalizeQueryText(query.get('draftSummary'));
    if (draftSummary) {
      this.summary.set(draftSummary.slice(0, 5000));
    }

    const draftTags = this.normalizeDraftTags(query.get('draftTags'));
    if (draftTags) {
      this.tagsInput.set(draftTags);
    }

    const draftOriginType = this.normalizeDraftOriginType(query.get('draftOriginType'));
    const draftOriginId = this.normalizeQueryText(query.get('draftOriginId'));
    if (draftOriginType && draftOriginId) {
      this.originType.set(draftOriginType);
      this.originId.set(draftOriginId);
      return;
    }

    const legacyAlertId = this.normalizeQueryText(query.get('draftAlertId'));
    if (this.normalizeQueryText(query.get('draftSource')) === 'alert' && legacyAlertId) {
      this.originType.set('alert');
      this.originId.set(legacyAlertId);
    }
  }

  private buildPrefillKey(query: ParamMap): string {
    const keys = [
      'draftSource',
      'draftAlertId',
      'draftType',
      'draftMode',
      'draftSectorId',
      'draftFromProvinceId',
      'draftToProvinceId',
      'draftTitle',
      'draftSummary',
      'draftTags',
      'draftOriginType',
      'draftOriginId',
    ];
    return keys.map(key => query.get(key) ?? '').join('|');
  }

  private normalizeQueryText(value: string | null): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }

  private normalizeDraftType(value: string | null): FeedItemType | null {
    const normalized = this.normalizeQueryText(value)?.toUpperCase() ?? null;
    if (!normalized) {
      return null;
    }
    return this.typeOptions.includes(normalized as FeedItemType) ? (normalized as FeedItemType) : null;
  }

  private normalizeDraftMode(value: string | null): FlowMode | null {
    const normalized = this.normalizeQueryText(value)?.toUpperCase() ?? null;
    if (!normalized) {
      return null;
    }
    return this.modeOptions.includes(normalized as FlowMode) ? (normalized as FlowMode) : null;
  }

  private normalizeDraftOriginType(value: string | null): FeedOriginType | null {
    const normalized = this.normalizeQueryText(value)?.toLowerCase() ?? null;
    if (!normalized || !['alert', 'opportunity', 'indicator'].includes(normalized)) {
      return null;
    }
    return normalized as FeedOriginType;
  }

  private normalizeDraftTags(value: string | null): string | null {
    const raw = this.normalizeQueryText(value);
    if (!raw) {
      return null;
    }
    const normalized = raw
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 8)
      .join(', ');
    return normalized.length ? normalized : null;
  }
}
