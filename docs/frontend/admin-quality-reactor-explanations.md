# Comprendre le diagnostic du Quality Reactor

Sur `/admin/quality`, ouvrir **Pourquoi cet état ?** pour consulter les causes du diagnostic, puis **Voir les lignes concernées** pour retrouver les lignes correspondantes dans la matrice. Chaque cause conserve les noms des domaines, leur date de révision et leurs références de preuve. Une référence de fichier est une trace documentaire ; elle ne certifie pas un résultat de test.

Les règles de classification et d'explication partagent les mêmes seuils dans `packages/admin-quality/src/lib/pages/admin-quality-reactor-state.ts`. Les proportions utilisent toujours l'ensemble des domaines, indépendamment des filtres de la matrice.

| Cause                    | Attention                                                                                          | Critique                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Écarts de priorité haute | Au moins un domaine                                                                                | Au moins 25 % des domaines                |
| Domaines non couverts    | Au moins 20 % des domaines                                                                         | Au moins 50 % des domaines                |
| Domaines non évalués     | Au moins un domaine                                                                                | Au moins 25 % des domaines                |
| Révisions à renouveler   | Au moins une révision manquante, invalide, future, expirée ou antérieure à un signal de changement | Ne remplace pas un état critique existant |

Les domaines non couverts en dessous de 20 % sont signalés à titre informatif. Les causes peuvent se recouper : leurs nombres ne s'additionnent pas. Une révision expire après sept jours complets suivant la fin de sa journée UTC ; un signal ultérieur du dépôt ou une mission terminée plus récente demande aussi une nouvelle validation.

L'action d'une cause efface les filtres précédents et place le focus clavier sur la matrice. Un bandeau affiche la cause active et permet de retirer ce filtre. Les filtres habituels restent utilisables pour affiner cette liste. Le filtre de cause suit les données actualisées : si la cause est résolue, la liste reste vide jusqu'au retrait du filtre. Ce filtre contextuel n'est pas mémorisé au rechargement de la page.

Les chargements, recalculs et erreurs restent annoncés. Pendant une actualisation ou après son échec, les causes disponibles correspondent aux derniers chiffres connus. Une matrice vide ne constitue pas une preuve de couverture.

## Points de reprise pour la maintenance

- Modèle des causes et références : `packages/admin-quality/src/lib/pages/admin-quality-reactor-explanations.ts`.
- Affichage, navigation au clavier et traductions : `admin-quality-reactor.component.*`, `openg7-org/src/assets/i18n/{fr,en}.json`.
- Filtrage dynamique et focus : `packages/admin-quality/src/lib/pages/admin-quality.page.ts`.
- Vérifications : `admin-quality-reactor-explanations.spec.ts`, `admin-quality-reactor.component.spec.ts`, `admin-quality.page.spec.ts` et `openg7-org/e2e/admin-quality-reactor.spec.ts`.
