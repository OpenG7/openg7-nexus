import { CreateOpportunityOfferPayload } from '@app/core/opportunity-offers.service';
import { TranslateService } from '@ngx-translate/core';

import { OpportunityOfferPayload } from './components/opportunity-detail.models';
import { FeedComposerDraft, FeedItem, FeedPublishOutcome } from './models/feed.models';

export interface OpportunityOfferDraftSource {
  readonly title: string;
  readonly sectorId: string | null;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly mode: FeedItem['mode'];
  readonly tags?: readonly string[];
}

export interface OpportunityOfferRecordSource extends OpportunityOfferDraftSource {
  readonly id: string;
  readonly source: FeedItem['source'];
}

export function buildOpportunityOfferDraft(
  source: OpportunityOfferDraftSource,
  payload: OpportunityOfferPayload,
  sectorFallback: string | null,
  translate: Pick<TranslateService, 'instant'>
): FeedComposerDraft {
  const titlePrefix = translate.instant('feed.opportunity.detail.offer.generatedTitlePrefix');
  const title = `${titlePrefix}: ${source.title}`.slice(0, 160);
  const summaryLines = [
    `${translate.instant('feed.opportunity.detail.offer.capacity')}: ${payload.capacityMw} MW`,
    `${translate.instant('feed.opportunity.detail.offer.start')}: ${payload.startDate}`,
    `${translate.instant('feed.opportunity.detail.offer.end')}: ${payload.endDate}`,
    `${translate.instant('feed.opportunity.detail.offer.pricing')}: ${payload.pricingModel}`,
    `${translate.instant('feed.opportunity.detail.offer.comment')}: ${payload.comment}`,
    payload.attachmentName
      ? `${translate.instant('feed.opportunity.detail.offer.attachment')}: ${payload.attachmentName}`
      : null,
  ].filter((line): line is string => Boolean(line));
  const tags = new Set<string>(['offer', 'opportunity', ...(source.tags ?? [])]);

  return {
    type: 'OFFER',
    title,
    summary: summaryLines.join(' | ').slice(0, 5000),
    sectorId: source.sectorId ?? sectorFallback,
    fromProvinceId: source.fromProvinceId ?? null,
    toProvinceId: source.toProvinceId ?? null,
    mode: source.mode ?? 'BOTH',
    quantity: {
      value: payload.capacityMw,
      unit: 'MW',
    },
    tags: Array.from(tags).slice(0, 8),
  };
}

export function buildOpportunityOfferRecordPayload(
  source: OpportunityOfferRecordSource,
  route: string,
  payload: OpportunityOfferPayload
): CreateOpportunityOfferPayload {
  return {
    opportunityId: source.id,
    opportunityTitle: source.title,
    opportunityRoute: route,
    recipientKind: source.source.kind,
    recipientLabel: source.source.label,
    capacityMw: payload.capacityMw,
    startDate: payload.startDate,
    endDate: payload.endDate,
    pricingModel: payload.pricingModel,
    comment: payload.comment,
    attachmentName: payload.attachmentName,
  };
}

export function resolveOpportunityOfferSubmitErrorMessage(
  outcome: FeedPublishOutcome,
  translate: Pick<TranslateService, 'instant'>
): string | null {
  if (outcome.status === 'success') {
    return null;
  }

  if (outcome.status === 'validation-error') {
    const [firstError] = outcome.validation.errors;
    if (!firstError) {
      return translate.instant('feed.error.generic');
    }
    const translated = translate.instant(firstError);
    return translated === firstError ? translate.instant('feed.error.generic') : translated;
  }

  return outcome.error ?? translate.instant('feed.error.generic');
}
