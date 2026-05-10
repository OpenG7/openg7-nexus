# Angular app structure — domain-first layout

L'application Angular est désormais organisée autour d'un dossier `src/app/domains/` qui regroupe tout le code lié à un domaine fonctionnel (pages, composants de section, services dédiés, state). Les éléments transverses vivent dans `src/app/shared/`.

```
src/app/
├─ app.component.*
├─ app.routes.ts
├─ core/                     # services et utilitaires transverses
├─ domains/
│  ├─ auth/
│  │  └─ pages/              # login, register, forgot/reset-password, etc.
│  ├─ admin/
│  │  └─ pages/              # admin dashboard, confiance, prévisualisations CMS
│  ├─ account/
│  │  └─ pages/              # profil, favoris, onboarding entreprise
│  ├─ developer/
│  │  └─ pages/              # pages de démonstration (_dev)
│  ├─ enterprise/
│  │  ├─ og7-entreprise.*    # page publique d'une entreprise
│  │  └─ pages/              # parcours d'inscription entreprise
│  ├─ feed/
│  │  └─ feature/            # routes + composants du flux social
│  ├─ home/
│  │  ├─ feature/            # sections de la homepage (hero, statistiques, carte…)
│  │  └─ pages/              # composition de la homepage
│  ├─ marketing/
│  │  └─ pages/              # pages marketing (features, pricing…)
│  ├─ matchmaking/
│  │  ├─ og7-mise-en-relation/
│  │  │  └─ components/      # stepper d'introduction
│  │  └─ sections/           # panneaux de mise en relation
│  ├─ opportunities/
│  │  ├─ sections/           # section « matches » réutilisable
│  │  └─ pages/              # demos timeline opportunité
│  ├─ search/
│  │  └─ feature/            # quick search modal / services associés
│  ├─ statistics/
│  │  └─ pages/              # pages stats publiques
│  └─ static/
│     └─ pages/              # privacy, legal, faq…
├─ shared/
│  ├─ components/            # UI transverses (CTA, hero, formulaires…)
│  ├─ directives/            # directives utilitaires (Ctrl+K, décorations…)
│  └─ styles/                # styles globaux réutilisables
├─ state/                    # signals stores
└─ store/                    # NgRx
```

### Comment lire/écrire du code avec cette structure ?

- **Domaine = point d'entrée** : lorsque l'on ajoute une page ou un composant métier, on crée (ou réutilise) un sous-dossier dans `domains/<domaine>/` et on y place pages, services spécifiques et tests associés.
- **Pages standalone** : toutes les routes chargées dynamiquement depuis `app.routes.ts` vivent sous `domains/<domaine>/pages/` avec un fichier `<slug>.page.ts` qui exporte un composant standalone.
- **Sections réutilisables** : les composants partagés entre plusieurs domaines mais spécifiques à un contexte restent dans le domaine concerné (ex. `domains/opportunities/sections`).
- **Transverse vs. spécifique** : si un composant est réutilisé dans plusieurs domaines non liés, il doit migrer vers `shared/components` et être consommé via l'alias `@app/shared/...`.

### Aliases TypeScript

Pour faciliter les imports après ce refactoring, `tsconfig.json` expose trois alias :

- `@app/*` → `src/app/*`
- `@app/domains/*` → `src/app/domains/*`
- `@app/shared/*` → `src/app/shared/*`

L'objectif est de supprimer les imports relatifs fragiles (`../../..`) dans les nouvelles contributions.
