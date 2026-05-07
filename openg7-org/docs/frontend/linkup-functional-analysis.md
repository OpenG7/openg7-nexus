# Cadrage repo-local — Mise en relation MVP

## Objectif

- Cette note cadre la surface "Mise en relation" a l'echelle du repo `openg7-org`.
- Elle documente le MVP actuellement expose et prouve, afin de ne pas elargir artificiellement la preuve avant une vraie extension produit.

## MVP actuellement expose dans le repo

- `/linkups` permet de consulter l'historique des mises en relation existantes.
- `/linkups/:id` permet d'ouvrir le detail d'un linkup existant.
- Depuis le detail, l'utilisateur peut suivre et mettre a jour manuellement le statut.
- Depuis le detail, l'utilisateur peut ajouter une note interne.
- La note et le statut mis a jour doivent rester visibles au retour dans l'historique puis a la reouverture du detail.

## Preuves fortes a preserver

- `e2e/linkup-workflow.spec.ts` prouve `historique -> detail -> note interne -> changement de statut -> retour historique -> persistence`.
- `src/app/domains/matchmaking/pages/linkup-detail/og7-linkup-detail-page.component.spec.ts` consolide la surface detail existante, le cas `not found`, le retry, et les garde-fous sur la note et le statut.

## Limite de scope MVP

- La creation directe d'un linkup ne fait pas partie du MVP courant a prouver.
- Le MVP courant ne force pas de branche riche d'acceptation ou de refus au-dela du suivi manuel du statut deja expose.
- Le MVP courant n'expose pas de messagerie dediee ni de fil de conversation.
- Le MVP courant n'expose pas de pieces jointes utilisateur.
- Le MVP courant n'expose pas de journal formel ou d'audit trail dedie au-dela de la timeline et de la persistence de statut deja visibles.

En consequence, l'absence de preuve E2E ou Angular sur ces surfaces ne doit pas etre traitee comme un manque du MVP actuel.

## Branche produit suivante si le scope s'etend

- Premiere branche recommandee : une decision explicite `acceptation/refus` sur un linkup existant, visible dans le detail, l'historique et la timeline.
- Cette branche devrait etre prouvee par une spec ciblee dediee, sans melanger dans le meme lot la messagerie ou les pieces jointes.
- La messagerie et les pieces jointes doivent rester des branches ulterieures, pas des ajouts implicites a un simple elargissement de preuve.
