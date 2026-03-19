import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { selectProvinces, selectSectors } from '@app/state/catalog/catalog.selectors';
import { feedModeSig, feedTypeSig, fromProvinceIdSig, sectorIdSig, toProvinceIdSig } from '@app/state/shared-feed-signals';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';

import {
  buildFeedDraftPrefillClearQueryParams,
  buildFeedDraftPrefillKey,
  readFeedDraftPrefillQuery,
} from '../feed-draft-prefill.helpers';
import { FeedComposerDraft, FeedItem, FeedItemType, FeedOriginType, FlowMode, QuantityUnit } from '../models/feed.models';
import { FeedConnectionMatchService } from '../services/feed-connection-match.service';
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
  private static readonly SUBMIT_ERROR_FALLBACK = 'feed.error.generic';

  private readonly auth = inject(AuthService);
  private readonly feed = inject(FeedRealtimeService);
  private readonly connectionMatcher = inject(FeedConnectionMatchService);
  private readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');
  private readonly queryParamMap = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });
  private readonly appliedPrefillKey = signal<string | null>(null);
  readonly showHeader = input(true);
  readonly published = output<FeedItem>();

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
  protected readonly connectionMatchId = signal<number | null>(null);

  protected readonly submitState = signal<'idle' | 'submitting' | 'success' | 'error' | 'offline'>('idle');
  protected readonly submitting = computed(() => this.submitState() === 'submitting');
  protected readonly submitError = signal<string | null>(null);
  protected readonly errors = signal<readonly string[]>([]);
  protected readonly warnings = signal<readonly string[]>([]);
  protected readonly draftNotice = computed(() => {
    const query = this.queryParamMap();
    if (!buildFeedDraftPrefillKey(query)) {
      return null;
    }

    const prefill = readFeedDraftPrefillQuery(query);
    const explicitOriginType = this.normalizeDraftOriginType(prefill.draftOriginType);
    const legacyOriginType =
      this.normalizeQueryText(prefill.draftSource) === 'alert' &&
      this.normalizeQueryText(prefill.draftAlertId)
        ? 'alert'
        : null;
    const originType = explicitOriginType ?? legacyOriginType;

    return {
      contextKey:
        originType === 'alert'
          ? 'feed.composer.draft.fromAlert'
          : originType === 'indicator'
            ? 'feed.composer.draft.fromIndicator'
            : originType === 'opportunity'
              ? 'feed.composer.draft.fromOpportunity'
              : 'feed.composer.draft.fromContext',
      prefilledTitle: this.normalizeQueryText(prefill.draftTitle),
    };
  });

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
        const prefillKey = buildFeedDraftPrefillKey(query);
        if (!prefillKey) {
          return;
        }
        if (prefillKey === this.appliedPrefillKey()) {
          return;
        }
        this.appliedPrefillKey.set(prefillKey);
        this.applyDraftPrefill(query);
      }
    );
  }

  protected handleSubmit(): void {
    void this.submitDraft();
  }

  protected updateType(value: string): void {
    this.resetSubmitState();
    const next = value ? (value as FeedItemType) : null;
    this.type.set(next);
  }

  protected updateSector(value: string): void {
    this.resetSubmitState();
    this.sectorId.set(value || null);
  }

  protected updateMode(value: string): void {
    this.resetSubmitState();
    this.mode.set((value as FlowMode) || 'BOTH');
  }

  protected updateFromProvince(value: string): void {
    this.resetSubmitState();
    this.fromProvinceId.set(value || null);
  }

  protected updateToProvince(value: string): void {
    this.resetSubmitState();
    this.toProvinceId.set(value || null);
  }

  protected updateTitle(value: string): void {
    this.resetSubmitState();
    this.title.set(value || '');
  }

  protected updateSummary(value: string): void {
    this.resetSubmitState();
    this.summary.set(value || '');
  }

  protected updateQuantityValue(value: string): void {
    this.resetSubmitState();
    this.quantityValue.set(value || '');
  }

  protected updateQuantityUnit(value: string): void {
    this.resetSubmitState();
    this.quantityUnit.set((value || '') as QuantityUnit | '');
  }

  protected updateTagsInput(value: string): void {
    this.resetSubmitState();
    this.tagsInput.set(value || '');
  }

  protected clearDraft(): void {
    this.resetSubmitState();
    this.title.set('');
    this.summary.set('');
    this.quantityValue.set('');
    this.quantityUnit.set('');
    this.tagsInput.set('');
    this.originType.set(null);
    this.originId.set(null);
    this.connectionMatchId.set(null);

    if (!buildFeedDraftPrefillKey(this.queryParamMap())) {
      return;
    }

    this.appliedPrefillKey.set(null);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: buildFeedDraftPrefillClearQueryParams(),
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  focusPrimaryField(): void {
    if (typeof document === 'undefined') {
      return;
    }
    this.titleInputRef()?.nativeElement.focus();
  }

  private async submitDraft(): Promise<void> {
    if (!this.canSubmit()) {
      return;
    }

    this.submitError.set(null);
    this.errors.set([]);
    this.warnings.set([]);

    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/login'], {
        queryParams: { redirect: this.resolveInternalUrl() },
      });
      return;
    }

    if (!this.feed.connectionState.connected()) {
      this.submitState.set('offline');
      this.submitError.set('feed.error.offline');
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
    const resolvedConnectionMatchId =
      this.connectionMatchId() ??
      (await this.connectionMatcher.resolveDraftConnectionMatchId({
        type: this.type(),
        title: this.title(),
        summary: this.summary(),
        sectorId: this.sectorId(),
        fromProvinceId: this.fromProvinceId(),
        toProvinceId: this.toProvinceId(),
        mode: this.mode(),
      }));

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
      connectionMatchId: resolvedConnectionMatchId,
    };
    this.submitState.set('submitting');

    const outcome = await this.feed.publishDraft(draft);
    this.errors.set(outcome.validation.errors);
    this.warnings.set(outcome.validation.warnings);

    if (outcome.status === 'validation-error') {
      this.submitState.set('error');
      return;
    }

    if (outcome.status === 'request-error') {
      this.submitState.set('error');
      this.submitError.set(outcome.error || Og7FeedComposerComponent.SUBMIT_ERROR_FALLBACK);
      return;
    }

    this.submitState.set('success');
    this.title.set('');
    this.summary.set('');
    this.quantityValue.set('');
    this.quantityUnit.set('');
    this.tagsInput.set('');
    this.originType.set(null);
    this.originId.set(null);
    this.connectionMatchId.set(null);
    if (outcome.item) {
      this.published.emit(outcome.item);
    }
  }

  private applyDraftPrefill(query: ParamMap): void {
    const prefill = readFeedDraftPrefillQuery(query);

    const draftType = this.normalizeDraftType(prefill.draftType);
    if (draftType) {
      this.type.set(draftType);
    }

    const draftMode = this.normalizeDraftMode(prefill.draftMode);
    if (draftMode) {
      this.mode.set(draftMode);
    }

    const draftSectorId = this.normalizeQueryText(prefill.draftSectorId);
    if (draftSectorId) {
      this.sectorId.set(draftSectorId);
    }

    const draftFromProvinceId = this.normalizeQueryText(prefill.draftFromProvinceId);
    if (draftFromProvinceId) {
      this.fromProvinceId.set(draftFromProvinceId);
    }

    const draftToProvinceId = this.normalizeQueryText(prefill.draftToProvinceId);
    if (draftToProvinceId) {
      this.toProvinceId.set(draftToProvinceId);
    }

    const draftTitle = this.normalizeQueryText(prefill.draftTitle);
    if (draftTitle) {
      this.title.set(draftTitle.slice(0, 160));
    }

    const draftSummary = this.normalizeQueryText(prefill.draftSummary);
    if (draftSummary) {
      this.summary.set(draftSummary.slice(0, 5000));
    }

    const draftTags = this.normalizeDraftTags(prefill.draftTags);
    if (draftTags) {
      this.tagsInput.set(draftTags);
    }

    const draftOriginType = this.normalizeDraftOriginType(prefill.draftOriginType);
    const draftOriginId = this.normalizeQueryText(prefill.draftOriginId);
    const draftConnectionMatchId = this.normalizeDraftConnectionMatchId(prefill.draftConnectionMatchId);
    this.connectionMatchId.set(draftConnectionMatchId);
    if (draftOriginType && draftOriginId) {
      this.originType.set(draftOriginType);
      this.originId.set(draftOriginId);
      return;
    }

    const legacyAlertId = this.normalizeQueryText(prefill.draftAlertId);
    if (this.normalizeQueryText(prefill.draftSource) === 'alert' && legacyAlertId) {
      this.originType.set('alert');
      this.originId.set(legacyAlertId);
    }
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

  private normalizeDraftConnectionMatchId(value: string | null): number | null {
    const raw = this.normalizeQueryText(value);
    if (!raw) {
      return null;
    }
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private resetSubmitState(): void {
    this.submitState.set('idle');
    this.submitError.set(null);
    this.errors.set([]);
    this.warnings.set([]);
  }

  private resolveInternalUrl(): string {
    const url = this.router.url;
    if (typeof url !== 'string') {
      return '/feed';
    }

    const normalized = url.trim();
    if (!normalized) {
      return '/feed';
    }

    return normalized.startsWith('/') ? normalized : `/${normalized.replace(/^\/+/, '')}`;
  }
}
