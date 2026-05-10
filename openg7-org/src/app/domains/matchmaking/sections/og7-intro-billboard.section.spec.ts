import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, Signal, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { OpportunityMatch } from '@app/core/models/opportunity';
import { FinancingBanner, PartnerProfile } from '@app/core/models/partner-profile';

import {
  IntroductionRequestContext,
  Og7IntroBillboardSection,
} from './og7-intro-billboard.section';

@Component({
  selector: 'og7-partner-details-panel',
  standalone: true,
  template: '',
})
class PartnerDetailsPanelStubComponent {
  @Input() selectedPartnerId: Signal<string | null> | null = null;
  @Input() matchContext: OpportunityMatch | null = null;
  @Input() financingContext: FinancingBanner | null = null;

  @Output() closed = new EventEmitter<void>();
  @Output() introductionRequested = new EventEmitter<PartnerProfile>();
}

@Component({
  selector: 'og7-partner-quick-actions',
  standalone: true,
  template: '',
})
class PartnerQuickActionsStubComponent {
  @Input() partnerId = '';
  @Input() matchId: number | string | null = null;
  @Input() partnerName: string | null = null;
}

describe('Og7IntroBillboardSection', () => {
  let fixture: ComponentFixture<Og7IntroBillboardSection>;
  let component: Og7IntroBillboardSection;

  const match: OpportunityMatch = {
    id: 73,
    commodity: 'Hydrogen',
    mode: 'import',
    buyer: { id: 1, name: 'Buyer Inc', province: 'QC', sector: 'energy', capability: 'import' },
    seller: { id: 2, name: 'Supplier Ltd', province: 'ON', sector: 'energy', capability: 'export' },
    confidence: 0.78,
  };

  const financingBanner: FinancingBanner = {
    id: 'fin-73',
    province: 'QC',
    sector: 'energy',
    title: { fr: 'Financement', en: 'Financing' },
    body: { fr: 'Option adaptée', en: 'Tailored option' },
    ctaLabel: { fr: 'Voir', en: 'View' },
    ctaUrl: 'https://example.com/financing',
  };

  const profile: PartnerProfile = {
    id: 2,
    role: 'supplier',
    legalName: 'Supplier Ltd',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Og7IntroBillboardSection],
    })
      .overrideComponent(Og7IntroBillboardSection, {
        set: {
          imports: [
            CommonModule,
            PartnerDetailsPanelStubComponent,
            PartnerQuickActionsStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(Og7IntroBillboardSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getPartnerPanelStub(): PartnerDetailsPanelStubComponent {
    const panelDebug = fixture.debugElement.query(By.directive(PartnerDetailsPanelStubComponent));
    return panelDebug.componentInstance as PartnerDetailsPanelStubComponent;
  }

  function getQuickActionsStub(): PartnerQuickActionsStubComponent | null {
    const quickActionsDebug = fixture.debugElement.query(
      By.directive(PartnerQuickActionsStubComponent),
    );
    return quickActionsDebug?.componentInstance ?? null;
  }

  it('forwards selected partner, match and financing inputs to partner panel', () => {
    const selectedPartnerId = signal<string | null>('buyer:1');

    fixture.componentRef.setInput('selectedPartnerId', selectedPartnerId);
    fixture.componentRef.setInput('matchSelected', match);
    fixture.componentRef.setInput('financingBanner', financingBanner);
    fixture.detectChanges();

    const panel = getPartnerPanelStub();
    expect(panel.selectedPartnerId).toBe(selectedPartnerId);
    expect(panel.matchContext).toEqual(match);
    expect(panel.financingContext).toEqual(financingBanner);
  });

  it('renders quick actions with parsed id and buyer name when a buyer is selected', () => {
    fixture.componentRef.setInput('selectedPartnerId', signal<string | null>('buyer:1'));
    fixture.componentRef.setInput('matchSelected', match);
    fixture.detectChanges();

    const quickActions = getQuickActionsStub();
    expect(quickActions).not.toBeNull();
    expect(quickActions!.partnerId).toBe('1');
    expect(quickActions!.partnerName).toBe('Buyer Inc');
    expect(quickActions!.matchId).toBe(73);
  });

  it('falls back to seller id and name when no selected partner is provided', () => {
    fixture.componentRef.setInput('selectedPartnerId', signal<string | null>(null));
    fixture.componentRef.setInput('matchSelected', match);
    fixture.detectChanges();

    const quickActions = getQuickActionsStub();
    expect(quickActions).not.toBeNull();
    expect(quickActions!.partnerId).toBe('2');
    expect(quickActions!.partnerName).toBe('Supplier Ltd');
    expect(quickActions!.matchId).toBe(73);
  });

  it('does not render quick actions when neither selection nor match is available', () => {
    fixture.componentRef.setInput('selectedPartnerId', signal<string | null>(null));
    fixture.componentRef.setInput('matchSelected', null);
    fixture.detectChanges();

    expect(getQuickActionsStub()).toBeNull();
  });

  it('emits panelClosed when the partner panel emits closed', () => {
    const onPanelClosed = jasmine.createSpy('onPanelClosed');
    component.panelClosed.subscribe(onPanelClosed);

    const panel = getPartnerPanelStub();
    panel.closed.emit();

    expect(onPanelClosed).toHaveBeenCalledTimes(1);
  });

  it('emits introductionRequested with profile and current match context', () => {
    fixture.componentRef.setInput('matchSelected', match);
    fixture.detectChanges();

    const requests: IntroductionRequestContext[] = [];
    component.introductionRequested.subscribe((context) => requests.push(context));

    const panel = getPartnerPanelStub();
    panel.introductionRequested.emit(profile);

    expect(requests).toEqual([{ profile, match }]);
  });
});
