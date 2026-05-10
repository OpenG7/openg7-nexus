**Languages:** [English](#english) | [Français](#francais)

<a id="english"></a>

# OpenG7 Security Policy

We are committed to protecting the OpenG7 ecosystem (Angular front-end, Strapi CMS, and shared tooling). Please report vulnerabilities privately so we can investigate and issue a fix.

## Reporting a Vulnerability

- **Email:** `contact@openg7.org` (preferred). You can also use GitHub Private Vulnerability Reporting if email is not possible.
- **Include:** clear description, impact, reproduction steps or proof-of-concept, affected component (front-end `openg7-org`, CMS `strapi`, infra scripts, or contracts), and any temporary mitigations.
- **Expect:** acknowledgement within **3 business days**, regular status updates, and coordinated disclosure after a fix or mitigation is available. We will credit reporters if requested.
- **Please avoid:** filing public issues, exploiting data belonging to others, or running tests that could degrade service for other users.

## Scope

In scope:

- Front-end application under `openg7-org/` and its SSR runtime.
- Strapi CMS (`strapi/`), including seeds, plugins, and API routes.
- Supporting packages and scripts (`packages/`, `infra/`, `scripts/`, `docs/` where applicable) that configure or deploy the platform.

Out of scope:

- Third-party services or libraries we consume (report to the upstream project instead).
- Social engineering, phishing, or physical attacks.
- Denial of Service (volume-based or resource exhaustion) and automated scanning that disrupts availability.
- Findings that require root/physical access to the host environment we do not control.

## Testing Guidelines (Safe Harbor)

We allow good-faith security research under these conditions:

- Use test accounts and limit the scope of your testing to your own data.
- Do not exfiltrate, destroy, or publicly disclose data. Stop testing immediately if you encounter real user data.
- Avoid actions that degrade availability for others. Coordinate timing with us for tests that may be disruptive.
- Follow applicable laws and third-party terms of service.

## Remediation & Disclosure

1. We triage and assign severity (CVSS) after receiving your report.
2. We develop and validate a fix or mitigation, then prepare a coordinated release.
3. We publish advisories and give credit to reporters who opt in. If a public disclosure is planned, we will agree on timing with you.

Thank you for helping keep OpenG7 users safe.

<a id="francais"></a>

# Politique de sécurité OpenG7

Nous protégeons l’écosystème OpenG7 (front-end Angular, CMS Strapi et outils partagés). Merci de signaler toute vulnérabilité de manière privée afin que nous puissions enquêter et corriger rapidement.

## Signalement d’une vulnérabilité

- **Courriel :** `contact@openg7.org` (canal privilégié). Vous pouvez aussi utiliser la fonctionnalité GitHub “Private Vulnerability Reporting” si l’email n’est pas possible.
- **À fournir :** description claire, impact, étapes de reproduction ou preuve de concept, composant concerné (front `openg7-org`, CMS `strapi`, scripts d’infra ou contrats), et mesures d’atténuation temporaires si disponibles.
- **Engagement :** accusé de réception sous **3 jours ouvrés**, mises à jour régulières, et divulgation coordonnée dès qu’un correctif ou une mitigation est prêt. Nous créditerons les chercheur·euse·s qui le souhaitent.
- **À éviter :** issues publiques, exploitation de données tierces, ou tests qui dégradent la disponibilité pour les autres utiliisateurs.

## Périmètre

En périmètre :

- Application front-end dans `openg7-org/` et son runtime SSR.
- CMS Strapi (`strapi/`), y compris seeds, plugins et routes API.
- Packages et scripts de support (`packages/`, `infra/`, `scripts/`, `docs/` le cas échéant) qui configurent ou déploient la plateforme.

Hors périmètre :

- Services ou bibliothèques tiers (merci de signaler directement à leur équipe).
- Attaques de social engineering, phishing ou physiques.
- Déni de service (volumétrique ou exhaustion) et scans automatisés qui perturbent la disponibilité.
- Problèmes nécessitant un accès root/physique à l’hôte que nous ne contrôlons pas.

## Règles de test (Safe Harbor)

La recherche en bonne foi est autorisée si vous respectez ces règles :

- Utilisez des comptes de test et limitez vos essais à vos propres données.
- N’exfiltrez, ne détruisez ni ne divulguez aucune donnée. Arrêtez immédiatement si vous tombez sur des données réelles.
- Évitez toute action qui dégraderait l’accessibilité pour d’autres. Coordonnez le calendrier avec nous pour les tests potentiellement perturbateurs.
- Respectez les lois applicables et les conditions d’utilisation des services tiers.

## Remédiation et divulgation

1. Nous trions le signalement et évaluons la sévérité (CVSS) dès réception.
2. Nous concevons et validons un correctif ou une mitigation, puis préparons une publication coordonnée.
3. Nous publions un avis et créditons les personnes qui le souhaitent. En cas de divulgation publique, nous convenons ensemble du calendrier.

Merci d’aider à sécuriser les utilisatrices et utilisateurs d’OpenG7.
