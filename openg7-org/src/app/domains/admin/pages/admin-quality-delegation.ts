import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

export type AdminQualityDelegationMode = 'qa-proof' | 'product-closure' | 'hardening' | 'scope-cadrage';
export type AdminQualityDelegationDifficulty = 'Easy' | 'Medium' | 'Hard';
export type AdminQualityDelegationTrack =
  | 'Front (Angular)'
  | 'Front (Angular) + CMS (Strapi)'
  | 'Docs'
  | 'Tooling / CI';

export interface AdminQualityDelegationPlan {
  readonly mode: AdminQualityDelegationMode;
  readonly actionLabel: string;
  readonly title: string;
  readonly projectStatus: string;
  readonly track: AdminQualityDelegationTrack;
  readonly difficulty: AdminQualityDelegationDifficulty;
  readonly repos: readonly string[];
  readonly primaryRepo: string;
  readonly primaryRepoFullName: string;
  readonly labels: readonly string[];
  readonly targetFiles: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly commands: readonly string[];
  readonly issueTitle: string;
  readonly issueBody: string;
  readonly codexPrompt: string;
  readonly githubIssueUrl: string;
}

interface DelegationOverride {
  readonly track?: AdminQualityDelegationTrack;
  readonly difficulty?: AdminQualityDelegationDifficulty;
  readonly repos?: readonly string[];
  readonly labels?: readonly string[];
  readonly targetFiles?: readonly string[];
  readonly acceptanceCriteria?: readonly string[];
  readonly commands?: readonly string[];
  readonly actionLabel?: string;
  readonly issueTitle?: string;
}

const REPO_ALIAS_MAP: Record<string, string> = {
  docs: 'OpenG7/openg7-nexus',
  '.github': 'OpenG7/openg7-nexus',
  infra: 'OpenG7/openg7-nexus',
  strapi: 'OpenG7/openg7-nexus',
  'packages/contracts': 'OpenG7/openg7-nexus',
  'openg7-nexus': 'OpenG7/openg7-nexus',
};

