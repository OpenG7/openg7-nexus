import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CodexLiveTimelineService } from '@app/core/observability/codex-live-timeline.service';
import { TranslateModule } from '@ngx-translate/core';

import { CodexLiveTimelineComponent } from './codex-live-timeline.component';

describe('CodexLiveTimelineComponent', () => {
  let timeline: CodexLiveTimelineService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodexLiveTimelineComponent, TranslateModule.forRoot()],
    }).compileComponents();

    timeline = TestBed.inject(CodexLiveTimelineService);
  });

  afterEach(() => {
    timeline.clear();
  });

  it('opens a live timeline and streams progressive steps', fakeAsync(() => {
    timeline.start({
      provider: 'codex',
      task: 'Construire la surface admin-quality.',
      source: 'admin-quality-agent',
      actionLabel: 'Codex Preuve',
    });

    const fixture = TestBed.createComponent(CodexLiveTimelineComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-og7="codex-live-timeline"]')).not.toBeNull();
    expect(root.textContent).toContain('Deploiement du chantier');
    expect(root.textContent).toContain('Analyse du repo');

    tick(950);
    fixture.detectChanges();

    expect(root.textContent).toContain('Identification des fichiers concernes');
    expect(root.textContent).toContain('[');
    timeline.clear();
  }));

  it('renders GitHub workflow and pull request links when available', () => {
    const runId = timeline.start({
      provider: 'codex',
      task: 'Construire la surface admin-quality.',
    });
    timeline.recordDispatchQueued(runId, { workflow: 'codex-pr.yml', ref: 'main' });
    timeline.recordGithubStatus(runId, {
      state: 'completed',
      label: 'GitHub Actions - termine',
      detail: 'Workflow termine.',
      workflow: 'codex-pr.yml',
      runUrl: 'https://github.test/actions/runs/42',
      runNumber: 42,
      correlationId: 'og7-test-correlation',
      updatedAt: '2026-05-15T00:00:00.000Z',
    });
    timeline.recordPullRequest(runId, {
      number: 482,
      url: 'https://github.test/pulls/482',
      title: 'Codex proof',
    });

    const fixture = TestBed.createComponent(CodexLiveTimelineComponent);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('codex-pr.yml');
    expect(root.textContent).toContain('#42');
    expect(root.textContent).toContain('Pull Request ouverte #482.');
    expect(root.querySelector('a[href="https://github.test/actions/runs/42"]')).not.toBeNull();
    expect(root.querySelector('a[href="https://github.test/pulls/482"]')).not.toBeNull();
  });
});
