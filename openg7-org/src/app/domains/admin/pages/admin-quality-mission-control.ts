import { AdminQualityMatrixEntry } from '../data-access/admin-quality-matrix.service';

import { AdminQualityDelegationPlan } from './admin-quality-delegation';

export type AdminQualityMissionStatus =
  | 'proposed'
  | 'approved'
  | 'in-progress'
  | 'proof-returned'
  | 'done'
  | 'deferred'
  | 'rejected'
  | 'blocked';

export type AdminQualityMissionPhase =
  | 'awaiting-human'
  | 'ready'
  | 'execution'
  | 'proof-review'
  | 'completed'
  | 'blocked';

export type AdminQualityMissionConfidence = 'High' | 'Medium';
export type AdminQualityMissionImpact = 'High' | 'Medium' | 'Low';
export type AdminQualityMissionKind = 'core' | 'safety-net' | 'governance';
export type AdminQualityMissionTimelineStatus = 'done' | 'current' | 'pending';

export interface AdminQualityMissionDecisionMap {
  readonly [recommendationId: string]: AdminQualityMissionStatus | undefined;
}

export interface AdminQualityMissionTimelineItem {
  readonly id: string;
  readonly label: string;
  readonly status: AdminQualityMissionTimelineStatus;
}

export interface AdminQualityMissionRecommendation {
  readonly id: string;
  readonly kind: AdminQualityMissionKind;
  readonly title: string;
  readonly summary: string;
  readonly whyNow: string;
  readonly rationale: readonly string[];
  readonly acceptanceCriteria: readonly string[];
  readonly validationCommands: readonly string[];
  readonly targetFiles: readonly string[];
  readonly dependencies: readonly string[];
  readonly confidence: AdminQualityMissionConfidence;
  readonly impact: AdminQualityMissionImpact;
  readonly suggestedOwner: string;
  readonly operatorPrompt: string;
  readonly status: AdminQualityMissionStatus;
}

export interface AdminQualityMissionControlState {
  readonly phase: AdminQualityMissionPhase;
  readonly phaseLabel: string;
  readonly phaseDetail: string;
  readonly operatorCue: string;
  readonly overview: string;
  readonly spokenBriefing: string;
  readonly recommendations: readonly AdminQualityMissionRecommendation[];
  readonly timeline: readonly AdminQualityMissionTimelineItem[];
}

export function buildMissionControl(
  entry: AdminQualityMatrixEntry,
  plan: AdminQualityDelegationPlan,
  decisions: AdminQualityMissionDecisionMap
): AdminQualityMissionControlState {
  const recommendations = buildRecommendations(entry, plan, decisions);
  const phase = resolvePhase(recommendations);

  return {
    phase,
    phaseLabel: phaseLabel(phase),
    phaseDetail: phaseDetail(phase, entry),
    operatorCue: operatorCue(phase),
    overview: buildOverview(entry, plan, phase),
    spokenBriefing: buildSpokenBriefing(entry, plan, phase),
    recommendations,
    timeline: buildTimeline(phase),
  };
}

