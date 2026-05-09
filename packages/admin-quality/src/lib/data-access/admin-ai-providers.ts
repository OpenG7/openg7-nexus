export type AdminAiProvider = 'codex' | 'copilot' | 'claude' | 'gemini';

export interface AdminAiProviderOption {
  readonly id: AdminAiProvider;
  readonly label: string;
  readonly caption: string;
  readonly defaultModel: string;
  readonly defaultQuotaUnits: number;
}

export const ADMIN_AI_PROVIDER_OPTIONS: readonly AdminAiProviderOption[] = [
  {
    id: 'codex',
    label: 'Codex',
    caption: 'Workflow GitHub natif de reference pour les delegations automatisees.',
    defaultModel: 'gpt-5.4',
    defaultQuotaUnits: 160,
  },
  {
    id: 'copilot',
    label: 'GitHub Copilot',
    caption: 'Bon relais quand le quota Codex est sature et qu il faut rester dans l environnement GitHub.',
    defaultModel: 'gpt-5.4',
    defaultQuotaUnits: 180,
  },
  {
    id: 'claude',
    label: 'Claude',
    caption: 'Utile pour des briefs longs et une relecture structuree avant delegation.',
    defaultModel: 'claude-sonnet-4-5',
    defaultQuotaUnits: 140,
  },
  {
    id: 'gemini',
    label: 'Gemini',
    caption: 'Pratique pour basculer rapidement sur une autre reserve de quota orientee synthesis.',
    defaultModel: 'gemini-2.5-pro',
    defaultQuotaUnits: 140,
  },
] as const;

export function buildAdminAiQuotaDefaults(): Record<AdminAiProvider, number> {
  return ADMIN_AI_PROVIDER_OPTIONS.reduce(
    (accumulator, option) => ({
      ...accumulator,
      [option.id]: option.defaultQuotaUnits,
    }),
    {} as Record<AdminAiProvider, number>,
  );
}

export function isAdminAiProvider(value: unknown): value is AdminAiProvider {
  return ADMIN_AI_PROVIDER_OPTIONS.some((option) => option.id === value);
}

export function resolveAdminAiProviderOption(provider: AdminAiProvider): AdminAiProviderOption {
  return (
    ADMIN_AI_PROVIDER_OPTIONS.find((option) => option.id === provider) ??
    ADMIN_AI_PROVIDER_OPTIONS[0]
  );
}