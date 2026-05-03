# Document de travail - Refonte UX de la carte des echanges (homepage)

## Statut

Document de travail preparatoire pour reprendre la refonte demain.

## Contexte

Ce document consolide:

- la lecture de l'implementation actuelle de la section carte de la page d'accueil
- les recommandations issues du rapport `RAPPORT_AUDIT_FONCTIONNEL_NGX_MAPLIBRE_GL.md`
- une premiere direction UX/produit pour rendre la zone plus claire, plus reactive et moins chargee

Surfaces concernees dans le code:

- `openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.html`
- `openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.ts`
- `openg7-org/src/app/shared/components/map/trade-map.component.html`
- `openg7-org/src/app/shared/components/map/trade-map.component.ts`
- `openg7-org/src/app/shared/components/map-frame/og7-map-frame.component.html`
- `openg7-org/src/app/shared/components/map-frame/og7-map-frame.component.css`

## Constats actuels

### Impression generale

La section n'est pas confuse, mais elle est visuellement dense pour une homepage.
Elle est proche de la limite entre "riche" et "trop chargee".

### Ce qui charge la zone aujourd'hui

1. La carte contient deja plusieurs elements d'interface persistants:
   - legende
   - chips secteur
   - basemap toggle
   - zoom control
   - tooltip

2. La colonne laterale ajoute encore plusieurs niveaux d'information:
   - kicker
   - titre
   - description
   - boutons de drilldown
   - bloc contextuel
   - deux KPI
   - CTA vers le feed

3. Le cadre visuel est esthetiquement travaille, mais ajoute encore de la presence:
   - halo
   - tilt
   - wave overlay
   - gradients et ombres marquees

### Diagnostic UX

Le probleme principal n'est pas un manque de fonctionnalites.
Le probleme est que trop d'elements restent visibles en permanence alors que Ngx MapLibre GL permet de deplacer davantage d'intelligence dans les interactions carte.

## Ce que le rapport Ngx MapLibre GL change dans l'approche

Le rapport montre que la librairie est surtout solide sur:

- la composition declarative de carte
- les sources et couches
- les popups
- les controles
- les transitions de camera
- les interactions riches autour des layers

Conclusion pratique:

- il faut moins expliquer la carte autour de la carte
- il faut faire faire plus de travail a la carte elle-meme
- il faut limiter les panneaux persistants aux informations a plus forte valeur

## Direction produit recommandee

### Principe 1 - Divulgation progressive

Ne pas afficher toute l'aide a la decision des le chargement.
Afficher un noyau simple, puis reveler du contexte seulement apres interaction.

### Principe 2 - Carte d'abord

La carte doit devenir le point de comprehension principal, pas seulement le decor d'un panneau lateral.

### Principe 3 - Reponse immediate

Une interaction utilisateur doit produire une reponse visible tres vite:

- highlight clair
- transition camera
- focus sur un corridor ou une zone
- apparition d'un resume cible

### Principe 4 - Densite differenciee selon support

La version mobile ne doit pas etre une simple pile verticale de la version desktop.

## Recommandations concretes

### R1. Reduire l'interface persistante

Objectif:

Faire baisser la charge cognitive initiale.

Proposition:

- conserver le zoom visible en permanence
- rendre la legende repliable ou plus concise
- afficher les chips secteur seulement si l'utilisateur entre dans un mode exploration
- garder le tooltip, mais seulement sur interaction utile

### R2. Alleger fortement le panneau lateral

Objectif:

Passer d'un panneau dense a un panneau de contexte.

Proposition:

- conserver un titre et une phrase d'aide courte
- remplacer la liste de cartes de drilldown par un seul bloc plus lisible
- ne montrer les KPI detaillees qu'apres selection
- faire du CTA feed une consequence de selection, pas un poids visuel permanent

### R3. Utiliser la camera comme outil UX

Objectif:

Donner une sensation de carte vivante et orientee produit.

Proposition:

- sur selection d'un secteur, recentrer ou ajuster le cadrage
- sur selection d'un corridor important, zoomer vers sa zone utile
- sur reset, revenir a une vue generale propre

APIs a exploiter selon le rapport:

- `fitBounds`
- `easeTo`
- `flyTo`
- `panTo`

### R4. Renforcer la hierarchie visuelle des etats

