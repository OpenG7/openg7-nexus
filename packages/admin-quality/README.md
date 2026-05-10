# @openg7/admin-quality

Portable admin-quality cockpit for Angular projects.

This package contains the standalone UI, reusable InjectionTokens, and adapter ports required by the OpenG7 admin-quality cockpit. Consuming projects provide their own adapters for matrix data, Ops telemetry, mission decisions, notifications, and route links.

Use this package when another Angular application needs the same admin-quality experience without copying OpenG7 application files. Shared AI/provider planning primitives live in `@openg7/admin-ai` and are re-exported where the cockpit needs them.

## Install in a workspace

```json
{
  "dependencies": {
    "@openg7/admin-ai": "workspace:*",
    "@openg7/admin-quality": "workspace:*"
  }
}
```

For a non-workspace consumer, publish or pack both packages together and install matching versions.

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

Only import UI and contracts from the public package entry point:

```ts
import {
  AdminQualityPage,
  AdminQualityWorkspaceDrawerComponent,
  AdminNavigationPillsComponent,
} from '@openg7/admin-quality';
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

## Adapter contract

The host application owns all side effects. Implement these ports with your own API client, notification system, and routes:

- `ADMIN_QUALITY_MATRIX_PORT`: load the matrix, recalculate it, and apply proposals.
- `ADMIN_QUALITY_OPS_PORT`: expose security snapshots, AI proof telemetry, and dispatch workflow calls.
- `ADMIN_QUALITY_MISSION_DECISIONS_PORT`: load, save, and delete mission decisions.
- `ADMIN_QUALITY_NOTIFICATIONS`: surface success, info, and error messages.
- `ADMIN_QUALITY_ROUTE_CONFIG`: map the cockpit links to host routes.

OpenG7 wires these adapters in the app layer through `provideOpenG7AdminQuality()`; other projects should provide their own implementation rather than importing OpenG7 domain services.

## AI planning helpers

Provider metadata and quota/task planning are canonical in `@openg7/admin-ai`:

```ts
import { ADMIN_AI_PROVIDER_OPTIONS } from '@openg7/admin-ai/admin-ai-providers';
import { buildMissionTasks } from '@openg7/admin-ai/mission-task-planner';
```

`@openg7/admin-quality` re-exports the pieces required by its UI for compatibility, but new domain logic should depend directly on `@openg7/admin-ai`.

## Extraction status

- Standalone UI components, route configuration, data contracts, and adapter ports are package-ready.
- AI provider defaults and mission task quota logic are shared through `@openg7/admin-ai`.
- OpenG7 provides its own Strapi and notification adapters through `provideOpenG7AdminQuality()`.
- The package builds with Angular partial compilation via `yarn workspace @openg7/admin-quality build`.
