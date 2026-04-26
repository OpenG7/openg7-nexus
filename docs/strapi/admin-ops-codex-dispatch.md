# Admin Ops Codex Dispatch

This guide documents the Strapi backend endpoint used to trigger the GitHub Actions Codex v1 workflow from an owner/admin surface.

## Endpoint

- `POST /api/admin/ops/codex/dispatch`
- Auth: authenticated user with role `Admin` or `Owner`
- Policy: `global::owner-admin-ops`

## Request payload

```json
{
  "task": "Fix the login empty state and add a focused test.",
  "scope": "openg7-org",
  "baseBranch": "main",
  "draftPr": true,
  "model": "gpt-5.4",
  "effort": "medium"
}
```

## Validation rules

- `task` is required and trimmed to 2000 characters.
- `scope` must belong to `OPS_CODEX_ALLOWED_SCOPES`.
- `baseBranch` must belong to `OPS_CODEX_ALLOWED_BASE_BRANCHES`.
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

## Response shape

Successful responses return a small queue acknowledgement:

```json
{
  "data": {
    "queued": true,
    "provider": "github-actions",
    "owner": "OpenG7",
    "repo": "openg7-platform",
    "workflow": "codex-pr.yml",
    "ref": "main",
    "requestedAt": "2026-04-25T12:00:00.000Z",
    "request": {
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

## Operating model

This endpoint is intentionally thin:

- Strapi validates operator intent.
- GitHub keeps the `OPENAI_API_KEY` secret and executes Codex.
- The workflow creates a dedicated branch and opens a PR.
- Human review still gates merge.

That keeps Codex secrets and branch automation outside the Angular app while giving OpenG7 a single backend control point for audits and future rate limiting.
