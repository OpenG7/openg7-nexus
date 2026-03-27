# Cas d'usage en langage courant pour OpenG7

## Pourquoi ce document

OpenG7 traite des situations metier qui peuvent vite devenir techniques. Avant de parler API, ecrans, schemas ou automatisation, il faut souvent partir d'une phrase simple que tout le monde comprend.

Ce document sert a cadrer un besoin en langage courant :

- qui vit la situation ;
- ce qui se passe ;
- ce qui bloque ou ce qui devient possible ;
- ce que la plateforme doit permettre ;
- quelles informations minimales il faut capturer.

L'objectif est d'avoir un point de depart partage entre produit, operations, partenaires, design, donnees et developpement.

## Comment utiliser ce format

Un bon cas d'usage de depart tient en une page et repond a ces questions :

1. Qui est l'acteur principal ?
2. Quel evenement declenche le besoin ?
3. Quel est l'impact concret sur le terrain ?
4. Que veut faire l'acteur dans OpenG7 ?
5. Qui doit voir l'information ou pouvoir reagir ?
6. Quelles donnees minimales faut-il saisir ?
7. A quoi ressemble un bon resultat ?

## Reperes simples

Pour enrichir la plateforme, on peut partir de quatre types de situations :

- `alerte` : quelque chose bloque, ralentit ou change brutalement ;
- `opportunite` : un volume, une capacite ou une ressource devient disponible ;
- `besoin` : un acteur cherche une solution, un fournisseur, un transporteur ou un acheteur ;
- `mise en relation` : la plateforme aide deux ou plusieurs acteurs a se trouver rapidement.

Un meme cas d'usage peut combiner plusieurs types. Par exemple, une fermeture logistique peut creer a la fois une alerte, un besoin de remplacement et une opportunite ailleurs.

## Exemple 1 - Hydro-Quebec a des surplus d'electricite

### Situation

Hydro-Quebec dispose d'un surplus d'electricite sur une periode donnee. Elle veut rendre ce surplus visible, indiquer les conditions, et trouver des acteurs capables d'acheter, d'absorber ou de redistribuer cette capacite.

### Ce que cela veut dire en langage courant

- une organisation s'inscrit sur la plateforme ;
- elle complete son profil ;
- elle indique qu'elle a un surplus disponible ;
- elle precise ou, quand, en quelle quantite et sous quelles contraintes ;
- elle publie l'information pour que les bons acteurs puissent reagir.

### Ce que la plateforme doit permettre

- creer un profil organisation verifie ;
- publier un surplus comme une opportunite exploitable, pas seulement comme une note informative ;
- cibler des provinces, entreprises, distributeurs ou grands acheteurs ;
- recevoir des prises de contact ou des propositions ;
- mettre a jour le volume restant ou fermer le cas quand le surplus est absorbe.

### Donnees minimales a capturer

- nom de l'organisation ;
- type de ressource : electricite, capacite, MW, MWh ;
- volume ou capacite disponible ;
- date de debut et date de fin ;
- zone d'origine ;
- zones ou partenaires cibles ;
- contraintes connues : transport, interconnexion, regulation, prix, priorite ;
- contact responsable.

### Resultat attendu

Le surplus n'est pas perdu dans des courriels ou des appels. Il devient visible, structurable, diffusable et actionnable dans OpenG7.

### Ce que ce cas peut enrichir dans la plateforme

- le profil partenaire ;
- le feed d'opportunites ;
- les alertes sectorielles ;
- la carte des flux et des capacites ;
- la mise en relation entre offreurs et receveurs ;
- les tableaux de bord sur les surplus energetiques.

## Exemple 2 - Le detroit d'Hormuz est ferme et l'helium ne circule plus

### Situation

Une route logistique critique est fermee. Dans cet exemple, le detroit d'Hormuz est bloque, ce qui empeche ou ralentit l'acheminement d'helium et potentiellement d'autres gaz.

### Ce que cela veut dire en langage courant

- une voie de passage strategique n'est plus disponible ;
- des volumes prevus ne peuvent plus circuler normalement ;
- des acheteurs, importateurs, industriels et transporteurs sont touches ;
- il faut savoir qui est impacte, pendant combien de temps et quelles alternatives existent.

### Ce que la plateforme doit permettre

- publier une alerte logistique avec un niveau de gravite ;
- rattacher cette alerte a une matiere, un corridor et des zones touchees ;
- identifier les acteurs qui risquent une rupture ou un retard ;
- faire apparaitre des besoins de remplacement ou de reroutage ;
- faire remonter des options alternatives : autres routes, autres fournisseurs, autre calendrier ;
- suivre l'evolution du blocage et son statut.

### Donnees minimales a capturer

