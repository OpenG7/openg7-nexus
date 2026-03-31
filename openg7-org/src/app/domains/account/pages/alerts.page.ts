import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IndicatorAlertRuleRecord,
  IndicatorAlertRulesService,
} from '@app/core/indicator-alert-rules.service';
import {
  OpportunityOfferActivityRecord,
  OpportunityOfferRecord,
  OpportunityOffersService,
} from '@app/core/opportunity-offers.service';
import { UserAlertRecord } from '@app/core/services/user-alerts-api.service';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

@Component({
  standalone: true,
  selector: 'og7-alerts-page',
  imports: [CommonModule, TranslateModule],
  templateUrl: './alerts.page.html',
})
/**
 * Contexte : Chargee par le routeur Angular pour afficher la page des alertes utilisateur.
 * Raison d'etre : Expose l'inbox des alertes in-app et les actions de lecture/suppression.
 * @param dependencies Dependances injectees automatiquement par Angular.
 * @returns AlertsPage geree par le framework.
 */
export class AlertsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly alerts = inject(UserAlertsService);
  private readonly indicatorAlertRules = inject(IndicatorAlertRulesService);
  private readonly opportunityOffers = inject(OpportunityOffersService);
  private readonly translate = inject(TranslateService);

  protected readonly loading = this.alerts.loading;
  protected readonly generating = this.alerts.generating;
  protected readonly markAllReadPending = this.alerts.markAllReadPending;
  protected readonly clearReadPending = this.alerts.clearReadPending;
  protected readonly error = this.alerts.error;
  protected readonly entries = this.alerts.entries;
  protected readonly hasEntries = this.alerts.hasEntries;
  protected readonly unreadCount = this.alerts.unreadCount;
  protected readonly indicatorRuleEntries = this.indicatorAlertRules.entries;
  protected readonly hasIndicatorRuleEntries = this.indicatorAlertRules.hasEntries;
  protected readonly opportunityOfferEntries = this.opportunityOffers.entries;
  protected readonly hasOpportunityOfferEntries = this.opportunityOffers.hasEntries;
  protected readonly hasReadEntries = computed(() => this.entries().some((entry) => entry.isRead));
  protected readonly pendingById = this.alerts.pendingById;
  protected readonly expandedOpportunityOfferIds = signal<readonly string[]>([]);
  protected readonly highlightedOpportunityOfferId = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('offerId'))),
    {
      initialValue: this.route.snapshot.queryParamMap.get('offerId'),
    }
  );

  constructor() {
    this.alerts.refresh();
    this.indicatorAlertRules.refresh();
    this.opportunityOffers.refresh();

    effect(() => {
      const selectedOfferId = this.highlightedOpportunityOfferId();
      if (!selectedOfferId) {
        return;
      }
      this.expandedOpportunityOfferIds.set([selectedOfferId]);
    });
  }

  protected onGenerate(): void {
    this.alerts.generateFromSavedSearches();
  }

  protected onMarkAllRead(): void {
    this.alerts.markAllRead();
  }

  protected onClearRead(): void {
    this.alerts.clearRead();
  }

  protected onToggleRead(entry: UserAlertRecord): void {
    this.alerts.markRead(entry.id, !entry.isRead);
  }

  protected onDelete(id: string): void {
    this.alerts.remove(id);
  }

  protected onToggleIndicatorRule(entry: IndicatorAlertRuleRecord): void {
    this.indicatorAlertRules.setActive(entry.id, !entry.active);
  }

  protected onDeleteIndicatorRule(id: string): void {
    this.indicatorAlertRules.remove(id);
  }

  protected onOpenOpportunityOffer(entry: OpportunityOfferRecord): void {
    const route = entry.opportunityRoute;
    if (route?.startsWith('/')) {
      void this.router.navigateByUrl(route);
      return;
    }
    void this.router.navigate(['/feed', 'opportunities', entry.opportunityId]);
  }

  protected onWithdrawOpportunityOffer(id: string): void {
    this.opportunityOffers.withdraw(id);
  }

  protected onMarkOpportunityOfferInDiscussion(id: string): void {
    this.opportunityOffers.markInDiscussion(id);
  }

  protected onMarkOpportunityOfferPartiallyServed(entry: OpportunityOfferRecord): void {
    const allocatedCapacityMw = Math.min(entry.capacityMw, 200);
    const opportunityCapacityMw = this.extractOpportunityCapacityMw(entry.opportunityTitle);
    const remainingOpportunityCapacityMw =
      opportunityCapacityMw === null
        ? Math.max(0, entry.capacityMw - allocatedCapacityMw)
        : Math.max(0, opportunityCapacityMw - allocatedCapacityMw);

    this.opportunityOffers.markPartiallyServed(entry.id, {
      allocatedCapacityMw,
      remainingOpportunityCapacityMw,
    });
  }

  protected toggleOpportunityOfferDetails(id: string): void {
    this.expandedOpportunityOfferIds.update((current) => {
      if (current.includes(id)) {
        return current.filter((entryId) => entryId !== id);
      }
      return [...current, id];
    });
  }

  protected isOpportunityOfferExpanded(id: string): boolean {
    return this.expandedOpportunityOfferIds().includes(id);
  }

  protected isOpportunityOfferHighlighted(id: string): boolean {
    return this.highlightedOpportunityOfferId() === id;
  }

  protected isPending(id: string): boolean {
    return Boolean(this.pendingById()[id]);
  }

  protected alertState(entry: UserAlertRecord): 'read' | 'unread' {
    return entry.isRead ? 'read' : 'unread';
  }

  protected severityClasses(entry: UserAlertRecord): string {
    switch (entry.severity) {
      case 'critical':
        return 'border-rose-200 bg-rose-50 text-rose-700';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      default:
        return 'border-sky-200 bg-sky-50 text-sky-700';
    }
  }

  protected sourceLabel(entry: UserAlertRecord): string {
    if (entry.sourceType === 'saved-search') {
      return 'pages.alerts.sources.savedSearch';
    }
    return 'pages.alerts.sources.system';
  }

  protected indicatorRuleState(entry: IndicatorAlertRuleRecord): 'active' | 'inactive' {
    return entry.active ? 'active' : 'inactive';
  }

  protected indicatorRuleDirectionLabel(entry: IndicatorAlertRuleRecord): string {
    return this.translate.instant(`pages.alerts.rules.direction.${entry.thresholdDirection}`);
  }

  protected indicatorRuleWindowLabel(entry: IndicatorAlertRuleRecord): string {
    return this.translate.instant(`pages.alerts.rules.window.${entry.window}`);
  }

  protected indicatorRuleFrequencyLabel(entry: IndicatorAlertRuleRecord): string {
    return this.translate.instant(`pages.alerts.rules.frequency.${entry.frequency}`);
  }

  protected indicatorRuleNotifyDeltaLabel(entry: IndicatorAlertRuleRecord): string {
    return this.translate.instant(
      entry.notifyDelta ? 'pages.alerts.rules.notifyDelta.on' : 'pages.alerts.rules.notifyDelta.off'
    );
  }

  protected opportunityOfferState(entry: OpportunityOfferRecord): OpportunityOfferRecord['status'] {
    return entry.status;
  }

  protected opportunityOfferRecipientLabel(entry: OpportunityOfferRecord): string {
    return this.translate.instant(`pages.alerts.offers.recipientKinds.${entry.recipientKind}`, {
      recipient: entry.recipientLabel,
    });
  }

  protected opportunityOfferLastActivity(entry: OpportunityOfferRecord): OpportunityOfferActivityRecord | null {
    return entry.activities[0] ?? null;
  }

  protected opportunityOfferActivityCount(entry: OpportunityOfferRecord): number {
    return entry.activities.length;
  }

  protected opportunityOfferActivityActorLabel(entry: OpportunityOfferActivityRecord): string {
    return this.translate.instant(`pages.alerts.offers.activity.actors.${entry.actor}`);
  }

  protected opportunityOfferActivityTitle(entry: OpportunityOfferActivityRecord): string {
    return this.translate.instant(`pages.alerts.offers.activity.types.${entry.type}.title`);
  }

  protected opportunityOfferActivityBody(
    offer: OpportunityOfferRecord,
    activity: OpportunityOfferActivityRecord
  ): string {
    return this.translate.instant(`pages.alerts.offers.activity.types.${activity.type}.body`, {
      reference: offer.reference,
      recipient: offer.recipientLabel,
      requestedCapacityMw: offer.capacityMw,
      allocatedCapacityMw: offer.allocatedCapacityMw,
      remainingOpportunityCapacityMw: offer.remainingOpportunityCapacityMw,
    });
  }

  protected opportunityOfferAllocationSummary(entry: OpportunityOfferRecord): string | null {
    if (entry.status !== 'partiallyServed' || entry.allocatedCapacityMw === null) {
      return null;
    }

    return this.translate.instant('pages.alerts.offers.allocationSummary', {
      allocatedCapacityMw: entry.allocatedCapacityMw,
      remainingOpportunityCapacityMw: entry.remainingOpportunityCapacityMw ?? 0,
    });
  }

  private extractOpportunityCapacityMw(title: string): number | null {
    const match = title.match(/(\d+)\s*MW/i);
    if (!match) {
      return null;
    }

    const value = Number(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  protected trackById = (_: number, entry: UserAlertRecord) => entry.id;
  protected trackIndicatorRuleById = (_: number, entry: IndicatorAlertRuleRecord) => entry.id;
  protected trackOpportunityOfferById = (_: number, entry: OpportunityOfferRecord) => entry.id;
  protected trackOpportunityOfferActivityById = (_: number, entry: OpportunityOfferActivityRecord) => entry.id;
}
