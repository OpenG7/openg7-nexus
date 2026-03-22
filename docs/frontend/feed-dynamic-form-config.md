# Dynamic Feed Publication Forms

## Goal

Drive feed publication forms from JSON configs so actor-specific use cases can vary without cloning Angular components.

Initial target:

- `energy-surplus-offer`

## Proposed Files

```txt
openg7-org/src/app/domains/feed/feature/
  form-config/
    publication-form-config.models.ts
    forms/
      energy-surplus-offer.json
  dynamic-publication-form/
    og7-dynamic-publication-form.component.ts
    og7-dynamic-publication-form.component.html
    og7-dynamic-publication-form.component.spec.ts
  services/
    publication-form-config.service.ts
    publication-form-mapper.service.ts
```

## Minimal Angular Plan

### 1. Load the JSON config

Create `PublicationFormConfigService` that returns a `PublicationFormConfig` for a given `formKey`.

Minimal MVP options:

- import the JSON statically once `resolveJsonModule` is enabled
- or fetch it from `assets/forms/*.json`

Recommended first step:

- store configs under `src/assets/forms/`
- fetch them with `HttpClient`

Reason:

- no TypeScript compiler dependency on JSON imports
- easier runtime extension later

### 2. Build a reactive `FormGroup`

Create `Og7DynamicPublicationFormComponent` that:

- accepts `config: PublicationFormConfig`
- creates one `FormControl` per configured field
- applies declarative validators
- renders sections and fields in order

Suggested component API:

```ts
@Component({...})
export class Og7DynamicPublicationFormComponent {
  readonly config = input.required<PublicationFormConfig>();
  readonly submitted = output<Record<string, unknown>>();
}
```

### 3. Map form values to a publication draft

Create `PublicationFormMapperService` that:

- receives `PublicationFormConfig`
- receives raw form values
- builds a `FeedComposerDraft`
- returns an `extensions` object for fields not yet represented in `FeedComposerDraft`

Suggested return type:

```ts
interface PublicationFormSubmission {
  draft: FeedComposerDraft;
  extensions: Record<string, unknown>;
}
```

### 4. Integrate into the current feed publish drawer

Short-term integration path:

- keep `og7-feed-composer` as the shell
- add a `formKey` selection step
- render the dynamic form when a config-backed template is chosen
- reuse `feed.publishDraft()` for submission

### 5. Preserve backward compatibility

Do not remove the current generic composer first.

Use a feature flag or branching logic:

- generic mode = current composer
- template mode = dynamic form renderer

## MVP Scope for `energy-surplus-offer`

Deliverable checklist:

1. Load `energy-surplus-offer.json`
2. Render the configured fields
3. Build a valid `FeedComposerDraft`
4. Submit through `FeedRealtimeService.publishDraft()`
5. Keep extra energy-specific values in an `extensions` object for later backend support

## Important Constraint

The current `FeedComposerDraft` does not carry all business-specific fields needed by Hydro-Quebec.

For the MVP:

- map what fits into the existing draft
- preserve the remaining values in `extensions`

For V2:

- add a richer backend payload and persistence model for domain-specific publications

## Follow-up Implementation Tasks

1. Add `resolveJsonModule` or move configs under `src/assets/forms`
2. Implement `PublicationFormConfigService`
3. Implement `Og7DynamicPublicationFormComponent`
4. Implement `PublicationFormMapperService`
5. Add unit tests for config loading, control creation, and draft mapping
6. Wire `energy-surplus-offer` into the feed publish drawer