function buildRecommendations(
  entry: AdminQualityMatrixEntry,
  plan: AdminQualityDelegationPlan,
  decisions: AdminQualityMissionDecisionMap
): readonly AdminQualityMissionRecommendation[] {
  const coreId = buildRecommendationId(entry.id, 'core');
  const safetyId = buildRecommendationId(entry.id, 'safety-net');
  const governanceId = buildRecommendationId(entry.id, 'governance');

  return [
    {
      id: coreId,
      kind: 'core',
      title: plan.actionLabel,
      summary: entry.nextMove,
      whyNow: entry.observedGap,
      rationale: [
        `Le bucket de gestion actuel est "${entry.managementBucket}", donc la mission centrale doit avancer maintenant.`,
        `La proposition s'appuie sur ${entry.evidence.length} preuve(s) existante(s) a preserver.`,
      ],
      acceptanceCriteria: plan.acceptanceCriteria,
      validationCommands: plan.commands,
      targetFiles: plan.targetFiles,
      dependencies: defaultCoreDependencies(plan),
      confidence: plan.difficulty === 'Hard' ? 'Medium' : 'High',
      impact: impactFromPriority(entry.priority),
      suggestedOwner: suggestedOwner(plan.track),
      operatorPrompt: plan.codexPrompt,
      status: decisions[coreId] ?? 'proposed',
    },
    {
      id: safetyId,
      kind: 'safety-net',
      title: safetyNetTitle(plan),
      summary: safetyNetSummary(plan),
      whyNow: 'Sans garde-fous explicites, une mission AI peut livrer vite mais fragiliser la preuve existante.',
      rationale: [
        'La mission secondaire protege les preuves existantes, les hooks data-og7 et la stabilite des validations.',
        'Elle limite le risque qu une execution locale ferme un gap en apparence seulement.',
      ],
      acceptanceCriteria: safetyNetAcceptanceCriteria(plan),
      validationCommands: safetyNetValidationCommands(plan),
      targetFiles: safetyNetTargetFiles(plan),
      dependencies: ['Mission principale approuvee ou scope fige.'],
      confidence: 'High',
      impact: entry.priority === 'haute' ? 'High' : 'Medium',
      suggestedOwner: 'QA / Front partner',
      operatorPrompt: buildSafetyNetPrompt(entry, plan),
      status: decisions[safetyId] ?? 'proposed',
    },
    {
      id: governanceId,
      kind: 'governance',
      title: 'Boucler la gouvernance de mission',
      summary: 'Relier issue, PR, preuve et mise a jour de matrice pour rendre la decision finale explicite.',
      whyNow: 'Une delegation AI sans retour structure reste un essai technique, pas un cycle de pilotage.',
      rationale: [
        'Cette mission force le retour de preuve avant de toucher au statut metier de la matrice.',
        'Elle garde l humain dans le circuit de validation finale.',
      ],
      acceptanceCriteria: [
        'La mission approuvee a un lien tracable vers issue, PR ou artefact equivalent.',
        'Le resultat resume ce qui a ete prouve, ce qui reste risque et ce qui doit revenir dans la matrice.',
        'Le changement de statut final reste une decision humaine.',
      ],
      validationCommands: ['Verifier issue, PR, logs de validation et mise a jour de matrice avant cloture.'],
      targetFiles: [
        'openg7-org/src/assets/data/admin-quality-matrix.json',
        'openg7-org/src/app/domains/admin/pages/admin-quality.page.ts',
      ],
      dependencies: ['Un resultat de mission existe et peut etre relu humainement.'],
      confidence: 'High',
      impact: 'Medium',
      suggestedOwner: 'Product / QA lead',
      operatorPrompt: buildGovernancePrompt(entry),
      status: decisions[governanceId] ?? 'proposed',
    },
  ];
}

function resolvePhase(recommendations: readonly AdminQualityMissionRecommendation[]): AdminQualityMissionPhase {
  const statuses = recommendations.map((recommendation) => recommendation.status);

  if (statuses.includes('blocked')) {
    return 'blocked';
  }
  if (statuses.some((status) => status === 'proof-returned')) {
    return 'proof-review';
  }
  if (statuses.some((status) => status === 'in-progress')) {
    return 'execution';
  }
  if (statuses.some((status) => status === 'approved')) {
    return 'ready';
  }
  if (statuses.some((status) => status === 'done')) {
    return 'completed';
  }
  return 'awaiting-human';
}

function phaseLabel(phase: AdminQualityMissionPhase): string {
  switch (phase) {
    case 'ready':
      return 'Pret a lancer';
    case 'execution':
      return 'Execution en cours';
    case 'proof-review':
      return 'Preuve revenue';
    case 'completed':
      return 'Boucle fermee';
    case 'blocked':
      return 'Blocage a lever';
    default:
      return 'Validation humaine requise';
  }
}

function phaseDetail(phase: AdminQualityMissionPhase, entry: AdminQualityMatrixEntry): string {
  switch (phase) {
    case 'ready':
      return `La mission sur "${entry.domain}" a une approbation humaine et attend son lancement effectif.`;
    case 'execution':
      return `Un chantier est considere en cours sur "${entry.domain}". Le cockpit doit suivre la preuve qui revient.`;
    case 'proof-review':
      return `Une preuve est revenue sur "${entry.domain}". Le prochain geste utile est la revue humaine.`;
    case 'completed':
      return `Au moins une mission a boucle sur "${entry.domain}". Il reste a confirmer si la matrice doit changer.`;
    case 'blocked':
      return `Le flux de mission sur "${entry.domain}" rencontre un blocage. Il faut arbitrer avant de poursuivre.`;
    default:
      return `L'agent a formule ses missions pour "${entry.domain}", mais le demarrage reste conditionne a une validation humaine.`;
  }
}

