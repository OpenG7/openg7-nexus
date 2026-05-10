import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { injectNotificationStore } from '@app/core/observability/notification.store';

import { AdminOpsService } from './admin-ops.service';
import { AdminQualityMatrixService } from './admin-quality-matrix.service';
import { AdminQualityMissionDecisionsService } from './admin-quality-mission-decisions.service';
import {
  ADMIN_QUALITY_MATRIX_PORT,
  ADMIN_QUALITY_MISSION_DECISIONS_PORT,
  ADMIN_QUALITY_NOTIFICATIONS,
  ADMIN_QUALITY_OPS_PORT,
  ADMIN_QUALITY_ROUTE_CONFIG,
  AdminQualityRouteConfig,
  DEFAULT_ADMIN_QUALITY_ROUTE_CONFIG,
} from './admin-quality.ports';

export function provideOpenG7AdminQuality(
  routeConfig: Partial<AdminQualityRouteConfig> = {},
): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ADMIN_QUALITY_MATRIX_PORT, useExisting: AdminQualityMatrixService },
    { provide: ADMIN_QUALITY_OPS_PORT, useExisting: AdminOpsService },
    {
      provide: ADMIN_QUALITY_MISSION_DECISIONS_PORT,
      useExisting: AdminQualityMissionDecisionsService,
    },
    { provide: ADMIN_QUALITY_NOTIFICATIONS, useFactory: injectNotificationStore },
    {
      provide: ADMIN_QUALITY_ROUTE_CONFIG,
      useValue: {
        ...DEFAULT_ADMIN_QUALITY_ROUTE_CONFIG,
        ...routeConfig,
      },
    },
  ]);
}