Objectif:

Mieux separer ce qui est secondaire de ce qui est actif.

Proposition:

- etat neutre discret
- etat hover lisible
- etat selectionne fort
- attenuation nette du reste

### R5. Deplacer le contexte dans la carte

Objectif:

Remplacer une partie de l'explication laterale par de l'interaction directe.

Proposition:

- popup ou mini fiche au clic sur un flux important
- highlight immediat du secteur ou corridor cible
- detail etendu seulement si l'utilisateur demande plus

### R6. Garder WebGL pour la volumetrie

Objectif:

Eviter de degrader les performances au moment ou l'UX devient plus riche.

Proposition:

- couches WebGL pour flows, hubs, intensites et agregats
- HTML reserve aux popups, controles speciaux, elements premium ou rares

Le rapport rappelle explicitement que les rendus HTML sont plus couteux que les couches WebGL.

### R7. Prevoir une vraie variante mobile

Objectif:

Eviter l'effet "carte + chrome + aside" trop lourd sur petit ecran.

Proposition:

- carte plus directe
- 1 ou 2 controles max visibles
- panneau contexte en bottom sheet apres interaction
- legende compacte ou repliable par defaut

## Priorites de travail

### Niveau 1 - Quick wins

Changements a faible risque et a fort impact:

1. Replier ou simplifier la legende.
2. Reduire le contenu visible du panneau lateral au chargement.
3. Mettre le CTA feed seulement en contexte selectionne.
4. Calmer le decor du frame si necessaire (halo, wave, ombres).

### Niveau 2 - Amelioration UX significative

Changements qui commencent a transformer l'experience:

1. Ajouter une vraie logique camera sur selection de drilldown.
2. Introduire une interaction clic/survol qui pilote le contexte affiche.
3. Faire passer une partie des informations depuis l'aside vers popup ou overlay carte.

### Niveau 3 - Refonte plus ambitieuse

Changements produit plus structurants:

1. Remplacer l'aside dense par une experience en deux temps: carte puis details.
2. Concevoir une version mobile specifique.
3. Introduire une logique d'exploration progressive selon zoom, filtre ou selection.

## Proposition de cadrage pour demain

### Option A - Sprint pragmatique

But:

Ameliorer la section sans changer l'architecture generale.

Contenu:

- alleger le panneau lateral
- simplifier les controles visibles
- ajouter une reponse camera sur selection
- garder le squelette actuel

### Option B - Refonte intermediaire

But:

Reequilibrer la section en faveur de la carte.

Contenu:

- aside plus compact
- details de contexte declenches par interaction carte
- logique hover/click/selected plus nette
- comportement mobile revu

### Option C - Refonte ambitieuse

But:

Faire de la carte une vraie interface d'exploration produit.

Contenu:

- narration par couche et selection
- transitions camera marquees
- contexte progressif selon focus utilisateur
- surfaces auxiliaires minimales

## Recommendation de depart

Commencer par l'option A, avec une cible preparee pour aller vers l'option B.

Raison:

- le gain UX est rapide
- le risque technique reste limite
- cela permet de mesurer si la densite percue baisse reellement avant d'engager une refonte plus lourde

## Taches proposees pour la prochaine session

1. Revalider ensemble la cible UX souhaitee: home plus editoriale ou home plus exploratoire.
2. Choisir le niveau d'ambition: A, B ou C.
3. Transformer ce document en plan d'execution technique par fichier.
4. Implementer un premier lot limite a la reduction de densite visuelle et a la camera.
5. Tester le resultat sur desktop puis sur mobile.

## Hypotheses ouvertes

- Le role principal de la section homepage est-il la comprehension rapide ou l'exploration active?
- Le CTA vers le feed doit-il rester central dans cette section ou devenir secondaire?
- Les utilisateurs doivent-ils manipuler la carte directement des l'accueil, ou etre surtout guides?
- Le rendu visuel actuel doit-il rester "premium demonstratif" ou devenir plus utilitaire?

## Definition d'un bon resultat

On pourra considerer que la section est amelioree si:

- la lecture initiale est plus immediate
- l'utilisateur comprend plus vite quoi faire
- les etats interactifs sont plus clairs
- la carte semble plus utile et moins decorative
- la densite percue baisse sans appauvrir la valeur produit