function operatorCue(phase: AdminQualityMissionPhase): string {
  switch (phase) {
    case 'ready':
      return 'Confirmer le scope final puis lancer le chantier AI.';
    case 'execution':
      return 'Verifier les hypotheses et attendre les artefacts d execution.';
    case 'proof-review':
      return 'Relire la preuve, les tests et la fermeture reelle du gap.';
    case 'completed':
      return 'Mettre a jour la matrice seulement si le besoin est reellement prouve.';
    case 'blocked':
      return 'Lever le blocage ou replanifier au lieu de pousser du code de plus.';
    default:
      return 'Choisir une mission, approuver ou replanifier.';
  }
}

function buildOverview(
  entry: AdminQualityMatrixEntry,
  plan: AdminQualityDelegationPlan,
  phase: AdminQualityMissionPhase
): string {
  switch (phase) {
    case 'ready':
      return `La matrice est prete a deleguer "${plan.actionLabel.toLowerCase()}" sur ${entry.domain}. Le cadre existe, il faut maintenant cadrer le lancement.`;
    case 'execution':
      return `Le cockpit suit un chantier AI actif sur ${entry.domain}. L enjeu n est plus de proposer, mais de verifier ce qui revient.`;
    case 'proof-review':
      return `Une preuve est annoncee sur ${entry.domain}. La valeur se joue maintenant dans la relecture humaine et la decision de cloture.`;
    case 'completed':
      return `La mission a boucle cote execution. La matrice doit maintenant retenir ou non ce resultat comme verite de pilotage.`;
    case 'blocked':
      return `Le travail suggere pour ${entry.domain} ne doit pas repartir avant arbitrage explicite.`;
    default:
      return `Mission Control transforme le gap "${entry.observedGap}" en missions pilotables, sans court-circuiter la validation humaine.`;
  }
}

function buildSpokenBriefing(
  entry: AdminQualityMatrixEntry,
  plan: AdminQualityDelegationPlan,
  phase: AdminQualityMissionPhase
): string {
  return [
    `Mission control pour ${entry.domain}.`,
    `Etat courant: ${phaseLabel(phase)}.`,
    `Action recommandee: ${plan.actionLabel}.`,
    `Gap observe: ${entry.observedGap}`,
    `Prochain mouvement attendu: ${entry.nextMove}`,
    operatorCue(phase),
  ].join(' ');
}

function buildTimeline(phase: AdminQualityMissionPhase): readonly AdminQualityMissionTimelineItem[] {
  const order: readonly AdminQualityMissionPhase[] = [
    'awaiting-human',
    'ready',
    'execution',
    'proof-review',
    'completed',
  ];
  const currentIndex = phase === 'blocked' ? 2 : order.indexOf(phase);

  return [
    { id: 'analysis', label: 'Analyse AI', status: currentIndex > 0 ? 'done' : 'current' },
    {
      id: 'approval',
      label: 'Validation humaine',
      status: currentIndex === 0 ? 'current' : currentIndex > 0 ? 'done' : 'pending',
    },
    {
      id: 'execution',
      label: phase === 'blocked' ? 'Execution bloquee' : 'Execution',
      status: phase === 'blocked' ? 'current' : currentIndex > 2 ? 'done' : currentIndex === 2 ? 'current' : 'pending',
    },
    {
      id: 'review',
      label: 'Revue de preuve',
      status: currentIndex > 3 ? 'done' : currentIndex === 3 ? 'current' : 'pending',
    },
    {
      id: 'closure',
      label: 'Cloture humaine',
      status: currentIndex === 4 ? 'current' : currentIndex > 4 ? 'done' : 'pending',
    },
  ];
}

function defaultCoreDependencies(plan: AdminQualityDelegationPlan): readonly string[] {
  if (plan.mode === 'scope-cadrage') {
    return ['Validation produit explicite sur le scope a retenir.'];
  }
  if (plan.mode === 'product-closure') {
    return ['Surface produit minimale explicite avant la preuve QA.'];
  }
  return ['Validation humaine de mission et priorite de passage.'];
}

