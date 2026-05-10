import { TestBed } from '@angular/core/testing';
import { AdminQualityCoverageMatrixComponent } from '@openg7/admin-quality';

import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

describe('AdminQualityCoverageMatrixComponent', () => {
  function buildEntry(overrides: Partial<AdminQualityMatrixEntry> = {}): AdminQualityMatrixEntry {
    return {
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
      repoSignalAt: null,
      repoSignalCommit: null,
      repoSignalSource: null,
      repoSignalSummary: null,
      signalDispatch: {},
      ...overrides,
    };
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminQualityCoverageMatrixComponent],
    }).compileComponents();
  });

  it('renders each coverage signal as a focusable button and emits signalSelected', () => {
    const fixture = TestBed.createComponent(AdminQualityCoverageMatrixComponent);
    const signalSelectedSpy = jasmine.createSpy('signalSelected');
    fixture.componentInstance.signalSelected.subscribe(signalSelectedSpy);
    fixture.componentRef.setInput('entries', [buildEntry()]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const e2eSignal = root.querySelector(
      '[data-og7="admin-quality-coverage-signal"][data-og7-id="e2e"]',
    ) as HTMLButtonElement;

    expect(e2eSignal.tagName).toBe('BUTTON');
    expect(e2eSignal.getAttribute('aria-label')).toContain('End-to-end');

    e2eSignal.click();

    expect(signalSelectedSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        signalId: 'e2e',
        shortLabel: 'E',
      }),
    );
  });

  it('renders the latest delegation trace for an entry and highlights the selected signal', () => {
    const fixture = TestBed.createComponent(AdminQualityCoverageMatrixComponent);
    fixture.componentRef.setInput('entries', [buildEntry()]);
    fixture.componentRef.setInput('selectedEntryId', 'advanced-discovery');
    fixture.componentRef.setInput('selectedSignalId', 'e2e');
    fixture.componentRef.setInput('delegationTraceByEntryId', {
      'advanced-discovery': {
        signalId: 'e2e',
        shortLabel: 'E',
        label: 'End-to-end',
        provider: 'Codex',
        requestedAt: '2026-05-01T09:30:00.000Z',
      },
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const e2eSignal = root.querySelector(
      '[data-og7="admin-quality-coverage-signal"][data-og7-id="e2e"]',
    ) as HTMLButtonElement;
    const trace = root.querySelector(
      '[data-og7="admin-quality-coverage-delegation-trace"][data-og7-id="advanced-discovery"]',
    );
    const focusTrace = root.querySelector(
      '[data-og7="admin-quality-coverage-focus-trace"][data-og7-id="e2e"]',
    );

    expect(e2eSignal.getAttribute('aria-pressed')).toBe('true');
    expect(trace?.textContent).toContain('Derniere delegation: E via Codex');
    expect(focusTrace?.textContent).toContain('Derniere delegation: E via Codex');
  });
});
