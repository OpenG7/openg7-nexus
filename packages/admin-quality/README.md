# @openg7/admin-quality

Portable admin-quality cockpit for Angular projects.

This package contains the standalone UI, reusable InjectionTokens, and adapter ports required by the OpenG7 admin-quality cockpit. Consuming projects provide their own adapters for matrix data, Ops telemetry, mission decisions, notifications, and route links.

## Route it

```ts
import { Routes } from '@angular/router';
import { AdminQualityPage } from '@openg7/admin-quality';

export const routes: Routes = [
  {
    path: 'admin/quality',
    component: AdminQualityPage,
    providers: [...adminQualityProviders],
  },
];
```

## Provide adapters

```ts
import {
  ADMIN_QUALITY_MATRIX_PORT,
  ADMIN_QUALITY_NOTIFICATIONS,
  ADMIN_QUALITY_OPS_PORT,
  ADMIN_QUALITY_MISSION_DECISIONS_PORT,
  ADMIN_QUALITY_ROUTE_CONFIG,
} from '@openg7/admin-quality';

export const adminQualityProviders = [
  { provide: ADMIN_QUALITY_MATRIX_PORT, useExisting: MyMatrixService },
  { provide: ADMIN_QUALITY_OPS_PORT, useExisting: MyOpsService },
  { provide: ADMIN_QUALITY_MISSION_DECISIONS_PORT, useExisting: MyMissionDecisionService },
  { provide: ADMIN_QUALITY_NOTIFICATIONS, useExisting: MyNotificationService },
  {
    provide: ADMIN_QUALITY_ROUTE_CONFIG,
    useValue: {
      adminHome: '/admin',
      adminOps: '/admin/ops',
      adminQuality: '/admin/quality',
    },
  },
];
```

## Extraction status

- Standalone UI components, route configuration, data contracts, and adapter ports are package-ready.
- OpenG7 provides its own Strapi and notification adapters through `provideOpenG7AdminQuality()`.
- The package builds with Angular partial compilation via `yarn workspace @openg7/admin-quality build`.
