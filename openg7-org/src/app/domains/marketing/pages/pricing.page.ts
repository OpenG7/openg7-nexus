import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@app/core/auth/auth.service';
import { SubscriptionPlansComponent } from '@app/shared/components/billing/subscription-plans.component';
import { TranslateModule } from '@ngx-translate/core';

type BillingCycle = 'monthly' | 'yearly';

type PlanPriceType = 'free' | 'fixed' | 'custom';

type PlanAction = 'router' | 'external' | 'mailto';

interface PlanCta {
  action: PlanAction;
  target: string;
  labelKey: string;
  hintKey?: string;
  queryParams?: Record<string, string>;
  includeCycleParam?: string;
  openInNewTab?: boolean;
}

interface MarketingPlan {
  key: 'explorer' | 'analyst' | 'enterprise';
  featured?: boolean;
  badgeKey?: string;
  highlightKey?: string;
  descriptionKey: string;
  priceType: PlanPriceType;
  currency?: string;
  monthlyPrice?: number;
  yearlyPrice?: number;
  savingsKey?: string;
  features: string[];
  footnoteKey?: string;
  cta: PlanCta;
}

interface FeatureRow {
  labelKey: string;
  descriptionKey?: string;
  values: {
    explorer: string;
    analyst: string;
    enterprise: string;
  };
}

interface FeatureGroup {
  titleKey: string;
  rows: FeatureRow[];
}

interface PricingAddon {
  key: 'api' | 'support' | 'analytics';
  badgeKey?: string;
  titleKey: string;
  descriptionKey: string;
  amount?: number;
  currency?: string;
  unitKey: string;
  frequencyKey?: string;
}

interface PricingTestimonial {
  quoteKey: string;
  authorKey: string;
  roleKey: string;
  organisationKey: string;
}

interface PricingFaqItem {
  anchor: string;
  questionKey: string;
  answerKey: string;
}

interface ComplianceBadge {
  code: string;
  labelKey: string;
  descriptionKey: string;
}

