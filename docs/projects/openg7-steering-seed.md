**Languages:** English | Français

---

# @OpenG7 – Steering Project seeding

`tools/projects/seed-openg7-steering.ts`

This document explains how to use the **Project seeding script** to create and update
GitHub issues and Project items for:

> `@OpenG7 — Pilotage & Livraison` (GitHub Projects v2)

The script reads two declarative JSON files:

- `scripts/projects/openg7-steering-wave1.json`
- `scripts/projects/openg7-steering-wave2.json`

Each entry describes a **public TODO** to expose to contributors.

This work is referenced in **AGENTS** as:

> `AG-13.1 – Seed GitHub Project “Pilotage & Livraison” (waves JSON)`

---

## 1. What the script does

When you run:

```bash
yarn projects:seed:steering
```

the script will:

1. **Load all items** from `wave1` and `wave2` JSON files.
2. For each `WaveItem` and each `repo` listed:
   - Compute a stable slug:  
     `slug = slugify("<repo>-<title>")`
   - Look for an existing issue that contains  
     `<!-- og7-steering:<slug> -->` in its body.
   - If no issue is found:
     - Create a new issue in `ORG/repo` with:
       - title,
       - bilingual body (EN + FR),
       - labels from `labels[]`.
3. **Add the issue to the Project v2** using its `node_id`.
4. **Set Project fields** on the created Project item:
   - `Status` (column) ← `project_status`
   - `Track` ← `track`
   - `Difficulty` ← `difficulty`
   - `AGENTS ID` ← `agents_id` (if present)

The script is **idempotent**:  
re-running it will find existing issues via the `<!-- og7-steering:... -->` marker
and re-use them instead of creating duplicates.

---

## 2. JSON shape for waves

Each `WaveItem` in `openg7-steering-wave1.json` or `openg7-steering-wave2.json`
has this structure:

```json
{
  "title": "Short issue title",
  "project_status": "Backlog validated",
  "track": "Front (Angular)",
  "difficulty": "Easy",
  "repos": ["openg7-org"],
  "agents_id": "AG-1.2",
  "labels": ["map", "good first issue"],
  "body_en": "English description and context.",
  "body_fr": "Description et contexte en français."
}
```

- `project_status`  
  Maps to the **Status** single-select in the Project  
  (e.g. `Cadrage & Strategic ideas`, `Backlog validated`, `Design & Multi-repo breakdown`, etc.).

- `track`  
  Maps to the **Track** field in the Project  
  (e.g. `Front (Angular)`, `CMS (Strapi)`, `Docs + Community`…).

- `difficulty`  
  Maps to the **Difficulty** field (`Easy`, `Medium`, `Hard`).

- `repos`  
  One item can generate **issues in several repos** if needed.

- `agents_id`  
  Optional link to an `AG-X.Y` entry in `AGENTS.md`.

- `labels`  
  GitHub labels applied to the created issues.

---

## 3. Environment variables

The script uses the GitHub **REST** and **GraphQL** APIs.  
You must export the following variables before running it:

```bash
export GITHUB_TOKEN=ghp_xxx           # PAT with repo + project read/write
export GITHUB_ORG=OpenG7              # Organisation or GitHub account
export GITHUB_PROJECT_ID=PVT_xxx      # ProjectV2 node id (GraphQL)
```

- **`GITHUB_TOKEN`**  
  Minimal recommended scopes: `repo`, `project`, and optionally `read:org`.

- **`GITHUB_ORG`**  
  Defaults to `OpenG7` if not defined.

- **`GITHUB_PROJECT_ID`**  
  Retrieved via a GraphQL query (see section 4).

---

## 4. Getting the Project & field IDs (GraphQL)

### 4.1. Find the Project node ID

Use the GitHub GraphQL Explorer:

```graphql
query {
  organization(login: "OpenG7") {
    projectsV2(first: 20, query: "Pilotage & Livraison") {
      nodes {
        id
        title
        number
      }
    }
  }
}
```

- Identify the Project called **`@OpenG7 — Pilotage & Livraison`**.
- Copy the `id` (e.g. `PVT_kwDO...`) into `GITHUB_PROJECT_ID`.

### 4.2. Inspect fields and options

Then, list the Project fields:

```graphql
query ($projectId: ID!) {
  node(id: $projectId) {
    ... on ProjectV2 {
      title
      fields(first: 50) {
        nodes {
          id
          name
          dataType
          ... on ProjectV2SingleSelectField {
            options {
              id
              name
            }
          }
        }
      }
    }
  }
}
```

