import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  CompanyProfile,
  TradeScope,
} from '@app/company-registration-form/models/registration.model';
import { injectNotificationStore } from '@app/core/observability/notification.store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
//import { CompanyProfile, TradeScope } from '@app/registration/models/registration.model';
//import { CompanyRegistrationFormComponent } from '@app/registration/components/company-registration-form/company-registration-form.component';

function isTradeScope(value: string | null | undefined): value is TradeScope {
  return value === 'canada' || value === 'international' || value === 'both';
}

@Component({
  standalone: true,
  selector: 'og7-account-open-page',
  imports: [CommonModule, TranslateModule],
  templateUrl: './account-open.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Account Open » du dossier « domains/auth/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns AccountOpenPage gérée par le framework.
 */
export class AccountOpenPage {
  private readonly notifications = injectNotificationStore();
  private readonly translate = inject(TranslateService);
  private readonly route = inject(ActivatedRoute);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  protected readonly initialCountry = signal<string>('CA');
  protected readonly initialScope = signal<TradeScope>('canada');

  constructor() {
    effect(() => {
      const params = this.queryParams();
      if (!params) {
        return;
      }

      const origin = params.get('origin');
      const scopeParam = params.get('scope');
      const countryParam = params.get('country');

      if (scopeParam && isTradeScope(scopeParam)) {
        this.initialScope.set(scopeParam);
      } else if (origin === 'international') {
        this.initialScope.set('international');
      } else if (origin === 'both') {
        this.initialScope.set('both');
      } else {
        this.initialScope.set('canada');
      }

      const normalizedCountry = countryParam?.toUpperCase();
      if (normalizedCountry && normalizedCountry.length === 2) {
        this.initialCountry.set(normalizedCountry);
      } else if (origin === 'international') {
        this.initialCountry.set('FR');
      } else {
        this.initialCountry.set('CA');
      }
    });
  }

  protected handleSubmit(profile: CompanyProfile): void {
    const message = this.translate.instant('registration.toast.success');
    this.notifications.success(message, {
      source: 'registration',
      metadata: {
        tradeScope: profile.tradeScope,
        country: profile.headquarterCountry,
      },
    });
  }
}
