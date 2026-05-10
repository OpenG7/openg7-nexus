import { HOME_CORRIDORS, getHomeSectorLabelKey } from './trade-map-corridors';
import type { CorridorMode, CorridorPriority, HomeSector } from './trade-map-corridors';

export interface CorridorContext {
  readonly id: string;
  readonly labelKey: string;
  readonly routeKey?: string;
  readonly fromProvinceId?: string | null;
  readonly toProvinceId?: string | null;
  readonly sectorId?: HomeSector | null;
  readonly sectorLabelKey?: string | null;
  readonly mode?: CorridorMode | null;
  readonly priority?: CorridorPriority | null;
  readonly priorityLabelKey?: string | null;
  readonly decisionItemId?: string | null;
  readonly cmsKey?: string | null;
  readonly source?: 'corridors-realtime' | 'trade-map';
}

const REALTIME_CORRIDOR_CONTEXTS: Readonly<Record<string, CorridorContext>> = {
  'essential-services': {
    id: 'essential-services',
    labelKey: 'home.corridorsRealtime.items.essentialServices',
    routeKey: 'home.corridorsRealtime.items.qcOn',
    fromProvinceId: 'QC',
    toProvinceId: 'ON',
    source: 'corridors-realtime',
  },
  'step-live': {
    id: 'step-live',
    labelKey: 'home.corridorsRealtime.items.stepLive',
    source: 'corridors-realtime',
  },
};

const TRADE_MAP_CORRIDOR_CONTEXTS: Readonly<Record<string, CorridorContext>> =
  HOME_CORRIDORS.reduce<Record<string, CorridorContext>>((contexts, corridor) => {
    contexts[corridor.id] = {
      id: corridor.id,
      labelKey: corridor.routeLabelKey,
      fromProvinceId: corridor.fromProvinceId,
      toProvinceId: corridor.toProvinceId ?? null,
      sectorId: corridor.sector,
      sectorLabelKey: getHomeSectorLabelKey(corridor.sector),
      mode: corridor.mode,
      priority: corridor.priority,
      priorityLabelKey: corridor.priorityLabelKey,
      decisionItemId: corridor.decisionItemId ?? null,
      cmsKey: corridor.cmsKey,
      source: 'trade-map',
    };
    return contexts;
  }, {});

const CORRIDOR_CONTEXTS: Readonly<Record<string, CorridorContext>> = {
  ...REALTIME_CORRIDOR_CONTEXTS,
  ...TRADE_MAP_CORRIDOR_CONTEXTS,
};

export function resolveCorridorContext(
  corridorId: string | null | undefined,
): CorridorContext | null {
  if (typeof corridorId !== 'string') {
    return null;
  }

  const normalizedId = corridorId.trim().toLowerCase();
  return normalizedId ? (CORRIDOR_CONTEXTS[normalizedId] ?? null) : null;
}
