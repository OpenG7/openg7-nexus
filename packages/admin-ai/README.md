# @openg7/admin-ai

Shared admin AI/provider planning primitives for OpenG7 workspaces.

This package is framework-agnostic TypeScript. It keeps reusable AI provider defaults and mission task/quota planning out of application folders so Angular apps, tooling, and future packages can consume one canonical implementation.

## Exports

```ts
import {
  ADMIN_AI_PROVIDER_OPTIONS,
  buildAdminAiQuotaDefaults,
  isAdminAiProvider,
  resolveAdminAiProviderOption,
} from '@openg7/admin-ai/admin-ai-providers';

import { buildMissionTasks, summarizeMissionQuota } from '@openg7/admin-ai/mission-task-planner';
```

The root entry point also re-exports both modules:

```ts
import { buildMissionTasks, resolveAdminAiProviderOption } from '@openg7/admin-ai';
```

## Provider model

`AdminAiProvider` currently supports `codex`, `copilot`, `claude`, and `gemini`. Use `isAdminAiProvider()` for runtime validation when reading query params, persisted settings, or API payloads.

```ts
const provider = isAdminAiProvider(value) ? value : 'codex';
const option = resolveAdminAiProviderOption(provider);
```

## Mission task planning

`buildMissionTasks()` converts a mission recommendation plus difficulty into alignment, implementation, validation, and proof tasks. `summarizeMissionQuota()` then compares estimated units with a provider quota.

```ts
const tasks = buildMissionTasks(recommendation, 'Medium');
const quota = summarizeMissionQuota(tasks, 160);
```

The recommendation shape is intentionally minimal and structural so host packages can pass richer objects without adapters.

## Build

```bash
yarn workspace @openg7/admin-ai build
```

`@openg7/admin-quality` builds this package first because it depends on the generated declarations.
