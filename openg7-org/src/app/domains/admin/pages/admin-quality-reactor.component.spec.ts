import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { AdminQualityReactorComponent } from '@openg7/admin-quality';

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

  it('derives trend and risk from the current reactor state', () => {
    setInputs({ reactorState: 'critical' });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('critical');
    expect(fixture.componentInstance.trendTone()).toEqual({
      labelKey: 'admin.quality.reactor.trends.degrading',
      className: 'tone-danger',
    });
    expect(fixture.componentInstance.riskTone()).toEqual({
      labelKey: 'admin.quality.reactor.risks.high',
      className: 'tone-danger',
    });
  });

  it('switches a stable reactor to scanning while analysis is running', () => {
    setInputs({ reactorState: 'stable', isAnalysisRunning: true });
    fixture.detectChanges();

    expect(fixture.componentInstance.visualState()).toBe('scanning');
    expect(fixture.componentInstance.riskTone().labelKey).toBe(
      'admin.quality.reactor.risks.assessing',
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
});
