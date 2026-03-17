import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import {
  IndicatorAlertRuleRecord,
  IndicatorAlertRulesService,
} from '@app/core/indicator-alert-rules.service';
import { UserAlertRecord } from '@app/core/services/user-alerts-api.service';
import { UserAlertsService } from '@app/core/user-alerts.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

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
  private readonly alerts = inject(UserAlertsService);
  private readonly indicatorAlertRules = inject(IndicatorAlertRulesService);
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
  protected readonly hasReadEntries = computed(() => this.entries().some((entry) => entry.isRead));
  protected readonly pendingById = this.alerts.pendingById;

  constructor() {
    this.alerts.refresh();
    this.indicatorAlertRules.refresh();
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

  protected trackById = (_: number, entry: UserAlertRecord) => entry.id;
  protected trackIndicatorRuleById = (_: number, entry: IndicatorAlertRuleRecord) => entry.id;
}
