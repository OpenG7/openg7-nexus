# \_dev/ol-demo - Corridor Intelligence

## Objectif

Faire evoluer `_dev/ol-demo` d'une demonstration technique OpenLayers vers un cockpit "Corridor Intelligence" utilisable pour explorer, analyser, comparer et prioriser des corridors interprovinciaux.

La page reste une route de developpement, mais elle doit ressembler a une surface produit credible : carte dominante, corridor actif, panneau decisionnel, KPI synchronises et hooks `data-og7` stables.

## Taches

### Phase 1 - Cadrage

- [x] Definir la cible UX : page "Corridor Intelligence" plutot que simple demo technique.
- [x] Garder la route existante `_dev/ol-demo`.
- [x] Decider ce qu'on conserve de l'actuel : donnees mock, OpenLayers, interactions hover/click, i18n, `data-og7`.

### Phase 2 - Structure page

- [x] Refactorer `openlayers-demo.page.ts` pour avoir un layout cockpit plein ecran.
- [x] Ajouter une barre superieure interne : logo/titre, onglets `Vue corridor`, `Comparaison`, `Analytics`, `Rapports`, `Alertes`.
- [x] Remplacer le hero actuel par une carte principale dominante.
- [x] Deplacer les blocs "scoreboard / comparaison MapLibre" plus bas ou derriere un onglet.

### Phase 3 - Carte OpenLayers

- [x] Ameliorer le rendu des provinces actives/inactives.
- [x] Ameliorer les corridors : ligne active, lignes secondaires, couleurs par secteur.
- [x] Ajouter/renforcer les hubs logistiques : Toronto, Montreal, Quebec City, Ottawa.
- [x] Ajouter une legende flottante.
- [x] Ajouter des controles carte : zoom, recentrer, focus corridor.
- [x] Brancher hover/click corridor vers l'etat actif.

### Phase 4 - Panneau detail

- [x] Creer un panneau droit "Brief corridor".
- [x] Ajouter les onglets : `Apercu`, `Performance`, `Risques`, `Insights`.
- [x] Afficher les infos du corridor actif : partenaire, secteur, valeur mensuelle, fiabilite, risque, capacite reservee.
- [x] Ajouter un score global visuel.
- [x] Ajouter un bloc "Insight cle".

### Phase 5 - KPI rail

- [x] Ajouter une barre KPI en bas de la carte.
- [x] Afficher : valeur mensuelle, fiabilite, risque, capacite reservee.
- [x] Synchroniser les KPI avec le corridor selectionne.

### Phase 6 - Donnees mock

- [x] Etendre `DEMO_CORRIDORS` avec capacite, fenetre d'optimisation, score global, alertes, insights.
- [x] Ajouter plusieurs corridors comparables : Quebec -> Ontario, Alberta -> Ontario, BC -> Ontario, Quebec -> US NE.
- [x] Normaliser les labels FR/EN via les JSON i18n.

### Phase 7 - Responsive

- [x] Desktop : carte + panneau droit fixe.
- [x] Tablet : panneau sous la carte ou en colonne.
- [x] Mobile : panneau detail en drawer ou section empilee.
- [x] Verifier que les textes ne debordent pas.

### Phase 8 - Hooks et qualite

- [x] Ajouter/valider les hooks `data-og7` : `ol-demo-page`, `ol-demo-map`, `ol-demo-brief`, `ol-demo-kpi-rail`, `ol-demo-tabs`.
- [x] Garder les composants standalone/signal-first.
- [x] Verifier build.
- [ ] Tester manuellement `_dev/ol-demo`.

## Tache 1 - Cible UX

### Decision

La cible UX est un cockpit decisionnel nomme "Corridor Intelligence Platform". La page doit mettre le corridor actif au centre de l'experience et utiliser OpenLayers comme moteur geospatial, pas comme sujet principal de l'ecran.

### Intentions produit

- Explorer les corridors et leurs infrastructures sur une carte lisible.
- Analyser la performance, la valeur, la fiabilite et le risque d'un corridor.
- Comparer plusieurs corridors ou scenarios sans quitter le contexte carte.
- Decider vite grace a des KPI, alertes et insights directement lies au corridor actif.

### Contraintes a conserver

- Route : `_dev/ol-demo`.
- Composant : `og7-openlayers-demo-page`.
- Donnees initiales : mocks locaux jusqu'a branchement API.
- Interactions : hover/click corridor, selection active, recentrage carte.
- Architecture : standalone Angular, signal-first, i18n `@ngx-translate`, Tailwind.
- Hooks : conserver `data-og7="ol-demo-page"` et `data-og7="ol-demo-map"`.

### Critere d'acceptation

En arrivant sur `_dev/ol-demo`, un utilisateur doit comprendre qu'il teste une experience "Corridor Intelligence" orientee decision, meme si l'implementation reste basee sur OpenLayers et des donnees mock.

## Tache 2 - Structure cockpit initiale

### Decision

La premiere version cockpit remplace le hero explicatif par une interface produit : barre superieure interne, carte OpenLayers dominante, panneau decisionnel a droite et rail KPI synchronise.

### Ce qui est livre