function safetyNetTitle(plan: AdminQualityDelegationPlan): string {
  switch (plan.mode) {
    case 'product-closure':
      return 'Preparer la preuve qui suivra la fermeture produit';
    case 'scope-cadrage':
      return 'Conserver le perimetre MVP pendant le cadrage';
    case 'hardening':
      return 'Durcir la regression autour du flux deja prouve';
    default:
      return 'Stabiliser la preuve et les hooks avant extension';
  }
}

function safetyNetSummary(plan: AdminQualityDelegationPlan): string {
  switch (plan.mode) {
    case 'product-closure':
      return 'Definir le garde-fou QA qui permettra de prouver la nouvelle surface sans repartir de zero.';
    case 'scope-cadrage':
      return 'Formaliser ce qui reste dans le scope et ce qui doit attendre, pour eviter une derive de mission.';
    case 'hardening':
      return 'Ajouter une regression ou une verification de protection pour figer le comportement attendu.';
    default:
      return 'Preserver la preuve existante, les selectors et la stabilite des tests avant extension de mission.';
  }
}

function safetyNetAcceptanceCriteria(plan: AdminQualityDelegationPlan): readonly string[] {
  switch (plan.mode) {
    case 'product-closure':
      return [
        'La future preuve QA est identifiee avant meme que la surface produit soit mergee.',
        'Les selectors ou hooks requis sont explicites pour eviter une UI non pilotable.',
      ];
    case 'scope-cadrage':
      return [
        'Le scope conserve est explicite et les non-objectifs sont notes.',
        'La matrice ne laisse pas croire qu une execution produit est deja souhaitable.',
      ];
    case 'hardening':
      return [
        'Une regression supplementaire ou un garde-fou concret est ajoute autour du flux existant.',
        'Le flux prouve reste stable apres build et validations ciblees.',
      ];
    default:
      return [
        'La preuve existante reste verte apres le changement.',
        'Les selectors data-og7 et les commandes de validation restent actionnables.',
      ];
  }
}

function safetyNetValidationCommands(plan: AdminQualityDelegationPlan): readonly string[] {
  return [...plan.commands, 'yarn --cwd openg7-org validate:selectors'];
}

function safetyNetTargetFiles(plan: AdminQualityDelegationPlan): readonly string[] {
  const files = new Set<string>(plan.targetFiles);
  files.add('openg7-org/src/assets/data/admin-quality-matrix.json');
  return Array.from(files);
}

function buildSafetyNetPrompt(entry: AdminQualityMatrixEntry, plan: AdminQualityDelegationPlan): string {
  return [
    `Objectif: securiser la mission autour de "${entry.domain}" avant extension.`,
    `Mission principale: ${plan.actionLabel}.`,
    'Travail attendu:',
    '- preserver les preuves existantes',
    '- maintenir les hooks data-og7 utiles au pilotage',
    '- rendre la validation robuste et relisible',
  ].join('\n');
}

function buildGovernancePrompt(entry: AdminQualityMatrixEntry): string {
  return [
    `Objectif: boucler la gouvernance autour du domaine "${entry.domain}".`,
    'Travail attendu:',
    '- relier la mission a un artefact suivable',
    '- resumer la preuve revenue',
    '- expliciter ce qui reste ouvert avant mise a jour de matrice',
  ].join('\n');
}

function impactFromPriority(priority: AdminQualityMatrixEntry['priority']): AdminQualityMissionImpact {
  switch (priority) {
    case 'haute':
      return 'High';
    case 'basse':
      return 'Low';
    default:
      return 'Medium';
  }
}

function suggestedOwner(track: AdminQualityDelegationPlan['track']): string {
  switch (track) {
    case 'Docs':
      return 'Product / docs lead';
    case 'Tooling / CI':
      return 'Platform / CI owner';
    case 'Front (Angular) + CMS (Strapi)':
      return 'Front + CMS pair';
    default:
      return 'Front owner';
  }
}

function buildRecommendationId(entryId: string, kind: AdminQualityMissionKind): string {
  return `${entryId}::${kind}`;
}
