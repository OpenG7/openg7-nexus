# Rapport d'audit fonctionnel

## Objet

Ce document synthétise les fonctionnalités du projet `ngx-maplibre-gl` pour une lecture depuis un autre projet.
Il décrit ce que la librairie expose, le niveau de validation observable dans le dépôt, ainsi que les points de vigilance avant adoption.

## Périmètre audité

- Librairie Angular `@maplibre/ngx-maplibre-gl`
- Showcase applicatif et routes de démonstration
- Couverture de tests unitaires et end-to-end présente dans le dépôt

Sources principales consultées:

- `projects/ngx-maplibre-gl/src/public_api.ts`
- `projects/ngx-maplibre-gl/src/lib/**`
- `projects/showcase/src/app/demo/routes.ts`
- `projects/showcase/cypress/e2e/**`
- `README.md`

## Synthèse exécutive

`ngx-maplibre-gl` est un wrapper Angular moderne autour de `maplibre-gl`.
La librairie couvre correctement les besoins de base et intermédiaires d'un projet cartographique Angular:

- instanciation déclarative d'une carte MapLibre
- configuration fine des options de carte
- branchement de sources et couches déclaratives
- marqueurs HTML, popups et contrôles natifs ou personnalisés
- cas avancés comme clusters HTML, terrain 3D et projection globe

Le showcase est large et démontre un spectre fonctionnel important. En revanche, la couverture automatisée est inégale: le coeur de la carte et plusieurs primitives ont des tests ciblés, mais une grande partie des démos avancées n'est validée que par chargement runtime ou par démonstration manuelle.

Conclusion pour un autre projet:

- bon candidat si vous cherchez une intégration Angular déclarative de MapLibre
- particulièrement solide sur la composition carte, couches, sources, marqueurs et popups
- nécessite un renfort de tests côté consommateur pour les usages avancés ou critiques métier

## Inventaire fonctionnel

### 1. Carte principale et cycle de vie

Surface exposée:

- `mgl-map`
- `MapService`
- `NgxMapLibreGLModule`

Capacités observées:

- création de la carte à partir d'un style MapLibre
- support standalone Angular ou import par module
- exposition d'un grand nombre d'inputs MapLibre natifs
- mises à jour dynamiques de la caméra et de paramètres runtime
- support de `jumpTo`, `easeTo`, `flyTo`
- support `fitBounds`, `fitScreenCoordinates`, `panTo`, curseur custom
- support terrain et projection déclarative
- exposition d'une large surface d'événements carte

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/map/map.component.ts`
- tests unitaires sur initialisation et mises à jour de pitch/zoom
- démos `display-map`, `set-style`, `interactive-false`, `language-switch`, `zoomto-linestring`, `center-on-symbol`

### 2. Sources de données

Surface exposée:

- `mgl-source` via `SourceDirective`
- sources `vector`, `geojson`, `raster`, `raster-dem`, `image`, `video`, `canvas`
- `mgl-feature` pour composition GeoJSON

Capacités observées:

- ajout et retrait déclaratifs de sources
- recréation de source après rechargement de style
- rafraîchissement explicite d'une source
- support des sources nécessaires aux usages 2D et 3D
- fonctions de cluster accessibles via `GeoJSONSourceComponent`

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/source/**`
- tests unitaires sur ajout/retrait de source et refresh
- démos `live-update-feature`, `live-update-image-source`, `cluster`, `cluster-html`, `terrain`, `terrain-style`

### 3. Couches et stylage

Surface exposée:

- `mgl-layer`
- `mgl-image`

Capacités observées:

- ajout de couches déclaratives reliées aux sources
- mise à jour dynamique de certains paramètres de couche
- ajout d'images au style et mise à jour d'images
- cas de style avancés: heatmap, bâtiments 3D, lignes GeoJSON, hover effects, bascule de style
- masquage et affichage de couches

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/layer/layer.component.ts`
- `projects/ngx-maplibre-gl/src/lib/image/image.component.ts`
- tests unitaires sur cycle de vie couche/image
- démos `toggle-layers`, `heatmap`, `3d-buildings`, `geojson-line`, `ngx-geojson-line`, `add-image`, `add-image-generated`, `add-image-missing-generated`

### 4. Marqueurs et drag

Surface exposée:

- `mgl-marker`
- directive `mglDraggable`

Capacités observées:

- marqueurs HTML Angular avec contenu custom
- positionnement par coordonnées ou feature GeoJSON
- rotation, alignement, opacité, popup associé
- drag de marqueur
- drag déclaratif d'un point GeoJSON via couche cible

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/marker/marker.component.ts`
- `projects/ngx-maplibre-gl/src/lib/draggable/draggable.directive.ts`
- tests unitaires sur cycle de vie du marqueur
- démos `custom-marker-icons`, `ngx-custom-marker-icons`, `ngx-marker-rotate`, `drag-a-marker`, `ngx-drag-a-point`, `marker-alignment`

### 5. Popups et overlays

Surface exposée:

- `mgl-popup`
- `mgl-control`

Capacités observées:

