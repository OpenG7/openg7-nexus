import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotificationStore, NotificationStoreApi } from '@app/core/observability/notification.store';
import { of } from 'rxjs';

import {
  AdminQualityMatrixService,
  AdminQualityMatrixSnapshot,
} from '../data-access/admin-quality-matrix.service';

import { AdminQualityPage } from './admin-quality.page';

class AdminQualityMatrixServiceMock {
  readonly loadMatrix = jasmine.createSpy('loadMatrix').and.returnValue(
    of<AdminQualityMatrixSnapshot>({
      generatedAt: '2026-04-11T14:00:00.000Z',
      entries: [
        {
          id: 'advanced-discovery',
          domain: 'Recherche et decouverte profonde',
          need: 'Conserver le contexte entre le feed et le detail.',
          summaryStatus: 'non',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          priority: 'haute',
          managementBucket: 'proof-gap',
          needsProductWorkFirst: false,
          observedGap: 'Une chaine cross-surface reste absente.',
          nextMove: 'Ajouter une chaine map vers feed.',
          evidence: ['e2e/feed-advanced-discovery-roundtrip.spec.ts'],
          reviewedAt: '2026-04-07',
        },
        {
          id: 'trust-validation',
          domain: 'Trust et validation',
          need: 'Historiser les decisions de confiance.',
          summaryStatus: 'oui',
          businessStatus: 'oui',
          implementationStatus: 'oui',
          e2eStatus: 'oui',
          priority: 'moyenne',
          managementBucket: 'covered',
          needsProductWorkFirst: false,
          observedGap: 'Le flux critique est deja prouve.',
          nextMove: 'Maintenir la regression existante.',
          evidence: ['e2e/admin-trust-visibility.spec.ts'],
          reviewedAt: '2026-04-07',
        },
        {
          id: 'observability',
          domain: 'Observabilite et tracabilite',
          need: 'Afficher un audit trail visible.',
          summaryStatus: 'partiel',
          businessStatus: 'oui',
          implementationStatus: 'partiel',
          e2eStatus: 'partiel',
          priority: 'moyenne',
          managementBucket: 'product-gap',
          needsProductWorkFirst: true,
          observedGap: "L'audit trail n'est pas encore expose.",
          nextMove: "Exposer une trace d'action sensible.",
          evidence: ['e2e/admin-ops-provenance-trail.spec.ts'],
          reviewedAt: '2026-04-07',
        },
      ],
    })
  );
}

