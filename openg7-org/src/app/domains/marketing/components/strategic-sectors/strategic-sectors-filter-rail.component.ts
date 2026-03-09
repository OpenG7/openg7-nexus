import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';

import {
  StrategicFilterKey,
  StrategicFilterOption,
  StrategicFilterValueMap,
} from '../../pages/strategic-sectors.models';

@Component({
  selector: 'og7-strategic-sectors-filter-rail',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './strategic-sectors-filter-rail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StrategicSectorsFilterRailComponent {
  readonly filterKeys = input.required<readonly StrategicFilterKey[]>();
  readonly values = input.required<StrategicFilterValueMap>();
  readonly optionsByKey = input.required<Readonly<Record<StrategicFilterKey, readonly StrategicFilterOption[]>>>();

  readonly filterChange = output<{ key: StrategicFilterKey; value: string }>();
  readonly resetFilters = output<void>();
  readonly applyFilters = output<void>();

  protected readonly activeFilterCount = computed(() => {
    return this.filterKeys().reduce((count, key) => {
      return this.values()[key] === 'all' ? count : count + 1;
    }, 0);
  });

  protected emitFilterChange(key: StrategicFilterKey, value: string): void {
    this.filterChange.emit({ key, value });
  }
}
