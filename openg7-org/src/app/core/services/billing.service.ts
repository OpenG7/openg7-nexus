import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { firstValueFrom, from, map } from 'rxjs';

import { StrapiClient } from '../api/strapi-client';
import { HttpClientService } from '../http/http-client.service';

interface StripeCheckoutResponse {
  provider: 'stripe';
  sessionId: string;
  publishableKey: string;
}

interface PaypalCheckoutResponse {
  provider: 'paypal';
  approvalUrl: string;
  planId: string;
  subscriptionId?: string | null;
}

interface InternalCheckoutResponse {
  provider: 'internal';
  message: string;
}

type CheckoutResponse = StripeCheckoutResponse | PaypalCheckoutResponse | InternalCheckoutResponse;

export interface BillingInvoiceLine {
  id: string;
  description: string;
  amount: number;
  currency: string;
  quantity: number | null;
}

export interface BillingInvoice {
  id: string;
  provider: 'stripe' | 'paypal' | 'internal';
  status: string;
  amountDue: number;
  amountPaid: number;
  currency: string;
  createdAt: string;
  hostedInvoiceUrl?: string | null;
  invoicePdf?: string | null;
  lines: BillingInvoiceLine[];
}

export interface BillingRefund {
  id: string;
  provider: 'stripe' | 'paypal';
  status: string;
  amount: number;
  currency: string;
  reason?: string | null;
  createdAt: string;
}

export type CheckoutResult =
  | { provider: 'stripe'; status: 'redirected' }
  | { provider: 'paypal'; status: 'redirected'; approvalUrl: string }
  | { provider: 'internal'; status: 'handled'; message: string };

@Injectable({ providedIn: 'root' })
/**
 * Contexte : Injecté via Angular DI par les autres briques du dossier « core/services ».
 * Raison d’être : Centralise la logique métier et les appels nécessaires autour de « Billing ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns BillingService gérée par le framework.
 */
export class BillingService {
  private readonly http = inject(HttpClientService);
  private readonly strapiClient = inject(StrapiClient);
  private stripe: Promise<Stripe | null> | null = null;
  private currentStripeKey: string | null = null;
  private readonly stripePromises = new Map<string, Promise<Stripe | null>>();

  /**
   * Contexte : Called by billing settings pages to display purchasable plans.
   * Raison d’être : Delegates the fetch to {@link StrapiClient} and unwraps the data array.
   * @returns Observable emitting the list of billing plans.
   */
  getPlans() {
    return from(this.strapiClient.billingPlans()).pipe(map((response) => response.data ?? []));
  }

  /**
   * Contexte : Triggered when a user begins the checkout process for a subscription.
   * Raison d’être : Requests a checkout session from the backend and routes the user to the appropriate provider.
   * @param planId Identifier of the plan to purchase.
   * @param options Optional success/cancel URLs overriding backend defaults.
   * @returns Promise describing the action taken (redirected or handled internally).
   */
  async startCheckout(
    planId: string,
    options?: { successUrl?: string; cancelUrl?: string }
  ): Promise<CheckoutResult> {
    const payload = await firstValueFrom(
      this.http.post<CheckoutResponse>('/billing/checkout', {
        planId,
        successUrl: options?.successUrl,
        cancelUrl: options?.cancelUrl,
      })
    ).catch((error: unknown) => {
      throw this.toCheckoutError(error);
    });

    switch (payload.provider) {
      case 'stripe': {
        const stripe = await this.ensureStripe(payload.publishableKey);
        const result = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
        if (result.error) {
          throw new Error(result.error.message ?? 'stripe.redirect_failed');
        }
        return { provider: 'stripe', status: 'redirected' };
      }
      case 'paypal': {
        if (!payload.approvalUrl) {
          throw new Error('paypal.approval_url_missing');
        }
        if (typeof window === 'undefined') {
          throw new Error('paypal.browser_required');
        }
        window.location.assign(payload.approvalUrl);
        return { provider: 'paypal', status: 'redirected', approvalUrl: payload.approvalUrl };
      }
      default:
        return { provider: payload.provider, status: 'handled', message: payload.message };
    }
  }

  /**
   * Contexte : Used by billing history views to fetch recent invoices.
   * Raison d’être : Calls the backend invoice endpoint and maps to the data payload.
   * @param options Optional limit for the number of invoices to retrieve.
   * @returns Observable emitting the retrieved invoices.
   */
  getInvoices(options?: { limit?: number }) {
    const params: Record<string, string> = {};
    if (options?.limit && Number.isFinite(options.limit)) {
      params['limit'] = String(options.limit);
    }
    return this.http
      .get<{ data: BillingInvoice[]; meta?: unknown }>('/billing/invoices', { params })
      .pipe(map((response) => response.data ?? []));
  }

  /**
   * Contexte : Called when a user inspects a specific invoice.
   * Raison d’être : Retrieves a single invoice record by its identifier.
   * @param id Invoice identifier from the billing backend.
   * @returns Observable emitting the invoice detail.
   */
  getInvoice(id: string) {
    return this.http.get<{ data: BillingInvoice }>(`/billing/invoices/${id}`).pipe(map((response) => response.data));
  }

  /**
   * Contexte : Used by support tooling to request refunds for a given invoice.
   * Raison d’être : Calls the refund endpoint and normalises errors into standard Error instances.
   * @param invoiceId Identifier of the invoice to refund.
   * @param payload Optional refund parameters such as amount or reason.
   * @returns Promise resolving with the created refund record.
   */
  async requestRefund(invoiceId: string, payload?: { amount?: number; reason?: string }): Promise<BillingRefund> {
    return firstValueFrom(
      this.http.post<{ data: BillingRefund }>(`/billing/invoices/${invoiceId}/refund`, payload ?? {})
    )
      .then((response) => response.data)
      .catch((error: unknown) => {
        throw this.toCheckoutError(error);
      });
  }

  /**
   * Contexte : Called by billing management pages to terminate the active subscription.
   * Raison d’être : Delegates to the backend cancellation endpoint while normalising failures.
   * @returns Promise resolved when the cancellation request completes.
   */
  async cancelSubscription(): Promise<void> {
    await firstValueFrom(this.http.post<{ cancelled: boolean }>('/billing/cancel', {})).catch((error: unknown) => {
      throw this.toCheckoutError(error);
    });
  }

  private async ensureStripe(publishableKey: string): Promise<Stripe> {
    if (!publishableKey) {
      throw new Error('stripe.publishable_key_missing');
    }
    if (this.currentStripeKey !== publishableKey) {
      this.currentStripeKey = publishableKey;
      this.stripe = null;
    }

    if (!this.stripe) {
      let promise = this.stripePromises.get(publishableKey) ?? null;
      if (!promise) {
        promise = this.loadStripeClient(publishableKey);
        this.stripePromises.set(publishableKey, promise);
      }
      this.stripe = promise;
    }
    const stripe = await this.stripe;
    if (!stripe) {
      this.stripePromises.delete(publishableKey);
      this.stripe = null;
      throw new Error('stripe.not_available');
    }
    return stripe;
  }

  private loadStripeClient(publishableKey: string): Promise<Stripe | null> {
    return loadStripe(publishableKey);
  }

  private toCheckoutError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }
    if (error instanceof HttpErrorResponse) {
      const message = typeof error.error === 'string' && error.error.trim()
        ? error.error
        : error.message;
      return new Error(message);
    }
    if (typeof error === 'string') {
      return new Error(error);
    }
    return new Error('billing.checkout_failed');
  }
}

