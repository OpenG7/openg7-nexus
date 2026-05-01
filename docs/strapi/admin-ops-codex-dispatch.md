# Admin Ops AI Dispatch

This guide documents the Strapi backend endpoint used to trigger provider-specific GitHub Actions workflows from an owner/admin surface.

## Endpoint

- `GET /api/admin/ops/ai/proofs`
- `POST /api/admin/ops/ai/dispatch`
- Compatibility alias: `POST /api/admin/ops/codex/dispatch`
- Auth: authenticated user with role `Admin` or `Owner`
- Policy: `global::owner-admin-ops`

## Proof telemetry response

`GET /api/admin/ops/ai/proofs` returns the latest observable GitHub evidence for each provider workflow. The response is read-only and meant for Mission Control / Ops dashboards.

```json
{
  "data": {
    "generatedAt": "2026-04-30T12:00:00.000Z",
    "providers": [
      {
        "provider": "codex",
        "label": "Codex",
        "workflow": "codex-pr.yml",
        "state": "completed",
        "summary": "Workflow #51 completed with 2 artifact(s) and PR #321.",
        "run": {
          "id": 501,
          "number": 51,
          "url": "https://github.com/OpenG7/openg7-nexus/actions/runs/501",
          "status": "completed",
          "conclusion": "success",
          "branch": "codex/qa-proof-501",
          "createdAt": "2026-04-30T00:00:00.000Z",
          "updatedAt": "2026-04-30T00:08:00.000Z"
        },
        "artifacts": [
          {
            "id": 9001,
            "name": "playwright-report",
            "sizeBytes": 2048,
            "expired": false,
            "url": "https://github.com/OpenG7/openg7-nexus/actions/runs/501#artifacts"
          }
        ],
        "pullRequest": {
          "number": 321,
          "title": "Codex QA proof package",
          "url": "https://github.com/OpenG7/openg7-nexus/pull/321",
          "state": "open",
          "merged": false,
          "branch": "codex/qa-proof-501"
        }
      }
    ]
  }
}
```

States are intentionally coarse:

- `queued` -> the workflow has been accepted by GitHub and is waiting to start.
- `in-progress` -> the provider lane is actively generating proof.
- `completed` -> the latest run finished successfully and artifacts/PR evidence can be reviewed.
- `failed` -> the latest run finished but did not conclude successfully.
- `unavailable` -> no run is observable yet or GitHub monitoring is not configured.

## Request payload

```json
{
  "provider": "copilot",
  "task": "Fix the login empty state and add a focused test.",
  "scope": "openg7-org",
  "baseBranch": "main",
  "draftPr": true,
  "model": "gpt-5.4",
  "effort": "medium"
}
```

## Validation rules

- `provider` accepts `codex`, `copilot`, `claude`, or `gemini`. Omit it to keep the legacy `codex` default.
- `task` is required and trimmed to 2000 characters.
- `scope` must belong to the allowlist resolved for the selected provider.
- `baseBranch` must belong to the branch allowlist resolved for the selected provider.
- `draftPr` defaults to `true`.
- `model` and `effort` are optional pass-through fields.

## Environment variables

- `OPS_CODEX_DISPATCH_ENABLED` - set to `true` to enable the endpoint.
- `OPS_CODEX_GITHUB_TOKEN` - GitHub token or GitHub App installation token used to call the Actions API.
- `OPS_CODEX_GITHUB_OWNER` - repository owner.
- `OPS_CODEX_GITHUB_REPO` - repository name.
- `OPS_CODEX_GITHUB_WORKFLOW` - workflow file or workflow identifier, default `codex-pr.yml`.
- `OPS_CODEX_GITHUB_REF` - git ref used for the dispatch API call, default `main`.
- `OPS_CODEX_GITHUB_API_URL` - defaults to `https://api.github.com`; override for GitHub Enterprise.
- `OPS_CODEX_ALLOWED_SCOPES` - comma-separated allowlist of workflow scopes.
- `OPS_CODEX_ALLOWED_BASE_BRANCHES` - comma-separated allowlist of base branches accepted from callers.
- `OPS_CODEX_TIMEOUT_MS` - outbound GitHub API timeout in milliseconds.

Optional multi-provider overrides use the `OPS_AI_*` namespace:

