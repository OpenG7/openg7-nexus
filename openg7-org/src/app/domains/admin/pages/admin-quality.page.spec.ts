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

  it('renders the compact coverage matrix and lets it change the active domain', () => {
    const fixture = TestBed.createComponent(AdminQualityPage);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const matrix = root.querySelector('[data-og7="admin-quality-coverage-matrix"]');
    const rows = root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-row"]');
    const legendItems = root.querySelectorAll('[data-og7="admin-quality-coverage-matrix-legend-item"]');
    const trustRow = root.querySelector(
      '[data-og7="admin-quality-coverage-matrix-row"][data-og7-id="trust-validation"]'
    ) as HTMLButtonElement;

    expect(matrix).not.toBeNull();
    expect(rows.length).toBe(3);
    expect(legendItems.length).toBe(6);

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
    const approveButton = root.querySelector('[data-og7-id="admin-quality-approve-mission"]') as HTMLButtonElement;

    expect(missionControl).not.toBeNull();
    expect(missionHero).not.toBeNull();
    expect(missionWorkflow).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-local-state"]')).toBeNull();
    expect(root.textContent).toContain('AI Mission Control');
    expect(root.textContent).toContain('Gap Detected:');
    expect(root.textContent).toContain('Suggestion:');
    expect(root.textContent).toContain('Create Mission');
    expect(root.textContent).toContain('Auto-Delegate');
    expect(recommendations.length).toBe(3);
    expect(root.textContent).toContain('Validation humaine requise');

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

    expect(root.querySelector('[data-og7="admin-quality-actions"]')).not.toBeNull();
    expect(root.querySelector('[data-og7="admin-quality-undocumented-actions"]')).not.toBeNull();
    expect(actionRows.length).toBe(3);
    expect(root.textContent).toContain('feed-open-item');
    expect(root.textContent).toContain('Hook action manquant');

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