@Component({
  standalone: true,
  selector: 'og7-pricing-page',
  imports: [CommonModule, TranslateModule, RouterModule, SubscriptionPlansComponent],
  templateUrl: './pricing.page.html',
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Pricing » du dossier « domains/marketing/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PricingPage gérée par le framework.
 */
export class PricingPage {
  private readonly auth = inject(AuthService);

  protected readonly billingCycle = signal<BillingCycle>('monthly');

  protected readonly plans: MarketingPlan[] = [
    {
      key: 'explorer',
      badgeKey: 'pages.pricing.planCards.explorer.badge',
      highlightKey: 'pages.pricing.planCards.explorer.highlight',
      descriptionKey: 'pages.pricing.planCards.explorer.description',
      priceType: 'free',
      features: [
        'pages.pricing.planCards.explorer.features.directory',
        'pages.pricing.planCards.explorer.features.watchlists',
        'pages.pricing.planCards.explorer.features.collaboration',
      ],
      footnoteKey: 'pages.pricing.planCards.explorer.footnote',
      cta: {
        action: 'router',
        target: '/register',
        labelKey: 'pages.pricing.planCards.explorer.cta',
        hintKey: 'pages.pricing.planCards.explorer.ctaHint',
        queryParams: { plan: 'explorer' },
      },
    },
    {
      key: 'analyst',
      featured: true,
      badgeKey: 'pages.pricing.planCards.analyst.badge',
      highlightKey: 'pages.pricing.planCards.analyst.highlight',
      descriptionKey: 'pages.pricing.planCards.analyst.description',
      priceType: 'fixed',
      currency: 'CAD',
      monthlyPrice: 129,
      yearlyPrice: 1290,
      savingsKey: 'pages.pricing.planCards.analyst.savings',
      features: [
        'pages.pricing.planCards.analyst.features.analytics',
        'pages.pricing.planCards.analyst.features.visibility',
        'pages.pricing.planCards.analyst.features.success',
      ],
      footnoteKey: 'pages.pricing.planCards.analyst.footnote',
      cta: {
        action: 'router',
        target: '/checkout',
        labelKey: 'pages.pricing.planCards.analyst.cta',
        hintKey: 'pages.pricing.planCards.analyst.ctaHint',
        queryParams: { plan: 'analyst' },
        includeCycleParam: 'cycle',
      },
    },
    {
      key: 'enterprise',
      badgeKey: 'pages.pricing.planCards.enterprise.badge',
      highlightKey: 'pages.pricing.planCards.enterprise.highlight',
      descriptionKey: 'pages.pricing.planCards.enterprise.description',
      priceType: 'custom',
      features: [
        'pages.pricing.planCards.enterprise.features.workshops',
        'pages.pricing.planCards.enterprise.features.integrations',
        'pages.pricing.planCards.enterprise.features.assurance',
      ],
      footnoteKey: 'pages.pricing.planCards.enterprise.footnote',
      cta: {
        action: 'mailto',
        target: 'partnerships@openg7.org',
        labelKey: 'pages.pricing.planCards.enterprise.cta',
        hintKey: 'pages.pricing.planCards.enterprise.ctaHint',
      },
    },
  ];

  protected readonly featureGroups: FeatureGroup[] = [
    {
      titleKey: 'pages.pricing.matrix.groups.data',
      rows: [
        {
          labelKey: 'pages.pricing.matrix.rows.visibility.label',
          descriptionKey: 'pages.pricing.matrix.rows.visibility.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.visibility.explorer',
            analyst: 'pages.pricing.matrix.rows.visibility.analyst',
            enterprise: 'pages.pricing.matrix.rows.visibility.enterprise',
          },
        },
        {
          labelKey: 'pages.pricing.matrix.rows.analytics.label',
          descriptionKey: 'pages.pricing.matrix.rows.analytics.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.analytics.explorer',
            analyst: 'pages.pricing.matrix.rows.analytics.analyst',
            enterprise: 'pages.pricing.matrix.rows.analytics.enterprise',
          },
        },
        {
          labelKey: 'pages.pricing.matrix.rows.dataExports.label',
          descriptionKey: 'pages.pricing.matrix.rows.dataExports.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.dataExports.explorer',
            analyst: 'pages.pricing.matrix.rows.dataExports.analyst',
            enterprise: 'pages.pricing.matrix.rows.dataExports.enterprise',
          },
        },
      ],
    },
    {
      titleKey: 'pages.pricing.matrix.groups.collaboration',
      rows: [
        {
          labelKey: 'pages.pricing.matrix.rows.teamSeats.label',
          descriptionKey: 'pages.pricing.matrix.rows.teamSeats.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.teamSeats.explorer',
            analyst: 'pages.pricing.matrix.rows.teamSeats.analyst',
            enterprise: 'pages.pricing.matrix.rows.teamSeats.enterprise',
          },
        },
        {
          labelKey: 'pages.pricing.matrix.rows.introductions.label',
          descriptionKey: 'pages.pricing.matrix.rows.introductions.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.introductions.explorer',
            analyst: 'pages.pricing.matrix.rows.introductions.analyst',
            enterprise: 'pages.pricing.matrix.rows.introductions.enterprise',
          },
        },
      ],
    },
    {
      titleKey: 'pages.pricing.matrix.groups.support',
      rows: [
        {
          labelKey: 'pages.pricing.matrix.rows.support.label',
          descriptionKey: 'pages.pricing.matrix.rows.support.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.support.explorer',
            analyst: 'pages.pricing.matrix.rows.support.analyst',
            enterprise: 'pages.pricing.matrix.rows.support.enterprise',
          },
        },
        {
          labelKey: 'pages.pricing.matrix.rows.compliance.label',
          descriptionKey: 'pages.pricing.matrix.rows.compliance.description',
          values: {
            explorer: 'pages.pricing.matrix.rows.compliance.explorer',
            analyst: 'pages.pricing.matrix.rows.compliance.analyst',
            enterprise: 'pages.pricing.matrix.rows.compliance.enterprise',
          },
        },
      ],
    },
  ];

  protected readonly addons: PricingAddon[] = [
    {
      key: 'api',
      badgeKey: 'pages.pricing.addons.api.badge',
      titleKey: 'pages.pricing.addons.api.title',
      descriptionKey: 'pages.pricing.addons.api.description',
      amount: 250,
      currency: 'CAD',
      unitKey: 'pages.pricing.addons.api.unit',
      frequencyKey: 'pages.pricing.addons.api.frequency',
    },
    {
      key: 'support',
      titleKey: 'pages.pricing.addons.support.title',
      descriptionKey: 'pages.pricing.addons.support.description',
      amount: 600,
      currency: 'CAD',
      unitKey: 'pages.pricing.addons.support.unit',
      frequencyKey: 'pages.pricing.addons.support.frequency',
    },
    {
      key: 'analytics',
      titleKey: 'pages.pricing.addons.analytics.title',
      descriptionKey: 'pages.pricing.addons.analytics.description',
      amount: 180,
      currency: 'CAD',
      unitKey: 'pages.pricing.addons.analytics.unit',
    },
  ];

  protected readonly testimonials: PricingTestimonial[] = [
    {
      quoteKey: 'pages.pricing.testimonials.quebec.quote',
      authorKey: 'pages.pricing.testimonials.quebec.author',
      roleKey: 'pages.pricing.testimonials.quebec.role',
      organisationKey: 'pages.pricing.testimonials.quebec.organisation',
    },
    {
      quoteKey: 'pages.pricing.testimonials.saskatchewan.quote',
      authorKey: 'pages.pricing.testimonials.saskatchewan.author',
      roleKey: 'pages.pricing.testimonials.saskatchewan.role',
      organisationKey: 'pages.pricing.testimonials.saskatchewan.organisation',
    },
    {
      quoteKey: 'pages.pricing.testimonials.bc.quote',
      authorKey: 'pages.pricing.testimonials.bc.author',
      roleKey: 'pages.pricing.testimonials.bc.role',
      organisationKey: 'pages.pricing.testimonials.bc.organisation',
    },
  ];

  protected readonly faqs: PricingFaqItem[] = [
    {
      anchor: 'data-security',
      questionKey: 'pages.pricing.faq.security.question',
      answerKey: 'pages.pricing.faq.security.answer',
    },
    {
      anchor: 'procurement',
      questionKey: 'pages.pricing.faq.procurement.question',
      answerKey: 'pages.pricing.faq.procurement.answer',
    },
    {
      anchor: 'billing',
      questionKey: 'pages.pricing.faq.billing.question',
      answerKey: 'pages.pricing.faq.billing.answer',
    },
    {
      anchor: 'rollout',
      questionKey: 'pages.pricing.faq.rollout.question',
      answerKey: 'pages.pricing.faq.rollout.answer',
    },
  ];

  protected readonly complianceBadges: ComplianceBadge[] = [
    {
      code: 'SOC2',
      labelKey: 'pages.pricing.compliance.soc2.label',
      descriptionKey: 'pages.pricing.compliance.soc2.description',
    },
    {
      code: 'ISO27001',
      labelKey: 'pages.pricing.compliance.iso.label',
      descriptionKey: 'pages.pricing.compliance.iso.description',
    },
    {
      code: 'PIPEDA',
      labelKey: 'pages.pricing.compliance.pipeda.label',
      descriptionKey: 'pages.pricing.compliance.pipeda.description',
    },
  ];

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly currentPlanId = this.auth.currentPlanId;
  protected readonly currentMarketingPlan = computed<MarketingPlan['key'] | null>(() =>
    this.resolveCurrentMarketingPlan(
      this.currentPlanId(),
      this.auth.isPremium(),
      this.isAuthenticated(),
    ),
  );
  protected readonly recommendedPlan = computed<MarketingPlan | null>(() => {
    const current = this.currentMarketingPlan();
    if (!current) {
      return this.plans.find((plan) => plan.featured) ?? this.plans[0] ?? null;
    }
    if (current === 'explorer') {
      return this.findPlan('analyst');
    }
    if (current === 'analyst') {
      return this.findPlan('enterprise');
    }
    return null;
  });

  protected setBillingCycle(cycle: BillingCycle): void {
    this.billingCycle.set(cycle);
  }

  protected isActiveCycle(cycle: BillingCycle): boolean {
    return this.billingCycle() === cycle;
  }

  protected displayedPrice(plan: MarketingPlan): number | null {
    if (plan.priceType !== 'fixed') {
      return null;
    }
    return this.billingCycle() === 'monthly'
      ? (plan.monthlyPrice ?? null)
      : (plan.yearlyPrice ?? null);
  }

  protected displayedIntervalKey(): string {
    return `pages.pricing.planCards.interval.${this.billingCycle()}`;
  }

  protected yearlyMonthlyEquivalent(plan: MarketingPlan): number | null {
    if (plan.priceType !== 'fixed' || !plan.yearlyPrice) {
      return null;
    }
    return plan.yearlyPrice / 12;
  }

  protected priceLabelKey(plan: MarketingPlan): string | null {
    if (plan.priceType === 'free') {
      return 'pages.pricing.planCards.freeLabel';
    }
    if (plan.priceType === 'custom') {
      return 'pages.pricing.planCards.customLabel';
    }
    return null;
  }

  protected ctaHref(cta: PlanCta): string | null {
    if (cta.action === 'mailto') {
      return `mailto:${cta.target}`;
    }
    if (cta.action === 'external') {
      return cta.target;
    }
    return null;
  }

  protected ctaQueryParams(plan: MarketingPlan): Record<string, string> | null {
    if (plan.cta.action !== 'router') {
      return null;
    }
    const params = plan.cta.queryParams ? { ...plan.cta.queryParams } : {};
    if (plan.cta.includeCycleParam) {
      params[plan.cta.includeCycleParam] = this.billingCycle();
    }
    return Object.keys(params).length > 0 ? params : null;
  }

  protected isCurrentPlan(plan: MarketingPlan): boolean {
    const current = this.currentMarketingPlan();
    return Boolean(current && current === plan.key);
  }

  protected isRecommendedPlan(plan: MarketingPlan): boolean {
    const recommended = this.recommendedPlan();
    return Boolean(recommended && recommended.key === plan.key && !this.isCurrentPlan(plan));
  }

  private findPlan(key: MarketingPlan['key']): MarketingPlan | null {
    return this.plans.find((plan) => plan.key === key) ?? null;
  }

  private resolveCurrentMarketingPlan(
    currentPlanId: string | null,
    isPremium: boolean,
    isAuthenticated: boolean,
  ): MarketingPlan['key'] | null {
    if (!isAuthenticated) {
      return null;
    }

    const normalized = (currentPlanId ?? '').trim().toLowerCase();
    if (!normalized) {
      return isPremium ? 'analyst' : 'explorer';
    }

    if (
      normalized.includes('enterprise') ||
      normalized.includes('business') ||
      normalized.includes('team')
    ) {
      return 'enterprise';
    }
    if (
      normalized.includes('analyst') ||
      normalized.includes('premium') ||
      normalized.includes('pro')
    ) {
      return 'analyst';
    }
    if (
      normalized.includes('explorer') ||
      normalized.includes('free') ||
      normalized.includes('starter')
    ) {
      return 'explorer';
    }

    return isPremium ? 'analyst' : 'explorer';
  }
}
