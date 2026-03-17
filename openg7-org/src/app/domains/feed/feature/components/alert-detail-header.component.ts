import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'og7-alert-detail-header',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslateModule],
  templateUrl: './alert-detail-header.component.html',
  styleUrl: './alert-detail-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertDetailHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input.required<string>();
  readonly severityLabel = input.required<string>();
  readonly confidenceLabel = input.required<string>();
  readonly windowLabel = input.required<string>();
  readonly compact = input(false);
  readonly subscribed = input(false);
  readonly canCreateOpportunity = input(true);
  readonly hasPendingReport = input(false);

  readonly toggleSubscribe = output<void>();
  readonly share = output<void>();
  readonly reportUpdate = output<void>();
  readonly reportAnotherUpdate = output<void>();
  readonly createOpportunity = output<void>();
}
