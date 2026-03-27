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

Hydro-Quebec dispose d'un surplus d'electricite sur une periode donnee. Son enjeu n'est pas seulement de declarer ce surplus, mais d'eviter qu'une capacite disponible reste inutilisee alors qu'elle pourrait aider d'autres acteurs. Elle veut donc rendre cette disponibilite visible, compréhensible et assez precise pour declencher une reaction utile.

### Ce que cela veut dire en langage courant

- une organisation vient sur la plateforme parce qu'elle cherche a transformer une capacite disponible en possibilite concrete pour d'autres ;
- elle commence par se rendre identifiable, parce qu'une information strategique n'a de valeur que si sa source est claire ;
- elle complete son profil pour inspirer confiance avant meme de publier le surplus ;
- elle declare ensuite la disponibilite parce qu'elle veut passer d'un constat interne a un signal partage ;
- elle precise ou, quand, en quelle quantite et sous quelles contraintes, parce qu'un surplus mal cadre provoque surtout des echanges inutiles ;
- elle publie enfin l'information pour que les acteurs capables d'acheter, d'absorber ou de redistribuer puissent se reconnaitre dans le cas et reagir rapidement.

### Si un acheteur soumet une demande pour une quantite precise

Le vrai parcours ne s'arrete pas au moment ou un acheteur dit : `je veux acheter 150 MW` ou `je peux absorber 40 pour cent du volume disponible`. A partir de ce moment, la question change. On ne cherche plus seulement a rendre un surplus visible. On cherche a accompagner une relation d'affaires jusqu'au point ou les deux parties savent clairement si elles vont avancer ensemble, partiellement, plus tard, ou pas du tout.

En langage simple :

- un acheteur se manifeste parce qu'il pense que ce surplus peut repondre a un besoin reel de son cote ;
- le vendeur veut savoir si la demande est serieuse, solvable et compatible avec ses contraintes ;
- l'acheteur veut savoir si le volume promis est reellement disponible, accessible et livrable dans sa fenetre de temps ;
- les deux parties ont besoin d'un espace ou clarifier la quantite, les dates, le point de livraison, les contraintes de transport, le cadre reglementaire et les conditions commerciales ;
- tant que ces elements ne sont pas clarifies, il ne s'agit pas encore d'une relation d'affaires aboutie mais d'une intention en cours de qualification.

### Comment le systeme peut accompagner la relation jusqu'au bout

Le systeme peut accompagner la relation en faisant evoluer le cas d'un simple signal vers un dossier partage et suivi.

1. Il capte l'intention initiale.
L'acheteur indique la quantite souhaitee, la periode, ses contraintes majeures et son niveau d'urgence.

2. Il qualifie la demande.
Le systeme aide a verifier si la demande est compatible avec le surplus publie : volume, calendrier, zone, interconnexion, cadre contractuel, priorites du vendeur.

3. Il ouvre un espace de clarification.
Les deux parties peuvent poser des questions, joindre des documents, demander des precisions, reformuler la quantite ou proposer un decoupage du volume.

4. Il rend visible l'etat de la relation.
Par exemple : `nouvelle marque d'interet`, `en qualification`, `en discussion`, `conditions a valider`, `accord de principe`, `accord confirme`, `partiellement servi`, `non retenu`, `expire`.

5. Il aide a decider.
Le systeme rappelle ce qui bloque encore : prix non confirme, capacite de transport incertaine, fenetre de livraison incompatible, documents manquants, autorisations a obtenir.

6. Il trace les engagements.
Quand les parties convergent, le dossier peut enregistrer un volume reserve, une date cible, un point de contact, un prochain jalon ou un document d'entente.

7. Il ferme proprement le cas.
La relation ne disparait pas. Elle se clot avec une issue explicite et utile pour les suites : accord signe, volume partiellement attribue, abandon, report, redirection vers un autre partenaire.

### Qu'est-ce qui determine "le bout"

