import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Signal,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ConnectionDraft } from '@app/core/models/connection';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { FinancingBanner, PartnerProfile } from '@app/core/models/partner-profile';
import { parsePartnerSelection } from '@app/core/models/partner-selection';
import { PartnerQuickActionsComponent } from '@app/domains/partners/partners/ui/partner-quick-actions.component';
import { PartnerDetailsPanelComponent } from '@app/shared/components/partner/partner-details-panel.component';

import { Og7IntroBillboardContentComponent } from './og7-intro-billboard-content.component';

export interface IntroductionRequestContext {
  readonly profile: PartnerProfile;
  readonly match: OpportunityMatch | null;
}

@Component({
  selector: 'og7-intro-billboard-section',
  standalone: true,
  imports: [CommonModule, PartnerDetailsPanelComponent, PartnerQuickActionsComponent],
  templateUrl: './og7-intro-billboard.view.html',
  styleUrls: ['./og7-intro-billboard.view.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Contexte : Affichée dans les vues du dossier « domains/matchmaking/sections » en tant que composant Angular standalone.
 * Raison d’être : Encapsule l'interface utilisateur et la logique propre à « Og7 Intro Billboard ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns Og7IntroBillboardSection gérée par le framework.
 */
export class Og7IntroBillboardSection {
  readonly matchSelected = input<OpportunityMatch | null>(null);
  readonly selectedPartnerId = input<Signal<string | null> | null>(null);
  readonly financingBanner = input<FinancingBanner | null>(null);
  readonly forcePanelOpen = input(false);

  readonly panelClosed = output<void>();
  readonly introductionSubmitted = output<ConnectionDraft>();
  readonly introductionRequested = output<IntroductionRequestContext>();

  private readonly contentRef = viewChild(Og7IntroBillboardContentComponent);

  protected get partnerSelectionSignal(): Signal<string | null> | null {
    return this.selectedPartnerId();
  }

  protected partnerId(): string | null {
    const selection = this.selectedPartnerId();
    const raw = selection ? selection() : null;
    if (!raw) {
      const match = this.matchSelected();
      const fallback = match?.seller?.id ?? match?.buyer?.id ?? null;
      return fallback != null ? String(fallback) : null;
    }
    const parsed = parsePartnerSelection(raw);
    return parsed ? parsed.id : raw;
  }

  protected partnerName(): string | null {
    const match = this.matchSelected();
    const selection = this.selectedPartnerId();
    const raw = selection ? selection() : null;
    const parsed = parsePartnerSelection(raw);

    if (parsed?.role === 'buyer') {
      return match?.buyer?.name ?? null;
    }

    if (parsed?.role === 'supplier') {
      return match?.seller?.name ?? null;
    }

    if (raw) {
      if (match?.seller?.id != null && String(match.seller.id) === raw) {
        return match.seller.name ?? null;
      }
      if (match?.buyer?.id != null && String(match.buyer.id) === raw) {
        return match.buyer.name ?? null;
      }
    }

    return match?.seller?.name ?? match?.buyer?.name ?? null;
  }

  protected handlePanelClosed(): void {
    this.panelClosed.emit();
  }

  protected handleIntroductionRequested(profile: PartnerProfile): void {
    const content = this.contentRef();
    const match = this.matchSelected();
    content?.handleIntroductionRequest(profile);
    this.introductionRequested.emit({ profile, match });
  }
}
