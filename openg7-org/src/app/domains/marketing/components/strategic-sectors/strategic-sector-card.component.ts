import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import { StrategicSectorCard } from '../../pages/strategic-sectors.models';

@Component({
  selector: 'og7-strategic-sector-card',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './strategic-sector-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategicSectorCardComponent {
  readonly card = input.required<StrategicSectorCard>();
}