Le bout n'est pas forcement la signature juridique finale. Cela depend du niveau d'accompagnement que l'on attend d'OpenG7.

On peut definir trois fins possibles :

- `fin de mise en relation` : les deux parties sont entrees en contact qualifie et savent qu'elles veulent poursuivre hors plateforme ;
- `fin de qualification commerciale` : les quantites, la fenetre, les contraintes et l'interet mutuel sont suffisamment clairs pour dire `oui`, `non` ou `partiellement` ;
- `fin de transaction suivie` : la plateforme suit le dossier jusqu'a un resultat concret comme `volume reserve`, `entente confirmee`, `livraison planifiee` ou `demande cloturee sans suite`.

Si l'objectif d'OpenG7 est seulement de creer des connexions utiles, alors `le bout` peut etre le moment ou la relation devient suffisamment mature pour sortir de la plateforme.

Si l'objectif est de piloter la chaine de valeur de bout en bout, alors `le bout` devrait etre defini par un resultat observable, par exemple :

- le volume a ete totalement attribue ;
- le volume a ete partiellement attribue et le reliquat reste publie ;
- la demande a ete retiree ou rejetee avec raison ;
- la relation a ete redirigee vers une autre solution ;
- la fenetre de surplus est terminee et le dossier est clos.

### Donnees minimales a capturer apres soumission d'un acheteur

- identite de l'acheteur et niveau de verification ;
- quantite demandee ;
- quantite finalement reservee ou attribuee ;
- fenetre temporelle souhaitee ;
- point de livraison ou zone concernee ;
- contraintes techniques ou reglementaires ;
- statut de la relation ;
- raisons de blocage ou de refus ;
- prochaine etape datee ;
- issue finale du dossier.

### Resultat attendu si on boucle vraiment la boucle

Hydro-Quebec ne voit pas seulement qu'un acheteur a clique sur un bouton. Elle voit si la marque d'interet est devenue une conversation utile, si cette conversation a produit un accord exploitable, quelle quantite a ete reellement engagee, et ce qu'il reste a redistribuer. De son cote, l'acheteur sait a tout moment si sa demande est en attente, en discussion, acceptee, refusee ou redirigee.

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

Une route logistique critique est fermee. Dans cet exemple, le detroit d'Hormuz est bloque, ce qui empeche ou ralentit l'acheminement d'helium et potentiellement d'autres gaz. L'enjeu humain n'est pas seulement de constater la fermeture, mais de comprendre tres vite qui va etre touche, ce qui risque de manquer et a quel moment il faut commencer a chercher une alternative.

### Ce que cela veut dire en langage courant

- une voie de passage strategique n'est plus disponible, et les acteurs concernes doivent d'abord comprendre s'il s'agit d'un incident passager ou d'un probleme durable ;
- des volumes prevus ne peuvent plus circuler normalement, ce qui pousse les acheteurs et les operateurs a mesurer leur niveau reel d'exposition ;
- des acheteurs, importateurs, industriels et transporteurs sont touches, mais pas tous de la meme maniere ni au meme moment ;
- il faut donc savoir rapidement qui est impacte, pendant combien de temps et a partir de quand il devient raisonnable de chercher une autre route, un autre fournisseur ou un autre calendrier.

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

## Exemple 3 - Un parcours humain complet depuis l'accueil jusqu'au suivi

Source executable a garder synchronisee : `openg7-org/e2e/full-human-journey.spec.ts`.
Quand ce test change, cette section doit changer dans le meme mouvement.

### Situation

Une personne arrive sur OpenG7 parce qu'elle veut comprendre rapidement ou se trouve une situation utile ou urgente, puis agir sans perdre de temps. Elle commence par explorer le feed pour reperer un sujet concret, essaie de repondre a une opportunite, revient sur ses actions pour les suivre, traite ensuite une alerte qui peut avoir des consequences plus larges, puis termine en verifiant qu'elle garde la maitrise de ses propres donnees.