const DELEGATION_OVERRIDES: Record<string, DelegationOverride> = {
  'advanced-discovery': {
    labels: ['qa', 'playwright', 'discovery', 'feed'],
    targetFiles: [
      'openg7-org/e2e/feed-advanced-discovery-roundtrip.spec.ts',
      'openg7-org/e2e/feed-advanced-discovery-comparison.spec.ts',
      'openg7-org/src/app/domains/feed/feature/feed.page.ts',
      'openg7-org/src/app/domains/feed/feature/og7-feed-stream/og7-feed-stream.component.ts',
    ],
    acceptanceCriteria: [
      'Une chaine de decouverte cross-surface est prouvee de bout en bout.',
      'Le contexte conserve survives detail navigation, browser back et reload.',
      'La nouvelle preuve peut etre ajoutee a la matrice QA sans ambiguite.',
    ],
  },
  geospatial: {
    labels: ['map', 'feed', 'qa', 'product-gap'],
    targetFiles: [
      'openg7-org/src/app/domains/home/feature/home-map-section/home-openlayers-map.component.ts',
      'openg7-org/src/app/domains/home/feature/home-map-section/home-map-section.component.ts',
      'openg7-org/e2e/map.spec.ts',
    ],
    acceptanceCriteria: [
      'Une interaction carte modifie un contexte downstream visible.',
      'La nouvelle surface reste pilotable au clavier et testable via data-og7.',
      'Le flux peut ensuite etre prouve en E2E sans mock fragile.',
    ],
  },
  'business-lifecycle': {
    difficulty: 'Hard',
    labels: ['lifecycle', 'trust', 'feed', 'product-gap'],
    targetFiles: [
      'openg7-org/src/app/domains/admin/pages/admin-trust.page.ts',
      'openg7-org/src/app/domains/feed/feature/pages/feed-opportunity-detail.page.ts',
      'openg7-org/e2e/company-or-partner-enrichment-lifecycle.spec.ts',
    ],
    acceptanceCriteria: [
      'Un cycle durable supplementaire est visible dans le produit.',
      'Le cycle garde une trace lisible apres reopen et reload.',
      'Une preuve de non-regression existe sur le cycle ajoute.',
    ],
  },
  'linkup-workflow': {
    track: 'Docs',
    labels: ['product-scope', 'matchmaking', 'qa'],
    targetFiles: [
      'docs/frontend/linkup-functional-analysis.md',
      'openg7-org/e2e/use-case-covered-needs-audit.md',
    ],
    acceptanceCriteria: [
      'La limite de scope ou la branche produit suivante est explicite.',
      'La matrice QA indique clairement pourquoi la preuve est differee.',
    ],
    actionLabel: 'Cadrer avant implementation',
    issueTitle: 'Cadrage: clarifier la prochaine branche linkup avant delegation dev',
  },
  'alerts-notifications': {
    labels: ['notifications', 'qa', 'a11y'],
    targetFiles: [
      'openg7-org/e2e/notification-panel.spec.ts',
      'openg7-org/e2e/notification-preferences.spec.ts',
      'openg7-org/src/app/domains/account/pages/alerts.page.ts',
    ],
  },
  'account-data': {
    difficulty: 'Easy',
    labels: ['account', 'regression', 'qa'],
    targetFiles: [
      'openg7-org/e2e/resilience.spec.ts',
      'openg7-org/src/app/domains/account/pages/profile.page.ts',
    ],
    acceptanceCriteria: [
      'Le flux critique reste prouve apres le changement.',
      'Aucune regression session, profil ou persistance n est introduite.',
    ],
  },
  rbac: {
    difficulty: 'Easy',
    labels: ['rbac', 'security', 'qa'],
    targetFiles: [
      'openg7-org/e2e/rbac-access.spec.ts',
      'openg7-org/src/app/core/security/rbac.policy.ts',
    ],
  },
  'trust-validation': {
    labels: ['trust', 'moderation', 'qa'],
    targetFiles: [
      'openg7-org/e2e/admin-trust-visibility.spec.ts',
      'openg7-org/src/app/domains/admin/pages/admin-trust.page.ts',
    ],
  },
  'quality-breadth': {
    difficulty: 'Hard',
    labels: ['qa', 'a11y', 'offline', 'responsive'],
    targetFiles: [
      'openg7-org/e2e/quality-breadth.spec.ts',
      'openg7-org/e2e/quality-breadth-cross-surface-a11y-depth.spec.ts',
      'openg7-org/e2e/quality-breadth-offline-queueing.spec.ts',
    ],
    acceptanceCriteria: [
      'Un nouveau risque qualite cross-surface est prouve.',
      'La preuve couvre au moins un cas a11y ou offline ou responsive encore faible.',
      'La suite reste stable sans dupliquer une preuve deja existante.',
    ],
  },
  observability: {
    labels: ['admin', 'ops', 'audit-trail', 'product-gap'],
    targetFiles: [
      'openg7-org/src/app/domains/admin/pages/admin-ops.page.ts',
      'openg7-org/e2e/admin-ops-provenance-trail.spec.ts',
    ],
    acceptanceCriteria: [
      'Une trace d action sensible devient visible dans l interface.',
      'La trace reste comprehensible apres refresh et erreur de refresh.',
      'La nouvelle surface est testable en E2E.',
    ],
  },
  'openg7-depth': {
    difficulty: 'Hard',
    labels: ['domain-depth', 'corridors', 'prioritization', 'product-gap'],
    targetFiles: [
      'openg7-org/src/app/domains/feed/feature/pages/feed-indicator-detail.page.ts',
      'openg7-org/src/app/domains/home/feature/home-corridors-realtime/home-corridors-realtime.component.ts',
      'openg7-org/e2e/hydrocarbon-business-journey.spec.ts',
    ],
    acceptanceCriteria: [
      'Une priorisation metier explicite devient lisible dans le produit.',
      'Le flux aide une decision et ne reste pas une visualisation fragmentee.',
      'La preuve E2E finale suit ce parcours de decision.',
    ],
  },
};

