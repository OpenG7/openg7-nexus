# Mot de passe oublié ? - Page Preview

![Capture de la page "Mot de passe oublié ?"](browser:/invocations/dhryvggh/artifacts/artifacts/forgot-password-page.png)

Cette capture a été réalisée avec `ng serve --host 0.0.0.0` sur le projet `openg7-org`, puis Playwright (`chromium`).

## Reproduction rapide

```bash
cd openg7-nexus/openg7-org
yarn start --host 0.0.0.0
```

Ensuite, lancer le script Playwright :

```bash
playwright install chromium
playwright screenshot http://localhost:4200/forgot-password docs/frontend/forgot-password-page.png
```

> Le binaire Playwright peut nécessiter un proxy ou un accès réseau selon l'environnement.