- `OPS_AI_GITHUB_TOKEN`, `OPS_AI_GITHUB_OWNER`, `OPS_AI_GITHUB_REPO`, `OPS_AI_GITHUB_API_URL`
- `OPS_AI_ALLOWED_SCOPES`, `OPS_AI_ALLOWED_BASE_BRANCHES`, `OPS_AI_TIMEOUT_MS`
- `OPS_AI_<PROVIDER>_DISPATCH_ENABLED`
- `OPS_AI_<PROVIDER>_GITHUB_WORKFLOW`
- `OPS_AI_<PROVIDER>_GITHUB_REF`

`<PROVIDER>` can be `COPILOT`, `CLAUDE`, or `GEMINI`. Non-Codex providers fall back to `OPS_AI_*` first and then to the legacy `OPS_CODEX_*` values for shared GitHub owner/repo/token settings.

## Workflow files and provider secrets

- `codex` -> `.github/workflows/codex-pr.yml` using `OPENAI_API_KEY`
- `claude` -> `.github/workflows/claude-pr.yml` using `ANTHROPIC_API_KEY`
- `gemini` -> `.github/workflows/gemini-pr.yml` using `GEMINI_API_KEY` by default; adapt the workflow if you prefer Vertex AI or Gemini Code Assist via repository variables
- `copilot` -> `.github/workflows/copilot-pr.yml` is a guarded placeholder that fails fast on purpose; keep `OPS_AI_COPILOT_DISPATCH_ENABLED=false` until GitHub exposes a stable automation surface for Copilot branch-and-PR runs in this repository

The Claude and Gemini workflows mirror the existing Codex flow: checkout the requested base branch, constrain the prompt to the selected scope, let the provider edit the repo, then open a PR with `peter-evans/create-pull-request`.

## Local development keys

For local development, each developer may place their own provider key in `strapi/.env`:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`

This local key is meant to unblock local platform development and to let the admin cockpit surface that a provider key is available on the workstation. It does not replace the repository GitHub Actions secret required by the remote branch-and-PR workflows.

In practice:

- local `OPENAI_API_KEY` in `strapi/.env` -> local development key detected for Codex
- repository secret `OPENAI_API_KEY` in GitHub Actions -> required for `.github/workflows/codex-pr.yml`

The same split applies to Claude and Gemini.

## Kubernetes wiring

The production manifest now exposes the non-secret settings through the shared Strapi `ConfigMap` and expects the GitHub token from the Kubernetes secret `strapi-github-actions` under the key `codex-github-token`.

The deployment keeps the secret optional so environments that do not use AI dispatch can leave it unset while all dispatch flags remain `false`.

## Response shape

Successful responses return a small queue acknowledgement:

```json
{
  "data": {
    "queued": true,
    "provider": "github-actions",
    "selectedProvider": "copilot",
    "owner": "OpenG7",
    "repo": "openg7-nexus",
    "workflow": "copilot-pr.yml",
    "ref": "main",
    "requestedAt": "2026-04-25T12:00:00.000Z",
    "request": {
      "selectedProvider": "copilot",
      "scope": "openg7-org",
      "baseBranch": "main",
      "draftPr": true,
      "model": "gpt-5.4",
      "effort": "medium",
      "taskLength": 49
    }
  }
}
```

## Failure modes

- `400` when the payload is missing or violates the allowlists.
- `403` when the authenticated user is not `Admin` or `Owner`.
- `503` when the integration is disabled or missing required GitHub configuration.
- `502` when GitHub rejects or times out the workflow dispatch.
- A dispatched workflow run can still fail later if the provider-specific secret is missing or, for `copilot`, if the placeholder workflow is enabled accidentally.

## Admin quality launch path

`/admin/quality` now uses the same backend control point instead of relying on a local quota estimate:

- Mission Control reads `/api/admin/ops/security` and only arms the launch action when the selected provider has `dispatchEnabled=true`, `keyInserted=true`, and `state="ready"`.
- Mission Control also reads `/api/admin/ops/ai/proofs` to surface the latest workflow run, PR lane, and artifact package for each provider.
- The launch button dispatches the selected mission directly through `POST /api/admin/ops/ai/dispatch` after an explicit browser confirmation.
- The prompt, scope, base branch, draft PR flag, model, and provider are still the same fields shown in `/admin/ops`; `/admin/ops` remains the manual inspection and retry surface.
- Mission status changes to `in-progress` only after the backend has accepted the GitHub workflow dispatch.

## Operating model

This endpoint is intentionally thin:

- Strapi validates operator intent.
- GitHub keeps provider secrets and executes the selected workflow.
- The workflow creates a dedicated branch and opens a PR.
- Human review still gates merge.

That keeps AI provider secrets and branch automation outside the Angular app while giving OpenG7 a single backend control point for audits and future rate limiting.