export function buildDelegationPlan(entry: AdminQualityMatrixEntry): AdminQualityDelegationPlan {
  const mode = resolveMode(entry);
  const override = DELEGATION_OVERRIDES[entry.id];
  const repos = override?.repos ?? ['openg7-nexus'];
  const primaryRepo = repos[0] ?? 'openg7-nexus';
  const primaryRepoFullName = resolveRepoFullName(primaryRepo);
  const labels = override?.labels ?? defaultLabels(entry, mode);
  const targetFiles = override?.targetFiles ?? defaultTargetFiles(entry);
  const acceptanceCriteria = override?.acceptanceCriteria ?? defaultAcceptanceCriteria(entry, mode);
  const commands = override?.commands ?? defaultCommands(entry);
  const issueTitle = override?.issueTitle ?? defaultIssueTitle(entry, mode);
  const actionLabel = override?.actionLabel ?? defaultActionLabel(mode);
  const track = override?.track ?? defaultTrack(entry, mode);
  const difficulty = override?.difficulty ?? defaultDifficulty(entry);
  const projectStatus = mode === 'product-closure' || mode === 'scope-cadrage' ? 'Cadrage & Strategic ideas' : 'Backlog validated';
  const title = `${actionLabel} - ${entry.domain}`;
  const issueBody = buildIssueBody(entry, {
    actionLabel,
    track,
    difficulty,
    repos,
    labels,
    targetFiles,
    acceptanceCriteria,
    commands,
  });
  const codexPrompt = buildCodexPrompt(entry, {
    actionLabel,
    track,
    difficulty,
    targetFiles,
    acceptanceCriteria,
    commands,
  });

  return {
    mode,
    actionLabel,
    title,
    projectStatus,
    track,
    difficulty,
    repos,
    primaryRepo,
    primaryRepoFullName,
    labels,
    targetFiles,
    acceptanceCriteria,
    commands,
    issueTitle,
    issueBody,
    codexPrompt,
    githubIssueUrl: buildGithubIssueUrl(primaryRepoFullName, issueTitle, issueBody, labels),
  };
}

function resolveMode(entry: AdminQualityMatrixEntry): AdminQualityDelegationMode {
  if (entry.managementBucket === 'covered') {
    return 'hardening';
  }
  if (entry.managementBucket === 'scope-limit') {
    return 'scope-cadrage';
  }
  if (entry.managementBucket === 'product-gap' || entry.needsProductWorkFirst) {
    return 'product-closure';
  }
  return 'qa-proof';
}

function defaultActionLabel(mode: AdminQualityDelegationMode): string {
  switch (mode) {
    case 'hardening':
      return 'Renforcer la regression';
    case 'product-closure':
      return 'Fermer la surface produit';
    case 'scope-cadrage':
      return 'Cadrer avant implementation';
    default:
      return 'Etendre la preuve QA';
  }
}

function defaultIssueTitle(entry: AdminQualityMatrixEntry, mode: AdminQualityDelegationMode): string {
  switch (mode) {
    case 'hardening':
      return `Regression: maintenir la couverture ${entry.domain.toLowerCase()}`;
    case 'product-closure':
      return `Produit + QA: fermer le gap ${entry.domain.toLowerCase()}`;
    case 'scope-cadrage':
      return `Cadrage: clarifier ${entry.domain.toLowerCase()} avant delegation dev`;
    default:
      return `QA: etendre la preuve ${entry.domain.toLowerCase()}`;
  }
}

function defaultTrack(entry: AdminQualityMatrixEntry, mode: AdminQualityDelegationMode): AdminQualityDelegationTrack {
  if (mode === 'scope-cadrage' && entry.managementBucket === 'scope-limit') {
    return 'Docs';
  }
  return 'Front (Angular)';
}

function defaultDifficulty(entry: AdminQualityMatrixEntry): AdminQualityDelegationDifficulty {
  switch (entry.priority) {
    case 'haute':
      return 'Hard';
    case 'basse':
      return 'Easy';
    default:
      return 'Medium';
  }
}

function defaultLabels(entry: AdminQualityMatrixEntry, mode: AdminQualityDelegationMode): readonly string[] {
  const labels = ['qa', normalizeLabel(entry.id)];
  if (mode === 'product-closure') {
    labels.push('product-gap');
  }
  if (mode === 'hardening') {
    labels.push('regression');
  }
  if (entry.priority === 'haute') {
    labels.push('high-priority');
  }
  return labels;
}

function defaultTargetFiles(entry: AdminQualityMatrixEntry): readonly string[] {
  const fileRefs = entry.evidence
    .filter((item) => item.endsWith('.spec.ts') || item.endsWith('.ts'))
    .map((item) => item.startsWith('src/') || item.startsWith('e2e/') ? `openg7-org/${item}` : item);

  return fileRefs.length ? fileRefs : ['openg7-org/src/app/domains/admin/pages/admin-quality.page.ts'];
}