### Ce que cela veut dire en langage parle

- la personne ne vient pas pour visiter des ecrans ; elle vient pour savoir si quelque chose demande une reaction immediate ;
- elle entre dans le feed parce que c'est l'endroit le plus direct pour voir ce qui bouge ;
- quand elle voit une opportunite credible, elle l'ouvre pour verifier si elle peut vraiment y repondre ;
- elle essaie de proposer une offre parce qu'elle veut transformer une information lue en action concrete ;
- si la connexion est demandee, elle accepte cette etape parce qu'elle comprend que son action doit etre attribuee et suivie ;
- une fois revenue sur l'opportunite, elle renseigne les details utiles pour etre prise au serieux par le destinataire ;
- ensuite, elle verifie le suivi de son offre parce qu'une action sans trace n'a pas de valeur operationnelle ;
- si le contexte change, elle veut pouvoir retirer proprement son offre plutot que laisser une promesse obsolete ;
- elle passe ensuite a une alerte parce qu'une situation critique peut exiger plus qu'une simple reaction individuelle ;
- elle signale une mise a jour parce qu'elle veut enrichir la situation commune, pas seulement la consulter ;
- elle cree une opportunite liee parce qu'une alerte utile doit parfois deboucher sur une action coordonnee ;
- elle configure ensuite une alerte sur un indicateur parce qu'elle veut etre prevenue avant que la situation ne se degrade a nouveau ;
- elle finit par son profil et l'export de ses donnees parce qu'un parcours de confiance se termine aussi par la maitrise de ses informations.

### Trajet raconte pas a pas

1. Depuis l'accueil, la personne clique sur l'acces au feed parce qu'elle cherche d'abord un point d'entree simple vers les situations en cours.
2. Dans le feed, elle ouvre l'opportunite `Short-term import of 300 MW` parce que c'est le premier sujet sur lequel elle pense pouvoir agir utilement.
3. Elle clique sur `Proposer une offre` parce qu'elle ne veut pas seulement lire le besoin ; elle veut y repondre.
4. Comme elle n'est pas encore authentifiee, elle est envoyee vers la page de connexion avec un retour automatique vers l'opportunite ; elle accepte cette etape parce qu'une offre doit etre rattachee a une identite claire.
5. Une fois connectee, elle retrouve la page detail de l'opportunite et ne perd pas son elan initial.
6. Elle ouvre a nouveau le drawer d'offre parce qu'elle veut finir l'action qu'elle avait commencée.
7. Elle saisit une offre de `280 MW`, avec une periode du `2026-03-16` au `2026-03-30`, un prix `indexed`, un commentaire metier et un document `term-sheet.pdf`, parce qu'elle veut envoyer une proposition credible et directement exploitable.
8. Elle envoie l'offre et le drawer se ferme ; pour elle, l'enjeu est maintenant de verifier que son geste existe vraiment dans le systeme.
9. La plateforme affiche immediatement un recapitulatif exploitable dans la zone Q/R avec un identifiant d'offre, la capacite, le mode de prix et la piece jointe ; elle peut donc constater que sa proposition n'est pas partie dans le vide.
10. Le bouton principal de l'opportunite n'est plus dans l'etat initial : il mene maintenant vers le suivi des offres ; la personne comprend alors que l'etape suivante n'est plus de proposer, mais de suivre.
11. Elle ouvre la vue `alerts?section=offers`, voit son offre en etat `submitted`, deplie le fil de suivi puis rouvre l'opportunite d'origine, parce qu'elle veut verifier a la fois la trace de son action et son contexte.
12. Depuis le menu profil, elle ouvre ses alertes et retire l'offre ; l'offre passe alors a l'etat `withdrawn` et le fil de suivi montre explicitement ce retrait, ce qui lui permet de corriger sa position quand la situation change.
13. Elle retourne au feed et ouvre l'alerte `Ice storm risk on Ontario transmission lines` parce qu'apres avoir gere son action personnelle, elle veut comprendre une situation plus large susceptible d'affecter d'autres decisions.
14. Elle s'abonne a cette alerte, puis ouvre le formulaire `Signaler une mise a jour`, parce qu'elle veut rester informee mais aussi contribuer a une vision plus a jour.
15. Elle renseigne un resume et une URL source, envoie le signalement, voit l'etat de succes, puis consulte son propre rapport avant de fermer la vue, parce qu'elle veut s'assurer que sa contribution est bien enregistree et consultable.
16. Depuis cette meme alerte, elle choisit `Creer une opportunite liee` parce qu'elle voit qu'une alerte ne suffit pas toujours : il faut parfois ouvrir un nouvel espace d'action.
17. OpenG7 ouvre directement un brouillon de publication dans le feed, deja rattache a l'alerte source, ce qui lui evite de repartir de zero.
18. Elle saisit le titre `Linked resilience corridor from storm alert` et un resume de coordination temporaire, puis publie, parce qu'elle veut convertir un probleme observe en proposition utile pour d'autres acteurs.
19. De retour sur le feed, la nouvelle opportunite apparait dans la liste ; elle peut verifier que l'information est devenue visible pour les autres.
20. Elle ouvre ensuite l'indicateur `Spot electricity price up 12 percent` parce qu'elle cherche maintenant a anticiper, et pas seulement a reagir.
21. Elle change la fenetre en `24h`, la granularite en `hour`, puis clique sur l'action d'abonnement, parce qu'elle veut lire le signal a la bonne echelle avant de definir son niveau de vigilance.
22. Un drawer d'alerte s'ouvre ; elle fixe un seuil numerique a `15`, ajoute une note operationnelle, puis valide, parce qu'elle veut etre avertie des que le signal franchira un niveau qu'elle juge critique.
23. Le drawer se ferme et l'action principale devient `View my alert` ou `Voir mon alerte` ; elle sait alors que sa surveillance est active.
24. Pour finir, elle ouvre son profil puis exporte ses donnees personnelles, parce qu'un usage responsable de la plateforme suppose aussi de pouvoir recuperer ce qui la concerne.

