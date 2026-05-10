import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '@app/core/auth/auth.service';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { BillingService, type BillingInvoice } from '@app/core/services/billing.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import type { BillingPlan } from '@openg7/contracts';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'og7-subscription-plans',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './subscription-plans.component.html',
  styleUrls: ['./subscription-plans.component.scss'],
  providers: [CurrencyPipe],
})
/**
 * Contexte : Affichée dans les vues du dossier « shared/components/billing » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Subscription Plans ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns SubscriptionPlansComponent gérée par le framework.
 */
export class SubscriptionPlansComponent {
  private readonly billing = inject(BillingService);
  private readonly auth = inject(AuthService);
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);
  private readonly currency = inject(CurrencyPipe);

  readonly plans = signal<BillingPlan[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly processingPlan = signal<string | null>(null);
  readonly invoices = signal<BillingInvoice[]>([]);
  readonly invoicesLoading = signal<boolean>(false);
  readonly invoicesError = signal<string | null>(null);
  readonly cancelling = signal<boolean>(false);

  readonly isPremium = computed(() => this.auth.isPremium());
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly currentPlanId = computed(() => this.auth.currentPlan());
  readonly hasPlans = computed(() => this.plans().length > 0);
  readonly hasInvoices = computed(() => this.invoices().length > 0);

  constructor() {
    this.loadPlans();
    if (this.auth.isAuthenticated()) {
      this.loadInvoices();
    }
  }

  async loadPlans(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const plans = await firstValueFrom(this.billing.getPlans());
      this.plans.set(plans);
    } catch (error) {
      this.error.set(this.toMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  async subscribe(plan: BillingPlan): Promise<void> {
    if (this.isCurrentPlan(plan) || !plan.available) {
      return;
    }
    if (plan.tier === 'free') {
      this.notifications.info(this.translate.instant('pricing.plans.freeActive'), {
        source: 'billing',
        metadata: { planId: plan.id },
      });
      return;
    }

    this.processingPlan.set(plan.id);
    try {
      const result = await this.billing.startCheckout(plan.id);
      if (result.provider === 'internal') {
        this.notifications.info(this.translate.instant('pricing.plans.internalHandled'), {
          source: 'billing',
          metadata: { planId: plan.id },
        });
      }
    } catch (error) {
      const message =
        this.toMessage(error) ?? this.translate.instant('pricing.plans.checkoutError');
      this.notifications.error(message, {
        source: 'billing',
        context: error,
        metadata: { planId: plan.id },
        deliver: { email: true },
      });
    } finally {
      this.processingPlan.set(null);
    }
  }

  async loadInvoices(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      this.invoices.set([]);
      return;
    }
    this.invoicesLoading.set(true);
    this.invoicesError.set(null);
    try {
      const list = await firstValueFrom(this.billing.getInvoices({ limit: 50 }));
      this.invoices.set(list);
    } catch (error) {
      this.invoicesError.set(this.toMessage(error));
    } finally {
      this.invoicesLoading.set(false);
    }
  }

  async cancelSubscription(): Promise<void> {
    if (!this.auth.isPremium()) {
      return;
    }
    this.cancelling.set(true);
    try {
      await this.billing.cancelSubscription();
      await firstValueFrom(this.auth.getProfile());
      await this.loadInvoices();
      this.notifications.success(this.translate.instant('pricing.plans.cancelled'), {
        source: 'billing',
        metadata: { action: 'cancel-subscription' },
      });
    } catch (error) {
      const message = this.toMessage(error) ?? this.translate.instant('pricing.plans.cancelError');
      this.notifications.error(message, {
        source: 'billing',
        context: error,
        metadata: { action: 'cancel-subscription' },
      });
    } finally {
      this.cancelling.set(false);
    }
  }

  invoiceAmount(invoice: BillingInvoice): string {
    const amount = invoice.amountPaid > 0 ? invoice.amountPaid : invoice.amountDue;
    const value = amount / 100;
    return (
      this.currency.transform(value, invoice.currency, 'symbol-narrow', '1.0-2') ??
      `${value.toFixed(2)} ${invoice.currency}`
    );
  }

  invoiceStatus(invoice: BillingInvoice): string {
    return this.translate.instant(`pricing.invoices.status.${invoice.status ?? 'unknown'}`);
  }

  isCurrentPlan(plan: BillingPlan): boolean {
    const current = this.currentPlanId();
    if (current) {
      return current === plan.id;
    }
    return !this.isPremium() && plan.tier === 'free';
  }

  planTitle(plan: BillingPlan): string {
    return `${plan.i18nKey}.title`;
  }

  planDescription(plan: BillingPlan): string {
    return `${plan.i18nKey}.description`;
  }

  planPrice(plan: BillingPlan): string {
    if (plan.price.amount === 0) {
      return this.translate.instant('pricing.plans.price.free');
    }
    const amount = plan.price.amount / 100;
    return (
      this.currency.transform(amount, plan.price.currency, 'symbol-narrow', '1.0-0') ??
      `${amount.toFixed(0)} ${plan.price.currency}`
    );
  }

  planInterval(plan: BillingPlan): string {
    return this.translate.instant(`pricing.plans.price.interval.${plan.price.interval}`);
  }

  private toMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return this.translateIfPossible(error.message);
    }
    if (typeof error === 'string' && error.trim()) {
      return this.translateIfPossible(error);
    }
    if (error && typeof error === 'object') {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) {
        return this.translateIfPossible(message);
      }
    }
    return this.translate.instant('pricing.plans.error');
  }

  private translateIfPossible(message: string): string {
    const trimmed = message.trim();
    if (!trimmed) {
      return this.translate.instant('pricing.plans.error');
    }
    const translated = this.translate.instant(trimmed);
    return translated === trimmed ? trimmed : translated;
  }
}
