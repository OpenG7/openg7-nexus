import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  AlertIndicatorEntry,
  AlertRelatedAlertEntry,
  AlertRelatedOpportunityEntry,
} from './alert-detail.models';

@Component({
  selector: 'og7-alert-context-aside',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './alert-context-aside.component.html',
  styleUrl: './alert-context-aside.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AlertContextAsideComponent {
  readonly indicators = input<readonly AlertIndicatorEntry[]>([]);
  readonly relatedAlerts = input<readonly AlertRelatedAlertEntry[]>([]);
  readonly relatedOpportunities = input<readonly AlertRelatedOpportunityEntry[]>([]);

  readonly openRelatedAlert = output<string | null>();
  readonly openRelatedOpportunity = output<string>();
  readonly openAllAlerts = output<void>();

  protected trackByIndicator(_index: number, entry: AlertIndicatorEntry): string {
    return entry.id;
  }

  protected trackByRelatedAlert(_index: number, entry: AlertRelatedAlertEntry): string {
    return `${entry.id ?? 'missing'}:${entry.title}`;
  }

  protected trackByRelatedOpportunity(_index: number, entry: AlertRelatedOpportunityEntry): string {
    return entry.id;
  }
}
