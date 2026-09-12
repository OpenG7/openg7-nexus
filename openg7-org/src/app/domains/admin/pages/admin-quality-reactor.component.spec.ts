import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminQualityReactorComponent, AdminQualityReactorReason } from '@openg7/admin-quality';

describe('AdminQualityReactorComponent', () => {
  let fixture: ComponentFixture<AdminQualityReactorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminQualityReactorComponent, TranslateModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminQualityReactorComponent);
    setInputs({
      coveredCount: 6,
      proofGapCount: 2,
      productGapCount: 1,
      notAlignedCount: 1,
      notEvaluatedCount: 0,
    });
  });

  function setInputs(
    inputs: Partial<{
      coveredCount: number;
      proofGapCount: number;
      productGapCount: number;
      notAlignedCount: number;
      notEvaluatedCount: number;
      isAnalysisRunning: boolean;
      isLoading: boolean;
      hasRefreshError: boolean;
      refreshRequiredCount: number;
      reasons: readonly AdminQualityReactorReason[];
      reactorState: 'stable' | 'scanning' | 'attention' | 'critical' | 'excellent';
    }>,
  ): void {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
  }

  it('computes coverage, consistency, and completeness from the matrix buckets', () => {
    fixture.detectChanges();

    expect(fixture.componentInstance.totalCount()).toBe(10);
    expect(fixture.componentInstance.coveragePercent()).toBe(60);
    expect(fixture.componentInstance.coherencePercent()).toBe(90);
    expect(fixture.componentInstance.completudePercent()).toBe(100);
  });

  it('reports a high current risk without inferring deterioration from a critical state', () => {
    setInputs({ reactorState: 'critical' });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('critical');
    expect(fixture.componentInstance.trendTone()).toEqual({
      labelKey: 'admin.quality.reactor.trends.unavailable',
      className: 'tone-neutral',
    });
    expect(fixture.componentInstance.riskTone()).toEqual({
      labelKey: 'admin.quality.reactor.risks.high',
      className: 'tone-danger',
    });
  });

  it('keeps the trend unavailable when the current state changes without comparable history', () => {
    for (const reactorState of [
      'stable',
      'attention',
      'critical',
      'excellent',
      'scanning',
    ] as const) {
      setInputs({ reactorState });
      fixture.detectChanges();

      expect(fixture.componentInstance.trendTone().labelKey).toBe(
        'admin.quality.reactor.trends.unavailable',
      );
    }
  });

  it('switches a stable reactor to scanning while analysis is running', () => {
    setInputs({ reactorState: 'stable', isAnalysisRunning: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('scanning');
    expect(fixture.componentInstance.riskTone().labelKey).toBe(
      'admin.quality.reactor.risks.assessing',
    );
  });

  it('retains the known critical state and figures while separately announcing recalculation', () => {
    setInputs({ reactorState: 'critical', isAnalysisRunning: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('critical');
    expect(fixture.componentInstance.coveragePercent()).toBe(60);
    const message = fixture.nativeElement.querySelector('[role="status"]') as HTMLElement;
    expect(message.getAttribute('aria-live')).toBe('polite');
    expect(message.textContent).toContain('admin.quality.reactor.states.scanning.message');

    setInputs({ isAnalysisRunning: false });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('critical');
    expect(fixture.componentInstance.coveragePercent()).toBe(60);
  });

  it('withholds the excellent diagnosis while covered domains require review', () => {
    setInputs({
      coveredCount: 10,
      proofGapCount: 0,
      productGapCount: 0,
      notAlignedCount: 0,
      reactorState: 'excellent',
      refreshRequiredCount: 2,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.coveragePercent()).toBe(100);
    expect(fixture.componentInstance.visualState()).toBe('attention');
    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.diagnostics.reviewRequired',
    );
    expect(fixture.componentInstance.riskTone().labelKey).toBe(
      'admin.quality.reactor.risks.unavailable',
    );

    setInputs({ refreshRequiredCount: 0 });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('excellent');
  });

  it('counts unassessed domains in completeness and prevents a complete diagnosis', () => {
    setInputs({
      coveredCount: 9,
      proofGapCount: 0,
      productGapCount: 0,
      notAlignedCount: 0,
      notEvaluatedCount: 1,
      reactorState: 'excellent',
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.totalCount()).toBe(10);
    expect(fixture.componentInstance.coveragePercent()).toBe(90);
    expect(fixture.componentInstance.completudePercent()).toBe(90);
    expect(fixture.componentInstance.visualState()).toBe('attention');
    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.diagnostics.incomplete',
    );

    setInputs({ coveredCount: 0, notEvaluatedCount: 10 });
    fixture.detectChanges();

    expect(fixture.componentInstance.totalCount()).toBe(10);
    expect(fixture.componentInstance.coveragePercent()).toBe(0);
    expect(fixture.componentInstance.completudePercent()).toBe(0);
  });

  it('distinguishes a refresh from a recalculation and keeps the last figures after refresh failure', () => {
    setInputs({ isLoading: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.reactorStateLabelKey()).toBe(
      'admin.quality.reactor.states.loading.label',
    );
    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.diagnostics.refreshing',
    );

    setInputs({ isLoading: false, hasRefreshError: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.coveragePercent()).toBe(60);
    expect(fixture.componentInstance.visualState()).toBe('attention');
    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.diagnostics.refreshFailed',
    );
    expect(fixture.componentInstance.riskTone().labelKey).toBe(
      'admin.quality.reactor.risks.unavailable',
    );
  });

  it('distinguishes initial loading, load failure, and an empty matrix without inventing percentages', () => {
    setInputs({
      coveredCount: 0,
      proofGapCount: 0,
      productGapCount: 0,
      notAlignedCount: 0,
      notEvaluatedCount: 0,
      reactorState: 'excellent',
      isLoading: true,
    });
    fixture.detectChanges();

    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.states.loading.message',
    );
    expect(fixture.componentInstance.coveragePercent()).toBe(0);
    expect(fixture.componentInstance.coherencePercent()).toBe(0);
    expect(fixture.componentInstance.completudePercent()).toBe(0);
    const coverage = fixture.nativeElement.querySelector(
      '[data-og7-id="admin-quality-reactor-coverage"]',
    ) as HTMLElement;
    expect(coverage.textContent?.trim()).toBe('—');

    setInputs({ isLoading: false, hasRefreshError: true });
    fixture.detectChanges();
    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.diagnostics.loadFailed',
    );

    setInputs({ hasRefreshError: false });
    fixture.detectChanges();
    expect(fixture.componentInstance.visualState()).toBe('stable');
    expect(fixture.componentInstance.reactorStateMessageKey()).toBe(
      'admin.quality.reactor.states.empty.message',
    );
    expect(fixture.componentInstance.riskTone().labelKey).toBe(
      'admin.quality.reactor.risks.unavailable',
    );
  });

  it('emits the priority-gap action from its CTA', () => {
    const action = jasmine.createSpy('viewPriorityGaps');
    fixture.componentInstance.viewPriorityGaps.subscribe(action);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      '[data-og7-id="admin-quality-reactor-view-gaps"]',
    ) as HTMLButtonElement;
    button.click();

    expect(action).toHaveBeenCalledTimes(1);
  });

  describe('state explanations', () => {
    const priorityReason: AdminQualityReactorReason = {
      id: 'priority-gaps',
      labelKey: 'admin.quality.reactor.explanations.reasons.priority-gaps.label',
      messageKey: 'admin.quality.reactor.explanations.reasons.priority-gaps.attention',
      severity: 'attention',
      params: { count: 2, total: 10, percent: 20 },
      entries: [
        {
          id: 'search',
          domain: 'Search',
          reviewedAt: '2026-09-08',
          evidence: ['e2e/search.spec.ts'],
        },
        { id: 'access', domain: 'Access control', reviewedAt: '', evidence: [] },
      ],
    };

    beforeEach(() => {
      setInputs({ reasons: [priorityReason], reactorState: 'attention' });
    });

    it('starts with a collapsed native disclosure and emits the selected reason from its action', () => {
      const action = jasmine.createSpy('viewReason');
      fixture.componentInstance.viewReason.subscribe(action);
      fixture.detectChanges();

      const panel = fixture.nativeElement.querySelector(
        '[data-og7="admin-quality-reactor-explanations"]',
      ) as HTMLDetailsElement;
      expect(panel.tagName).toBe('DETAILS');
      expect(panel.open).toBeFalse();
      expect(panel.querySelector(':scope > summary')).not.toBeNull();
      panel.open = true;
      const button = panel.querySelector(
        '[data-og7-id="admin-quality-reactor-view-priority-gaps"]',
      ) as HTMLButtonElement;
      expect(button.type).toBe('button');
      button.click();

      expect(action).toHaveBeenCalledOnceWith('priority-gaps');
    });

    it('interpolates the applicable threshold, affected count and denominator', () => {
      const translations = TestBed.inject(TranslateService);
      translations.setTranslation('en', {
        admin: {
          quality: {
            reactor: {
              explanations: {
                reasons: {
                  unresolved: {
                    label: 'Domains not covered',
                    attention:
                      '{{ count }} / {{ total }} ({{ percent }}%). Threshold {{ threshold }}%.',
                  },
                },
              },
            },
          },
        },
      });
      translations.use('en');
      setInputs({
        reasons: [
          {
            ...priorityReason,
            id: 'unresolved',
            labelKey: 'admin.quality.reactor.explanations.reasons.unresolved.label',
            messageKey: 'admin.quality.reactor.explanations.reasons.unresolved.attention',
            params: { count: 2, total: 10, percent: 20, threshold: 20 },
          },
        ],
      });
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector('.reactor-reason-message') as HTMLElement;
      expect(message.textContent?.trim()).toBe('2 / 10 (20%). Threshold 20%.');
    });

    it('keeps recorded dates and proof references distinct from missing review and evidence', () => {
      fixture.detectChanges();

      const reviewed = fixture.nativeElement.querySelector(
        '[data-entry-id="search"]',
      ) as HTMLElement;
      expect(reviewed.querySelector('time')?.getAttribute('datetime')).toBe('2026-09-08');
      expect(reviewed.querySelector('code')?.textContent).toBe('e2e/search.spec.ts');
      const unknown = fixture.nativeElement.querySelector(
        '[data-entry-id="access"]',
      ) as HTMLElement;
      expect(unknown.querySelector('time')).toBeNull();
      expect(unknown.querySelector('code')).toBeNull();
      expect(unknown.textContent).toContain('admin.quality.reactor.explanations.unknownReview');
      expect(unknown.textContent).toContain('admin.quality.reactor.explanations.noEvidence');
      expect(fixture.nativeElement.textContent).toContain(
        'admin.quality.reactor.explanations.referencesHint',
      );
    });

    it('renders malformed dates as unknown and untrusted proof strings as plain text', () => {
      setInputs({
        reasons: [
          {
            ...priorityReason,
            entries: [
              {
                id: 'search',
                domain: 'Search',
                reviewedAt: '2026-02-30',
                evidence: ['<img src=x onerror="alert(1)">', 'javascript:alert(1)'],
              },
            ],
          },
        ],
      });
      fixture.detectChanges();

      const entry = fixture.nativeElement.querySelector('[data-entry-id="search"]') as HTMLElement;
      expect(entry.querySelector('time')).toBeNull();
      expect(entry.textContent).toContain('admin.quality.reactor.explanations.unknownReview');
      expect(entry.querySelector('a, img, script')).toBeNull();
      expect(entry.querySelector('code')?.textContent).toBe('<img src=x onerror="alert(1)">');
    });

    it('replaces reasons after new input and keeps failure context with the last available reasons', () => {
      fixture.detectChanges();
      setInputs({ hasRefreshError: true });
      fixture.detectChanges();
      const panel = fixture.nativeElement.querySelector(
        '[data-og7="admin-quality-reactor-explanations"]',
      ) as HTMLElement;
      expect(panel.textContent).toContain('admin.quality.reactor.diagnostics.refreshFailed');
      expect(panel.textContent).toContain('admin.quality.reactor.explanations.previousData');
      expect(panel.querySelectorAll('[data-og7="admin-quality-reactor-reason"]').length).toBe(1);

      setInputs({ hasRefreshError: false, reasons: [] });
      fixture.detectChanges();
      expect(panel.querySelector('[data-og7="admin-quality-reactor-reason"]')).toBeNull();
      expect(panel.textContent).not.toContain('admin.quality.reactor.explanations.previousData');
      expect(panel.textContent).toContain('admin.quality.reactor.states.attention.message');
    });
  });
});
