# Évaluation d'OpenTofu pour la standardisation de l'infrastructure OpenG7

## Résumé exécutif

OpenTofu (opentofu.org) est un fork communautaire de Terraform maintenu sous l'égide de la Linux Foundation. Sa gouvernance ouverte, sa compatibilité quasi totale avec l'écosystème Terraform 1.5+ et ses engagements en matière de licences en font un candidat sérieux pour une stratégie d'Infrastructure-as-Code (IaC) normalisée au sein d'OpenG7. Cependant, la relative jeunesse du projet, l'écosystème de modules encore en consolidation et la dépendance aux fournisseurs cloud imposent une adoption progressive, accompagnée d'un dispositif de veille et de tests de régression.

## Critères d'évaluation

| Critère                  | Analyse                                                                                                                                                                    | Risque                                                                                                                      | Opportunité                                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Gouvernance & licence    | Fondation OpenTofu (Linux Foundation) avec comité technique élu, licence MPL 2.0. Transparence des feuilles de route et processus de RFC publics.                          | Faible : modèle à but non lucratif, pas de verrou propriétaire.                                                             | Forte : alignement avec principes d'ouverture d'OpenG7, possibilité de contribuer aux orientations.      |
| Compatibilité écosystème | Maintien de la compatibilité en lecture/écriture avec la syntaxe HCL et les providers Terraform. Des tests de compatibilité réguliers sont publiés pour les versions 1.6+. | Moyen : risque de divergences futures avec Terraform propriétaire, nécessitant des backports ou des ajustements de modules. | Forte : migration quasi transparente des modules existants, mutualisation de la base IaC.                |
| Roadmap & stabilité      | Release trimestrielle, support LTS annoncé (12 mois) pour la branche stable 1.8.x. Pipelines CI publics et politique de sécurité documentée.                               | Moyen : cadence jeune, backlog encore centré sur la parité fonctionnelle.                                                   | Moyenne : possibilité d'influencer la feuille de route via RFC, adoption rapide de correctifs critiques. |
| Fournisseurs & modules   | Providers majeurs (AWS, Azure, GCP) déjà compatibles via le registre communautaire OpenTofu ; modules historiques Terraform à tester mais souvent compatibles.             | Moyen/Élevé : absence de certains providers niche, nécessité de maintenir des modules internes.                             | Moyenne : opportunité de créer un registre OpenG7 conforme (audit, sécurité).                            |
| Sécurité & supply-chain  | Builds reproductibles, signatures cosign, SBOM fournie. Intégration possible avec outils de scanning (tfsec, Checkov) sans adaptation majeure.                             | Faible : chaîne d'approvisionnement plus transparente que Terraform propriétaire.                                           | Forte : renforcement conformité (CSPM, audit).                                                           |
| Communauté & support     | Croissance rapide (>700 contributeurs), documentation et forum actifs. Partenariats avec HashiCorp évités, mais soutien de Gruntwork, Spacelift, env0.                     | Moyen : pas de support commercial officiel unique ; dépendance à partenaires tiers.                                         | Moyenne : possibilité de support via intégrateurs open-source ou internalisation.                        |

## Analyse détaillée

### Forces principales

1. **Ouverture et gouvernance transparente** : l'ancrage au sein de la Linux Foundation garantit un modèle non propriétaire et un processus d'amélioration continu par RFC publiques.
2. **Compatibilité ascendante avec Terraform 1.5+** : les états existants et les plans HCL peuvent être réutilisés, ce qui réduit le coût de migration depuis des stacks Terraform historiques.
3. **Chaîne d'approvisionnement sécurisée** : la distribution binaire signée et la publication d'une SBOM facilitent l'intégration aux exigences de conformité d'OpenG7.
4. **Écosystème d'outillage** : OpenTofu reste compatible avec Terragrunt, Atlantis, Spacelift, facilitant l'intégration dans les pipelines GitOps existants.

### Points de vigilance

1. **Maturité relative** : la gouvernance n'a que quelques trimestres d'existence ; certains cas limites d'état (backends S3/Consul) nécessitent encore des retours d'expérience.
2. **Providers spécialisés** : quelques fournisseurs niche (ex. services provinciaux spécifiques) n'ont pas encore de builds officiels ; ils doivent être compilés depuis les sources Terraform correspondantes ou maintenus en interne.
3. **Divergences futures avec Terraform** : HashiCorp poursuit sa propre roadmap (e.g. fonctionnalités Cloud spécifique). Il faut anticiper des efforts de backport si des modules tiers adoptent des fonctionnalités exclusives.
4. **Support entreprise** : l'absence d'un acteur unique de support impose un modèle multi-partenaire ou une montée en compétence interne (Centre d'Excellence IaC).

## Recommandation

Adopter OpenTofu comme standard cible IaC pour OpenG7 avec une approche progressive :

1. **Phase pilote (T1)** :
   - Migrer un périmètre limité (ex. environnement de sandbox) vers OpenTofu 1.8.x.
   - Mettre en place des tests d'acceptation (plan/apply simulé) et un pipeline de sécurité (tfsec, OPA/Conftest) pour valider la parité fonctionnelle.
2. **Phase d'industrialisation (T2)** :
   - Standardiser les modules partagés dans un monorepo `infrastructure/modules` en HCL, avec validation Terratest.
   - Créer un registre interne (Artefactories OCI) pour les modules/providers approuvés.
   - Documenter les patterns d'utilisation (naming, tagging, stratégies de workspace).
3. **Phase de généralisation (T3)** :
   - Étendre la migration aux environnements de production après deux cycles de releases stables.
   - Former les équipes produits via workshops, et instaurer un processus de revue IaC obligatoire (policy-as-code).
   - Participer aux RFC OpenTofu pour peser sur les évolutions critiques (state encryption, gestion des secrets).

## Conditions de succès

- **Veille technologique** : suivi trimestriel des releases, et évaluation des divergences avec Terraform propriétaire.
- **Gouvernance interne** : constitution d'un comité IaC OpenG7 (SRE + DevEx) pour valider les modules et politiques.
- **Automatisation** : intégration continue (GitHub Actions/GitLab CI) pour tester les plans, contrôler la dérive et appliquer les policy checks.
- **Gestion des secrets** : adopter un backend standard (ex. S3 + KMS ou Vault) avec chiffrement systématique des états.
- **Formation & support** : budget dédié pour l'accompagnement (consultants OpenTofu ou développement interne) et pour la montée en compétence des équipes régionales.

## Conclusion

OpenTofu constitue un excellent candidat pour la standardisation de l'infrastructure OpenG7 dès lors que l'adoption est accompagnée d'un dispositif de gouvernance, de tests et de formation. Sa nature open-source et sa compatibilité avec l'écosystème Terraform offrent un levier pour mutualiser les pratiques IaC tout en limitant le risque de verrou propriétaire. Une migration par étapes, pilotée par des environnements de référence et des modules certifiés, permettra de sécuriser la transition et d'en tirer rapidement des gains de conformité, de fiabilité et de collaboration.