Use this output to fill the `PROJECT_CONFIG` section in  
`tools/projects/seed-openg7-steering.ts`:

- `STATUS_FIELD_ID` + mapping  
  `"Backlog validated" -> OPTION_ID_STATUS_BACKLOG`, etc.
- `TRACK_FIELD_ID` + mapping for each track name.
- `DIFFICULTY_FIELD_ID` + mapping for `Easy`, `Medium`, `Hard`.
- `AGENTS_ID_FIELD_ID` for the text field `"AGENTS ID"`.

✅ Once these IDs are in place, the script can update the **custom fields** of
each Project item.

---

## 5. Running the script

### 5.1. Via Yarn

Add this in the root `package.json`:

```jsonc
{
  "scripts": {
    "projects:seed:steering": "ts-node tools/projects/seed-openg7-steering.ts",
  },
}
```

Then run:

```bash
# From the monorepo root
yarn projects:seed:steering
```

### 5.2. What you should see

For each item / repo, the script logs:

- creation or detection of an existing issue,
- the issue URL,
- the Project item ID,
- any warnings if a `status` or `track` does not match a known option.

Example logs:

```text
######## Processing wave file: scripts/projects/openg7-steering-wave1.json ########

=== [openg7-org] Implement hero section with CTAs (AG-1.2) ===
Created issue #42 in OpenG7/openg7-org: https://github.com/OpenG7/openg7-org/issues/42
  ↳ Project item id: PVTI_lAHK...

=== [docs] Explain AGENTS.md for new contributors ===
Found existing issue in OpenG7/docs: #7 (https://github.com/OpenG7/docs/issues/7)
  ↳ Project item id: PVTI_...
```

---

## 6. Idempotence & updates

The script uses a hidden HTML comment marker in the issue body:

```md
<!-- og7-steering:<slug> -->
```

where:

```ts
slug = slugify('<repo>-<title>');
```

The script first searches for issues containing this marker before creating a new one.

This allows you to:

- re-run the seed safely,
- manually edit issue titles without breaking the link,
- keep a **stable mapping** between JSON waves and issues.

If you edit `body_en` / `body_fr` / `labels` in JSON, you can extend the script later
to also update existing issues (currently, it only creates and links them).

---

## 7. Troubleshooting

### 7.1. 401 / 403 from GitHub

Check `GITHUB_TOKEN`:

- Is it valid?
- Does it have enough scopes (`repo`, `project`)?

Check that the token has access to:

- the `ORG` (`OpenG7` or your own user),
- the repositories listed in `repos[]`.

### 7.2. “Unknown status / track / difficulty”

If you see logs like:

```text
⚠ Unknown status "Backlog validated" – skipping Status field update
```

Either:

- the spelling in JSON does not match the **option name** in the Project, or
- you forgot to map this value in `PROJECT_CONFIG.fields.status.options`.

Align the names or update the mapping, then re-run the script.

### 7.3. Item appears as note instead of issue

If you manually add a note to the Project, it will not be tied to an issue.

This script always creates **real issues**, then adds them to the Project as items.

If you see “note-only” items that duplicate an issue created by the script,
you can safely delete those notes from the Project.

---

## 8. Maintenance & future work

- Add support for **updating existing issues** when JSON changes  
  (labels, body, title).
- Add a `--dry-run` mode to log actions without calling the API.
- Add a GitHub Actions workflow that can run the seed script on demand  
  (manually via `workflow_dispatch`).

---

## 🇫🇷 Résumé rapide pour mainteneurs

- Les TODO publics de la roadmap OpenG7 sont décrits dans 2 fichiers JSON :  
  `scripts/projects/openg7-steering-wave1.json` et `scripts/projects/openg7-steering-wave2.json`.
- Le script `tools/projects/seed-openg7-steering.ts` :
  - crée les issues dans les bons dépôts,
  - les ajoute au Project GitHub `@OpenG7 — Pilotage & Livraison`,
  - remplit les champs `Status`, `Track`, `Difficulty`, `AGENTS ID`.
- Commande à retenir :

```bash
yarn projects:seed:steering
```

- Il utilise des variables d’environnement (`GITHUB_TOKEN`, `GITHUB_ORG`, `GITHUB_PROJECT_ID`)
  et des IDs de champs récupérés via GraphQL.

L’objectif est que toute nouvelle vague de tâches (`wave3`, `wave4`, …)
puisse être ajoutée en modifiant uniquement des JSON déclaratifs,
sans avoir à recréer les issues ni les items de Project à la main.
