import { inject, Injectable } from '@angular/core';
import { StatisticsService } from '@app/core/services/statistics.service';
import { StatisticsFilters } from '@app/core/models/statistics';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { catchError, map, of, switchMap, withLatestFrom } from 'rxjs';

import { StatisticsActions } from './statistics.actions';
import { selectStatisticsFilters } from './statistics.selectors';

/**
 * Contexte : Enregistrée dans NgRx afin de réagir aux actions gérées au sein de « store/statistics ».
 * Raison d’être : Orchestre les flux asynchrones et la synchronisation du domaine « Statistics ».
 * @param dependencies Dépendances injectées automatiquement par Angular.
 * @returns StatisticsEffects gérée par le framework.
 */
@Injectable()
export class StatisticsEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly service = inject(StatisticsService);

  readonly initialize$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StatisticsActions.initialize),
      withLatestFrom(this.store.select(selectStatisticsFilters)),
      map(([, filters]) => StatisticsActions.loadStatistics({ filters }))
    )
  );

  readonly triggerLoad$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        StatisticsActions.resetFilters,
        StatisticsActions.changeScope,
        StatisticsActions.changeIntrant,
        StatisticsActions.changePeriod,
        StatisticsActions.changeProvince,
        StatisticsActions.changeCountry
      ),
      withLatestFrom(this.store.select(selectStatisticsFilters)),
      map(([action, filters]) =>
        StatisticsActions.loadStatistics({ filters: resolveTriggeredFilters(action, filters) })
      )
    )
  );

  readonly loadStatistics$ = createEffect(() =>
    this.actions$.pipe(
      ofType(StatisticsActions.loadStatistics),
      switchMap(({ filters }) =>
        this.service.fetch(filters).pipe(
          map((payload) => StatisticsActions.loadStatisticsSuccess({ payload })),
          catchError((error: unknown) =>
            of(
              StatisticsActions.loadStatisticsFailure({
                error: error instanceof Error ? error.message : 'Unable to load statistics',
              })
            )
          )
        )
      )
    )
  );
}

type StatisticsTriggerAction =
  | ReturnType<typeof StatisticsActions.resetFilters>
  | ReturnType<typeof StatisticsActions.changeScope>
  | ReturnType<typeof StatisticsActions.changeIntrant>
  | ReturnType<typeof StatisticsActions.changePeriod>
  | ReturnType<typeof StatisticsActions.changeProvince>
  | ReturnType<typeof StatisticsActions.changeCountry>;

const DEFAULT_FILTERS: StatisticsFilters = {
  scope: 'interprovincial',
  intrant: 'all',
  period: null,
  province: null,
  country: null,
};

const resolveTriggeredFilters = (
  action: StatisticsTriggerAction,
  filters: StatisticsFilters
): StatisticsFilters => {
  switch (action.type) {
    case StatisticsActions.resetFilters.type:
      return DEFAULT_FILTERS;
    case StatisticsActions.changeScope.type:
      return {
        ...filters,
        scope: action.scope,
        period: null,
        province: null,
        country: null,
      };
    case StatisticsActions.changeIntrant.type:
      return {
        ...filters,
        intrant: action.intrant,
        period: null,
        province: null,
        country: null,
      };
    case StatisticsActions.changePeriod.type:
      return {
        ...filters,
        period: action.period,
      };
    case StatisticsActions.changeProvince.type:
      return {
        ...filters,
        province: action.province,
      };
    case StatisticsActions.changeCountry.type:
      return {
        ...filters,
        country: action.country,
      };
    default:
      return filters;
  }
};