- corridor ou point de passage critique ;
- matiere concernee : helium, gaz naturel, GPL, autre ;
- niveau de blocage : ralentissement, fermeture partielle, fermeture totale ;
- date de debut ;
- duree estimee ou incertitude ;
- volumes impactes si connus ;
- zones, pays ou secteurs touches ;
- options de contournement ;
- source d'information et niveau de confiance.

### Resultat attendu

La plateforme ne se contente pas d'afficher une mauvaise nouvelle. Elle aide a transformer un choc logistique en informations utiles, besoins qualifies et pistes d'action.

### Ce que ce cas peut enrichir dans la plateforme

- les alertes geopolitique et supply chain ;
- les cartes de corridors critiques ;
- les besoins urgents cote acheteurs ;
- la priorisation des opportunites de remplacement ;
- les vues analytiques sur les dependances logistiques.

## Gabarit minimal pour proposer un nouveau cas d'usage

Partir de cette phrase :

`[Organisation ou acteur] fait face a [evenement]. Il/elle veut [action] afin de [resultat].`

Puis remplir ces points :

- `acteur principal` : qui vit la situation ?
- `declencheur` : qu'est-ce qui se passe ?
- `impact` : qu'est-ce que cela bloque, ralentit ou rend possible ?
- `action dans OpenG7` : publier, alerter, chercher, connecter, suivre ?
- `destinataires` : qui doit voir ou recevoir cette information ?
- `donnees minimales` : quelles informations sont indispensables ?
- `resultat attendu` : comment sait-on que le besoin est couvert ?

## Exemples de prompts efficaces pour naviguer dans la solution

Ces exemples sont utiles pour interroger un agent IA, preparer une demo, explorer le produit ou se reperer rapidement dans le depot.

### Prompts pour comprendre un parcours metier

- `Explique-moi le parcours complet d'une organisation qui s'inscrit, publie un surplus d'electricite, puis entre en relation avec un acheteur. Je veux les etapes, les donnees saisies et les points de blocage possibles.`
- `A partir du cas du detroit d'Hormuz ferme, explique ce qui releve d'une alerte, d'un besoin et d'une opportunite dans OpenG7. Reponds en langage simple.`
- `Si Hydro-Quebec a un surplus pendant 7 jours, comment la plateforme doit-elle transformer cette information en publication utile pour d'autres acteurs ?`

### Prompts pour naviguer dans le produit

- `Montre-moi ou se trouvent dans OpenG7 le feed, la carte, la recherche, les profils partenaires et la mise en relation. Pour chaque zone, donne l'objectif fonctionnel.`
- `Je veux faire une demonstration du cas Hydro-Quebec en moins de 5 minutes. Quel parcours utilisateur dois-je suivre dans l'application ?`
- `Pour un utilisateur non technique, quelles pages OpenG7 faut-il visiter pour comprendre comment une alerte logistique devient une opportunite ou une mise en relation ?`

### Prompts pour naviguer dans le code et la documentation

- `Repere dans le repo les fichiers lies au profil partenaire, a la publication d'opportunite, au feed et a la mise en relation. Resume le role de chaque fichier important.`
- `Si je veux ajouter un nouveau cas d'usage comme l'helium bloque par Hormuz, quels documents, composants Angular, services, contrats API et fichiers i18n dois-je verifier en premier ?`
- `Montre-moi les composants Angular et les selectors deja en place pour la carte, la recherche, le feed et les profils partenaires.`
- `Quels fichiers de documentation dois-je lire pour comprendre rapidement la logique produit avant de modifier le code ?`

### Prompts pour enrichir la plateforme a partir d'un besoin terrain

- `Transforme ce cas d'usage en backlog initial : ecrans touches, donnees a capturer, regles metier, evenements a tracer et risques.`
- `Aide-moi a convertir ce besoin terrain en trois niveaux : langage courant, spec produit, puis impact technique.`
- `Quelles questions faut-il poser a un partenaire pour passer d'une idee floue a un cas d'usage actionnable dans OpenG7 ?`

### Bonnes pratiques pour ecrire un prompt utile

- nommer l'acteur principal ;
- nommer l'evenement declencheur ;
- dire si l'on cherche une reponse metier, produit, UX ou technique ;
- demander le format attendu : liste, tableau, parcours, synthese, backlog ;
- demander explicitement les pages, composants, services ou fichiers si l'on veut naviguer dans la solution.

## Suite logique si le cas devient prioritaire

Quand un cas d'usage est juge important, on peut ensuite le decliner en artefacts plus precis :

- note produit ;
- parcours UX ;
- structure de donnees ;
- contrat API ;
- instrumentation analytics ;
- tests de demonstration ou E2E.

## Voir aussi

- `docs/frontend/hydrocarbures-surplus-baril-use-case.md` pour un exemple plus detaille, deja oriente produit et implementation.
