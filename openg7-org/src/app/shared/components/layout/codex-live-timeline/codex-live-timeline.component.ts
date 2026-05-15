import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  CodexLiveTimelineEvent,
  CodexLiveTimelineService,
  CodexLiveTimelineStep,
} from '@app/core/observability/codex-live-timeline.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-codex-live-timeline',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './codex-live-timeline.component.html',
  styleUrl: './codex-live-timeline.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodexLiveTimelineComponent {
  private readonly timeline = inject(CodexLiveTimelineService);

  readonly run = this.timeline.run;
  readonly isOpen = this.timeline.isOpen;

  hide(): void {
    this.timeline.hide();
  }

  clear(): void {
    this.timeline.clear();
  }

  trackStep = (_: number, step: CodexLiveTimelineStep) => step.id;
  trackEvent = (_: number, event: CodexLiveTimelineEvent) => event.id;
}