- popup attaché à des coordonnées, une feature ou un marqueur
- mise à jour dynamique de la position et de l'offset
- écoute des événements d'ouverture et fermeture
- contrôle custom rendu via template Angular

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/popup/popup.component.ts`
- `projects/ngx-maplibre-gl/src/lib/control/control.component.ts`
- tests unitaires sur retrait de popup
- démos `popup`, `set-popup`, `popup-on-click`, `polygon-popup-on-click`, `ngx-custom-control`

### 6. Contrôles natifs MapLibre

Surface exposée:

- `mglNavigation`
- `mglGeolocate`
- `mglFullscreen`
- `mglAttribution`
- `mglScale`
- `mglTerrain`
- `mglGlobe`

Capacités observées:

- ajout déclaratif des contrôles natifs MapLibre à l'intérieur de `mgl-control`
- positionnement de contrôle
- support des options spécifiques selon le contrôle
- contrôle terrain pour activer/désactiver le relief
- contrôle globe pour projection globe

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/control/**`
- démos `navigation`, `locate-user`, `fullscreen`, `attribution-position`, `ngx-scale-control`, `terrain-control`, `globe`

### 7. Clusters HTML avancés

Surface exposée:

- `mgl-markers-for-clusters`
- templates `mglPoint` et `mglClusterPoint`

Capacités observées:

- rendu de clusters et points individuels sous forme de marqueurs HTML Angular
- mise à jour sur mouvements de carte et sur rafraîchissement de source
- possibilité d'injecter deux templates distincts pour points et clusters

Éléments de preuve:

- `projects/ngx-maplibre-gl/src/lib/markers-for-clusters/markers-for-clusters.component.ts`
- démos `cluster-html` et `ngx-cluster-html`

## Couverture observable

### Tests unitaires ciblés

Couverture présente sur les primitives suivantes:

- carte (`MapComponent`, `MapService`)
- couche (`LayerComponent`)
- image (`ImageComponent`)
- marqueur (`MarkerComponent`)
- popup (`PopupComponent`)
- source générique et source GeoJSON (`SourceDirective`, `GeoJSONSourceComponent`)

Ce que ces tests valident principalement:

- création et destruction correctes des objets MapLibre
- propagation de quelques inputs dynamiques
- nettoyage des objets et désabonnement d'événements
- recréation correcte de source/couche dans certains cas

### End-to-end Cypress ciblés

Scénarios explicitement couverts:

- changement de langue
- mise à jour temps réel d'une feature
- changement de style
- activation et désactivation de couches
- contrôle terrain
- zoom vers une LineString
- contrôle custom Angular
- affichage et fermeture de popup
- chargement runtime d'un grand nombre de routes de démo sans erreur bloquante

Lecture d'ensemble:

- le coeur de l'intégration Angular/MapLibre est raisonnablement vérifié
- la largeur fonctionnelle du showcase dépasse largement la profondeur de validation automatisée

## Points de vigilance et findings

### F1. Incohérence de packaging sur le contrôle globe

Gravité: élevée pour les consommateurs du module agrégateur.

Constat:

- `GlobeControlDirective` est exportée dans `public_api.ts`
- la démo `globe` l'importe directement en standalone
- `NgxMapLibreGLModule` ne l'exporte pas dans sa liste `NgxMapLibreGLImports`

Impact:

- un projet qui consomme `NgxMapLibreGLModule` ne bénéficiera pas automatiquement de `mglGlobe`
- la fonctionnalité globe est donc disponible en import standalone, mais pas via le module agrégateur tel qu'audité

### F2. Couverture automatisée faible sur les fonctionnalités avancées

Gravité: moyenne.

Constat:

- de nombreuses démos avancées n'ont pas de test comportemental dédié
- plusieurs cas ne sont couverts que par un test runtime de chargement de page

Zones particulièrement peu validées:

- clusters et clusters HTML
- drag de feature et drag de marqueur
- géolocalisation
- popups déclenchés au clic sur feature
- attribution custom et locale custom
- projection globe et certains scénarios terrain
- image source mise à jour en temps réel

Impact:

- la fonctionnalité existe et est démontrée, mais le niveau de confiance en non-régression est inférieur sur ces zones

### F3. Les rendus HTML sont explicitement plus coûteux que les couches WebGL

Gravité: faible à moyenne selon la charge.

Constat:

- la documentation interne des composants `mgl-marker` et `mgl-markers-for-clusters` indique qu'ils sont plus lents que des couches symbol WebGL

Impact:

- à éviter pour de très gros volumes de points si le projet cible de fortes contraintes de performance

## Recommandation d'adoption pour un autre projet

Pertinent si le projet cible:

- Angular récent
- intégration déclarative avec MapLibre
- besoin de composer sources, couches, popups et contrôles via templates Angular
- besoin ponctuel de comportements avancés comme terrain, globe ou clusters HTML

Précautions recommandées avant mise en production:

- ajouter des tests de non-régression sur les fonctionnalités réellement utilisées par le projet consommateur
- privilégier les couches symbol WebGL plutôt que les marqueurs HTML pour de gros volumes
- si le projet consomme `NgxMapLibreGLModule`, vérifier ou corriger l'export de `mglGlobe`
- valider en conditions réelles les fonctions avancées peu couvertes par les tests du dépôt source

## Priorité de test recommandée pour le projet consommateur

1. Carte de base, chargement de style, événements critiques et changements de caméra
2. Sources et couches réellement utilisées par le produit
3. Popups et interactions utilisateur métier
4. Marqueurs/drag si l'application repose dessus
5. Terrain, globe, clusters HTML et géolocalisation si ces options sont activées

## Verdict

Le projet présente une base fonctionnelle riche et cohérente pour intégrer MapLibre dans Angular.
L'API publique est large, le showcase est utile, et les primitives principales sont suffisamment établies pour un usage réel.
Le principal frein n'est pas l'absence de fonctionnalités, mais l'hétérogénéité du niveau de validation entre le socle et les exemples avancés.