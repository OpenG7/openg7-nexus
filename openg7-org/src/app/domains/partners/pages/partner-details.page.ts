import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { createPartnerSelection } from '@app/core/models/partner-selection';
import { PartnerDetailsPanelComponent } from '@app/shared/components/partner/partner-details-panel.component';
import { distinctUntilChanged, map } from 'rxjs';

type PartnerRole = 'buyer' | 'supplier';

@Component({
  standalone: true,
  selector: 'og7-partner-details-page',
  imports: [CommonModule, RouterModule, PartnerDetailsPanelComponent],
  templateUrl: './partner-details.page.html',
  styleUrls: ['./partner-details.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Chargée par le routeur Angular pour afficher la page « Partner Details » du dossier « domains/partners/pages ».
 * Raison d’être : Lie le template standalone et les dépendances de cette page pour la rendre navigable.
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns PartnerDetailsPage gérée par le framework.
 */
export class PartnerDetailsPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly routeId = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('id')),
      distinctUntilChanged(),
    ),
    { initialValue: this.route.snapshot.paramMap.get('id') },
  );

  private readonly routeRole = toSignal(
    this.route.queryParamMap.pipe(
      map((params) => this.normalizeRole(params.get('role'))),
      distinctUntilChanged(),
    ),
    { initialValue: this.normalizeRole(this.route.snapshot.queryParamMap.get('role')) },
  );

  protected readonly partnerSelection = computed(() => {
    const id = this.routeId();
    if (!id) {
      return null;
    }
    return createPartnerSelection(this.routeRole(), id);
  });

  constructor() {
    effect(() => {
      if (!this.partnerSelection()) {
        void this.router.navigate(['/']);
      }
    });
  }

  protected handleClose(): void {
    void this.router.navigate(['/']);
  }

  private normalizeRole(role: string | null): PartnerRole {
    return role === 'buyer' ? 'buyer' : 'supplier';
  }
}