### Ce que la plateforme doit permettre

- conserver le contexte de navigation lors d'une redirection vers la connexion ;
- permettre un aller-retour propre entre feed, detail, alertes et profil ;
- transformer une intention en action traquee : offre soumise, offre retiree, rapport d'alerte, opportunite liee, alerte d'indicateur ;
- rendre visibles les changements d'etat importants pour l'utilisateur ;
- offrir un suivi lisible des actions deja faites ;
- terminer par un geste de confiance et de conformite : l'export des donnees du compte.

### Donnees minimales a capturer

- identifiant et type de la carte ouverte depuis le feed ;
- route de retour apres connexion ;
- offre opportunite : capacite, dates, mode de prix, commentaire, piece jointe ;
- etat de l'offre : `submitted`, puis `withdrawn` si retrait ;
- signalement d'alerte : resume, URL source, statut de succes ;
- brouillon d'opportunite liee : source, titre, resume ;
- alerte d'indicateur : seuil, note, etat d'abonnement ;
- action finale de profil : export des donnees.

### Resultat attendu

Une personne non technique peut suivre un trajet complet et comprendre qu'OpenG7 sert a decouvrir une situation, agir dessus, suivre les consequences de cette action, puis retrouver ses traces et ses donnees personnelles sans perdre le fil.

### Ce que ce cas peut enrichir dans la plateforme

- les demos produit de bout en bout ;
- les scripts E2E qui servent de reference metier ;
- la documentation de parcours en langage parle ;
- l'instrumentation des etats utilisateur critiques ;
- la validation des redirections login -> retour contexte -> action.

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
- `j'aimerais faire un parcours complet avec toi. Tu pourrais simuler les gestes d'un humain a partir des tests e2e.`
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