- Header "Corridor Intelligence" avec onglets `Vue corridor`, `Comparaison`, `Analytics`, `Rapports`, `Alertes`.
- Carte OpenLayers gardee comme moteur principal et deplacee au centre de l'ecran.
- Carte active flottante avec partenaire, secteur et derniere mise a jour mock.
- Controles carte visibles : zoom avant, zoom arriere, effacer le focus, recentrer.
- Legende flottante sur la carte.
- Panneau droit "Brief corridor" avec onglets visuels, score global, risque, capacite reservee et insight cle.
- Rail KPI sous la carte, base sur le corridor selectionne.
- Blocs `scoreboard` et comparaison MapLibre conserves plus bas pour ne pas perdre les tests existants.

### Reste a durcir

- Rendu geospatial plus proche de la maquette : provinces mieux cadrees, hubs supplementaires, lignes plus expressives.
- Onglets du panneau droit encore visuels seulement.
- Donnees `keyInsight` et secteurs encore stockees dans les mocks TypeScript, a normaliser ensuite dans l'i18n.

## Tache 3 - Carte OpenLayers renforcee

### Decision

La carte doit porter l'experience, donc le mock geospatial doit ressembler a un reseau de corridors et pas seulement a trois lignes de test.

### Ce qui est livre

- Corridor principal Quebec -> Ontario trace via Quebec City, Montreal, Ottawa et Toronto.
- Hubs ajoutes : Quebec City, Ottawa, Winnipeg et Boston, en plus de Montreal, Toronto, Calgary et Vancouver.
- Corridors comparables ajoutes ou realignes : Alberta -> Ontario, BC -> Ontario, Quebec -> US NE.
- Provinces actives mieux differenciees par couleur et halo.
- Corridors actifs renforces avec halo, trait principal et chevrons directionnels.
- Corridors secondaires rendus en pointille plus discret.
- Hubs actifs agrandis avec halo et libelle plus lisible.

### Reste a durcir

- Les geometries restent volontairement schematiques.
- Manitoba et US NE sont representes par hubs et corridors, pas encore par polygones de zone.
- Les libelles metier des corridors restent dans le mock TypeScript.

## Tache 4 - I18n et responsive

### Decision

Les donnees mock restent locales dans `openlayers-demo.page.ts`, mais les libelles visibles doivent passer par `@ngx-translate` pour eviter une experience mixte FR/EN.

### Ce qui est livre

- Libelles de corridors, partenaires, secteurs, risques, insights et recommandations exposes dans `openlayers-demo.fr.json` et `openlayers-demo.en.json`.
- Le template consomme les cles i18n au lieu d'afficher directement les chaines mock TypeScript.
- Les libelles de carte OpenLayers utilisent aussi les traductions disponibles, avec fallback mock si les traductions ne sont pas encore chargees.
- La carte est contrainte en hauteur mobile/tablette/desktop.
- Le panneau detail reste a droite en desktop et passe sous la carte en dessous du breakpoint `lg`.
- Les overlays carte sont reduits sur mobile pour limiter les chevauchements.

### Reste a durcir

- Les onglets `Performance`, `Risques` et `Insights` sont encore des etats visuels, pas des panneaux de contenu distincts.
- Une verification visuelle Playwright multi-viewports serait utile avant de considerer la route comme reference UI.

## Tache 5 - Frontieres administratives reelles

### Decision

Les ZIP geoBoundaries servent de source brute, mais l'application ne charge que les fichiers simplifiés utiles. Pour limiter le poids navigateur, on utilise les TopoJSON simplifiés inclus dans les ZIP plutôt que les GeoJSON complets.

Les dossiers extraits `openg7-org/docs/geoBoundaries-CAN-ADM1-all` et `openg7-org/docs/geoBoundaries-USA-ADM1-all` sont conserves comme source brute de reference. Les fichiers servis par Angular restent sous `openg7-org/src/assets/geo/boundaries`.

### Ce qui est livre

- Assets extraits :
  - `openg7-org/src/assets/geo/boundaries/canada-adm1.simplified.topojson`
  - `openg7-org/src/assets/geo/boundaries/usa-adm1.simplified.topojson`
  - `openg7-org/src/assets/geo/boundaries/CITATION-AND-USE-geoBoundaries.txt`
- OpenLayers charge les frontieres ADM1 depuis ces assets au demarrage navigateur.
- Les proprietes geoBoundaries `shapeISO` / `shapeName` sont normalisees en `provinceId` / `label` pour conserver les styles et interactions existants.
- Le Canada ADM1 est charge en entier.
- Les USA ADM1 sont filtres au Nord-Est US pour le corridor `Quebec -> US NE` et pour eviter d'elargir inutilement l'emprise de la demo.
- Un fallback conserve les anciens polygones mock si les assets ne se chargent pas.
- L'attribution geoBoundaries CC BY 4.0 est ajoutee aux notes de la page.

### Reste a durcir

- Decouper les futurs fichiers Europe/Asie par region ou pays, en lazy-load.
- Ajouter un script de preparation reproductible au lieu d'extraire les ZIP manuellement.
- Ajouter une verification visuelle Playwright des frontieres chargees.
