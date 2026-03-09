import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { CorridorRisk, StrategicCorridorItem } from '../../pages/strategic-sectors.models';

@Component({
  selector: 'og7-strategic-sectors-map-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './strategic-sectors-map-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategicSectorsMapPanelComponent {
  readonly corridors = input.required<readonly StrategicCorridorItem[]>();

  protected corridorRiskClass(risk: CorridorRisk): string {
    if (risk === 'low') {
      return 'border-emerald-300/35 bg-emerald-300/10 text-emerald-100';
    }
    if (risk === 'high') {
      return 'border-rose-300/35 bg-rose-300/10 text-rose-100';
    }
    return 'border-amber-300/35 bg-amber-300/10 text-amber-100';
  }
}