function defaultAcceptanceCriteria(entry: AdminQualityMatrixEntry, mode: AdminQualityDelegationMode): readonly string[] {
  const base = [
    `La proposition repond directement au gap observe: ${entry.observedGap}`,
    `La prochaine action de la matrice devient executable: ${entry.nextMove}`,
  ];

  switch (mode) {
    case 'hardening':
      return [...base, 'La couverture existante reste verte apres le changement.'];
    case 'product-closure':
      return [...base, 'La surface produit manquante devient visible et delegable.'];
    case 'scope-cadrage':
      return [...base, 'La limite de scope ou le prochain pas produit est explicite.'];
    default:
      return [...base, 'Une preuve executable et maintenable est ajoutee.'];
  }
}

function defaultCommands(entry: AdminQualityMatrixEntry): readonly string[] {
  const e2eSpecs = entry.evidence.filter((item) => item.startsWith('e2e/') && item.endsWith('.spec.ts'));
  const unitSpecs = entry.evidence.filter((item) => item.startsWith('src/') && item.endsWith('.spec.ts'));
  const commands: string[] = [];

  if (e2eSpecs.length) {
    commands.push(`yarn --cwd openg7-org exec playwright test ${e2eSpecs.join(' ')} --workers=1 --reporter=dot`);
  }
  if (unitSpecs.length) {
    commands.push(
      `yarn --cwd openg7-org test --watch=false --browsers=ChromeHeadlessNoSandbox ${unitSpecs
        .map((item) => `--include ${item}`)
        .join(' ')}`
    );
  }
  commands.push('yarn --cwd openg7-org build');

  return commands;
}

function buildIssueBody(
  entry: AdminQualityMatrixEntry,
  context: {
    readonly actionLabel: string;
    readonly track: AdminQualityDelegationTrack;
    readonly difficulty: AdminQualityDelegationDifficulty;
    readonly repos: readonly string[];
    readonly labels: readonly string[];
    readonly targetFiles: readonly string[];
    readonly acceptanceCriteria: readonly string[];
    readonly commands: readonly string[];
  }
): string {
  return [
    '## Delegation',
    `${context.actionLabel} sur le domaine "${entry.domain}".`,
    '',
    '## Contexte',
    `- Besoin: ${entry.need}`,
    `- Gap observe: ${entry.observedGap}`,
    `- Prochaine action attendue: ${entry.nextMove}`,
    `- Track suggere: ${context.track}`,
    `- Difficult e suggeree: ${context.difficulty}`,
    `- Repos cibles: ${context.repos.join(', ')}`,
    `- Labels suggeres: ${context.labels.join(', ')}`,
    '',
    '## Preuves actuelles a preserver',
    ...entry.evidence.map((item) => `- ${item}`),
    '',
    '## Fichiers probables',
    ...context.targetFiles.map((item) => `- ${item}`),
    '',
    '## Criteres d acceptation',
    ...context.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    '## Validation suggeree',
    ...context.commands.map((item) => `- ${item}`),
  ].join('\n');
}

function buildCodexPrompt(
  entry: AdminQualityMatrixEntry,
  context: {
    readonly actionLabel: string;
    readonly track: AdminQualityDelegationTrack;
    readonly difficulty: AdminQualityDelegationDifficulty;
    readonly targetFiles: readonly string[];
    readonly acceptanceCriteria: readonly string[];
    readonly commands: readonly string[];
  }
): string {
  return [
    `Objectif: ${context.actionLabel} pour le domaine "${entry.domain}".`,
    `Besoin: ${entry.need}`,
    `Gap observe: ${entry.observedGap}`,
    `Resultat attendu: ${entry.nextMove}`,
    `Track: ${context.track}`,
    `Difficulte: ${context.difficulty}`,
    '',
    'Preuves actuelles a preserver:',
    ...entry.evidence.map((item) => `- ${item}`),
    '',
    'Fichiers probables:',
    ...context.targetFiles.map((item) => `- ${item}`),
    '',
    'Criteres d acceptation:',
    ...context.acceptanceCriteria.map((item) => `- ${item}`),
    '',
    'Validation a executer:',
    ...context.commands.map((item) => `- ${item}`),
  ].join('\n');
}

function buildGithubIssueUrl(repoFullName: string, title: string, body: string, labels: readonly string[]): string {
  const params = new URLSearchParams({
    title,
    body,
  });

  if (labels.length) {
    params.set('labels', labels.join(','));
  }

  return `https://github.com/${repoFullName}/issues/new?${params.toString()}`;
}

function resolveRepoFullName(repo: string): string {
  return REPO_ALIAS_MAP[repo] ?? (repo.includes('/') ? repo : `OpenG7/${repo}`);
}

function normalizeLabel(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, '-').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
}
