import type { CountryCode } from '@app/core/models/country';
import {
  StatisticsFilters,
  StatisticsPayload,
  StatisticsScope,
  StatisticsIntrant,
} from '@app/core/models/statistics';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const StatisticsActions = createActionGroup({
  source: 'Statistics',
  events: {
    Initialize: emptyProps(),
    'Reset Filters': emptyProps(),
    'Change Scope': props<{ scope: StatisticsScope }>(),
    'Change Intrant': props<{ intrant: StatisticsIntrant }>(),
    'Change Period': props<{ period: string | null }>(),
    'Change Province': props<{ province: string | null }>(),
    'Change Country': props<{ country: CountryCode | null }>(),
    'Load Statistics': props<{ filters: StatisticsFilters }>(),
    'Load Statistics Success': props<{ payload: StatisticsPayload }>(),
    'Load Statistics Failure': props<{ error: string }>(),
  },
});