describe('AdminQualityPage', () => {
  let service: AdminQualityMatrixServiceMock;
  let notifications: jasmine.SpyObj<NotificationStoreApi>;

  beforeEach(async () => {
    localStorage.removeItem('og7.admin-quality.mission-control.v1');
    localStorage.removeItem('og7.admin-quality.view-state.v1');
    service = new AdminQualityMatrixServiceMock();
    notifications = jasmine.createSpyObj<NotificationStoreApi>('NotificationStoreApi', ['success', 'info', 'error']);

    await TestBed.configureTestingModule({
      imports: [AdminQualityPage],
      providers: [
        provideRouter([]),
        { provide: AdminQualityMatrixService, useValue: service },
        { provide: NotificationStore, useValue: notifications },
      ],
    }).compileComponents();
  });

  it('renders summary counts from the QA matrix snapshot', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;

    expect(service.loadMatrix).toHaveBeenCalled();
    expect(root.querySelector('[data-og7-id="proved-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="proof-gap-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7-id="product-work-domains"]')?.textContent).toContain('1');
    expect(root.querySelector('[data-og7="admin-quality-domain-icon"][data-og7-id="advanced-discovery"]')).not.toBeNull();
  });

  it('keeps delegation and actions as primary surfaces and moves the QA queue to a secondary panel', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const delegationSurface = root.querySelector('[data-og7-id="admin-quality-surface-delegation"]') as HTMLButtonElement;
    const actionsSurface = root.querySelector('[data-og7-id="admin-quality-surface-actions"]') as HTMLButtonElement;
    const secondaryQueue = root.querySelector('[data-og7="admin-quality-secondary-queue"]') as HTMLDetailsElement;

    expect(delegationSurface).not.toBeNull();
    expect(actionsSurface).not.toBeNull();
    expect(root.querySelector('[data-og7-id="admin-quality-surface-queue"]')).toBeNull();
    expect(secondaryQueue).not.toBeNull();
    expect(secondaryQueue.open).toBeFalse();
    expect(delegationSurface.getAttribute('aria-pressed')).toBe('true');
    expect(actionsSurface.getAttribute('aria-pressed')).toBe('false');

    actionsSurface.click();
    fixture.detectChanges();

    expect(delegationSurface.getAttribute('aria-pressed')).toBe('false');
    expect(actionsSurface.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders the compact coverage matrix and lets it change the active domain', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const matrix = root.querySelector('[data-og7="admin-quality-coverage-matrix"]');
    const rows = root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-row"]');
    const signalLegend = root.querySelector('[data-og7="admin-quality-coverage-matrix-signal-legend"]');
    const legendToggle = root.querySelector(
      '[data-og7-id="admin-quality-coverage-matrix-legend-toggle"]'
    ) as HTMLButtonElement;
    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]'
    ) as HTMLButtonElement;

    expect(matrix).not.toBeNull();
    expect(rows.length).toBe(3);
    expect(signalLegend).not.toBeNull();
    expect(legendToggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-legend-item"]').length).toBe(6);

    legendToggle.click();
    fixture.detectChanges();

    expect(legendToggle.getAttribute('aria-expanded')).toBe('false');
    expect(root.querySelector('[data-og7="admin-quality-coverage-matrix-legend"]')).toBeNull();

    trustRow.click();
    fixture.detectChanges();

    const delegationSurface = root.querySelector(
      '[data-og7-id="admin-quality-surface-delegation"]'
    ) as HTMLButtonElement;
    delegationSurface.click();
    fixture.detectChanges();

    expect(
      root
        .querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]')
        ?.getAttribute('data-og7-selected')
    ).toBe('true');
    expect((root.querySelector('[data-og7-id="admin-quality-open-issue"]') as HTMLAnchorElement).href).toContain(
      'title=Regression%3A+maintenir+la+couverture+trust+et+validation'
    );
  });

  it('filters rows by search term and E2E status', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;
    const e2eFilter = root.querySelector('[data-og7-id="admin-quality-e2e-filter"]') as HTMLSelectElement;

    search.value = 'map';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    let rows = root.querySelectorAll('[data-og7="admin-quality-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-og7-id')).toBe('advanced-discovery');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    e2eFilter.value = 'oui';
    e2eFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    rows = root.querySelectorAll('[data-og7="admin-quality-row"]');
    expect(rows.length).toBe(1);
    expect(rows[0]?.getAttribute('data-og7-id')).toBe('trust-validation');
  });

  it('surfaces active filters as readable chips in the sticky rail', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const domainFilter = root.querySelector('[data-og7-id="admin-quality-domain-filter"]') as HTMLSelectElement;
    const resetButton = root.querySelector('[data-og7-id="admin-quality-reset-filters"]') as HTMLButtonElement;

    expect(root.querySelector('[data-og7="admin-quality-active-filters"]')).toBeNull();
    expect(root.textContent).toContain('Aucun filtre actif. La vue montre tout le portefeuille QA.');
    expect(resetButton.disabled).toBeTrue();

    domainFilter.value = 'Trust et validation';
    domainFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const chips = root.querySelectorAll('[data-og7="admin-quality-active-filter"]');
    expect(chips.length).toBe(1);
    expect(chips[0]?.textContent).toContain('Domaine : Trust et validation');
    expect(resetButton.disabled).toBeFalse();
  });

  it('keeps the visible domain selected after filters replace the previous focus', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]'
    ) as HTMLButtonElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;

    trustRow.click();
    fixture.detectChanges();

    expect(
      root.querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')?.getAttribute(
        'data-og7-id'
      )
    ).toBe('trust-validation');

    search.value = 'map';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(
      root.querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')?.getAttribute(
        'data-og7-id'
      )
    ).toBe('advanced-discovery');

    search.value = '';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(
      root.querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')?.getAttribute(
        'data-og7-id'
      )
    ).toBe('advanced-discovery');
  });

  it('clears the action registry when filters leave no visible domain', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const search = root.querySelector('[data-og7-id="admin-quality-search"]') as HTMLInputElement;
    const actionsSurface = root.querySelector('[data-og7-id="admin-quality-surface-actions"]') as HTMLButtonElement;

    search.value = 'zzz';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    actionsSurface.click();
    fixture.detectChanges();

    expect(root.querySelector('[data-og7-id="admin-quality-empty"]')?.textContent).toContain(
      'Aucun domaine ne correspond aux filtres actifs.'
    );
    expect(root.querySelectorAll('[data-og7="admin-quality-action-row"]').length).toBe(0);
    expect(root.querySelector('[data-og7-id="admin-quality-action-empty"]')?.textContent).toContain(
      "Aucun bouton d action n est encore recense pour ce domaine."
    );
    expect(root.querySelector('[data-og7="admin-quality-action-detail"]')).toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-actions"]')?.textContent).toContain('0 pour le domaine courant');
  });

  it('distinguishes active scope from global totals in the command rail', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const domainFilter = root.querySelector('[data-og7-id="admin-quality-domain-filter"]') as HTMLSelectElement;

    expect(root.querySelector('[data-og7-id="rail-heading"]')?.textContent).toContain('Vue globale');

    domainFilter.value = 'Trust et validation';
    domainFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root.querySelector('[data-og7-id="rail-heading"]')?.textContent).toContain('Scope actif');
    expect(root.querySelector('[data-og7-id="total-domains"]')?.textContent).toContain('Global 3');
    expect(root.querySelector('[data-og7-id="proved-domains"]')?.textContent).toContain('Global 1');
  });

  it('restores the last admin-quality console scope from localStorage', async () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();
    await fixture.whenStable();

    let root = fixture.nativeElement as HTMLElement;
    const domainFilter = root.querySelector('[data-og7-id="admin-quality-domain-filter"]') as HTMLSelectElement;
    const actionsSurface = root.querySelector('[data-og7-id="admin-quality-surface-actions"]') as HTMLButtonElement;

    domainFilter.value = 'Observabilite et tracabilite';
    domainFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    actionsSurface.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(JSON.parse(localStorage.getItem('og7.admin-quality.view-state.v1') ?? '{}')).toEqual(
      jasmine.objectContaining({
        selectedDomain: 'Observabilite et tracabilite',
        inspectionSurface: 'actions',
      })
    );

    fixture.destroy();

    const restoredFixture = TestBed.createComponent(AdminQualityPage);
    restoredFixture.detectChanges();
    await restoredFixture.whenStable();
    restoredFixture.detectChanges();

    root = restoredFixture.nativeElement as HTMLElement;

    expect(root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-row"]').length).toBe(1);
    expect(
      root.querySelector('[data-og7="admin-quality-coverage-matrix-row"][data-og7-selected="true"]')?.getAttribute(
        'data-og7-id'
      )
    ).toBe('observability');
    expect(root.querySelector('[data-og7="admin-quality-inspection-deck"]')?.textContent).toContain(
      'Surface principale : Actions'
    );
  });

  it('renders a delegation panel and updates it when another row is selected', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const delegationSurface = root.querySelector(
      '[data-og7-id="admin-quality-surface-delegation"]'
    ) as HTMLButtonElement;
    delegationSurface.click();
    fixture.detectChanges();

    let issueLink = root.querySelector('[data-og7-id="admin-quality-open-issue"]') as HTMLAnchorElement;

    expect(root.querySelector('[data-og7="admin-quality-delegation-panel"]')).not.toBeNull();
    expect(issueLink.href).toContain('https://github.com/OpenG7/openg7-nexus/issues/new');
    expect(root.textContent).toContain('Etendre la preuve QA - Recherche et decouverte profonde');

    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]'
    ) as HTMLButtonElement;
    trustRow.click();
    fixture.detectChanges();

    issueLink = root.querySelector('[data-og7-id="admin-quality-open-issue"]') as HTMLAnchorElement;
    expect(root.textContent).toContain('Renforcer la regression - Trust et validation');
    expect(issueLink.href).toContain('title=Regression%3A+maintenir+la+couverture+trust+et+validation');
  });

  it('renders mission control recommendations and moves to ready after approval', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const missionControl = root.querySelector('[data-og7="admin-quality-mission-control"]');
    const missionHero = root.querySelector('[data-og7="admin-quality-mission-hero"]');
    const missionWorkflow = root.querySelector('[data-og7="admin-quality-mission-workflow"]');
    const recommendations = root.querySelectorAll('[data-og7="admin-quality-recommendation"]');
    let recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button'
    ) as NodeListOf<HTMLButtonElement>;
    let approveButton = root.querySelector('[data-og7-id="admin-quality-approve-mission"]') as HTMLButtonElement;

    expect(missionControl).not.toBeNull();
    expect(missionHero).not.toBeNull();
    expect(missionWorkflow).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-local-state"]')).toBeNull();
    expect(missionControl?.textContent).toContain('Mission Control');
    expect(missionControl?.textContent).toContain('Gap constate');
    expect(missionControl?.textContent).toContain('Mission suggeree');
    expect(missionControl?.textContent).toContain('Valider mission');
    expect(missionControl?.textContent).toContain('Deleguer');
    expect(recommendations.length).toBe(3);
    expect(root.textContent).toContain('Validation humaine requise');
    expect(recommendationButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(recommendationButtons[1]?.getAttribute('aria-pressed')).toBe('false');

    recommendationButtons[1]?.click();
    fixture.detectChanges();

    recommendationButtons = root.querySelectorAll('[data-og7="admin-quality-recommendation"] > button') as NodeListOf<HTMLButtonElement>;
    expect(recommendationButtons[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(recommendationButtons[1]?.getAttribute('aria-pressed')).toBe('true');

    approveButton = root.querySelector('[data-og7-id="admin-quality-approve-mission"]') as HTMLButtonElement;
    approveButton.click();
    fixture.detectChanges();

    expect(root.textContent).toContain('Pret a lancer');
    expect(notifications.success).toHaveBeenCalledWith('Mission approuvee par un humain.', { source: 'admin-quality' });
  });

  it('renders the action registry for the selected domain and updates it on row change', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const actionsSurface = root.querySelector('[data-og7-id="admin-quality-surface-actions"]') as HTMLButtonElement;
    actionsSurface.click();
    fixture.detectChanges();

    let actionRows = root.querySelectorAll('[data-og7="admin-quality-action-row"]');
    let actionButtons = root.querySelectorAll('[data-og7="admin-quality-action-row"] > button') as NodeListOf<HTMLButtonElement>;

    expect(root.querySelector('[data-og7="admin-quality-actions"]')).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-undocumented-actions"]')).not.toBeNull();
    expect(actionRows.length).toBe(3);
    expect(actionButtons[0]?.getAttribute('aria-pressed')).toBe('true');
    expect(actionButtons[1]?.getAttribute('aria-pressed')).toBe('false');
    expect(root.textContent).toContain('feed-open-item');
    expect(root.textContent).toContain('Hook action manquant');

    actionButtons[1]?.click();
    fixture.detectChanges();

    actionButtons = root.querySelectorAll('[data-og7="admin-quality-action-row"] > button') as NodeListOf<HTMLButtonElement>;
    expect(actionButtons[0]?.getAttribute('aria-pressed')).toBe('false');
    expect(actionButtons[1]?.getAttribute('aria-pressed')).toBe('true');

    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]'
    ) as HTMLButtonElement;
    trustRow.click();
    fixture.detectChanges();

    actionRows = root.querySelectorAll('[data-og7="admin-quality-action-row"]');
    expect(actionRows.length).toBe(2);
    expect(root.textContent).toContain('admin-trust-quick-verify');
    expect(root.textContent).toContain('AdminTrustPage');
    expect(root.textContent).toContain('admin-trust-quick-correction');
  });

  it('stops spoken briefing when the active admin-quality context changes', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const page = fixture.componentInstance;
    const stopSpy = spyOn(page, 'stopMissionVoice').and.callFake(() => undefined);
    const root = fixture.nativeElement as HTMLElement;
    const actionsSurface = root.querySelector('[data-og7-id="admin-quality-surface-actions"]') as HTMLButtonElement;
    const recommendationButtons = root.querySelectorAll(
      '[data-og7="admin-quality-recommendation"] > button'
    ) as NodeListOf<HTMLButtonElement>;

    page.speaking.set(true);
    actionsSurface.click();
    fixture.detectChanges();

    expect(stopSpy).toHaveBeenCalledWith(false);

    stopSpy.calls.reset();
    page.speaking.set(true);
    recommendationButtons[1]?.click();
    fixture.detectChanges();

    expect(stopSpy).toHaveBeenCalledWith(false);
  });

  it('resets active filters back to the full table', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const bucketFilter = root.querySelector('[data-og7-id="admin-quality-bucket-filter"]') as HTMLSelectElement;
    const resetButton = root.querySelector('[data-og7-id="admin-quality-reset-filters"]') as HTMLButtonElement;

    bucketFilter.value = 'product-gap';
    bucketFilter.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(root.querySelectorAll('[data-og7="admin-quality-row"]').length).toBe(1);

    resetButton.click();
    fixture.detectChanges();

    expect(root.querySelectorAll('[data-og7="admin-quality-row"]').length).toBe(3);
  });
});
